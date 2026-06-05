# Ticket: Playlist Advanced Playback Controls

> [!NOTE]
> The scope of this ticket is for the mobile app (i.e. the folder in 'mobile').

Goal:
- Introduce intuitive, advanced controls to the video playback experience to allow for faster and more precise navigation during practice.

Scope:
- Implement a draggable knob or slider on the playlist/video player for precise timestamp scrubbing.
- Add long-press gestures on the sides of the video player for fast-forward and fast-backward functionality.
- Ensure these controls are integrated seamlessly into the existing player UI.

Definition of done:
- Users can drag the progress knob to scrub to a specific timestamp in the video.
- Users can long-press the left/right sides of the video container to rewind or fast-forward, respectively.
- These controls work reliably during both standard and full-screen playback.

Steps to verify:
1. Start video playback.
2. Drag the progress slider/knob to a new position; confirm the video jumps to that timestamp.
3. Long-press on the left side of the player; confirm it rewinds.
4. Long-press on the right side of the player; confirm it fast-forwards.
