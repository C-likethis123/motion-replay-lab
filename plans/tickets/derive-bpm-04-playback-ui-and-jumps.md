# Ticket: Derive BPM - Playback UI And Jumps

References:
- Plan: `plans/derive-bpm-from-video-audio.md`

Goal:
- Make playback UI reflect BPM source and ensure count-jump controls behave correctly when timing is unknown.

Scope:
- Update playback UI to show one of:
  - "`{bpm} BPM`"
  - "`{bpm} BPM - tapped`"
  - "`BPM unavailable`"
- Ensure `countSeconds` is the single gate for enabling count jumps:
  - Disable one-count and eight-count jump buttons when `countSeconds` is `null`.
- Keep other playback features unchanged:
  - play/pause, mirror, speed, section looping, metadata editing.

Definition of done:
- Playback UI renders correct BPM label for all `bpmSource` states.
- Count jump controls are disabled (and do not attempt calculations) when `countSeconds` is `null`.
- No regressions to existing playback controls.

Steps to verify:
1. Open a video with detected BPM: confirm label shows "`NN BPM`" and jumps work.
2. Open a video with tapped BPM: confirm label shows "`NN BPM - tapped`" and jumps work.
3. Open a video with unavailable BPM: confirm label shows "`BPM unavailable`" and jump buttons are disabled.
4. Toggle mirror/speed/looping: confirm those controls still work in all three cases.

