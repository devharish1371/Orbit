# M5 notifications and phone acceptance

The user authorized proceeding while M4's remaining physical checks are deferred. M4
stays untagged. M5 also remains untagged until real Android delivery passes.

## Configuration

Human #3 supplied a matching Firebase Android app and service account. The Android
package is `app.orbit.couple`. `tools/setup_firebase.py` validates matching project IDs,
saves `web/android/app/google-services.json` (ignored, owner-readable), puts the service
account base64 in ignored `.env.tools`, and configures private CI secret
`GOOGLE_SERVICES_JSON_B64`. No Firebase private credential enters a client bundle.

Deploy using `.venv/bin/python tools/deploy_backend.py --notify` for dry-run mode, or
add `--live` after checks pass. The helper runs strict type checks before deployment.
`NOTIFY_DRY_RUN` defaults to true when absent. Only the internal `x-orbit-secret` may
invoke the function; app users cannot invoke service delivery RPCs.

## Delivery behavior

Database triggers commit a private metadata-only outbox before best-effort HTTP. A
minute cron retries due jobs, with leases/backoff, six attempts maximum and seven-day
cleanup. It copies no message bodies, media paths or coordinates. The worker resolves
the other member of the same couple, applies their preferences and local quiet hours,
and claims a database dedupe key for type/actor/place/recipient for two minutes.
Per-device success hashes prevent re-sending successful devices on a partial retry.
Provider delivery and receipt persistence are not transactional; a crash between those
steps can still duplicate a notification. Notification tags collapse repeated displays.

FCM HTTP v1 uses a short-lived RS256 OAuth assertion and a cached access token. Sends
include a notification payload (Android can display it with the WebView absent) plus
allowlisted internal routing data. Speed, coordinates, chat text and media URLs never
appear in lock-screen payloads. Channels are alerts, social and quiet; Android controls
the final sound/visibility. Only explicit UNREGISTERED errors delete a device token;
generic 404/authentication failures remain retryable.

Normal alerts are suppressed during quiet hours in the couple's time zone. SOS and
stopped-sharing alerts bypass quiet hours, while an explicit stopped-sharing preference
still applies. Equal start/end disables quiet hours. Suppressed alerts remain visible
in Activity; they are not delivered later as a burst.

Android registration is opt-in at Settings → Notifications. Tokens are registered to
the signed-in user, refreshed on registration/reconnect/resume, and removed for this
device before explicit logout. A failed deregistration keeps the session and shows a
retry message rather than reporting a completed logout. Firebase auto-init is off before
opt-in. Web has activity/preferences but no background push subscription.

Home/Activity provide Thinking of you, Call me? and Need you. The urgent action asks for
confirmation inside Orbit and does not call emergency services. The server derives
actor/couple and enforces 2-minute nudge/call and 30-second urgent cooldowns. A saved
activity row confirms persistence, not delivery to another phone.

## Human #7 — delivery gate

Verified [M5 build 333a4c6](https://github.com/devharish1371/Orbit/actions/runs/41081000069).
Local APK: `.artifacts/apk/333a4c6/app-debug.apk`, 6,761,971 bytes.
SHA256: `9a0ec62a3f09c49d4578602561e8ecddb087d4aa5c3b93a69451decfb0d094bb`.
CI passed 33 web tests, 15 worker tests, Python checks, three native policy tests,
Android compilation, cryptographic APK signature verification, private tracking-service
manifest checks and Firebase native resource/messaging-service assertions. Local ZIP and
private credential/contact scans passed; v2 signing certificate matches M4's APK.
The complete hosted/local Python suite passed 47 tests separately. The notify worker
is deployed in live mode; real phone receipt is still unverified.

1. Update the installed M4 APK with the M5 build; the stable debug signing identity is
   preserved. Open Settings → Notifications → Enable notifications. Confirm ready.
2. Repeat on the other phone/account when available. Swipe Orbit away on the receiver.
   Send a nudge from the other account; confirm the notification arrives and tap opens
   Activity. Call me? should open the call/Meet screen. Urgent attention opens the map.
3. Exercise arrive/leave, low-battery and stopped/resumed sharing with consent, without
   fabricating real-account positions or battery readings. Confirm preferences and quiet
   hours suppress normal alerts, and enabled urgent/stopped alerts bypass quiet hours.
4. Confirm logout removes this device registration and opening/reconnecting restores
   registration after the next deliberate opt-in/login. Do not force-stop the receiver:
   Android force-stop prevents delivery until the app is opened again.

Automated tests use disposable accounts and mocked FCM transports. They establish RLS,
cooldowns, queue/dedupe access, token cleanup logic, private previews, OAuth signatures,
quiet-hour boundaries and retries. They do not establish real killed-app delivery.
