# Ticket: Full Screen Video View

Goal:
- Add a full-screen practice video view so dancers can focus on playback while retaining the core controls needed during rehearsal.

Scope:
- Add an affordance from the video practice screen to enter full-screen playback.
- Keep play/pause, count jumps, mirror, speed, and active loop behavior available in full-screen mode.
- Preserve the current embedded practice screen behavior.
- Ensure the full-screen view exits cleanly back to the practice screen without losing playback position or active loop state.

Definition of done:
- Users can enter and exit a full-screen video view from a practice video.
- Full-screen playback uses the same video source, timing, mirror state, playback speed, and loop state as the practice screen.
- Existing playback controls continue to work after entering and exiting full-screen mode.

Steps to verify:
1. Open a practice video and start playback.
2. Enter full-screen mode and confirm playback continues with the expected controls.
3. Toggle mirror, change speed, and use count jumps while full-screen.
4. Exit full-screen mode and confirm the practice screen preserves playback state.
