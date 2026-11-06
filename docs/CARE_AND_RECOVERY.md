# Keeping Orbit running

Orbit has two invited accounts. Email codes sign you in; sessions are remembered until you
log out or the service requires a new sign-in. A device screen lock protects Orbit's local
lock. Neither the anniversary letter nor a fall/emergency guarantee is part of the app.

## Location and alerts

Use Settings → Device & alerts → Tracking health to review permissions, sharing mode and
queued updates. Both members see pause; Surprise shows an approximate area. A displayed
location has an age and GPS uncertainty: it is a recorded fix, not a promise about where
someone is now. Refresh requests another fix without bypassing pause/Surprise. Directions
are offered only for an eligible recent exact location.

On Android, allow precise/all-the-time location, notifications and background battery use
when you want background sharing. Reopen Orbit after reboot. If fixes stop, inspect Tracking
health rather than repeatedly reinstalling. Keep a pending offline queue intact until the
phone reconnects. Nothing OS device behavior remains part of the deferred physical tests.

Notifications require opt-in on each device. Processing/acceptance is not recipient delivery.
Safety check-ins are timers; overdue does not establish an accident. Speed is an uncertain
phone estimate, not proof of driving. No automatic partner fall/impact escalation is shipped.

## Messages, moments and keepsakes

Unkept posts expire; Keep retains the entire memory, including its photo set and each member's
optional side. Each person edits/removes only their own side. Unsending the front hides the
whole memory. File cleanup follows through Storage API; offline copies reconcile at sync.
Pending native messages/media are private to that device until successfully sent. Retry
uses the same identity; check the pending state before creating a duplicate.

## Backups and cloud space

Phone copies are encrypted app-private files. They are useful offline, but logout/uninstall
removes them. They are not an independent backup. Each member must enable their own phone
and open Orbit to sync; one Keep cannot silently configure the other phone.

Settings → Storage & backup → Export downloads online memories and archive metadata. The
ordinary ZIP excludes removed cloud files and sealed partner capsules. ZIPs are personal,
unencrypted files; keep them somewhere safe outside Orbit and keep the signing-key backup
separately with the account owner.

Cloud archives are explicit, whole-memory transfers out of cloud storage. Both members
must freshly verify compatible phone copies, save/read back a separate per-memory ZIP and
approve the exact memory. The original author then confirms removal. No automatic eviction
runs. Cancel before removal starts; once it starts, retry until cleanup completes. Never
remove another copy because a phone or a cache merely looks available.

To restore: Keepsakes → Cloud archives → Restore from ZIP. Choose that memory's Orbit
archive ZIP, not the monthly export. The initiating member can resume a partial restore or
cancel its temporary files. Nothing is labelled restored until every upload/readback passes.
Restored originals get fresh paths; phone copies and exported ZIPs are retained.

If a phone copy is missing/corrupt, try the separate ZIP restore while connected. If every
copy and backup is lost after explicit cloud removal, Orbit cannot reconstruct the files.
Do not log out, clear app storage or uninstall as the first recovery step.

## Updates and ongoing care

Web updates offer Update Orbit; finish or preserve a draft before accepting. Android updates
must use the same signing identity. Keep the signing key/password backups: losing that
identity can force uninstalling, which removes app-private copies and pending messages.
The agent retains builds internally until the user's requested consolidated device test.

Open Orbit regularly; review free-tier usage periodically and export memories monthly. If
Supabase pauses the free project, the account owner restores it in the dashboard. Keep
configuration/service keys in ignored local files and provider/CI secrets. Changes requiring
payment or a credit card need a free alternative; none are authorized here.

See [the release checklist](RELEASE_CHECKLIST.md), [tracking setup](TRACKING.md),
[authentication](AUTHENTICATION.md) and [cloud archive contract](V2_CLOUD_ARCHIVE.md).
