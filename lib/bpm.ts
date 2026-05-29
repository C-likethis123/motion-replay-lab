import type { BpmSource, DanceVideo } from "@/lib/videos";
import * as FileSystem from "expo-file-system/legacy";
import MusicTempo from "music-tempo";

export type BpmTiming = {
  bpm: number | null;
  countSeconds: number | null;
  bpmSource: BpmSource;
  bpmConfidence?: number;
};

export type BpmEstimate = {
  bpm: number | null;
  confidence: number;
  source: Extract<BpmSource, "detected" | "unavailable">;
  error?: string;
};

const minDanceBpm = 70;
const maxDanceBpm = 180;
const analysisSeconds = 75;
const targetSampleRate = 16_000;
const minimumConfidence = 0.35;

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

export function deriveDetectedBpmTiming(estimate: BpmEstimate): BpmTiming {
  if (!estimate.bpm || estimate.source !== "detected") {
    return { bpm: null, countSeconds: null, bpmSource: "unavailable" };
  }

  return {
    bpm: estimate.bpm,
    countSeconds: 60 / estimate.bpm,
    bpmSource: "detected",
    bpmConfidence: estimate.confidence,
  };
}

export function formatBpm(video: Pick<DanceVideo, "bpm" | "bpmSource">) {
  if (!video.bpm) {
    return "BPM unavailable";
  }

  return `${video.bpm} BPM${video.bpmSource === "tap" ? " - tapped" : ""}`;
}

export async function estimateBpm(uri: string): Promise<BpmEstimate> {
  const outputUri = `${FileSystem.cacheDirectory ?? ""}bpm-analysis-${Date.now()}.wav`;

  if (!FileSystem.cacheDirectory) {
    return unavailable("Audio cache is unavailable.");
  }

  try {
    const { extractAudio } = await import("expo-video-audio-extractor");

    await extractAudio({
      video: toNativeFilePath(uri),
      output: toNativeFilePath(outputUri),
      format: "wav",
      start: 0,
      duration: analysisSeconds,
      channels: 1,
      sampleRate: targetSampleRate,
    });

    const analysis = await readAnalysisSamples(outputUri);

    if (!hasEnoughSignal(analysis.samples, analysis.sampleRate)) {
      return unavailable("No steady musical signal was found.");
    }

    const detected = detectTempo(analysis);

    if (!detected.bpm || detected.confidence < minimumConfidence) {
      return unavailable("Detected tempo confidence was too low.");
    }

    return { ...detected, source: "detected" };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : String(error));
  } finally {
    await FileSystem.deleteAsync(outputUri, { idempotent: true }).catch(() => {});
  }
}

type AnalysisSamples = {
  samples: Float32Array;
  sampleRate: number;
};

type TempoResult = {
  beats?: number[];
  events?: number[];
  bestAgent?: { score?: number };
};

async function readAnalysisSamples(outputUri: string): Promise<AnalysisSamples> {
  const base64 = await FileSystem.readAsStringAsync(outputUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wav = decodeWav(base64ToBytes(base64));
  const trimmedSamples = trimLeadingSilence(wav.samples, wav.sampleRate);

  return prepareAnalysisSamples(trimmedSamples, wav.sampleRate);
}

function detectTempo({ samples, sampleRate }: AnalysisSamples) {
  const hopSize = Math.max(1, Math.round(sampleRate / 100));
  const tempo = new MusicTempo(samples, {
    bufferSize: 2048,
    expiryTime: 20,
    hopSize,
    maxBeatInterval: 60 / minDanceBpm,
    minBeatInterval: 60 / maxDanceBpm,
    timeStep: hopSize / sampleRate,
  });

  return {
    bpm: normalizeDanceBpm(Number(tempo.tempo)),
    confidence: estimateConfidence(tempo, samples.length / sampleRate),
  };
}

function normalizeDanceBpm(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  let bpm = value;

  while (bpm < minDanceBpm) {
    bpm *= 2;
  }

  while (bpm > maxDanceBpm) {
    bpm /= 2;
  }

  return bpm >= minDanceBpm && bpm <= maxDanceBpm ? Math.round(bpm) : null;
}

function estimateConfidence(tempo: TempoResult, durationSeconds: number) {
  const beats = tempo.beats?.length ?? 0;
  const events = tempo.events?.length ?? 0;
  const agentScore = tempo.bestAgent?.score ?? 0;
  const beatDensity = durationSeconds > 0 ? beats / durationSeconds : 0;
  const beatScore = Math.min(1, beats / 16);
  const densityScore = Math.min(1, beatDensity / 1.1);
  const onsetScore = Math.min(1, events / 30);
  const agentScoreNormalized = Math.min(1, agentScore / Math.max(1, beats * 12));

  return roundConfidence(
    beatScore * 0.35 +
      densityScore * 0.25 +
      onsetScore * 0.2 +
      agentScoreNormalized * 0.2,
  );
}

function roundConfidence(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function trimLeadingSilence(samples: Float32Array, sampleRate: number) {
  const windowSize = Math.max(512, Math.round(sampleRate * 0.1));
  let maxRms = 0;
  let firstAudibleWindow = 0;

  for (let start = 0; start < samples.length; start += windowSize) {
    const rms = windowRms(samples, start, Math.min(samples.length, start + windowSize));
    maxRms = Math.max(maxRms, rms);
  }

  if (maxRms < 0.01) {
    return new Float32Array();
  }

  const threshold = Math.max(0.01, maxRms * 0.15);

  for (let start = 0; start < samples.length; start += windowSize) {
    const rms = windowRms(samples, start, Math.min(samples.length, start + windowSize));

    if (rms >= threshold) {
      firstAudibleWindow = Math.max(0, start - sampleRate);
      break;
    }
  }

  return samples.subarray(firstAudibleWindow);
}

function prepareAnalysisSamples(samples: Float32Array, sampleRate: number) {
  if (sampleRate <= targetSampleRate) {
    return { samples, sampleRate };
  }

  const ratio = sampleRate / targetSampleRate;
  const downsampled = new Float32Array(Math.floor(samples.length / ratio));

  for (let index = 0; index < downsampled.length; index += 1) {
    downsampled[index] = samples[Math.floor(index * ratio)];
  }

  return { samples: downsampled, sampleRate: targetSampleRate };
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
      const sampleOffset = dataOffset + frame * frameSize + channel * bytesPerSample;
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

function base64ToBytes(base64: string) {
  const cleaned = base64.replace(/[\r\n\s]/g, "");
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((cleaned.length * 3) / 4 - padding);
  let byteIndex = 0;

  for (let index = 0; index < cleaned.length; index += 4) {
    const chunk =
      (base64Value(cleaned.charCodeAt(index)) << 18) |
      (base64Value(cleaned.charCodeAt(index + 1)) << 12) |
      (base64Value(cleaned.charCodeAt(index + 2)) << 6) |
      base64Value(cleaned.charCodeAt(index + 3));

    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = chunk & 0xff;
  }

  return bytes;
}

function base64Value(code: number) {
  if (code >= 65 && code <= 90) return code - 65;
  if (code >= 97 && code <= 122) return code - 71;
  if (code >= 48 && code <= 57) return code + 4;
  if (code === 43) return 62;
  if (code === 47) return 63;
  return 0;
}

function readAscii(view: DataView, offset: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }

  return value;
}

function toNativeFilePath(uri: string) {
  return uri.startsWith("file://") ? decodeURI(uri.slice("file://".length)) : uri;
}

function unavailable(error?: string): BpmEstimate {
  return { bpm: null, confidence: 0, source: "unavailable", error };
}
