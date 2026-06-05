# Website Implementation Plan

## Summary

Build a React-based web variant of the mobile application in the `website` folder. The website will replicate the core capabilities of the mobile player: local video imports, automatic BPM estimation, metadata editing, count-based playback jumping, mirror mode, and section looping. 

Because web browsers operate under a different security model than mobile apps (specifically regarding local file system paths and native audio APIs), the web version will employ Web Audio APIs for audio demuxing/decoding and IndexedDB for local video file persistence.

---

## Architectural Decisions

### 1. Framework & Styling
- **Tech Stack**: Vite + React + TypeScript + Vanilla CSS.
- **Routing**: `react-router-dom` to emulate the routing flow of the mobile app (`/` for library, `/video/:id` for details, `/practice/:id` for practice view).
- **Design Tokens**: Replicate the exact design palette, spacing scale, typography, and radii from [theme.ts](file:///Users/chowjiaying/dance/mobile/lib/theme.ts) as CSS variables in a global `index.css`.

### 2. Video Persistence (IndexedDB)
- **Problem**: Browsers do not permit loading arbitrary file system paths (e.g., `file:///...`) or persistent storage of file-picker object URLs across page reloads.
- **Solution**: 
  - Use **IndexedDB** (via native API or a lightweight wrapper like `dexie`) to store the actual video `Blob` along with metadata (`title`, `style`, `teacher`, `bpm`, `sections`, etc.).
  - Retrieve the video `Blob` on load, create an object URL (`URL.createObjectURL(blob)`) for `<video src="...">`, and cleanly revoke it (`URL.revokeObjectURL`) when the video unmounts.

### 3. Web BPM Detection Engine
- **Problem**: The mobile app uses custom native decoders and `expo-video-audio-extractor` to get audio samples.
- **Solution**:
  - The browser's native **Web Audio API** (`AudioContext.decodeAudioData()`) can decode audio tracks directly from video file buffers (MP4, WebM, etc.) into an `AudioBuffer`.
  - Extract Float32 PCM samples directly using `AudioBuffer.getChannelData(0)`.
  - Pass these samples to a web-compatible build of **`essentia.js`** to compute the BPM estimate and ticks, preserving the exact same preprocessing (filtering/downsampling) and selection algorithms as `mobile/lib/bpm.ts`.

### 4. Player Controls Mapping
- Replicate the `expo-video` player API with a custom React hook (e.g., `useWebVideoPlayer`) wrapping an HTML5 `<video>` element reference to expose properties like `playing`, `currentTime`, `duration`, and `playbackRate`, and actions like `play()`, `pause()`, and `seek()`.

---

## Tickets

Implementation work is broken down into the following tickets:

1. **`plans/tickets/web-01-scaffolding-and-theme.md`**: Project setup, React/Vite scaffolding, routing, and design system variables.
2. **`plans/tickets/web-02-video-storage-indexeddb.md`**: IndexedDB storage integration for video `Blob`s and metadata.
3. **`plans/tickets/web-03-bpm-detection-web-audio.md`**: Audio decoding and `essentia.js` BPM analyzer implementation.
4. **`plans/tickets/web-04-dashboard-and-video-management.md`**: Library dashboard page with search and import capabilities.
5. **`plans/tickets/web-05-video-player-and-controls.md`**: HTML5 Video player view with mirror support and count jumps.
6. **`plans/tickets/web-06-practice-and-looping.md`**: Dedicated practice page, section looping, and count-one calibration.

---

## Repository Constraints
- Ensure `react` and `react-dom` versions in the website's `package.json` are identical (recommended: React `19.2.3` to match the mobile app).
- Use `conditional && <Component />` pattern instead of ternary operators returning `null`.
- After a ticket is successfully implemented and verified, move its file to `plans/archived/`.
