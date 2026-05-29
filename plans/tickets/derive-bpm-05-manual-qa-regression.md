# Ticket: Derive BPM - Manual QA / Regression

References:
- Plan: `plans/derive-bpm-from-video-audio.md`

Goal:
- Consolidate manual verification of end-to-end behavior and guard against regressions after wiring detection + UI.

Scope:
- Manual QA pass across:
  - add flow (detected / unavailable + tap)
  - edit flow (change source triggers re-analysis)
  - playback display and jump gating
  - app responsiveness during analysis
- Ensure starter videos keep existing BPM values but are marked as detected (per plan).

Definition of done:
- All manual scenarios in the plan's test section pass.
- No obvious UI glitches (stuck analyzing state, incorrect labels, save blocked indefinitely).
- Detection results are persisted and reloaded correctly across app restarts.

Steps to verify:
1. Run `npm run lint` and `npm run typecheck` and ensure both pass.
2. Add a local music video: confirm BPM detected, saved, and persists after app restart.
3. Add a silence/speech video: confirm "unavailable", save works, persists after app restart.
4. Use tap tempo on an unavailable entry: confirm it updates BPM, enables jumps, and persists after app restart.
5. Edit an entry and change the video: confirm re-analysis happens and replaces the prior derived fields.
6. Confirm starter videos still behave as before (BPM shown, jumps work).

