# Ticket: Remove legacy music-tempo BPM detection

> [!NOTE]
> The scope of this ticket is for the mobile app (i.e. the folder in 'mobile').

Goal:
- Remove the legacy `music-tempo` BPM detection implementation once the new BPM analyzer (e.g., `realtime-bpm-analyzer`) is confirmed as the stable, preferred solution.

Scope:
- Remove `music-tempo` from `dependencies` in `package.json`.
- Delete `types/music-tempo.d.ts`.
- Update `lib/bpm.ts` to remove the `music-tempo` import and related logic.
- Remove `music-tempo` related code from any other locations identified.

Definition of done:
- `music-tempo` package is removed.
- `lib/bpm.ts` is clean of legacy `music-tempo` code.
- `types/music-tempo.d.ts` is deleted.
- The application builds and runs correctly, utilizing only the new BPM detection method.

Steps to verify:
1. Confirm that `music-tempo` is not present in `package.json`.
2. Verify `lib/bpm.ts` does not contain references to `music-tempo`.
3. Run the application and confirm BPM detection works as expected using the new method.
4. Confirm no compilation errors or runtime warnings related to `music-tempo`.
