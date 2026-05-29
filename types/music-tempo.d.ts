declare module "music-tempo" {
  type MusicTempoParams = {
    bufferSize?: number;
    decayRate?: number;
    expiryTime?: number;
    hopSize?: number;
    maxBeatInterval?: number;
    minBeatInterval?: number;
    timeStep?: number;
  };

  export default class MusicTempo {
    agents: Array<{ score: number }>;
    beatInterval: number;
    beats: number[];
    bestAgent?: { score: number };
    events: number[];
    spectralFlux: number[];
    tempo: number | string;
    tempoList: number[];

    constructor(audioData: Float32Array | number[], params?: MusicTempoParams);
  }
}
