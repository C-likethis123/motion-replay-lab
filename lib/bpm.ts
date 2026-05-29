import type { BpmSource, DanceVideo } from "@/lib/videos";

export type BpmTiming = {
  bpm: number | null;
  countSeconds: number | null;
  bpmSource: BpmSource;
};

export function parseBpmInput(value: string): number | null {
  const bpm = Number(value);

  if (!Number.isFinite(bpm) || bpm <= 0) {
    return null;
  }

  return bpm;
}

export function deriveBpmTiming(bpm: number | null): BpmTiming {
  if (!bpm) {
    return { bpm: null, countSeconds: null, bpmSource: "unavailable" };
  }

  return { bpm, countSeconds: 60 / bpm, bpmSource: "tap" };
}

export function formatBpm(video: Pick<DanceVideo, "bpm">) {
  return video.bpm ? `${video.bpm} BPM` : "BPM unavailable";
}
