# Orbit blockers

M3 web implementation passes automated checks. Its Android WebView performance acceptance
requires human #7 on a physical phone; the debug APK handoff is being prepared.
See `docs/MAP_TESTING.md`. M3 is not tagged complete and M4 has not started.

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
