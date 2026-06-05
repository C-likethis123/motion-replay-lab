import { Essentia, EssentiaWASM } from "essentia.js";

export type AudioTimingCandidate = {
  label: "half-time" | "detected" | "double-time";
  bpm: number;
  confidence: number;
};

export type AudioTimingResult = {
  bpm: number | null;
  confidence: number;
  firstBeatTimestamp: number | null;
  tempoCandidates: AudioTimingCandidate[];
  rawBpm: number | null;
  beatTimestamps: number[];
};

type ExtractAudioTimingOptions = {
  minBpm: number;
  maxBpm: number;
  timestampOffsetSeconds?: number;
};

export function extractAudioTiming(
  samples: Float32Array,
  options: ExtractAudioTimingOptions,
): AudioTimingResult {
  const essentia = new Essentia(EssentiaWASM);
  const signal = essentia.arrayToVector(samples);

  try {
    const rhythm = essentia.RhythmExtractor2013(
      signal,
      options.maxBpm,
      "multifeature",
      Math.max(40, Math.floor(options.minBpm / 2)),
    );
    const rawBpm = toPositiveNumber(rhythm.bpm);
    const beatTimestamps = vectorToNumberArray(essentia, rhythm.ticks).map(
      (timestamp) => timestamp + (options.timestampOffsetSeconds ?? 0),
    );
    const confidence = normalizeConfidence(rhythm.confidence, beatTimestamps);
    const tempoCandidates = buildTempoCandidates(
      rawBpm,
      confidence,
      options.minBpm,
      options.maxBpm,
    );
    const bestCandidate = chooseDanceTempoCandidate(tempoCandidates);

    return {
      bpm: bestCandidate?.bpm ?? null,
      confidence: bestCandidate?.confidence ?? 0,
      firstBeatTimestamp: beatTimestamps[0] ?? null,
      tempoCandidates,
      rawBpm,
      beatTimestamps,
    };
  } finally {
    deleteVector(signal);
    essentia.delete();
  }
}

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

  return Array.from(essentia.vectorToArray(vector)).filter(Number.isFinite);
}

function toPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function deleteVector(vector: unknown) {
  if (
    vector &&
    typeof vector === "object" &&
    "delete" in vector &&
    typeof vector.delete === "function"
  ) {
    vector.delete();
  }
}
