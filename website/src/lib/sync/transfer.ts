import { db, type VideoMetadata } from "../db";
import { prepareVideoForSync } from "./manifest";
import { PairingConnection } from "./pairing";
import { requestStorageReadiness, sha256Blob } from "./storage";
import { SYNC_PROTOCOL_VERSION, type SyncControlMessage, type SyncTransferProgress, type SyncVideoRecord } from "./types";

const CHUNK_SIZE = 256 * 1024;
const ACK_INTERVAL = 1024 * 1024;
const MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024;

type TransferCallbacks = {
  onProgress: (progress: SyncTransferProgress[]) => void;
  onComplete: () => void;
  onError: (message: string) => void;
};

type IncomingTransfer = {
  transferId: string;
  videoId: string;
  kind: "thumbnail" | "video";
  size: number;
  sha256: string;
  chunkSize: number;
  acknowledgedOffset: number;
  lastAckOffset: number;
  chunks: Blob[];
  chain: Promise<void>;
};

export class SyncTransferEngine {
  private pendingRecords = new Map<string, SyncVideoRecord>();
  private incoming: IncomingTransfer | null = null;
  private completionResolvers = new Map<string, () => void>();
  private startResolvers = new Map<string, () => void>();
  private acknowledgementResolvers = new Map<string, { target: number; resolve: () => void }>();
  private sendingProgress = new Map<string, SyncTransferProgress>();
  private receivingProgress: SyncTransferProgress | null = null;
  private unsubscribers: (() => void)[] = [];
  private connection: PairingConnection;
  private callbacks: TransferCallbacks;

  constructor(connection: PairingConnection, callbacks: TransferCallbacks) {
    this.connection = connection;
    this.callbacks = callbacks;
    this.unsubscribers.push(connection.onControlMessage((message) => {
      void this.handleControlMessage(message).catch((error) => this.fail(error));
    }));
    this.unsubscribers.push(connection.onBinaryMessage((data) => {
      this.receiveBinaryChunk(data);
    }));
  }

  close() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  requestVideos(videoIds: string[]) {
    this.connection.sendControl({ type: "sync-request", protocolVersion: SYNC_PROTOCOL_VERSION, videoIds });
  }

  async sendVideos(videoIds: string[]) {
    for (const videoId of videoIds) await this.sendVideo(videoId);
  }

  private async handleControlMessage(message: SyncControlMessage) {
    switch (message.type) {
      case "sync-request":
        for (const videoId of message.videoIds) await this.sendVideo(videoId);
        break;
      case "record":
        await this.receiveRecord(message.record);
        break;
      case "file-start":
        await this.startIncomingFile(message);
        break;
      case "file-ack":
        this.startResolvers.get(message.transferId)?.();
        this.startResolvers.delete(message.transferId);
        this.updateSendingProgress(message.transferId, message.acknowledgedOffset);
        this.resolveAcknowledgement(message.transferId, message.acknowledgedOffset);
        break;
      case "file-end":
        await this.finishIncomingFile(message.transferId);
        break;
      case "file-complete":
        if (this.sendingProgress.get(message.transferId)?.kind === "video") this.callbacks.onComplete();
        this.completionResolvers.get(message.transferId)?.();
        this.completionResolvers.delete(message.transferId);
        break;
      case "cancel":
      case "error":
        if (message.transferId) await this.discardIncoming(message.transferId);
        throw new Error(message.message ?? "Sync cancelled by peer");
      default:
        break;
    }
  }

  private async sendVideo(videoId: string) {
    const metadata = await db.videos.get(videoId);
    if (!metadata) return;
    const record = await syncRecordFromMetadata(metadata);
    this.connection.sendControl({ type: "record", protocolVersion: SYNC_PROTOCOL_VERSION, record });

    if (record.deletedAt) return;
    const thumbnail = await db.thumbnailBlobs.get(videoId);
    if (thumbnail && record.thumbnail) await this.sendFile(videoId, record.title, "thumbnail", thumbnail.blob, record.thumbnail.sha256);
    const video = await db.videoBlobs.get(videoId);
    if (!video) throw new Error(`Video file missing for ${record.title}`);
    await this.sendFile(videoId, record.title, "video", video.blob, record.media.sha256);
  }

  private async sendFile(videoId: string, title: string, kind: "thumbnail" | "video", blob: Blob, sha256: string) {
    const transferId = crypto.randomUUID();
    this.sendingProgress.set(transferId, { direction: "sending", videoId, title, kind, completedBytes: 0, totalBytes: blob.size });
    this.publishSendingProgress();
    const started = new Promise<void>((resolve) => this.startResolvers.set(transferId, resolve));
    const completed = new Promise<void>((resolve) => this.completionResolvers.set(transferId, resolve));
    const acknowledged = new Promise<void>((resolve) => {
      this.acknowledgementResolvers.set(transferId, { target: blob.size, resolve });
    });
    this.connection.sendControl({
      type: "file-start",
      protocolVersion: SYNC_PROTOCOL_VERSION,
      transferId,
      videoId,
      kind,
      size: blob.size,
      sha256,
      chunkSize: CHUNK_SIZE,
    });
    await started;
    for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
      await this.connection.waitForBinaryDrain(MAX_BUFFERED_AMOUNT);
      const payload = await blob.slice(offset, Math.min(offset + CHUNK_SIZE, blob.size)).arrayBuffer();
      this.connection.sendBinary(encodeChunk(Math.floor(offset / CHUNK_SIZE), payload));
    }
    await acknowledged;
    this.connection.sendControl({ type: "file-end", protocolVersion: SYNC_PROTOCOL_VERSION, transferId });
    await completed;
    this.sendingProgress.delete(transferId);
    this.publishSendingProgress();
  }

  private async receiveRecord(record: SyncVideoRecord) {
    if (record.deletedAt) {
      const existing = await db.videos.get(record.id);
      const metadata = metadataFromRecord(record);
      await db.transaction("rw", [db.videos, db.videoBlobs, db.thumbnailBlobs], async () => {
        await db.videos.put({ ...existing, ...metadata });
        await db.videoBlobs.delete(record.id);
        await db.thumbnailBlobs.delete(record.id);
      });
      this.libraryChanged();
      return;
    }
    this.pendingRecords.set(record.id, record);
  }

  private async startIncomingFile(message: Extract<SyncControlMessage, { type: "file-start" }>) {
    if (this.incoming) throw new Error("A file transfer is already in progress");
    const record = this.pendingRecords.get(message.videoId);
    if (!record) throw new Error("Received a file without its metadata record");
    const readiness = await requestStorageReadiness();
    if (!readiness.canReceiveBytes(message.size)) throw new Error("Not enough browser storage for this file");

    const acknowledgedOffset = 0;
    await db.syncTransfers.put({
      id: message.transferId,
      videoId: message.videoId,
      kind: message.kind,
      expectedHash: message.sha256,
      size: message.size,
      acknowledgedOffset,
      updatedAt: Date.now(),
    });
    this.incoming = { ...message, acknowledgedOffset, lastAckOffset: acknowledgedOffset, chunks: [], chain: Promise.resolve() };
    this.receivingProgress = {
      direction: "receiving",
      videoId: message.videoId,
      title: record.title,
      kind: message.kind,
      completedBytes: acknowledgedOffset,
      totalBytes: message.size,
    };
    this.publishProgress();
    this.connection.sendControl({ type: "file-ack", protocolVersion: SYNC_PROTOCOL_VERSION, transferId: message.transferId, acknowledgedOffset });
  }

  private receiveBinaryChunk(data: ArrayBuffer) {
    const incoming = this.incoming;
    if (!incoming || data.byteLength < 4) return;
    const { sequence, payload } = decodeChunk(data);
    const offset = sequence * incoming.chunkSize;
    incoming.chain = incoming.chain.then(async () => {
      if (offset !== incoming.acknowledgedOffset) throw new Error("Received file chunks out of order");
      incoming.chunks.push(new Blob([payload]));
      incoming.acknowledgedOffset = offset + payload.byteLength;
      const shouldAck = incoming.acknowledgedOffset >= incoming.size
        || incoming.acknowledgedOffset - incoming.lastAckOffset >= ACK_INTERVAL;
      if (!shouldAck) return;

      incoming.lastAckOffset = incoming.acknowledgedOffset;
      await db.syncTransfers.update(incoming.transferId, { acknowledgedOffset: incoming.acknowledgedOffset, updatedAt: Date.now() });
      this.updateReceivingProgress(incoming);
      this.connection.sendControl({
        type: "file-ack",
        protocolVersion: SYNC_PROTOCOL_VERSION,
        transferId: incoming.transferId,
        acknowledgedOffset: incoming.acknowledgedOffset,
      });
    }).catch((error) => this.fail(error));
  }

  private async finishIncomingFile(transferId: string) {
    const incoming = this.incoming;
    if (!incoming || incoming.transferId !== transferId) throw new Error("Unexpected file end");
    await incoming.chain;
    const blob = new Blob(incoming.chunks);
    if (blob.size !== incoming.size || await sha256Blob(blob) !== incoming.sha256) {
      await this.discardIncoming(transferId);
      throw new Error("Received file checksum failed");
    }

    const record = this.pendingRecords.get(incoming.videoId)!;
    await db.transaction("rw", [db.videos, db.videoBlobs, db.thumbnailBlobs, db.syncTransfers, db.syncChunks], async () => {
      if (incoming.kind === "thumbnail") await db.thumbnailBlobs.put({ id: incoming.videoId, blob });
      if (incoming.kind === "video") {
        await db.videoBlobs.put({ id: incoming.videoId, blob });
        await db.videos.put(metadataFromRecord(record));
        this.pendingRecords.delete(incoming.videoId);
      }
      await db.syncChunks.where("transferId").equals(transferId).delete();
      await db.syncTransfers.delete(transferId);
    });
    this.incoming = null;
    this.receivingProgress = null;
    this.publishProgress();
    this.connection.sendControl({ type: "file-complete", protocolVersion: SYNC_PROTOCOL_VERSION, transferId });
    if (incoming.kind === "video") this.libraryChanged();
  }

  private async discardIncoming(transferId: string) {
    await db.transaction("rw", [db.syncTransfers, db.syncChunks], async () => {
      await db.syncChunks.where("transferId").equals(transferId).delete();
      await db.syncTransfers.delete(transferId);
    });
    if (this.incoming?.transferId === transferId) this.incoming = null;
    this.receivingProgress = null;
    this.publishProgress();
  }

  private updateSendingProgress(transferId: string, completedBytes: number) {
    const progress = this.sendingProgress.get(transferId);
    if (!progress) return;
    this.sendingProgress.set(transferId, { ...progress, completedBytes: Math.min(completedBytes, progress.totalBytes) });
    this.publishSendingProgress();
  }

  private updateReceivingProgress(incoming: IncomingTransfer) {
    const record = this.pendingRecords.get(incoming.videoId)!;
    this.receivingProgress = {
      direction: "receiving",
      videoId: incoming.videoId,
      title: record.title,
      kind: incoming.kind,
      completedBytes: incoming.acknowledgedOffset,
      totalBytes: incoming.size,
    };
    this.publishProgress();
  }

  private resolveAcknowledgement(transferId: string, acknowledgedOffset: number) {
    const pending = this.acknowledgementResolvers.get(transferId);
    if (!pending || acknowledgedOffset < pending.target) return;
    pending.resolve();
    this.acknowledgementResolvers.delete(transferId);
  }

  private publishSendingProgress() {
    this.publishProgress();
  }

  private publishProgress() {
    this.callbacks.onProgress([
      ...this.sendingProgress.values(),
      ...(this.receivingProgress ? [this.receivingProgress] : []),
    ]);
  }

  private libraryChanged() {
    window.dispatchEvent(new Event("dance-replay-library-changed"));
    this.callbacks.onComplete();
  }

  private fail(error: unknown) {
    this.callbacks.onError(error instanceof Error ? error.message : String(error));
  }
}

async function syncRecordFromMetadata(metadata: VideoMetadata): Promise<SyncVideoRecord> {
  const prepared = await prepareVideoForSync(metadata);
  const {
    thumbnailUri,
    bpmDetectionStatus,
    bpmDetectionError,
    media,
    thumbnail,
    ...syncable
  } = prepared;
  void thumbnailUri;
  void bpmDetectionStatus;
  void bpmDetectionError;
  if (prepared.deletedAt) {
    return {
      ...syncable,
      media: { fileName: "deleted", mimeType: "application/octet-stream", byteLength: 0, sha256: "deleted" },
      thumbnail: undefined,
    };
  }
  if (!media?.sha256) throw new Error(`Missing media hash for ${prepared.title}`);
  return {
    ...syncable,
    media: { ...media, sha256: media.sha256 },
    thumbnail: thumbnail?.sha256 ? { ...thumbnail, sha256: thumbnail.sha256 } : undefined,
  };
}

function metadataFromRecord(record: SyncVideoRecord): VideoMetadata {
  return { ...record, thumbnailUri: null, bpmDetectionStatus: "idle", bpmDetectionError: undefined };
}

function encodeChunk(sequence: number, payload: ArrayBuffer) {
  const data = new Uint8Array(4 + payload.byteLength);
  new DataView(data.buffer).setUint32(0, sequence);
  data.set(new Uint8Array(payload), 4);
  return data.buffer;
}

function decodeChunk(data: ArrayBuffer) {
  return { sequence: new DataView(data).getUint32(0), payload: data.slice(4) };
}
