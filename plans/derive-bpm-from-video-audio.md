# Derive BPM From Video/Audio

## Summary

Replace manual numeric BPM entry with on-device BPM detection when a video is added or changed. If detection is unavailable or low-confidence, provide a tap-tempo fallback instead of a BPM text field. The detected or tapped BPM remains the source for `countSeconds`, count jumps, eight-count jumps, and BPM display.

## Key Changes

- Add a local Expo native module, `DanceAudioAnalysis`, because the current Expo app only has playback APIs and no decoded audio sample access.
- Implement `estimateBpm(uri)`:
  - iOS: decode audio from the selected video with `AVAssetReader`.
  - Android: decode audio with `MediaExtractor`/`MediaCodec`.
  - Return a compact mono amplitude/onset envelope or final BPM result to JS.
- Use a deterministic BPM estimator:
  - Analyze up to the first useful 90 seconds of audio, skipping leading silence.
  - Detect onset peaks, score tempo candidates in a dance-practical range of `70-180 BPM`, and normalize half/double tempo into that range.
  - Return `{ bpm, confidence, source: "detected" | "tap", error? }`.
- Update `DanceVideo` data:
  - Keep `bpm: number | null`.
  - Keep `countSeconds: number | null`.
  - Add `bpmSource: "detected" | "tap" | "unavailable"`.
  - Add optional `bpmConfidence`.
- Update add/edit flows:
  - Remove the BPM text input from both modals.
  - After video selection, show detection state: analyzing, detected BPM, or unavailable.
  - Disable save only while analysis is actively running; allow save with unavailable BPM.
  - If unavailable, expose a tap-tempo control where repeated taps compute BPM and populate `bpmSource: "tap"`.
- Update playback UI:
  - Show `96 BPM`, `96 BPM - tapped`, or `BPM unavailable`.
  - Disable one-count and eight-count jump buttons when `countSeconds` is null.
  - Keep play, pause, mirror, speed, section looping, and metadata editing unchanged.

## Implementation Notes

- Recommendation (default path):
  - Prefer `expo-video-audio-extractor` to export an audio-only file from the selected video, then run BPM detection in JS using a pure TS analyzer (start with `music-tempo`).
  - Rationale: minimizes custom native code, avoids FFmpegKit/binary maintenance, and keeps the BPM iteration loop in JS.
  - Fallback if this proves too slow or unreliable across codecs/devices: keep the JS analyzer, but add a minimal native decoder that produces a downsampled mono envelope/onset signal (first ~60-90s) and pass that to JS for tempo scoring.

- Scaffold the local module with `create-expo-module` and strip generated view boilerplate; this app will require a dev build/prebuild after adding the module.
- Put JS-facing BPM orchestration in a small helper, for example `lib/bpm.ts`, so UI code only handles states and results.
- Avoid storing large PCM buffers in React state; native code should stream/decode and return only analysis results or a compact envelope.
- Optional simplification: use an off-the-shelf JS/TS BPM analyzer once native decoding is in place.
  - Candidate JS libs: `music-tempo`, `realtime-bpm-analyzer`. (Avoid `web-audio-beat-detector` unless we add a Web Audio environment; it assumes Web Audio types like `AudioBuffer`.)
  - Important: these libs do not solve "decoded audio sample access". We still need native code to decode the video's audio track to PCM (or to a compact envelope) before running a JS analyzer.
- Optional simplification: use an off-the-shelf video->audio extraction module, then decode the extracted audio to PCM for analysis.
  - Candidate: `expo-video-audio-extractor` (exports audio-only output using `AVAssetExportSession` on iOS and `MediaExtractor/MediaMuxer/MediaCodec` on Android; explicitly positioned as "no FFmpeg"). After export, run BPM analysis on the resulting audio file. (This still requires a dev build; Expo Go won't include the native code.)
  - FFmpeg note: `ffmpeg-kit-react-native` has been commonly used for this, but FFmpegKit has been retired and prebuilt binaries were removed from public repos; using it typically implies hosting/maintaining your own binaries and config plugin plumbing.
- For starter videos, keep their existing BPM values but mark them as `bpmSource: "detected"` so current demo behavior remains usable.

## Test Plan

- Typecheck with `npm run typecheck`.
- Lint with `npm run lint`.
- Add unit tests for pure JS BPM/tap helpers if a test runner is introduced; otherwise keep helpers deterministic and manually verify through the app.
- Manual scenarios:
  - Add a local video with clear music: BPM appears and count jumps work.
  - Add a video with silence or speech: BPM shows unavailable and count jumps are disabled.
  - Use tap tempo fallback: BPM appears as tapped and count jumps become enabled.
  - Edit a video URL/source: BPM detection reruns and replaces the previous derived value.
  - Confirm React and React DOM versions remain matched if dependencies change.

## Assumptions

- First implementation is on-device and offline.
- Numeric BPM entry is removed.
- Tap tempo is the only fallback for failed or uncertain detection.
- The native-module approach follows Expo Modules guidance; Expo's older `expo-av` APIs are deprecated in favor of newer audio/video packages, and Essentia's documented BPM extraction is a whole-track analysis model rather than real-time detection.
