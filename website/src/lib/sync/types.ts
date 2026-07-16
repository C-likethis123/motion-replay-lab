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
