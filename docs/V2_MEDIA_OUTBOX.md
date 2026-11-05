# Chat media outbox

V2.5 extends the existing durable text outbox to Chat photo sets and voice notes. Tap Send
to save a private pending package before the composer clears. The pending row offers a local
photo/voice preview, retry and confirmed discard. It stays distinct from messages accepted
by Orbit. Moments drafts still remain in memory until posted; no durable Moment queue is claimed.

## Storage and recovery

- Up to six ordered/captioned photos or one completed voice note per package. Existing image,
  thumbnail and 120-second/4.5 MB voice limits still apply. Maximum 8 MB package, up to 32 MB
  pending storage and 50 messages; Android also counts file overhead and reserves free space.
- Android stores metadata and media in one AES-GCM authenticated record in no-backup app
  storage. Owner/post/version bind the record; the Keystore generation changes on clear.
  Bounded bridge chunks avoid returning all queued files as base64. Atomic write and decrypted
  readback precede confirmation. Old text records remain readable; old clients ignore new
  media record filenames. Logout clears both formats and keys.
- Web keeps encrypted metadata and separately encrypted binary payloads in IndexedDB,
  with the existing non-extractable per-owner key and generation stamp. One transaction
  commits the message and payload. Upgrade preserves version-one text records/keys.
- Every asset has a contiguous range, allowed MIME type, bounded size and SHA-256 digest.
  Restore checks the complete package and each image/thumbnail/voice hash before sending.
  Composer clearing requires storage readback, not just a completed write call. A media
  package remains staged until verification completes. Interrupted staging cannot auto-send;
  an explicit Retry verifies it before promotion.
- Pending lifetime remains at most 24 hours (or a shorter chosen TTL). Expired copies are
  pruned when the queue next opens/refreshes. Discard, logout and expiry remove the media
  alongside its metadata. This queue is temporary and is not an archive or backup.

## Sending

Immutable post identity, original author/couple, captions, reply reference and TTL/Keep choice
survive retries. New writes cannot replace a different intent under the same ID. The server
still checks membership, quote availability, Keep/quota and current account. A lost response
is resolved through the original post lookup before more uploads or publication.

The provider pauses a pass on background/offline and stops it on logout. Work resumes on
foreground/reconnect or deliberate retry. The installed Storage SDK cannot abort an upload
fetch: interruption releases the waiting send flow, and a late private upload may finish,
but cannot continue into publication. Unattached uploads remain eligible for existing orphan
cleanup. Publication already accepted before interruption still resolves by the same ID.
No background uploader, new sensor permission or partner contact is added.

Storage failure retains the composer; there is no plaintext or transient-only fallback for
media. Pending previews read the private local package and revoke object URLs on close/change.
Account/couple guards and clear generations prevent old work from reviving after logout.
Cloud originals, Keep fan-out and the separate phone-keepsake cache are unchanged.

## Verification scope

Real AES-GCM/IndexedDB tests cover reload, migration, quota rollback, tamper, expiry, clear/write
races, immutable retries, account changes and interruption. Bridge tests cover chunk bounds,
wrong sizes and logout before commit. Native record tests cover Unicode metadata, nonce
uniqueness, identity/key/format isolation and tampering. Composer tests retain media on failed
local save. Viewer tests check captions, focus return and URL cleanup without sending.

The isolated browser harness uses the production Composer, pending UI, encryption/store and
engine with synthetic files and an injected test transport. Its reload/preview/accept/reject
checks are not a claim of real internet delivery or Android process-death recovery. Full
hosted backend regressions run separately. Physical airplane-mode, background interruption,
process-death/full-storage and two-phone checks remain in the user's later device batch.
Final automated/browser/Android evidence is recorded in DEVLOG.md.
