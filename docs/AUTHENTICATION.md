# Email OTP and persistent sessions

The user's latest request replaces phone/password login with **email OTP**. The numbered
input documents describe the older flow; this amendment and the updated PLAN take priority.
Both permanent passwordless Auth accounts and their shared couple membership are provisioned.
Their email addresses and phones are held in ignored local configuration, not public source.
No chosen password has been stored or silently modified. Public signup remains disabled.

## Implemented login behavior (M2)

1. Enter email and request an eight-digit code. Use `signInWithOtp` with
   `shouldCreateUser: false`, so no third account is created.
2. Enter the code; verify with `verifyOtp({ email, token, type: 'email' })`.
3. Persist the session and refresh access tokens automatically. Reopening the app should
   restore the session without requesting an OTP. Logging out clears session/client caches.
4. Request a new code after explicit logout or if local data is cleared/access is revoked.
   Persistence cannot guarantee that device/browser storage is never lost.

The real project currently reports zero timebox and inactivity timeout, and single-session
restriction disabled. These already support long-lived sessions. Do not extend the one-hour
JWT lifetime to emulate persistent login: refresh tokens provide that behavior.

## Configured free email delivery

Gmail SMTP is configured and actual inbox delivery is verified. Supabase's built-in sender
only sends to organization-team addresses and was replaced for normal couple login. Do not add a partner as a
project administrator merely to get OTP delivery. SMS requires an external SMS provider and
conflicts with the original free/no-card constraint.

For this two-person, occasional-login app, a Gmail sender using an app password is an option:

1. In the sender's Google account, enable 2-Step Verification if needed.
2. Open [Google App passwords](https://myaccount.google.com/apppasswords), create one named
   Orbit, and save that generated credential locally. This requires the account owner;
   do not send a regular Gmail password or OTP through chat.
3. Fill these entries in ignored `.env.tools` (they are not application-login passwords):

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<sender Gmail address>
SMTP_FROM_EMAIL=<same sender Gmail address>
SMTP_PASSWORD=<generated Google app password, without display spaces>
```

If Google does not offer app passwords for the account, use another free SMTP provider
and its host/port/user/password instead. Keep the no-card requirement. No paid upgrade or
additional domain purchase is required by the implementation. Sender limits/policies still
apply; this setup is for two people, not bulk email.

Once the local sender credential is ready, the agent runs:

```sh
.venv/bin/python tools/configure_email_otp.py
```

This configures the sender and an OTP email template with the actual token, keeps signup
disabled, and selects an eight-digit code with a ten-minute expiry. It never prints sender
credentials or sends mail by itself. `--check` reads safe readiness flags without making
changes. Actual inbox delivery and Dev’s code login are verified. Vidya’s UI login was checked
with an admin-generated one-use code (no additional email). Both sessions restored after
reload; explicit logout returned to login. M4 moves native sessions to Android Keystore encrypted storage and migrates the saved
Capacitor Preferences login on an in-place upgrade. Native refresh behavior still needs
human #7 / later soak verification. Browser storage behavior is unchanged.

`tools/create_users.py` now defaults to passwordless provisioning and is safe to re-run.
Legacy synthetic-email password provisioning remains available via `--mode password` and
requires an interactive terminal and passwords that meet the hosted policy. It is not the
current login plan.

Sources: [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[sessions](https://supabase.com/docs/guides/auth/sessions), and
[Google app passwords](https://support.google.com/accounts/answer/185833).
