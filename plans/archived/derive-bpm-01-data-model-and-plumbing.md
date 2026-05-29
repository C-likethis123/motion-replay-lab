# Ticket: Derive BPM - Data Model And Plumbing

References:
- Plan: `plans/derive-bpm-from-video-audio.md`

Goal:
- Introduce the data fields and JS plumbing needed to store/display BPM source and computed timing, without yet implementing audio analysis.

Scope:
- Update the `DanceVideo` model to support:
  - `bpm: number | null`
  - `countSeconds: number | null`
  - `bpmSource: "detected" | "tap" | "unavailable"`
  - optional `bpmConfidence?: number`
- Ensure all reads/writes/serialization paths tolerate `null` and unknown videos without crashes.
- Ensure anything that depends on `countSeconds` is guarded when it is `null`.

Definition of done:
- App compiles and runs with the new `DanceVideo` fields present.
- Existing starter/demo videos still display a BPM and count-jump behavior remains unchanged.
- No runtime errors when `bpm`/`countSeconds` are `null`.

Steps to verify:
1. Launch the app; confirm starter videos load and play.
2. Confirm any UI that shows BPM still renders (even if it is the existing hardcoded/stored BPM).
3. Create or edit a video entry so that `bpm`/`countSeconds` are `null` (or simulate by temporarily setting them to `null` in storage/seed data).
4. Verify playback still works and the app does not crash; count-jump controls should be disabled or no-op when `countSeconds` is `null`.

