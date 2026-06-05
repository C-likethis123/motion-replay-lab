declare module "essentia.js" {
  export const EssentiaWASM: unknown;
  export class Essentia {
    constructor(EssentiaWASM: unknown, isDebug?: boolean);
    arrayToVector(inputArray: Float32Array): unknown;
    vectorToArray(inputVector: unknown): Float32Array;
    RhythmExtractor2013(
      signal: unknown,
      maxTempo?: number,
      method?: string,
      minTempo?: number,
    ): {
      bpm?: number;
      ticks?: unknown;
      confidence?: number;
      estimates?: unknown;
      bpmIntervals?: unknown;
    };
    delete(): void;
  }
}
