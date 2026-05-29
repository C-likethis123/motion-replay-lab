# Improving BPM Detection Accuracy Plan

## Research & Diagnosis (High Priority)
- [ ] **Establish Ground Truth:** Create a test dataset of 10-20 videos with known BPMs (manually verified).
- [ ] **Benchmark Current Implementation:** Run existing `estimateBpm` against the test dataset to establish a baseline success rate, confidence levels, and common failure modes (e.g., half-time, double-time, complete failure).
- [ ] **Analyze Audio Extraction Quality:** Verify the quality of audio extracted by `expo-video-audio-extractor` and the `trimLeadingSilence` logic.

## Technical Improvements
- [ ] **Optimize Analysis Window:** Investigate if dynamic windowing (e.g., skip intro, analyze middle of song) improves stability.
- [ ] **Improve Preprocessing:** Experiment with higher sample rates (e.g., 22,050 Hz or 44,100 Hz) if performance allows, and apply basic frequency filtering (e.g., low-pass) to focus on the rhythmic content (kick drum).
- [ ] **Algorithm Evaluation:** Compare `music-tempo` with modern, possibly native or WASM-based alternatives for better accuracy.
- [ ] **Refine Confidence Scoring:** Adjust `estimateConfidence` to better reward consistent rhythmic patterns and handle common BPM doubling/halving issues gracefully.

## Validation & Workflow
- [ ] **Implement Automated Regression Tests:** Integrate the test dataset into the CI/CD pipeline to ensure future changes do not degrade accuracy.
- [ ] **Add Manual Overrides/Feedback:** While improving detection, implement a robust UI for users to manually correct BPMs, which can then be used to improve the detection model over time (e.g., via "correction-aware" analysis).
