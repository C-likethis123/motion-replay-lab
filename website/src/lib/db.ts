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
  mirrored: boolean;
}

export interface VideoBlobRecord {
  id: string;
  blob: Blob;
}

export class DanceReplayDB extends Dexie {
  videos!: Table<VideoMetadata, string>;
  videoBlobs!: Table<VideoBlobRecord, string>;

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
  }
}

export const db = new DanceReplayDB();
