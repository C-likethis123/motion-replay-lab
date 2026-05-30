# Ticket: Remove Placeholder Videos and Add Empty State

Goal:
- Improve user experience by removing hardcoded placeholder videos in the library and displaying a clear empty state when no videos are present.

Scope:
- Locate the rendering logic for the library video list (likely in `components/library-video-list.tsx`).
- Remove any existing hardcoded placeholder video data.
- Create or implement an "empty state" component to display when the video list is empty.
- Ensure the empty state provides a clear call-to-action (CTA) to add a new video.

Definition of done:
- Placeholder videos are no longer rendered in the library.
- A user-friendly empty state is displayed when the video list is empty.
- The empty state includes a CTA to add the first video, triggering the expected add-video flow.

Steps to verify:
1. Navigate to the library view with no videos present.
2. Confirm that no placeholder videos are displayed.
3. Confirm the empty state component is visible.
4. Click the CTA in the empty state and verify that the "add video" modal or flow initiates correctly.
