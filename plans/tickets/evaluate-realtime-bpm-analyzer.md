# Ticket: Evaluate and Migrate to `realtime-bpm-analyzer`

> [!NOTE]
> The scope of this ticket is for the mobile app (i.e. the folder in 'mobile').

## Context
Our current BPM detection relies on the `music-tempo` library. To improve detection accuracy, we researched modern alternatives.

## Key Findings
1.  **`realtime-bpm-analyzer`**: This is a robust, well-maintained, zero-dependency library that is widely considered the modern standard for musical BPM detection.
2.  **Implementation Paths**:
    *   **Option A: Native High Performance (`react-native-audio-api`)**: By using Software Mansion's `react-native-audio-api` (which provides a full Web Audio API implementation), you can use `realtime-bpm-analyzer` natively with excellent performance and accuracy. This requires a Development Build (it will not work in the standard Expo Go app).
    *   **Option B: Rapid Implementation (`expo-dom`)**: You can run the analyzer inside an Expo DOM component. This avoids complex native setup by running your audio logic in a high-performance, browser-native webview context.

## Recommendation
For a production app requiring high precision, **Option A (`react-native-audio-api`)** is the superior choice due to its lower latency and tighter integration with the native audio stack.

## Action Items
- [x] Choose implementation path (Option A recommended).
- [x] Prototype integration with `realtime-bpm-analyzer`.
- [ ] Benchmark accuracy against the established ground truth dataset.
- [ ] Replace `music-tempo` if accuracy improvements are confirmed.

## Progress
- Chosen path: Option A, using `react-native-audio-api` to provide the Web Audio primitives required by `realtime-bpm-analyzer`.
- Prototype: `estimateBpm` now keeps the existing video-to-WAV extraction and signal validation, then tries `realtime-bpm-analyzer`'s offline `analyzeFullBuffer` path first.
- Risk control: `music-tempo` remains as a fallback until a ground-truth benchmark confirms the new analyzer is more accurate on target dance videos.
