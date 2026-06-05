# Ticket: Practice Mode, Looping, and Beat Calibration

> [!NOTE]
> The scope of this ticket is for the website app (i.e. the folder in `website`).

Goal:
- Implement the practice page (`/practice/:id`), section-based loop controls, tap-to-BPM manual inputs, and count-one beat calibration.

Scope:
- Build the Practice page route (`/practice/:id`) styled matching [practice/[id].tsx](file:///Users/chowjiaying/dance/mobile/app/practice/[id].tsx):
  - Minimalistic viewport focused on the video player container (full screen layout).
  - Keeps the core playback controls: Play/Pause, speed adjustment, mirror state, and count jumps visible.
- Implement Section Looping logic:
  - Display the video's custom sections below the video detail player.
  - Clicking a section card seeks the player to `section.start` and starts playback.
  - Introduce a "Loop Section" toggle button (re-entering the long-press action from [video/[id].tsx](file:///Users/chowjiaying/dance/mobile/app/video/[id].tsx#L320-L340)).
  - When an active loop is selected, monitor the video's playback: if `currentTime >= section.end`, immediately reset `currentTime = section.start` and trigger play.
- Implement Beat Calibration ("Set current time as count one"):
  - Provide a Flag button that saves the current `currentTime` as `firstEightCountTimestamp` in IndexedDB.
  - Recalculate the beat grids and enable the count jump buttons.
- Implement a Tap to BPM input component:
  - Port [tap-to-bpm-control.tsx](file:///Users/chowjiaying/dance/mobile/components/tap-to-bpm-control.tsx) to React Web.
  - Record millisecond timings of manual button clicks, compute the average BPM, and let users save this tapped BPM. Set the metadata source state to `"tap"`.
- Add Keyboard Accessibility for desktop dancers:
  - Spacebar: Play/Pause
  - `M`: Toggle Mirror
  - Left / Right Arrow: Jump back/forward 1 count
  - Shift + Left / Right Arrow: Jump back/forward 8 counts
  - `L`: Loop/unloop active section

Definition of done:
- A user can enter dedicated practice mode at `/practice/:id` with a large, clean player layout.
- Activating a loop successfully constraints playback between the section's start and end times continuously.
- Tapping the BPM button calculates the rate accurately and updates the metadata.
- Calibrating "count one" instantly enables and aligns the jump buttons to the correct offsets.
- Keyboard shortcuts operate reliably on the video detail and practice pages.

Steps to verify:
1. Navigate to `/practice/:id`, start video playback, and confirm the layout is optimized for viewing.
2. Select a section and click the "Loop" button. Confirm that as the playhead hits the end time, it loops back to the start time smoothly.
3. Test the Tap-to-BPM control by clicking in rhythm, verifying that the BPM changes and updates the metadata on save.
4. Press the `Spacebar` to pause/play, `M` to mirror, and arrow keys to execute count jumps, verifying desktop keyboard controls operate correctly.
