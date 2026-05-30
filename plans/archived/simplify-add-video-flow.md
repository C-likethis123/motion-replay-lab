# Ticket: Simplify Add Video Flow

Goal:
- Streamline the "add video" process by removing the form during the initial upload, ensuring forms are only shown when editing existing videos.

Scope:
- Modify the "add video" trigger to invoke the document picker directly.
- Implement background BPM estimation after the video is selected and during/before upload.
- Upload the video directly without requiring user input for metadata immediately.
- Ensure the edit form is accessible only through a dedicated "edit" flow for existing videos.

Definition of done:
- Adding a new video only requires selecting the file via the document picker.
- BPM is estimated automatically without interrupting the user or requiring form input.
- Video is uploaded seamlessly after selection/estimation.
- No metadata form is presented during the "add" process.
- The edit form is available, but triggered exclusively when modifying existing videos.

Steps to verify:
1. Initiate the "add video" process.
2. Select a video file from the document picker.
3. Confirm that the video uploads and BPM is estimated without being prompted to fill out a metadata form.
4. Verify that the video appears in the library.
5. Select the newly added video to trigger the "edit" flow and confirm the metadata form is correctly displayed for existing videos.
