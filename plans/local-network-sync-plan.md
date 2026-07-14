# Plan: Website Local Network Sync

## Scope

Sync runs only inside deployed website.

- Peer A: website open in desktop, tablet, or mobile browser.
- Peer B: same website open on different device.
- Video, thumbnail, and metadata transfer directly between browsers.
- Firebase Auth and Firestore handle temporary pairing/signaling only.
- IndexedDB remains local source storage on every device.
- Native Expo app is out of scope.

MVP requires both devices on same local network with website open and foregrounded.

## Architecture

```text
Desktop/tablet/mobile browser
          |
          | Firebase signaling only
          |
Desktop/tablet/mobile browser
          |
          | WebRTC data channels
          |
 Direct local encrypted transfer
```

Use WebRTC data channels for browser-to-browser transfer.

- Video bytes never pass through Firebase or website host.
- Do not configure TURN. Reject relay candidates.
- Failed local connection fails visibly instead of routing video through cloud.
- Keep website hosting independent from signaling. Existing deployment can remain on Vercel.
- Reuse same protocol, transfer engine, storage adapter, and UI on both peers.

Why:

- Browsers already support encrypted peer-to-peer binary data through WebRTC.
- Website uses Dexie and IndexedDB for video metadata and Blobs.
- One website implementation avoids Expo WebRTC, native permissions, and separate mobile migrations.
- Firebase provides managed realtime signaling and anonymous identity without storing videos.

## Browser requirements

Required capabilities:

- Secure HTTPS context
- `RTCPeerConnection` and `RTCDataChannel`
- IndexedDB with Blob support
- Web Crypto SHA-256
- `navigator.mediaDevices.getUserMedia` only when scanning QR code

Fallback behavior:

- Show pairing code entry when camera access is unavailable or denied.
- Reject unsupported browsers before session creation.
- Detect insufficient storage before accepting transfer.
- Keep both tabs foregrounded during MVP transfer.
- Warn before transfer when browser storage is temporary or persistence request fails.

Known limits:

- Mobile browsers may suspend tabs when screen locks or browser enters background.
- Browser storage can be quota-limited or evicted, especially on mobile.
- Guest and enterprise Wi-Fi may block peer-to-peer traffic.
- Large videos require bounded-memory chunk storage.

## User flow

1. User opens `Sync` on first device.
2. Website creates five-minute Firebase session.
3. Website shows QR code and six-character pairing code.
4. User opens same website on second device.
5. User scans QR or enters pairing code.
6. Both devices show peer name and require confirmation.
7. Browsers establish direct local WebRTC connection.
8. Devices exchange library manifests. No video bytes transfer yet.
9. UI shows videos missing, changed, deleted, conflicting, or identical.
10. User selects direction and videos.
11. Metadata and thumbnails transfer first. Videos transfer one at a time.
12. Receiver verifies checksum and commits video into IndexedDB.
13. Both devices show sync summary.

Both devices can send and receive during same session. Transfers remain user-started.

## Shared data model

Create framework-neutral sync types under website code.

```ts
type SyncVideoRecord = {
  id: string;
  title: string;
  bpm: number | null;
  countSeconds: number | null;
  firstBeatTimestamp: number | null;
  firstEightCountTimestamp: number | null;
  bpmSource: "detected" | "tap" | "unavailable";
  bpmConfidence?: number;
  sections: PracticeSection[];
  labels: string[];
  teacher?: string;
  mirrored: boolean;
  media: {
    fileName: string;
    mimeType: string;
    byteLength: number;
    sha256: string;
  };
  thumbnail?: {
    mimeType: string;
    byteLength: number;
    sha256: string;
  };
  revision: {
    counter: number;
    deviceId: string;
  };
  updatedAt: number;
  deletedAt?: number;
};
```

Model rules:

- Generate stable UUID video IDs. Preserve ID between devices.
- Generate stable `deviceId` once per browser profile.
- Add schema version to every protocol message.
- Do not sync transient values: object URLs, local thumbnail URLs, detection status, detection errors.
- Store thumbnail as Blob instead of large data URL after migration.
- Store deletion tombstones for 30 days. Prevent stale peer from restoring deleted video.
- Track last-synced revision for each peer.
- Detect concurrent metadata changes. Ask user to choose version.
- Never silently merge section arrays.
- Use revision for convergence. Use timestamps for display and audit only.

## WebRTC protocol

Use two ordered data channels:

- `control`: JSON handshake, manifests, requests, acknowledgements, errors, cancellation.
- `binary`: thumbnail and video chunks.

Control messages:

- `hello`: protocol version, device ID, device name, browser, capabilities.
- `manifest`: video ID, revision, deletion state, media hash, metadata hash.
- `sync-request`: selected video IDs and direction.
- `record`: video metadata.
- `file-start`: transfer ID, video ID, kind, size, hash, chunk size, resume offset.
- `file-ack`: highest contiguous byte persisted.
- `file-end`: sender finished.
- `file-complete`: receiver checksum passed and record committed.
- `cancel`, `error`, `goodbye`.

Transfer rules:

- Start with 32 KiB binary chunks.
- Pause sender when `bufferedAmount` exceeds 4 MiB.
- Resume on `bufferedamountlow`.
- Transfer one video at a time.
- Transfer thumbnail before video.
- Persist acknowledged offset every few MiB.
- Resume only when transfer ID, size, and hash match.
- Persist incoming chunks directly to IndexedDB.
- Do not retain complete incoming video in React state.
- Verify SHA-256 before committing final Blob.
- Commit metadata and Blob in transaction after verification.
- Delete temporary chunks after success, cancel, or hash failure.

## IndexedDB changes

Add new Dexie schema version.

Tables:

- `videos`: metadata, revision, updated time, deletion state.
- `videoBlobs`: completed local video Blobs.
- `thumbnailBlobs`: completed local thumbnail Blobs.
- `syncPeers`: peer ID, display name, last sync time, per-record base revisions.
- `syncTransfers`: transfer state, expected hash, size, acknowledged offset.
- `syncChunks`: temporary incoming chunks keyed by transfer ID and sequence.

Storage rules:

- Request persistent browser storage using `navigator.storage.persist()`.
- Check `navigator.storage.estimate()` before receiving video.
- Reserve safety margin instead of filling full reported quota.
- Compute hashes lazily for existing videos before first sync.
- Create object URLs only from committed Blobs.
- Revoke object URLs during replacement, deletion, and provider cleanup.
- Clean abandoned transfer chunks on startup.

Likely files:

- `website/src/lib/db.ts`
- `website/src/lib/videos.tsx`
- `website/src/lib/sync/types.ts`
- `website/src/lib/sync/protocol.ts`
- `website/src/lib/sync/firebase.ts`
- `website/src/lib/sync/peer.ts`
- `website/src/lib/sync/transfer.ts`
- `website/src/lib/sync/storage.ts`
- `website/src/pages/Sync.tsx`
- `website/src/components/SyncProgress.tsx`
- `website/src/components/PairingCode.tsx`

## Firebase signaling

Use Firebase anonymous authentication and Firestore.

Session data:

- Random unguessable session document ID
- Six-character lookup code
- One-time pairing secret
- Creator and joiner anonymous user IDs
- SDP offer and answer
- ICE candidates
- Creation and expiry times
- Connection status

Security rules:

- Only authenticated anonymous users can create or join sessions.
- Only creator and accepted joiner can read or write session details.
- Pairing code cannot grant access without one-time secret.
- Session expires after five minutes.
- Client deletes session after connection or cancellation.
- Expired sessions become unreadable even before cleanup.
- Rate-limit session creation and join attempts.
- Never store media, video metadata, filesystem paths, or transfer chunks in Firebase.

Use separate Firebase projects for development and production.

## Delivery phases

### Phase 0: Browser transport spike

- Add Firebase client SDK.
- Connect two website instances through temporary Firestore signaling.
- Test Chrome desktop to Chrome Android.
- Test Safari desktop to Safari iOS.
- Transfer synthetic 10 MB, 250 MB, and 1 GB files both directions.
- Measure throughput, peak memory, browser storage growth, and reconnect behavior.
- Confirm selected ICE candidate is direct and Firebase receives no file bytes.

Exit gate: supported desktop/mobile pair completes 250 MB transfer without tab crash or complete-file memory duplication. Set tested maximum video size.

### Phase 1: Shared schema and storage

- Add stable device IDs, UUID video IDs, revisions, hashes, and tombstones.
- Add Dexie tables and migrations.
- Move thumbnails from data URLs into Blob storage.
- Implement storage estimate, persistence request, temp chunks, and cleanup.
- Add migration and storage adapter tests.

Exit gate: existing library survives migration and restart. Temp transfer cleanup preserves completed videos.

### Phase 2: Pairing and connection

- Configure Firebase anonymous auth, Firestore, rules, and dev/prod environments.
- Implement session creation, QR/code join, peer confirmation, timeout, cancel, and reconnect states.
- Add browser capability checks and camera fallback.

Exit gate: supported device pairs establish local data channel in under 15 seconds on normal Wi-Fi.

### Phase 3: Manifest and metadata sync

- Implement versioned handshake and capability negotiation.
- Exchange manifests.
- Calculate `new`, `changed`, `deleted`, `same`, and `conflict` sets.
- Sync metadata, thumbnails, and tombstones.
- Add explicit conflict resolution.

Exit gate: metadata converges deterministically. Deletes do not resurrect.

### Phase 4: Video transfer

- Implement chunking, IndexedDB persistence, backpressure, hash verification, progress, cancel, retry, and resume.
- Commit completed media atomically.
- Re-run BPM detection only when transferred metadata lacks valid BPM data.

Exit gate: interrupted 250 MB transfer resumes. Corrupt transfer never replaces valid local video.

### Phase 5: Product UI

- Add `Sync` command to dashboard.
- Build pairing, comparison, selection, progress, error, conflict, and summary states.
- Make layout usable on desktop and mobile website.
- Keep sync user-started. Do not access camera or network on page load.

Exit gate: first-time user pairs and transfers without developer tools.

### Phase 6: Hardening

- Test refresh, screen lock, tab backgrounding, browser termination, Wi-Fi loss, low storage, corrupt chunks, clock skew, denied camera, expired sessions, and peer isolation.
- Add protocol parser tests and migration fixtures.
- Add telemetry for event names, timings, sizes, and error codes only.
- Never log titles, labels, metadata payloads, IP addresses, pairing secrets, or media.

## Verification matrix

Required device pairs:

- Chrome macOS/Windows to Chrome Android
- Chrome macOS/Windows to Safari iOS
- Safari macOS to Safari iOS
- Edge Windows to Chrome Android
- Desktop sender and mobile sender directions
- Two desktop browsers
- Two mobile browsers

Required scenarios:

- 10 MB, 250 MB, and tested maximum-size video
- Normal Wi-Fi
- Guest Wi-Fi with peer isolation
- Wi-Fi disconnect and reconnect
- Sender refresh during transfer
- Receiver refresh during transfer
- Mobile screen lock during transfer
- Insufficient IndexedDB quota
- Camera denied with pairing-code fallback

Acceptance criteria:

- No video, thumbnail, or library metadata stored in Firebase.
- Successful destination hash matches source hash.
- Completed video plays after both browsers restart.
- Metadata, sections, labels, BPM timing, teacher, and mirror state match.
- Deletion propagates without resurrection.
- Cancel leaves no visible partial video.
- Resume does not resend acknowledged chunks.
- Peak memory remains bounded as video size grows.
- Unsupported browser or network produces clear failure and retry path.
- Desktop and mobile layouts show usable progress and conflict controls.

## Risks

- Mobile browser background suspension can interrupt transfer. MVP requires foreground tab and awake screen.
- IndexedDB quota and eviction differ by browser and device. Storage checks reduce risk but cannot guarantee retention.
- Some networks block peer-to-peer traffic. No-TURN policy means sync cannot work there.
- Large Blob assembly can cause memory pressure. Phase 0 must validate chunk persistence and final Blob creation limits.
- Existing thumbnails use data URLs. Migration must avoid duplicating large values.
- Browser WebRTC implementations differ in binary handling and connection statistics.
- Device clocks can differ. Revision tracking and explicit conflicts must drive convergence.

## Non-goals

- Native Expo app sync
- Cloud video backup
- Internet sync across different networks
- Background sync while browser is closed
- Multi-device live editing
- Streaming playback before transfer completion
- Automatic conflict merging
- TURN relay fallback
