# Photo sets

V2.5 adds up to six photos in one Moment or chat message. Pick several files, select a
thumbnail, move it earlier/later, remove/add photos, and add a caption to each. A general
note belongs to the set. Drafts survive route changes in the current signed-in shell;
failed-send retries reuse the draft ID, while editing a failed draft creates a new one.
Draft photos remain in memory and are not yet a persistent offline upload queue.

The feed shows the cover and photo count. The viewer supports previous/next controls,
keyboard arrows and deliberate horizontal swipes. Zoom disables page switching; vertical
scrolling and pinch gestures do not turn pages. Closing returns to the original cover.

## Storage and privacy

- One post, social thread, collection membership and Keep/expiry/unsend decision per set.
- The server verifies canonical author-owned WebP paths, dimensions/captions, every uploaded
  original and thumbnail, and records their actual Storage byte sizes. Existing client
  fields remain the cover only; additional byte fields make Keep/quota accounting complete.
- Atomic Keep includes every original and thumbnail. Orphan collection locks/protects all
  referenced paths; cleanup removes files through Storage API before dropping the post.
- Failed/ambiguous sends follow the existing idempotency and unattached-file cleanup rules.
  Partner access follows post RLS; no file is public. Signed URLs stay in memory only.
- ZIP export includes each original/thumbnail once, with order/captions in memories.json.
- A caption survives reducing a draft to one photo. Posted set ordering is immutable.

## Phone copies and compatibility

Each image has its own encrypted, verified native record. Cover IDs, filenames and encryption
AAD stay compatible; extras use a bounded post:photo identity, encoded safely for filenames.
Receipts for extras use a separate member/device/revision-bound table and RPC, preserving the
installed cover API. A full set cannot show both phones verified from cover receipts alone.
Phone quota remains 256 MB and 1,000 physical records, including individual set photos.
The local library opens each available image and supports navigation through saved set images.
An interrupted sync can leave a partial set; status never claims the missing files were saved.

An older app can display/copy only the cover. An updated app can browse/copy every image.
Server Keep/quota/unsend always cover the whole set, including older app actions. Cloud
originals remain the transfer/recovery bridge. No cloud removal is implemented or implied.
Offline/process-death/native gesture and two-phone proof remain in the user's later batch.

## Verification

Five hosted photo-set checks cover RLS, canonical/malformed manifests, authoritative byte
accounting, quota rollback, current-device receipts, orphan protection and old/new cleanup.
The complete backend suite passes 85 checks. Final web/browser/Android evidence is recorded
in DEVLOG.md and docs/screens/v2-photo-sets after final verification.
