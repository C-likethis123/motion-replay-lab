import Dexie, { type Table } from "dexie";

export type PracticeSection = {
  id: string;
  label: string;
  start: number;
  end?: number;
  note?: string;
};

export type BpmSource = "detected" | "tap" | "unavailable";
export type BpmDetectionStatus = "idle" | "detecting";
export type VideoThumbnailSource = string | null;

export type SyncRevision = {
  counter: number;
  deviceId: string;
};

export type MediaDescriptor = {
  fileName: string;
  mimeType: string;
  byteLength: number;
  sha256: string | null;
};

export type ThumbnailDescriptor = {
  mimeType: string;
  byteLength: number;
  sha256: string | null;
};

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUri: VideoThumbnailSource;
  bpm: number | null;
  countSeconds: number | null;
  firstBeatTimestamp: number | null;
  firstEightCountTimestamp: number | null;
  bpmSource: BpmSource;
  bpmConfidence?: number;
  bpmDetectionStatus?: BpmDetectionStatus;
  bpmDetectionError?: string;
  sections: PracticeSection[];
  labels: string[];
  teacher?: string;
  mirrored: boolean;
  media?: MediaDescriptor;
  thumbnail?: ThumbnailDescriptor;
  revision: SyncRevision;
  updatedAt: number;
  deletedAt?: number;
}

export interface VideoBlobRecord {
  id: string;
  blob: Blob;
}

export interface ThumbnailBlobRecord {
  id: string;
  blob: Blob;
}

export interface DeviceRecord {
  id: string;
  deviceId: string;
  displayName: string;
  createdAt: number;
}

export interface SyncPeerRecord {
  id: string;
  displayName: string;
  lastSyncAt?: number;
  baseRevisions: Record<string, SyncRevision>;
}

export interface SyncTransferRecord {
  id: string;
  videoId: string;
  kind: "thumbnail" | "video";
  expectedHash: string;
  size: number;
  acknowledgedOffset: number;
  updatedAt: number;
}

export interface SyncChunkRecord {
  transferId: string;
  sequence: number;
  offset: number;
  blob: Blob;
}

export class DanceReplayDB extends Dexie {
  videos!: Table<VideoMetadata, string>;
  videoBlobs!: Table<VideoBlobRecord, string>;
  thumbnailBlobs!: Table<ThumbnailBlobRecord, string>;
  devices!: Table<DeviceRecord, string>;
  syncPeers!: Table<SyncPeerRecord, string>;
  syncTransfers!: Table<SyncTransferRecord, string>;
  syncChunks!: Table<SyncChunkRecord, [string, number]>;

  constructor() {
    super("DanceReplayDB");
    this.version(1).stores({
      videos: "id, title, style, teacher, bpm, bpmSource",
      videoBlobs: "id",
    });
    this.version(2).stores({
      videos: "id, title, bpm, bpmSource",
      videoBlobs: "id",
    });
    this.version(3).stores({
      videos: "id, title, bpm, bpmSource, countSeconds, bpmDetectionStatus",
      videoBlobs: "id",
    }).upgrade(async (tx) => {
      await tx.table("videos").toCollection().modify((video) => {
        delete video.style;
        delete video.teacher;
        // Ensure new fields exist
        video.countSeconds = video.countSeconds ?? null;
      });
    });
    this.version(4).stores({
      videos: "id, title, bpm, bpmSource, countSeconds, bpmDetectionStatus, updatedAt, deletedAt, revision.deviceId",
      videoBlobs: "id",
      thumbnailBlobs: "id",
      devices: "id, deviceId",
      syncPeers: "id, lastSyncAt",
      syncTransfers: "id, videoId, updatedAt",
      syncChunks: "[transferId+sequence], transferId",
    }).upgrade(async (tx) => {
      const now = Date.now();
      await tx.table("videos").toCollection().modify((video) => {
        video.thumbnailUri = video.thumbnailUri ?? null;
        video.sections = video.sections ?? [];
        video.labels = video.labels ?? [];
        video.mirrored = video.mirrored ?? false;
        video.revision = video.revision ?? { counter: 1, deviceId: "legacy" };
        video.updatedAt = video.updatedAt ?? now;
      });
    });
  }
}

export const db = new DanceReplayDB();
