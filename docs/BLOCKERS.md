# Orbit blockers

M4 implementation, tests and final signed APK build pass. The APK is installed on the
Nothing Phone (3a), Nothing OS 4.1. Short screen-off and swipe-away heartbeats, pause,
surprise and resume passed. Offline queue flushing, moving-update timing and full
30-minute endurance remain human #7 gates before M4 is tagged. The observer uses the
phone's hotspot, so an observer connection loss cannot establish a phone tracking failure.
See `docs/TRACKING.md` and the [verified M4 build](https://github.com/devharish1371/Orbit/actions/runs/41069740547).
The earlier Profile/Map usability check completed M3. The user explicitly authorized
continuing to M5 while M4's remaining physical tests are deferred; no M4 completion tag.

M5 implementation and hosted tests pass. Firebase human #3 files are validated and
configured privately. Signed Firebase APK `333a4c6` passed CI and matches M4's signing
identity; the live worker is deployed. Human #7 now needs to install the update, enable
notifications, and verify real background delivery/taps. See
`docs/NOTIFICATIONS.md`; do not claim killed-app delivery before the phone check.

## Resolved — Email OTP sender and M2 logins

Gmail SMTP is configured using the owner-provided app credential, held only in ignored
local configuration. Real inbox delivery and Dev's email code login succeeded. Vidya's
UI login was verified with an admin-generated one-use code, without sending another email.
Both accounts restored on reload. Logout clears the session and query cache.

## Upcoming human gates

- #7: install the debug APK on Android phones for tracking/permission, screen-off,
  swipe-away and offline reliability tests. Hardware performance remains unverified.
- #3 resolved: matching Firebase Android/service-account files supplied and configured.
- #6: personal anniversary letter for M7; profiles now allow people to set photos,
  nicknames and colors themselves. Shared date and Meet link are already configured.
- #1/#5: Pages/CI release configuration and backed-up signing key for M9.

## Resolved — Backend and GitHub

Hosted database/Vault/retention/cron and permanent passwordless identities are configured;
signup is disabled. Disposable-user integration tests pass. M0 and M1 are pushed to
`devharish1371/Orbit` with milestone tags. The password-choice requirement was superseded
by the user's email OTP request.
