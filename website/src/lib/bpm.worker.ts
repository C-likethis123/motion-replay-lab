import { Essentia } from "essentia.js";

// Mock globals for Emscripten glue code
(self as any).document = {
  currentScript: { src: "" },
  title: ""
};
(self as any).window = self;

// @ts-ignore
import EssentiaWASM from "essentia.js/dist/essentia-wasm.web.js";

export type AudioTimingCandidate = {
  label: "half-time" | "detected" | "double-time";
  bpm: number;
  confidence: number;
};

function buildTempoCandidates(
  rawBpm: number | null,
  confidence: number,
  minBpm: number,
  maxBpm: number,
) {
  if (!rawBpm) {
    return [];
  }

  return [
    { label: "half-time" as const, multiplier: 0.5, bias: -0.08 },
    { label: "detected" as const, multiplier: 1, bias: 0.08 },
    { label: "double-time" as const, multiplier: 2, bias: -0.04 },
  ]
    .map(({ label, multiplier, bias }) => ({
      label,
      bpm: rawBpm * multiplier,
      confidence: clampConfidence(confidence + bias),
    }))
    .filter((candidate) => candidate.bpm >= minBpm && candidate.bpm <= maxBpm)
    .map((candidate) => ({
      ...candidate,
      bpm: Math.round(candidate.bpm),
    }));
}

function chooseDanceTempoCandidate(candidates: AudioTimingCandidate[]) {
  const preferredBpm = 120;

  return [...candidates].sort((left, right) => {
    const scoreLeft =
      left.confidence - Math.abs(left.bpm - preferredBpm) / preferredBpm / 4;
    const scoreRight =
      right.confidence - Math.abs(right.bpm - preferredBpm) / preferredBpm / 4;

    return scoreRight - scoreLeft;
  })[0];
}

function normalizeConfidence(
  confidence: number | undefined,
  beatTimestamps: number[],
) {
  const reported = toPositiveNumber(confidence) ?? 0;
  const beatScore = Math.min(1, beatTimestamps.length / 24);

  return clampConfidence(reported * 0.8 + beatScore * 0.2);
}

function vectorToNumberArray(essentia: Essentia, vector: unknown) {
  if (!vector) {
    return [];
  }

  return Array.from(essentia.vectorToArray(vector)).filter(Number.isFinite) as number[];
}

function toPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

let essentia: Essentia | null = null;
console.log("[Worker] Initializing Essentia...");

// Configuration to handle worker environment and WASM path
const Module = {
  ENVIRONMENT_IS_WEB: false,
  ENVIRONMENT_IS_WORKER: true,
  locateFile: (path: string) => `/${path}`,
};

// The imported module is a factory function that returns the ready promise
EssentiaWASM(Module).then((wasmModule: any) => {
  console.log("[Worker] Essentia WASM ready.");
  essentia = new Essentia(wasmModule);
});

self.onmessage = async (event) => {
  console.log("[Worker] Received message:", event.data);
  const { samples, minBpm, maxBpm, timestampOffsetSeconds } = event.data;
  
  // Wait for initialization
  while (!essentia) {
    console.log("[Worker] Waiting for initialization...");
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log("[Worker] Starting analysis...");
  const signal = essentia.arrayToVector(samples);
  
  try {
    const rhythm = essentia.RhythmExtractor2013(
      signal,
      maxBpm,
      "multifeature",
      Math.max(40, Math.floor(minBpm / 2)),
    );
    const rawBpm = toPositiveNumber(rhythm.bpm);
    const beatTimestamps = vectorToNumberArray(essentia, rhythm.ticks).map(
      (timestamp) => timestamp + (timestampOffsetSeconds ?? 0),
    );
    const confidence = normalizeConfidence(rhythm.confidence, beatTimestamps);
    const tempoCandidates = buildTempoCandidates(
      rawBpm,
      confidence,
      minBpm,
      maxBpm,
    );
    const bestCandidate = chooseDanceTempoCandidate(tempoCandidates);
    
    self.postMessage({
      success: true,
      result: {
        bpm: bestCandidate?.bpm ?? null,
        confidence: bestCandidate?.confidence ?? 0,
        firstBeatTimestamp: beatTimestamps[0] ?? null,
        tempoCandidates,
        rawBpm,
        beatTimestamps,
      }
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    try {
      const sig = signal as { delete?: () => void };
      if (sig && typeof sig.delete === "function") {
        sig.delete();
      }
      // essentia.delete(); // No delete method on the Essentia instance based on d.ts
    } catch (e) {
      console.error("Error during cleanup in worker:", e);
    }
  }
};
