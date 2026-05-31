# Ticket: Add Video Labels Functionality

References:
- N/A

Goal:
- Enable tagging videos with custom labels to improve organization and searchability.
- Add filtering/search capabilities by labels in the library view.

Scope:
- Update `DanceVideo` type in `lib/videos.tsx` to include `labels: string[]`.
- Update Add/Edit Video flows:
  - Add a UI component to manage labels (add/remove).
- Update Library View:
  - Add filtering/searching by labels in `library-controls.tsx`.
- Persistence:
  - Ensure labels are persisted in `AsyncStorage`.

Definition of done:
- Videos can be tagged with one or more labels.
- Labels are persisted.
- Users can filter the video library by selected label(s).
- Labels can be managed in the edit modal.

Steps to verify:
1. Open edit modal for a video: confirm UI for managing labels exists.
2. Add labels to a video, save: confirm labels are saved and visible in the library.
3. Use library controls to filter by added labels: confirm the list updates correctly.
4. Remove a label from a video: confirm it's updated and no longer filters correctly.
