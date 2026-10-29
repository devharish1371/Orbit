# Orbit blockers

## Human #2a — Email OTP sender credential (2026-10-30)

The user requested email OTP with a persistent session. Both permanent passwordless Auth
identities and their shared membership are provisioned; no password prompt remains.
The backend, Vault, retention function and cron are deployed, and security tests pass.

Custom SMTP is not configured. The built-in Supabase sender only delivers to organization
team members, so it does not satisfy normal login delivery for the couple. Gmail SMTP
host/port/user/from are already prepared in ignored `.env.tools`. The account owner must
create a Google app password and fill the single remaining `SMTP_PASSWORD` entry.
Do not put a regular Gmail password in that file or put sender credentials in chat.

Follow `docs/AUTHENTICATION.md` / `08_HUMAN_TASKS.md` #2a. The agent can then run
`configure_email_otp.py` to configure the sender and code template. Real inbox delivery,
client session persistence and both real logins remain M2 acceptance checks.
The hosted session timebox/inactivity limits are already zero; routine reopen should not
require a new code once the M2 client persists and refreshes the session.

## Resolved — Supabase project and permanent identities

API/DB/CLI credentials and both identities are configured privately. Hosted signup is
disabled. The earlier four-digit password issue was superseded by the email OTP request.
No user password was padded, invented or saved. Temporary test users were deleted.

## Resolved — GitHub access

Authentication works outside the sandbox. `devharish1371/Orbit` is the project's public
remote. M0 was pushed with `m0-done`; M1 publication is recorded in DEVLOG.
