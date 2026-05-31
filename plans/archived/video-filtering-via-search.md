# Ticket: Implement Video Filtering via Search

Goal:
- Add search functionality to the video library to allow users to quickly find videos.

Scope:
- Add a search input field in the `LibraryControls` component.
- Implement filtering logic to filter the list of videos in `LibraryVideoList`.
- Filter by title.
- Handle the "no results found" state in the UI.

Definition of done:
- A search input is present and functional in the library view.
- Typing in the search input updates the video list in real-time.
- Searching with no results shows an appropriate empty state.
- Searching is case-insensitive.

Steps to verify:
1. Navigate to the library view.
2. Type a partial or full video title into the search bar.
3. Confirm the video list updates to show only matching videos.
4. Type a string that matches no videos and confirm the empty state is displayed.
5. Clear the search input and confirm all videos are displayed again.
