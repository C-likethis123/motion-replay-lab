# Ticket: Add Video Labels Functionality

> [!NOTE]
> The scope of this ticket is for both mobile and website.

References:
- N/A

Goal:
- Enable tagging videos with custom labels to improve organization and searchability.
- Add filtering/search capabilities by labels in the library view.

Shared Implementation:
- Define `labels: string[]` on the `DanceVideo` type in a shared location if possible, or maintain consistency across `mobile/lib/videos.tsx` and `website/src/lib/videos.tsx`.
- Create a reusable label management UI component or hook for label state manipulation.

Mobile Scope:
- Update `DanceVideo` type in `mobile/lib/videos.tsx`.
- Update Add/Edit Video flows:
  - Add a UI component to manage labels (add/remove).
- Update Library View:
  - Add filtering/searching by labels in `mobile/components/library-controls.tsx`.
- Persistence:
  - Ensure labels are persisted in `AsyncStorage`.

Website Scope:
- Update `DanceVideo` type in `website/src/lib/videos.tsx`.
- Update Add/Edit Video flows:
  - Implement similar label management UI component to manage labels (add/remove) in the dashboard/detail view.
- Update Library View:
  - Add filtering/searching by labels in `website/src/pages/Dashboard.tsx` or equivalent.
- Persistence:
  - Ensure labels are persisted (e.g., IndexedDB as per existing web implementation).

Definition of done:
- Videos can be tagged with one or more labels.
- Labels are persisted.
- Users can filter the video library by selected label(s).
- Labels can be managed in the edit modal.

Steps to verify:
1. Open edit modal for a video (mobile/web): confirm UI for managing labels exists.
2. Add labels to a video, save: confirm labels are saved and visible in the library.
3. Use library controls to filter by added labels: confirm the list updates correctly.
4. Remove a label from a video: confirm it's updated and no longer filters correctly.
