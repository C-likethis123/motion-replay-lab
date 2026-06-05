# Ticket: Video Player and Playback Controls

> [!NOTE]
> The scope of this ticket is for the website app (i.e. the folder in `website`).

Goal:
- Implement the HTML5 video player and playback controls on the video details route (`/video/:id`), including mirror mode, playback rate selectors, and beat-relative jump buttons.

Scope:
- Build the details page component (`/video/:id`) and a custom hook `useWebVideoPlayer` wrapping an HTML5 `<video>` reference:
  - Synchronize React states (`isPlaying`, `currentTime`, `duration`, `playbackRate`) with the video element's events (`play`, `pause`, `timeupdate`, `durationchange`, `ratechange`).
  - Provide controls: `play()`, `pause()`, `seekBy(seconds)`, and update `playbackRate`.
- Replicate the video player UI from [video/[id].tsx](file:///Users/chowjiaying/dance/mobile/app/video/[id].tsx):
  - Aspect ratio constrained to 16:9, centered inside a dark styled canvas chrome (`colors.videoChrome`).
  - Mirror Toggle: toggle a state which applies the CSS rule `transform: scaleX(-1)` to the `<video>` element.
- Implement the playback control panel matching [video-playback-controls.tsx](file:///Users/chowjiaying/dance/mobile/components/video-playback-controls.tsx):
  - Timeline progress bar showing current progress.
  - Play/Pause toggle.
  - Speed buttons: `0.5x`, `0.75x`, `1.0x`, and `1.25x` (controlling `video.playbackRate`).
  - Count jumps: Back/Forward 1 count, and Back/Forward 8 counts. If the first beat timestamp and BPM are available, align jumps to the exact beat grid. If not, disable or use basic seconds.
- Create an "Edit Video" modal or inline form:
  - Inputs for `title`, `style`, and `teacher`.
  - Sections textarea input: parsed as comma-separated values (e.g., `Section Label, StartSecond, EndSecond`) matching the mobile app parser.
- Add a "Delete Video" action that removes the video from IndexedDB and redirects to the home screen.

Definition of done:
- A user can view a detailed player page for any imported video.
- Play, pause, speed, and mirroring controls update the video element in real-time.
- Mirror mode flips the video horizontally without altering sound or synchronization.
- Count jumps move the video player cursor relative to the beat grid (if BPM is active).
- Edits to metadata (title, style, sections) save successfully.

Steps to verify:
1. Open an imported video's detail page. Play the video and change the speed to `0.5x`.
2. Toggle the "Mirror" option and verify that the video is flipped horizontally.
3. Click "Forward 1 Count" and "Back 8 Counts" to confirm seeking adjusts the cursor position.
4. Open the edit flow, modify the title, add a section (e.g. `Chorus, 10, 20`), and save. Confirm the video updates immediately.
