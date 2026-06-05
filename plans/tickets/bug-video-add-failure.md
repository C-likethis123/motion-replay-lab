# Ticket: Bug - Unable to add multiple videos consecutively

> [!NOTE]
> The scope of this ticket is for the mobile app (i.e. the folder in 'mobile').

Goal:
- Investigate and resolve the issue where adding a video fails or behaves unexpectedly after a previous video has been added successfully.

Scope:
- Reproduce the failure to add a second video.
- Analyze state management in `VideosProvider` and the add video modal/flow.
- Identify if this is a UI blocking issue, a state persistence issue, or a validation issue.
- Implement a fix.

Definition of done:
- Users can add multiple videos in a single session without the flow breaking.
- The `VideosProvider` correctly updates state and persists all added videos.

Steps to verify:
1. Open the application.
2. Add a video successfully.
3. Attempt to add another video.
4. Confirm the second video is added and persists alongside the first.
