# Ticket: IndexedDB Video File and Metadata Storage

> [!NOTE]
> The scope of this ticket is for the website app (i.e. the folder in `website`).

Goal:
- Implement a browser-native storage system using IndexedDB (e.g., using `dexie` or native IndexedDB API) to persistently save video file Blobs and metadata across sessions.

Scope:
- Set up an IndexedDB database named `DanceReplayDB` with tables:
  - `videos`: stores metadata (`id`, `title`, `style`, `teacher`, `bpm`, `countSeconds`, `firstBeatTimestamp`, `firstEightCountTimestamp`, `bpmSource`, `bpmConfidence`, `bpmDetectionStatus`, `sections`).
  - `videoBlobs`: stores the actual large binary `Blob` or `File` keyed by video ID.
- Create a React `VideosProvider` and `useVideos` hook matching the API and functions of [videos.tsx](file:///Users/chowjiaying/dance/mobile/lib/videos.tsx):
  - `videos`: Array of all dance videos. To make them playable in HTML5 `<video>`, generate a temporary object URL (`URL.createObjectURL(blob)`) for the current session.
  - `addVideo(metadata, file: File)`: Saves the file to `videoBlobs` and metadata to `videos`.
  - `updateVideo(id, updates)`: Updates metadata records in the DB and React state.
  - `deleteVideo(id)`: Removes the video files and metadata, and revokes the associated object URL.
- Properly revoke old object URLs (`URL.revokeObjectURL`) when videos are updated, deleted, or when the provider unmounts, to prevent memory leaks.

Definition of done:
- Users can import a video file, which is saved as a binary Blob in IndexedDB.
- Refreshing the web application does not erase imported videos; they reload successfully with valid, playable object URLs.
- Video records can be updated (e.g., changing titles, editing sections) and deleted, with full IndexedDB synchronization.
- No memory leaks occur from dangling object URLs.

Steps to verify:
1. Load the app, import a test MP4 video, and verify it appears in the active state.
2. Inspect the browser's developer tools under Application -> IndexedDB -> `DanceReplayDB` to confirm both the metadata record and binary `Blob` are stored.
3. Refresh the page and confirm the video remains visible and can be played in a video element.
4. Delete the video and verify it is completely removed from both IndexedDB stores and that the object URL is revoked.
