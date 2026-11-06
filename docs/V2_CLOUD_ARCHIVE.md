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
and is not labelled restored before every file is checked. Both authors' original paths and
ownership are preserved. Backup files and phone copies are not removed when cloud restore
succeeds. A missing/corrupt local copy offers restore from ZIP, not a broken cloud image.

Logout, disable copies and recovery guidance must distinguish ordinary cloud keepsakes from
cloud-removed memories. App-private copies are removed by logout/uninstall; exported ZIPs
survive independently of app storage. Offline changes cannot be remotely erased immediately.
Physical two-phone/SAF/provider/process-death tests remain task #7, deferred with APK handover.

Implementation and exact verification outcomes are recorded in DEVLOG.md; this document does
not itself authorize deleting any real memory or claim that the partner has verified a copy.
