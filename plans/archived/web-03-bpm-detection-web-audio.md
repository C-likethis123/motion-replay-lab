# Ticket: Web Audio and Essentia.js BPM Detection

> [!NOTE]
> The scope of this ticket is for the website app (i.e. the folder in `website`).

Goal:
- Implement client-side BPM detection for imported video files using browser-native Web Audio APIs and `essentia.js`.

Scope:
- Port the audio preprocessing logic from [bpm.ts](file:///Users/chowjiaying/dance/mobile/lib/bpm.ts) and [audio-timing.ts](file:///Users/chowjiaying/dance/mobile/lib/audio-timing.ts) to a web-compatible `website/src/lib/bpm.ts`:
  - Read the video `File` / `Blob` as an `ArrayBuffer`.
  - Instantiate an `OfflineAudioContext` or `AudioContext` and decode the audio track using `decodeAudioData()`. This extracts mono/stereo PCM channels regardless of video container (MP4, MOV, WebM).
  - Extract the primary channel: `audioBuffer.getChannelData(0)`.
  - Trim leading silence and downsample the audio to 44.1kHz (if needed) using the algorithms in [bpm.ts](file:///Users/chowjiaying/dance/mobile/lib/bpm.ts#L195-L251).
- Integrate `essentia.js` in the browser:
  - Load the WebAssembly binary (`essentia-wasm.wasm`) statically or via CDN.
  - Run `essentia.RhythmExtractor2013` on the downsampled samples to retrieve raw BPM, ticks (beat timestamps), and confidence level.
  - Apply the dance tempo preference scaling (preferred ~120 BPM) from [audio-timing.ts](file:///Users/chowjiaying/dance/mobile/lib/audio-timing.ts#L92-L103).
- Implement background analysis:
  - Run the heavy WASM processing asynchronously. Consider using a Web Worker to keep the UI responsive during calculations.
- Re-use the data mapping: return a `BpmEstimate` payload containing `{ bpm, confidence, source: "detected" | "unavailable", firstBeatTimestamp }`.

Definition of done:
- Importing a video file triggers automatic audio decoding.
- BPM and beat tick arrays are calculated client-side using Web Audio and `essentia.js`.
- The analyzer successfully handles typical dance tracks, filtering tempo candidates between 70-180 BPM.
- The UI remains completely responsive (no freezing or stuttering) during audio analysis.

Steps to verify:
1. Import a video with a known tempo (e.g. 120 BPM). Verify that the console logs trace the phases (extraction -> decoded -> rhythm analyzed).
2. Compare the output BPM and confidence with the mobile app's detection output on the same video file.
3. Import an silent/non-musical video and verify that it gracefully falls back to "unavailable" status with low confidence.
