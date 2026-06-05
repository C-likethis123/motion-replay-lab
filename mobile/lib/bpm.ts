import type { BpmSource, DanceVideo } from "@/lib/videos";
import type { AudioTimingCandidate } from "@/lib/audio-timing";
import { File, Paths } from "expo-file-system";
import { toNativeFilePath } from "../utils/path";
export type BpmTiming = {
  bpm: number | null;
  countSeconds: number | null;
  firstBeatTimestamp: number | null;
  firstEightCountTimestamp: number | null;
  bpmSource: BpmSource;
  bpmConfidence?: number;
};

export type BpmEstimate = {
  bpm: number | null;
  confidence: number;
  source: Extract<BpmSource, "detected" | "unavailable">;
  error?: string;
  firstBeatTimestamp?: number | null;
  firstEightCountTimestamp?: number | null;
  tempoCandidates?: AudioTimingCandidate[];
};

const minDanceBpm = 70;
const maxDanceBpm = 180;
const analysisSeconds = 75;
const rhythmicWindowSeconds = 30;
const targetSampleRate = 44_100;
const minimumConfidence = 0.35;

import { parseNumberInput as _parseNumberInput } from "../utils/input";
export const parseNumberInput = _parseNumberInput;

export function deriveBpmTiming(bpm: number | null): BpmTiming {
  if (!bpm) {
    return {
      bpm: null,
      countSeconds: null,
      firstBeatTimestamp: null,
      firstEightCountTimestamp: null,
      bpmSource: "unavailable",
    };
  }

  return {
    bpm,
    countSeconds: 60 / bpm,
    firstBeatTimestamp: null,
    firstEightCountTimestamp: null,
    bpmSource: "tap",
  };
}

export function deriveDetectedBpmTiming(estimate: BpmEstimate): BpmTiming {
  if (!estimate.bpm || estimate.source !== "detected") {
    return {
      bpm: null,
      countSeconds: null,
      firstBeatTimestamp: null,
      firstEightCountTimestamp: null,
      bpmSource: "unavailable",
    };
  }

  return {
    bpm: estimate.bpm,
    countSeconds: 60 / estimate.bpm,
    firstBeatTimestamp: estimate.firstBeatTimestamp ?? null,
    firstEightCountTimestamp:
      estimate.firstEightCountTimestamp ?? estimate.firstBeatTimestamp ?? null,
    bpmSource: "detected",
    bpmConfidence: estimate.confidence,
  };
}

export function formatBpm(
  video: Pick<DanceVideo, "bpm" | "bpmSource" | "bpmDetectionStatus">,
) {
  if (video.bpmDetectionStatus === "detecting") {
    return "Analyzing BPM";
  }

  if (!video.bpm) {
    return "BPM unavailable";
  }
  return `${video.bpm} BPM${video.bpmSource === "tap" ? " - tapped" : ""}`;
}

export async function estimateBpm(uri: string): Promise<BpmEstimate> {
  const outputFile = makeCacheFile(`bpm-analysis-${Date.now()}.wav`);
  const startedAt = Date.now();

  if (!outputFile) {
    return unavailable("Audio cache is unavailable.");
  }

  try {
    logBpmPhase("start");
    const { extractAudio } = await import("expo-video-audio-extractor");

    await extractAudio({
      video: toNativeFilePath(uri),
      output: toNativeFilePath(outputFile.uri),
      format: "wav",
      start: 0,
      duration: analysisSeconds,
      channels: 1,
      sampleRate: targetSampleRate,
    });
    logBpmPhase("audio extracted", startedAt);

    const analysis = await readAnalysisSamples(outputFile);
    logBpmPhase(
      `samples ready (${Math.round(analysis.samples.length / analysis.sampleRate)}s)`,
      startedAt,
    );

    if (!hasEnoughSignal(analysis.samples, analysis.sampleRate)) {
      logBpmPhase("insufficient signal", startedAt);
      return unavailable("No steady musical signal was found.");
    }

    const detected = await detectTempo(analysis);
    logBpmPhase(
      `tempo result (${detected.bpm ?? "none"}, confidence ${detected.confidence})`,
      startedAt,
    );

    if (!detected.bpm || detected.confidence < minimumConfidence) {
      return unavailable("Detected tempo confidence was too low.");
    }

    return { ...detected, source: "detected" };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : String(error));
  } finally {
    try {
      outputFile.delete();
    } catch {}
  }
}

function logBpmPhase(message: string, startedAt?: number) {
  if (!__DEV__) {
    return;
  }

  const elapsed = startedAt ? ` +${Date.now() - startedAt}ms` : "";
  console.log(`[BPM] ${message}${elapsed}`);
}

function makeCacheFile(fileName: string) {
  if (!Paths.cache.uri) {
    return null;
  }

  return new File(Paths.cache, fileName);
}

type AnalysisSamples = {
  samples: Float32Array;
  sampleRate: number;
  timestampOffsetSeconds: number;
};

async function readAnalysisSamples(outputFile: File): Promise<AnalysisSamples> {
  const wav = decodeWav(await outputFile.bytes());
  const trimmed = trimLeadingSilence(wav.samples, wav.sampleRate);
  const analysis = prepareAnalysisSamples(trimmed.samples, wav.sampleRate);

  return {
    ...analysis,
    timestampOffsetSeconds: trimmed.offsetSeconds,
  };
}

async function detectTempo(analysis: AnalysisSamples) {
  const { extractAudioTiming } = await import("@/lib/audio-timing");
  const focusedAnalysis = selectRhythmicWindow(analysis);
  const timing = extractAudioTiming(focusedAnalysis.samples, {
    minBpm: minDanceBpm,
    maxBpm: maxDanceBpm,
    timestampOffsetSeconds: focusedAnalysis.timestampOffsetSeconds,
  });

  return {
    bpm: timing.bpm,
    confidence: timing.confidence,
    firstBeatTimestamp: timing.firstBeatTimestamp,
    firstEightCountTimestamp: timing.firstBeatTimestamp,
    tempoCandidates: timing.tempoCandidates,
  };
}

function trimLeadingSilence(samples: Float32Array, sampleRate: number) {
  const windowSize = Math.max(512, Math.round(sampleRate * 0.1));
  let maxRms = 0;
  let firstAudibleWindow = 0;

  for (let start = 0; start < samples.length; start += windowSize) {
    const rms = windowRms(
      samples,
      start,
      Math.min(samples.length, start + windowSize),
    );
    maxRms = Math.max(maxRms, rms);
  }

  if (maxRms < 0.01) {
    return { samples: new Float32Array(), offsetSeconds: 0 };
  }

  const threshold = Math.max(0.01, maxRms * 0.15);

  for (let start = 0; start < samples.length; start += windowSize) {
    const rms = windowRms(
      samples,
      start,
      Math.min(samples.length, start + windowSize),
    );

    if (rms >= threshold) {
      firstAudibleWindow = Math.max(0, start - sampleRate);
      break;
    }
  }

  return {
    samples: samples.subarray(firstAudibleWindow),
    offsetSeconds: firstAudibleWindow / sampleRate,
  };
}

function prepareAnalysisSamples(samples: Float32Array, sampleRate: number) {
  const filteredSamples = lowPassSamples(samples, sampleRate, 180);

  if (sampleRate <= targetSampleRate) {
    return { samples: filteredSamples, sampleRate };
  }

  const ratio = sampleRate / targetSampleRate;
  const downsampled = new Float32Array(
    Math.floor(filteredSamples.length / ratio),
  );

  for (let index = 0; index < downsampled.length; index += 1) {
    downsampled[index] = filteredSamples[Math.floor(index * ratio)];
  }

  return { samples: downsampled, sampleRate: targetSampleRate };
}

function lowPassSamples(
  samples: Float32Array,
  sampleRate: number,
  cutoffHz: number,
) {
  if (samples.length === 0) {
    return samples;
  }

  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  const filtered = new Float32Array(samples.length);
  filtered[0] = samples[0];

  for (let index = 1; index < samples.length; index += 1) {
    filtered[index] =
      filtered[index - 1] + alpha * (samples[index] - filtered[index - 1]);
  }

  return filtered;
}

function selectRhythmicWindow({
  samples,
  sampleRate,
  timestampOffsetSeconds,
}: AnalysisSamples): AnalysisSamples {
  const windowLength = sampleRate * rhythmicWindowSeconds;

  if (samples.length <= windowLength) {
    return { samples, sampleRate, timestampOffsetSeconds };
  }

  const step = Math.max(sampleRate * 5, Math.round(windowLength / 4));
  let bestStart = 0;
  let bestScore = -Infinity;

  for (let start = 0; start + windowLength <= samples.length; start += step) {
    const end = start + windowLength;
    const score = rhythmicWindowScore(samples, start, end);

    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }

  return {
    samples: samples.subarray(bestStart, bestStart + windowLength),
    sampleRate,
    timestampOffsetSeconds: timestampOffsetSeconds + bestStart / sampleRate,
  };
}

function rhythmicWindowScore(
  samples: Float32Array,
  start: number,
  end: number,
) {
  let energy = 0;
  let flux = 0;
  let previous = Math.abs(samples[start] ?? 0);

  for (let index = start; index < end; index += 1) {
    const value = Math.abs(samples[index]);
    energy += value * value;
    flux += Math.max(0, value - previous);
    previous = value;
  }

  return energy + flux * 12;
}

function windowRms(samples: Float32Array, start: number, end: number) {
  let sum = 0;

  for (let index = start; index < end; index += 1) {
    sum += samples[index] * samples[index];
  }

  return Math.sqrt(sum / Math.max(1, end - start));
}

function hasEnoughSignal(samples: Float32Array, sampleRate: number) {
  if (samples.length < sampleRate * 5) {
    return false;
  }

  let peak = 0;
  let sum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.abs(samples[index]);
    peak = Math.max(peak, value);
    sum += value;
  }

  return peak >= 0.04 && sum / samples.length >= 0.004;
}

function decodeWav(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("Extracted audio was not a WAV file.");
  }

  let offset = 12;
  let format: WavFormat | null = null;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      format = {
        audioFormat: view.getUint16(chunkStart, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true),
      };
    } else if (chunkId === "data") {
      dataOffset = chunkStart;
      dataLength = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!format || dataOffset < 0 || dataLength <= 0) {
    throw new Error("Extracted WAV file is missing audio data.");
  }

  return {
    sampleRate: format.sampleRate,
    samples: decodeWavSamples(view, dataOffset, dataLength, format),
  };
}

type WavFormat = {
  audioFormat: number;
  bitsPerSample: number;
  channels: number;
  sampleRate: number;
};

function decodeWavSamples(
  view: DataView,
  dataOffset: number,
  dataLength: number,
  format: WavFormat,
) {
  const bytesPerSample = format.bitsPerSample / 8;
  const frameSize = bytesPerSample * format.channels;
  const frameCount = Math.floor(dataLength / frameSize);
  const samples = new Float32Array(frameCount);

  if (format.audioFormat !== 1 && format.audioFormat !== 3) {
    throw new Error(`Unsupported WAV audio format ${format.audioFormat}.`);
  }

  for (let frame = 0; frame < frameCount; frame += 1) {
    let sum = 0;

    for (let channel = 0; channel < format.channels; channel += 1) {
      const sampleOffset =
        dataOffset + frame * frameSize + channel * bytesPerSample;
      sum += readPcmSample(view, sampleOffset, format);
    }

    samples[frame] = sum / format.channels;
  }

  return samples;
}

function readPcmSample(view: DataView, offset: number, format: WavFormat) {
  if (format.audioFormat === 3 && format.bitsPerSample === 32) {
    return view.getFloat32(offset, true);
  }

  switch (format.bitsPerSample) {
    case 8:
      return (view.getUint8(offset) - 128) / 128;
    case 16:
      return view.getInt16(offset, true) / 32768;
    case 24: {
      const value =
        view.getUint8(offset) |
        (view.getUint8(offset + 1) << 8) |
        (view.getUint8(offset + 2) << 16);
      const signed = value & 0x800000 ? value | 0xff000000 : value;
      return signed / 8388608;
    }
    case 32:
      return view.getInt32(offset, true) / 2147483648;
    default:
      throw new Error(`Unsupported WAV bit depth ${format.bitsPerSample}.`);
  }
}

function readAscii(view: DataView, offset: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
}

function unavailable(error?: string): BpmEstimate {
  return { bpm: null, confidence: 0, source: "unavailable", error };
}
