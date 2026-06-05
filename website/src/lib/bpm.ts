import type { AudioTimingCandidate } from "./bpm.worker";
import BpmWorker from "./bpm.worker?worker";

export type BpmEstimate = {
  bpm: number | null;
  confidence: number;
  source: "detected" | "unavailable";
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

function logBpmPhase(message: string, startedAt?: number) {
  const elapsed = startedAt ? ` +${Date.now() - startedAt}ms` : "";
  console.log(`[BPM] ${message}${elapsed}`);
}

function unavailable(error?: string): BpmEstimate {
  return { bpm: null, confidence: 0, source: "unavailable", error };
}

function windowRms(samples: Float32Array, start: number, end: number) {
  let sum = 0;
  for (let index = start; index < end; index += 1) {
    sum += samples[index] * samples[index];
  }
  return Math.sqrt(sum / Math.max(1, end - start));
}

function trimLeadingSilence(samples: Float32Array, sampleRate: number) {
  const windowSize = Math.max(512, Math.round(sampleRate * 0.1));
  let maxRms = 0;

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
  let firstAudibleWindow = 0;

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

type AnalysisSamples = {
  samples: Float32Array;
  sampleRate: number;
  timestampOffsetSeconds: number;
};

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

export async function estimateBpm(file: Blob | File): Promise<BpmEstimate> {
  const startedAt = Date.now();
  logBpmPhase("start");

  try {
    // Decode audio track using AudioContext
    const audioCtx = new AudioContext();
    
    logBpmPhase("reading file buffer");
    const arrayBuffer = await file.arrayBuffer();
    
    logBpmPhase("decoding audio data");
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    logBpmPhase(`audio decoded successfully. duration: ${audioBuffer.duration}s, channels: ${audioBuffer.numberOfChannels}, sampleRate: ${audioBuffer.sampleRate}`, startedAt);
    
    // Extract first channel PCM samples
    const fullSamples = audioBuffer.getChannelData(0);
    
    // We only analyze up to analysisSeconds
    const maxSamplesToCopy = Math.min(fullSamples.length, audioBuffer.sampleRate * analysisSeconds);
    const samples = fullSamples.slice(0, maxSamplesToCopy);
    
    logBpmPhase("trimming silence");
    const trimmed = trimLeadingSilence(samples, audioBuffer.sampleRate);
    
    logBpmPhase("downsampling and lowpassing");
    const analysis = prepareAnalysisSamples(trimmed.samples, audioBuffer.sampleRate);
    logBpmPhase(`samples ready (${Math.round(analysis.samples.length / analysis.sampleRate)}s)`, startedAt);

    if (!hasEnoughSignal(analysis.samples, analysis.sampleRate)) {
      logBpmPhase("insufficient signal", startedAt);
      return unavailable("No steady musical signal was found.");
    }

    logBpmPhase("selecting rhythmic window");
    const focusedAnalysis = selectRhythmicWindow({
      ...analysis,
      timestampOffsetSeconds: trimmed.offsetSeconds
    });

    logBpmPhase("submitting to worker for essentia rhythm analysis", startedAt);
    
    return new Promise((resolve) => {
      const worker = new BpmWorker();
      
      worker.onmessage = (event) => {
        const { success, result, error } = event.data;
        worker.terminate();
        
        if (success) {
          logBpmPhase(`tempo analysis finished. bpm: ${result.bpm}, confidence: ${result.confidence}`, startedAt);
          if (!result.bpm || result.confidence < minimumConfidence) {
            resolve(unavailable("Detected tempo confidence was too low."));
          } else {
            resolve({
              bpm: result.bpm,
              confidence: result.confidence,
              source: "detected",
              firstBeatTimestamp: result.firstBeatTimestamp,
              firstEightCountTimestamp: result.firstBeatTimestamp,
              tempoCandidates: result.tempoCandidates
            });
          }
        } else {
          logBpmPhase(`worker error: ${error}`, startedAt);
          resolve(unavailable(error));
        }
      };

      worker.postMessage({
        samples: focusedAnalysis.samples,
        minBpm: minDanceBpm,
        maxBpm: maxDanceBpm,
        timestampOffsetSeconds: focusedAnalysis.timestampOffsetSeconds
      });
    });

  } catch (error) {
    logBpmPhase(`bpm estimation failed: ${error}`);
    return unavailable(error instanceof Error ? error.message : String(error));
  }
}

// Keep timing helper mapping consistent with mobile
export function deriveBpmTiming(bpm: number | null) {
  if (!bpm) {
    return {
      bpm: null,
      countSeconds: null,
      firstBeatTimestamp: null,
      firstEightCountTimestamp: null,
      bpmSource: "unavailable" as const,
    };
  }

  return {
    bpm,
    countSeconds: 60 / bpm,
    firstBeatTimestamp: null,
    firstEightCountTimestamp: null,
    bpmSource: "tap" as const,
  };
}

export function deriveDetectedBpmTiming(estimate: BpmEstimate) {
  if (!estimate.bpm || estimate.source !== "detected") {
    return {
      bpm: null,
      countSeconds: null,
      firstBeatTimestamp: null,
      firstEightCountTimestamp: null,
      bpmSource: "unavailable" as const,
    };
  }

  return {
    bpm: estimate.bpm,
    countSeconds: 60 / estimate.bpm,
    firstBeatTimestamp: estimate.firstBeatTimestamp ?? null,
    firstEightCountTimestamp:
      estimate.firstEightCountTimestamp ?? estimate.firstBeatTimestamp ?? null,
    bpmSource: "detected" as const,
    bpmConfidence: estimate.confidence,
  };
}

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBpm(
  video: Pick<import("./videos").DanceVideo, "bpm" | "bpmSource" | "bpmDetectionStatus">,
) {
  if (video.bpmDetectionStatus === "detecting") {
    return "Analyzing BPM";
  }

  if (!video.bpm) {
    return "BPM unavailable";
  }
  return `${video.bpm} BPM${video.bpmSource === "tap" ? " - tapped" : ""}`;
}
