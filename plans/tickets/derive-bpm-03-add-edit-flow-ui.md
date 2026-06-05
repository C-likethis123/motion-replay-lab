# Ticket: Derive BPM - Add/Edit Flow UI

> [!NOTE]
> The scope of this ticket is for the mobile app (i.e. the folder in 'mobile').

References:
- Plan: `plans/derive-bpm-from-video-audio.md`

Goal:
- Update add/edit flows to remove manual BPM entry and replace it with:
  - automatic detection state (analyzing, detected, unavailable)
  - tap-tempo fallback when detection is unavailable or low confidence

Scope:
- Remove the numeric BPM text input from add and edit modals.
- After video selection/change, run BPM detection and show UI states:
  - analyzing (in progress)
  - detected BPM (with optional confidence)
  - unavailable (and show tap-tempo control)
- Saving behavior:
  - Disable save only while analysis is actively running.
  - Allow saving even if BPM is unavailable (persist `bpmSource: "unavailable"` and `bpm: null`).
- Tap tempo:
  - Provide a simple control that computes BPM from repeated taps.
  - Persist result as `bpmSource: "tap"` and fill `bpm`.

Definition of done:
- No BPM text field exists in add/edit flows.
- The UI clearly reflects analysis state and never blocks saving except during active analysis.
- Tap tempo populates BPM and enables downstream count-jump functionality where applicable.

Steps to verify:
1. Open add video flow: confirm no BPM text input is present.
2. Select a music video: confirm "analyzing" appears, then a detected BPM appears.
3. Select a silence/speech video: confirm it ends in "unavailable" and tap tempo is offered.
4. Tap tempo at a steady pace: confirm BPM appears as tapped and is saved with the entry.
5. Edit an existing video and change its source: confirm analysis reruns and updates stored BPM fields.

