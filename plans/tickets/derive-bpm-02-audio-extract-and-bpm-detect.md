# Ticket: Derive BPM - Audio Extract And BPM Detect

References:
- Plan: `plans/derive-bpm-from-video-audio.md`

Goal:
- Implement the default BPM detection pipeline:
  1) export/extract audio from a selected video
  2) decode enough samples for analysis
  3) estimate BPM with a JS/TS analyzer

Recommendation (from plan):
- Prefer `expo-video-audio-extractor` to export an audio-only file, then run BPM detection in JS (start with `music-tempo`).
- Keep a clear seam for a fallback "native envelope decoder" if extraction/decoding proves unreliable or too slow.

Scope:
- Add and wire dependencies for:
  - video->audio export (`expo-video-audio-extractor`), which implies a dev build/prebuild (not Expo Go).
  - a JS BPM analyzer (start with `music-tempo`).
- Implement `estimateBpm(uri)` in JS that:
  - exports audio from the video (temporary file)
  - decodes a bounded duration (target: first ~60-90 seconds, skipping leading silence if easy)
  - runs tempo estimation and produces `{ bpm, confidence, source: "detected", error? }`
  - normalizes half/double tempo into `70-180 BPM`
- Ensure the implementation avoids pushing large PCM buffers into React state.

Definition of done:
- On a dev build, selecting a local video with clear music results in a detected BPM within a reasonable tolerance.
- For silence/speech-only videos, detection returns `unavailable` (or low confidence) without crashes.
- Detection completes in a user-acceptable time (target: a few seconds on a modern device for 60-90s of audio).

Steps to verify:
1. Create a dev build and run on a physical device/simulator.
2. Add a local video with a steady beat; confirm BPM is detected and displayed.
3. Add a local video with silence/speech; confirm detection yields "unavailable" or low confidence and UI stays responsive.
4. Try a very long video; confirm analysis caps at the configured max duration.
5. Repeat the same video selection twice; confirm results are deterministic (same BPM or within tight tolerance).

