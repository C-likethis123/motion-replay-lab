# Ticket: Dashboard and Video Library Management

> [!NOTE]
> The scope of this ticket is for the website app (i.e. the folder in `website`).

Goal:
- Build the web video library dashboard page (replicating the home/dashboard screen in the mobile app) with a search filter, video grid cards, and import buttons.

Scope:
- Build the home route (`/`) layout and components matching [index.tsx](file:///Users/chowjiaying/dance/mobile/app/index.tsx):
  - **Header / Controls**: Title, Search input (filters list by title, style, or teacher), and an "Import Video" button.
  - **Video Grid List**: Replicate the styling of `LibraryVideoList` and `Card` components from the mobile app (rounded borders, soft shadows, hover transitions, flexbox/grid layout).
  - **Empty State**: Show a custom placeholder if no videos are found, matching [empty-state.tsx](file:///Users/chowjiaying/dance/mobile/components/empty-state.tsx).
- Implement the "Import Video" flow:
  - Trigger a native browser file picker restricted to video formats (`accept="video/*"`).
  - Extract the filename as the default video title.
  - Save the file object/blob to IndexedDB, insert the metadata with `bpmDetectionStatus: "detecting"`, and add it to the state.
  - Execute `estimateBpm` asynchronously: once complete, update the video entry in IndexedDB with the computed BPM, confidence, and first beat timestamp, and set status to `"idle"`.
- Each video card should display:
  - Video thumbnail (generate a canvas frame at time 0.0s of the video, replicating the thumbnail generation in mobile).
  - Title, style, and teacher name.
  - BPM status badge ("Analyzing", "Unavailable", or computed BPM).
  - Quick action links to view the details page (`/video/:id`) or enter practice mode (`/practice/:id`).

Definition of done:
- Users see a modern dashboard styled matching the design system.
- Searching filters the visible grid cards instantly.
- Uploading a local video adds it immediately with a spinner/loader showing BPM calculation progress.
- Once analysis finishes, the card updates with the detected BPM, and the video is playable.

Steps to verify:
1. Open the homepage, verify the dashboard matches the design guidelines (clean fonts, neutral borders, correct primary/accent colors).
2. Import a video file and observe the card appearing immediately with an "Analyzing BPM" indicator.
3. Verify the indicator changes to the detected BPM when processing finishes.
4. Test typing in the search bar to confirm it correctly filters by teacher, style, or title.
