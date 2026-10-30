# M7 memories and device privacy

User exception: the personal anniversary letter stays **outside Orbit**. The visual
reveal uses generic anniversary copy, with no invented personal letter or bundled secrets.
It appears on the couple's local anniversary date once per signed-in user/device/year,
and can be replayed from Us → Timeline. Reduced motion skips confetti/entrance motion.

Us links to Keepsakes (both chat and Moments), a lazy Memory Map of loaded pinned keeps,
capsules and the timeline. Keepsakes use stable cursor pagination with a 90-card window.
The Memory Map shows only pins in that window; earlier pages are explicitly loadable.

Migration 0015 implements identity-derived, idempotent capsule creation, recipient-only
opening after the server unlock time and author cancellation before unlock. Existing
RLS hides all partner capsule content before unlock. A thirty-second screen refresh
handles time-based unlock without relying on the notification cron. Capsule alerts use
the existing ten-minute cron/outbox path. Creating a capsule never bypasses membership.

The database chooses today's question/day from the couple timezone and a stable 60-item
catalog. Answers are immutable and stamped by the server. Direct answer insertion is
revoked, so a client cannot backdate a response to inspect an old partner answer. Both
answers become readable only after both reply. Serialized writes produce one ready
event, without answer text in the event. Content-free social revisions refresh screens.

Permanent daily-summary counters record new Moments and arrivals from this update onward.
Existing nightly location rollup preserves them. Recap covers seven completed local days;
it labels available sampled travel as recorded kilometres, with no invented distance-apart
estimate or missing-data interpolation. Counters are not retroactively fabricated.

## Export

Settings creates an uncompressed ZIP (media is already compressed) containing kept posts,
their photos/audio/thumbnails, comments/reactions and JSON for RLS-visible capsules,
answers and daily summaries. Locked partner capsules remain hidden. No access/refresh
tokens, device tokens, live-location table or signed media URLs enter the JSON. Kept
post place pins remain part of those posts. A download is private and unencrypted.

Queries paginate; media errors abort the export instead of silently omitting files. The
archive is bounded to 400 MB / 20,000 entries; metadata queries also stop at 20,000 rows
per collection. Large exports currently assemble a Blob in memory, so memory on the
actual phone remains a physical check. Browser downloads use a revocable Blob URL.
Android uses ACTION_CREATE_DOCUMENT and bounded 256 KB bridge chunks to the user's
chosen destination; no broad file permission or cloud account is required. Cancellation
closes and attempts to remove an incomplete document (provider support can vary).

## Android lock and privacy

The native Activity installs an opaque cover independently of JavaScript. Optional app
lock requires the device's secure screen lock. Android 11+ uses platform BiometricPrompt
with strong biometric or device credential; earlier versions use device credential.
App launch locks immediately; one minute in the background locks using monotonic elapsed
time. Short background trips also cover the WebView until return. The cover hides the
WebView from accessibility while visible. Device authentication changes lock settings;
Orbit stores no custom PIN or biometric data. Locking does not stop the native tracker.

App lock or the independent screenshot option sets FLAG_SECURE, protecting screenshots
and app previews. Settings are device-local. Web users receive a clear Android-only
explanation rather than a cosmetic browser lock.

Official references checked 2026-10-31:
[Android KeyguardManager](https://developer.android.com/reference/android/app/KeyguardManager),
[Android BiometricPrompt](https://developer.android.com/reference/android/hardware/biometrics/BiometricPrompt),
[Capacitor plugin guide](https://capacitorjs.com/docs/plugins/android).

## Verification and open gates

- Hosted/local Python: **58 passed**, including capsule disclosure/open/cancel, server-dated
  immutable daily answers, reciprocal disclosure, permanent counters and existing RLS/TTL.
- Web: **49 passed**; worker: **16 passed**; lint/types/format/build pass. ZIP tests check
  CRC/directory fields and path safety; calendar tests check local-day boundaries/catalog.
- Browser verification and Android compilation are in progress. Device biometric/PIN,
  screenshot/preview privacy, 60-second resume lock and native ZIP saving still require #7.
- Telegram is optional and unconfigured; no bot account/token is needed for core features.
- M4/M5/M6 outstanding endurance/offline/partner/4G checks remain recorded separately.
