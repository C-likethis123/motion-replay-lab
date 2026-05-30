# Improving BPM Detection Accuracy Plan

## Research & Diagnosis (High Priority)
- [ ] **Establish Ground Truth:** Create a test dataset of 10-20 videos with known BPMs (manually verified).
- [ ] **Benchmark Current Implementation:** Run existing `estimateBpm` against the test dataset to establish a baseline success rate, confidence levels, and common failure modes (e.g., half-time, double-time, complete failure).
- [ ] **Analyze Audio Extraction Quality:** Verify the quality of audio extracted by `expo-video-audio-extractor` and the `trimLeadingSilence` logic.

## Technical Improvements
- [x] **Optimize Analysis Window:** Select the strongest rhythmic 30-second window from the extracted analysis samples instead of always trusting the beginning of the track.
- [x] **Improve Preprocessing:** Analyze at 22,050 Hz and apply a light low-pass filter before tempo detection to emphasize lower-frequency rhythmic content.
- [x] **Algorithm Evaluation:** Run `realtime-bpm-analyzer` and `music-tempo` on the same focused window, then choose/merge candidates instead of blindly accepting the first realtime result.
- [x] **Refine Confidence Scoring:** Boost confidence when analyzers agree within a small BPM tolerance and keep the stronger candidate when they disagree.

## Validation & Workflow
- [ ] **Implement Automated Regression Tests:** Integrate the test dataset into the CI/CD pipeline to ensure future changes do not degrade accuracy.
- [ ] **Add Manual Overrides/Feedback:** While improving detection, implement a robust UI for users to manually correct BPMs, which can then be used to improve the detection model over time (e.g., via "correction-aware" analysis).
