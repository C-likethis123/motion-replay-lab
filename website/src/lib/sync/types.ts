import type { BpmSource, PracticeSection, SyncRevision } from "../db";

export const SYNC_PROTOCOL_VERSION = 1;
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type SyncVideoRecord = {
  id: string;
  title: string;
  bpm: number | null;
  countSeconds: number | null;
  firstBeatTimestamp: number | null;
  firstEightCountTimestamp: number | null;
  bpmSource: BpmSource;
  bpmConfidence?: number;
  sections: PracticeSection[];
  labels: string[];
  teacher?: string;
  mirrored: boolean;
  media: {
    fileName: string;
    mimeType: string;
    byteLength: number;
    sha256: string;
  };
  thumbnail?: {
    mimeType: string;
    byteLength: number;
    sha256: string;
  };
  revision: SyncRevision;
  updatedAt: number;
  deletedAt?: number;
};

export type StorageReadiness = {
  persisted: boolean;
  quota: number | null;
  usage: number | null;
  available: number | null;
  canReceiveBytes: (byteLength: number) => boolean;
};

export type SyncManifestEntry = {
  id: string;
  title: string;
  revision: SyncRevision;
  updatedAt: number;
  deletedAt?: number;
  mediaHash: string | null;
  metadataHash: string;
};

export type SyncComparisonKind = "new" | "changed" | "deleted" | "same" | "conflict";
export type SyncDirection = "pull" | "push" | "none" | "resolve";

export type SyncComparisonItem = {
  id: string;
  title: string;
  kind: SyncComparisonKind;
  direction: SyncDirection;
};

export type SyncControlMessage =
  | {
    type: "hello";
    protocolVersion: number;
    deviceId: string;
    deviceName: string;
    capabilities: { manifests: true; metadata: true; binary: true };
  }
  | {
    type: "manifest";
    protocolVersion: number;
    entries: SyncManifestEntry[];
  }
  | {
    type: "sync-request";
    protocolVersion: number;
    videoIds: string[];
  }
  | {
    type: "record";
    protocolVersion: number;
    record: SyncVideoRecord;
  }
  | {
    type: "file-start";
    protocolVersion: number;
    transferId: string;
    videoId: string;
    kind: "thumbnail" | "video";
    size: number;
    sha256: string;
    chunkSize: number;
  }
  | {
    type: "file-ack";
    protocolVersion: number;
    transferId: string;
    acknowledgedOffset: number;
  }
  | {
    type: "file-end";
    protocolVersion: number;
    transferId: string;
  }
  | {
    type: "file-complete";
    protocolVersion: number;
    transferId: string;
  }
  | {
    type: "cancel" | "error";
    protocolVersion: number;
    transferId?: string;
    message?: string;
  };

export type SyncTransferProgress = {
  direction: "sending" | "receiving";
  videoId: string;
  title: string;
  kind: "thumbnail" | "video";
  completedBytes: number;
  totalBytes: number;
};
