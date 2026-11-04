# Private phone keepsakes — V2.5 first slice

Either member can Keep a post. Each member must independently opt in to phone copies in
Keepsakes → On this phone → Set up. Orbit reconciles kept posts while the Android app is
open, visible and connected. It does not send a partner notification or require GPS sharing.
Keep/revision changes and app resume trigger reconciliation; the fallback interval is five
minutes. Unchanged receipts are not rewritten on every pass; evidence is renewed daily.
One designated phone per member can sync; choosing another replaces its server designation.

The separate On this phone library opens from Keepsakes and from the reconnect screen.
It reads native files without the space query or a successful server session refresh. Native
operations still require the saved, encrypted account identity. A known account change hides
old metadata
and media immediately while native identity is rechecked. With no live session, the saved
native identity still permits cold offline access. A slow in-flight native auth
refresh can delay access; expired-session/airplane-mode timing remains a physical test gate.
Web previews explain Android availability; browser storage is not a durable archive substitute.
The local library is a checked snapshot. Return to the connected Keepsakes screen to
reconcile current Keep/unsend changes; its independent offline route does not run cloud sync.

## Files and receipts

- Originals and a minimal metadata record share one AES-256-GCM authenticated, atomic file
  in Android no-backup internal storage. Identity includes member, couple and post IDs.
  Keys live in Android Keystore. No gallery or broad storage permission is requested.
- Media crosses the bridge in bounded chunks; partial writes remain in memory and are
  discarded on backgrounding/failure. A committed file is decrypted and hashed again before
  acknowledgement. Listing checks authentication and hashes; corrupt files are removed and
  their stale server evidence is forgotten during reconciliation.
- Each phone holds at most 256 MB and 1,000 posts, with a 16 MB per-media limit and a 32 MB
  free-space reserve. A full phone keeps existing files and reports new copies as waiting.
  Opening media uses revocable memory-only Blob URLs. Locations, quoted text, signed URLs,
  reaction/comment snapshots and unrelated profile data are not copied.
- RLS exposes device/receipt rows only to the couple. Scoped RPCs bind expected member,
  couple, current designated phone and current post revision. Direct API writes are denied.
  A copy acknowledgement is evidence supplied by the authenticated client, not remote proof
  that a phone can never lose its storage.
- “Both phones verified” requires two distinct opted-in members, current devices, matching
  media hashes/byte counts and the current revision. It describes the last successful checks;
  it does not promise the partner phone is currently reachable. Uninstall cannot immediately
  notify the server. This ledger never authorizes cloud deletion.
- Keep changes, edits and unsends invalidate receipts. A complete successful manifest is
  required before pruning local copies. Removing Keep/unsending removes each phone copy on
  its next sync; an offline phone cannot be remotely erased immediately.
- Explicit turn-off removes this phone's copies and receipts. Logout/account switching clears
  files and keys. Uninstall also removes app-specific files. These are convenient offline
  copies, not an independent backup; use the existing memory ZIP for a separate backup.

## Cloud storage

Cloud originals remain the transfer and recovery bridge. **This slice does not free cloud
storage.** It avoids repeat downloads and enables offline use. No cloud deletion worker or
automatic eviction has been introduced. A later archive policy needs explicit owner consent,
verified compatible phones, backup/recovery handling and changed-availability UX before using
the Storage API to remove any cloud originals. Preview clients continue to work normally.

## Verification and deferred device batch

Sync tests cover failed manifests, retries, loss of Keep, missing/corrupt files, incorrect
sizes/revisions, full storage, cancellation and a concurrent unkeep. UI tests open the library
without Auth/Space/Query providers and verify that failed identity checks/logout clear private
metadata. Native cipher tests cover empty/text copies, media, unique IVs, wrong keys/identity,
tampering and limits. Hosted tests use disposable accounts for RLS, direct-write denial,
device replacement/disable, stale revisions and own-only forgetting. The complete retention
privilege audit caught default execution on the new private trigger helper; migration 0028
revokes it rather than weakening the audit.

Physical tests remain in the user's requested batch: encrypted file/process-death persistence,
offline cold launch (including expired auth), photo/voice playback, full-disk interruption,
background cancellation, logout/relogin and two-device propagation/revocation. Vidya's real
phone is unavailable before the surprise reveal, so no real partner-copy claim is made.
APK handover stays deferred until requested. V2.5 photo sets/collections and later V2 phases
remain open; this is the phone-copy foundation, not a final production-release declaration.

Final software result: 159 web / 22 worker tests and all lint/type/format/build checks pass.
All 75 hosted checks are validated across the full run and targeted privilege correction.
Android source f0fdf4a passes native tests/build/signing in CI 41920390183, plus local APK
integrity/signing-identity/private-material checks. The browser capture scores 100/100 for
accessibility/best practices, and 320/360/412 px layouts fit. Secret scan: 988 files, no findings.

References: [Android app-specific storage](https://developer.android.com/training/data-storage/app-specific),
[Android Keystore](https://developer.android.com/privacy-and-security/keystore).
