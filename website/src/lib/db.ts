import Dexie, { type Table } from "dexie";

export type PracticeSection = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export type BpmSource = "detected" | "tap" | "unavailable";
export type BpmDetectionStatus = "idle" | "detecting";
export type VideoThumbnailSource = string | null;

export interface VideoMetadata {
  id: string;
  title: string;
  style: string;
  teacher: string;
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
  }
}

export const db = new DanceReplayDB();
