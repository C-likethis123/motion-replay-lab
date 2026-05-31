# Ticket: Bug - Video persistence not loading

Goal:
- Investigate and resolve the issue where video data is not correctly loaded into the application state upon restart, despite evidence that data exists in the cache (`AsyncStorage`).

Scope:
- Analyze `VideosProvider` load logic.
- Debug `AsyncStorage` read operations.
- Ensure the deserialization of cached data correctly matches the `DanceVideo` type.
- Identify why, even with non-empty cache/user data, the application fails to populate the state.

Definition of done:
- Videos are successfully restored to the application state after a full application restart.
- The UI reflects the persisted video library correctly.

Steps to verify:
1. Add one or more videos to the application.
2. Observe cache/storage updates (confirm data is present).
3. Restart the application.
4. Confirm the previously added videos appear in the library view upon load.
