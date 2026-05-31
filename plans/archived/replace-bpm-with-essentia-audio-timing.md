# Ticket: Replace BPM detection with Essentia audio timing

## Context
The current BPM pipeline in `lib/bpm.ts` combines `realtime-bpm-analyzer` and `music-tempo` over audio extracted from video. This estimates a music BPM, but choreography practice needs a more reliable audio-only timing model that can provide beat positions, confidence, and candidate half/double tempo interpretations.

Research recommendation:
- Use **Essentia.js / Essentia WASM** as the production detector.
- Use **madmom** offline as the benchmark reference for beat/downbeat quality.
- Use **librosa** offline as a simple baseline and debugging comparison.

Do not use motion-only tracking or audio-motion fusion for this ticket.

## Goals
- Replace the production BPM implementation with Essentia-based audio-only rhythm extraction.
- Produce beat timestamps, BPM, confidence, and tempo candidates from extracted audio.
- Preserve the existing tap-tempo and manual count-1 correction fallbacks.
- Keep playback count jumps driven by choreography timing fields, not raw music BPM assumptions.

## Scope
- Add Essentia.js / WASM integration for rhythm extraction.
- Update `lib/bpm.ts` so `estimateBpm` uses Essentia rhythm extraction as the primary detector.
- Return and persist:
  - `bpm`
  - `countSeconds`
  - `firstBeatTimestamp`
  - `firstEightCountTimestamp`
  - confidence
  - detection error when unavailable
- Generate dance-practical tempo candidates from the detected BPM:
  - half-time
  - detected tempo
  - double-time
- Choose the final count tempo using the app's dance BPM range and confidence scoring.
- Keep manual tap BPM and "set current time as count 1" correction behavior working.
- Remove or isolate the old `music-tempo` / `realtime-bpm-analyzer` path after Essentia is verified.

## Out of Scope
- Pose detection.
- Motion-only choreography timing.
- Audio-motion fusion.
- Cloud song recognition or BPM metadata lookup.
- Fully automatic semantic choreography phrase detection beyond audio beat/downbeat heuristics.

## Research Notes
- `librosa.beat.beat_track` is useful as an offline baseline because it returns tempo and beat positions from onset strength plus dynamic-programming beat tracking.
- `madmom` is useful as an offline benchmark because it includes beat, downbeat, and meter tracking, but it is not a good direct mobile dependency.
- Essentia.js is the best production candidate because it has a JavaScript/WASM path and rhythm extraction APIs that return BPM, beat/tick positions, confidence, estimates, and intervals.

## Implementation Plan
- [ ] Add Essentia.js dependency and confirm it works in the app runtime or an Expo-compatible WebAssembly execution path.
- [ ] Build a small wrapper module, for example `lib/audio-timing.ts`, that accepts mono PCM samples and returns a normalized timing result.
- [ ] Feed the existing extracted WAV samples into Essentia rhythm extraction.
- [ ] Map Essentia beat/tick positions to `firstBeatTimestamp`.
- [ ] Initialize `firstEightCountTimestamp` from the strongest available audio alignment, then rely on manual correction when needed.
- [ ] Generate half/detected/double tempo candidates and normalize them into the dance-practical range.
- [ ] Replace the existing `detectTempo` implementation in `lib/bpm.ts`.
- [ ] Keep existing unavailable/low-confidence handling.
- [ ] Update package dependencies and remove legacy packages once verified.
- [ ] Update or add tickets for cleanup if removal is split from the detector replacement.

## Benchmark Plan
- [ ] Create a small ground-truth dataset of dance videos with manually verified:
  - count BPM
  - first beat timestamp
  - first count-1 timestamp
  - expected half/double interpretation
- [ ] Run current implementation, Essentia, librosa, and madmom against the same audio samples.
- [ ] Compare:
  - BPM error
  - beat-grid drift
  - count-1 alignment error
  - unavailable/low-confidence rate
  - runtime on device
- [ ] Use madmom results as a reference, not as production app code.

## Definition of Done
- Essentia is the primary production rhythm detector.
- BPM detection still works from newly added videos.
- Count and 8-count jumps use the stored timing fields and remain disabled when timing is unavailable.
- Manual tap BPM still updates `countSeconds`.
- Manual count-1 correction still persists and affects snapped jumps.
- Legacy detector packages are removed or documented as temporary fallback.
- `npm run typecheck` passes.
- `npm run lint` passes.

## Steps to Verify
1. Add a local music video with a clear beat and confirm BPM/timing is detected.
2. Confirm one-count and eight-count jumps snap consistently to the beat grid.
3. Mark the current time as count 1 and confirm subsequent 8-count jumps align from that point.
4. Add a video with silence or speech and confirm timing is unavailable and count jumps are disabled.
5. Tap a manual BPM and confirm count jumps become available.
6. Run `npm run typecheck`.
7. Run `npm run lint`.
