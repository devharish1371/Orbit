# Orbit blockers

M4 implementation, tests and final signed APK build pass. The APK is ready for
human #7; screen-off, swipe-away and offline recovery must pass before M4 is tagged.
See `docs/TRACKING.md` and the [verified M4 build](https://github.com/devharish1371/Orbit/actions/runs/41067142247). The user accepted Profile/Map on Nothing Phone
(3a), Nothing OS 4.1; M3's qualitative device check is complete. M4 will need a separate
human #7 screen-off/swipe-away/offline test with its new build.

## Resolved — Email OTP sender and M2 logins

Gmail SMTP is configured using the owner-provided app credential, held only in ignored
local configuration. Real inbox delivery and Dev's email code login succeeded. Vidya's
UI login was verified with an admin-generated one-use code, without sending another email.
Both accounts restored on reload. Logout clears the session and query cache.

## Upcoming human gates

- #7: install the debug APK on Android phones for tracking/permission, screen-off,
  swipe-away and offline reliability tests. Hardware performance remains unverified.
- #3: Firebase project and private configuration for M5 push delivery.
- #6: personal anniversary letter for M7; profiles now allow people to set photos,
  nicknames and colors themselves. Shared date and Meet link are already configured.
- #1/#5: Pages/CI release configuration and backed-up signing key for M9.

## Resolved — Backend and GitHub

Hosted database/Vault/retention/cron and permanent passwordless identities are configured;
signup is disabled. Disposable-user integration tests pass. M0 and M1 are pushed to
`devharish1371/Orbit` with milestone tags. The password-choice requirement was superseded
by the user's email OTP request.
