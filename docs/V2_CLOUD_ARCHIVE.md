# Explicit cloud archives — V2.5 completion (design and implementation record)

An archive moves a complete kept memory's media out of cloud storage while keeping its
metadata. It is never automatic eviction. Real memories are not archived by the agent.
The feature's destructive QA uses disposable fixture files only.

## Gates

Both current members must independently approve the exact Keep instance/revision and archive
snapshot. Each must have a current designated compatible phone, a fresh local readback/hash
check of every original (front/set/sides), and a separate portable Orbit ZIP saved through
Android's document picker and verified by reading it back. Approval explicitly acknowledges
keeping a copy independently of Orbit and its app-private storage. The app cannot verify a
user's claim that a second copy is on another physical medium. Receipts are authenticated
client evidence, not hardware attestation or a guarantee against uninstall/device loss.

Changing content/Keep, replacing/disabling a phone or a stale/revoked receipt invalidates the
proposal. Client protocol/version is part of fresh evidence. Old installed clients remain
able to use ordinary online posts, but cannot approve archive removal. No notification or
email is sent to prompt the other member during setup/QA.

## State and storage contract

One root includes all photos, thumbnails and optional memory-side assets. A server-generated,
version-bound snapshot names every expected file and byte count. Portable ZIPs contain metadata
and all files with hashes; native save/readback and bounded import reject missing, duplicate,
unsafe or corrupt entries. Never count opening a file chooser or a successful write alone as
verified backup. ZIPs are ordinary personal files outside Orbit's private encrypted store;
keep them somewhere safe. The feature must disclose that backups can contain photos/audio and
chosen memory locations.

Cloud removal queues only after both approvals. It can be cancelled before a worker claims
it. Once removal starts it is idempotent and finishes/retries; all file deletion goes through
Storage API. A lease/token and revalidation prevent stale worker completion. Keep/expiry/edit
writes are blocked during removal and while media is cloud-archived. Old readers cannot fetch
broken post media; current readers show a separate archive shelf with explicit phone/backup
availability. The full authorized copy manifest keeps current phone copies from being pruned.
Neither missing/offline phones nor a cache are described as an independent backup.

Restore accepts the matching portable backup, verifies its snapshot/files and uploads through
an authenticated, server-authorized path. Partial restore remains retryable, accounts for quota
and is not labelled restored before every file is checked. Both authors' ownership and logical asset IDs are preserved. Restored files use fresh
generation-specific paths so a late deletion request cannot erase a restored copy. Backup files and phone copies are not removed when cloud restore
succeeds. A missing/corrupt local copy offers restore from ZIP, not a broken cloud image.

Logout, disable copies and recovery guidance must distinguish ordinary cloud keepsakes from
cloud-removed memories. App-private copies are removed by logout/uninstall; exported ZIPs
survive independently of app storage. Offline changes cannot be remotely erased immediately.
Physical two-phone/SAF/provider/process-death tests remain task #7, deferred with APK handover.

Implementation and exact verification outcomes are recorded in DEVLOG.md; this document does
not itself authorize deleting any real memory or claim that the partner has verified a copy.

## Implemented protocol and limits

Source `9b427ec`; migrations 0038–0040. Archive/proof reads exhaust bounded 500-row pages,
and the compact keepsake picker loads earlier memories on demand. Failure to finish an
archive manifest fails readiness instead of silently using partial evidence. Protocol-2
phone manifests retain archived roots independently of ordinary post RLS. Explicit selected
readback checks metadata as well as native file hashes, then renews all source receipts.

A portable backup is ZIP STORE, up to 16 MB and twenty media files plus the snapshot/index.
It is an ordinary, unencrypted ZIP; app-private phone files remain encrypted. Native SAF
writes bounded chunks, closes the file, reads it back and checks the full ZIP and every
entry before returning proof. Choosing a destination or writing bytes alone never approves.
The server checks both matching member proofs and the exact current Keep/revision/device.

`archive` Edge requests verify the user JWT with Auth and derive the actor from it. Removal
is scoped to one queued root; retention retries leased jobs. Restore uploads cannot overwrite
files, verify input and Storage readback hashes, and acknowledge each exact generation target.
The initiating member alone can resume/cancel that restore. Completion rechecks the manifest;
a partial upload remains offline and retryable. A cancelled restore uses a new generation on
retry, so late uploads are isolated/orphan-cleaned. Backups remain outside Orbit after restore.

Ordinary Export includes archive metadata with `media_included: false`; it does not replace
the separate per-memory archive ZIP. Only the matching archive ZIP restores that cloud
archive. See screens/v2-archives/README.md for automated evidence and deferred phone gates.
