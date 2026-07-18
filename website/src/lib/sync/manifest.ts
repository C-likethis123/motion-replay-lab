import { db, type VideoMetadata } from "../db";
import { sha256Blob } from "./storage";
import type { SyncComparisonItem, SyncManifestEntry } from "./types";

export async function createSyncManifest(): Promise<SyncManifestEntry[]> {
  const videos = await db.videos.toArray();
  const entries = await Promise.all(videos.map(createManifestEntry));
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

export async function prepareVideoForSync(video: VideoMetadata): Promise<VideoMetadata> {
  if (video.deletedAt) return video;
  const mediaBlob = await db.videoBlobs.get(video.id);
  if (!mediaBlob) throw new Error(`Video file missing for ${video.title}`);
  const thumbnailBlob = await db.thumbnailBlobs.get(video.id);
  const mediaHash = video.media?.sha256 ?? await sha256Blob(mediaBlob.blob);
  const thumbnailHash = thumbnailBlob ? video.thumbnail?.sha256 ?? await sha256Blob(thumbnailBlob.blob) : null;
  const next: VideoMetadata = {
    ...video,
    media: {
      fileName: video.media?.fileName ?? video.title,
      mimeType: video.media?.mimeType ?? (mediaBlob.blob.type || "application/octet-stream"),
      byteLength: mediaBlob.blob.size,
      sha256: mediaHash,
    },
    thumbnail: thumbnailBlob ? {
      mimeType: video.thumbnail?.mimeType ?? (thumbnailBlob.blob.type || "image/jpeg"),
      byteLength: thumbnailBlob.blob.size,
      sha256: thumbnailHash,
    } : undefined,
  };
  await db.videos.put(next);
  return next;
}

export function compareSyncManifests(
  localEntries: SyncManifestEntry[],
  remoteEntries: SyncManifestEntry[],
): SyncComparisonItem[] {
  const localById = new Map(localEntries.map((entry) => [entry.id, entry]));
  const remoteById = new Map(remoteEntries.map((entry) => [entry.id, entry]));
  const ids = new Set([...localById.keys(), ...remoteById.keys()]);

  return [...ids].map((id) => compareEntry(localById.get(id), remoteById.get(id))).sort((left, right) => {
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
    return left.title.localeCompare(right.title);
  });
}

async function createManifestEntry(video: VideoMetadata): Promise<SyncManifestEntry> {
  const prepared = await prepareVideoForSync(video);
  return {
    id: prepared.id,
    title: prepared.title,
    revision: prepared.revision,
    updatedAt: prepared.updatedAt,
    deletedAt: prepared.deletedAt,
    mediaHash: prepared.media?.sha256 ?? null,
    metadataHash: await hashMetadata(prepared),
  };
}

async function hashMetadata(video: VideoMetadata) {
  const { thumbnailUri, bpmDetectionStatus, bpmDetectionError, ...syncable } = video;
  void thumbnailUri;
  void bpmDetectionStatus;
  void bpmDetectionError;
  return sha256Blob(new Blob([stableStringify(syncable)], { type: "application/json" }));
}

function compareEntry(local: SyncManifestEntry | undefined, remote: SyncManifestEntry | undefined): SyncComparisonItem {
  if (!local && remote) {
    return { id: remote.id, title: remote.title, kind: remote.deletedAt ? "deleted" : "new", direction: "pull" };
  }
  if (local && !remote) {
    return { id: local.id, title: local.title, kind: local.deletedAt ? "deleted" : "new", direction: "push" };
  }

  const localEntry = local!;
  const remoteEntry = remote!;
  if (sameEntry(localEntry, remoteEntry)) {
    return { id: localEntry.id, title: localEntry.title, kind: "same", direction: "none" };
  }
  if (localEntry.revision.counter === remoteEntry.revision.counter) {
    return { id: localEntry.id, title: localEntry.title, kind: "conflict", direction: "resolve" };
  }

  const remoteIsNewer = remoteEntry.revision.counter > localEntry.revision.counter;
  const newer = remoteIsNewer ? remoteEntry : localEntry;
  return {
    id: newer.id,
    title: newer.title,
    kind: newer.deletedAt ? "deleted" : "changed",
    direction: remoteIsNewer ? "pull" : "push",
  };
}

function sameEntry(left: SyncManifestEntry, right: SyncManifestEntry) {
  return left.revision.counter === right.revision.counter
    && left.revision.deviceId === right.revision.deviceId
    && left.deletedAt === right.deletedAt
    && left.mediaHash === right.mediaHash
    && left.metadataHash === right.metadataHash;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
