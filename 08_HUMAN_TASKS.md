# 08 · Human-Only Tasks (the agent cannot do these)

The agent works autonomously and stops **only** when it needs one of these. Everything here is
free and needs **no credit card**. Put secrets in the local files named below — **never paste
secrets into chat**. UI labels in dashboards change over time; follow the spirit and tell the
agent if something looks different.

---
## #1 · GitHub (needed from Milestone 0 / before M9)
1. Create a GitHub account (free) and a **public** repository named e.g. `orbit`.
   (Public is required for free Pages + free Actions minutes. Safe because no secrets are committed.)
2. Give the agent access to push (e.g., `gh auth login`, or add a remote with a personal access token stored in your OS keychain).
3. Later (M9): repo → **Settings → Pages → Source: GitHub Actions**.
4. Later (M9): repo → **Settings → Secrets and variables → Actions**:
   - *Variables:* `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - *Secrets:* `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
     `ANDROID_KEY_PASSWORD`, `GOOGLE_SERVICES_JSON_B64`, (integration workflow only) `SUPABASE_SERVICE_ROLE_KEY`.

## #2 · Supabase project (needed for Milestone 1)
1. Sign up at supabase.com (GitHub login works). Create a **Free** project. Region: **Mumbai
   (ap-south-1)** if offered, otherwise the nearest (Singapore). Save the **database password**.
2. Authentication → **Sign In / Providers**: turn **OFF "Allow new users to sign up"**; email provider
   ON, **"Confirm email" OFF**. (Accounts are created by the admin script.)
3. Database → **Extensions**: enable `pg_cron`, `pg_net` (and confirm **Vault** is available) if the SQL
   migration could not enable them.
4. Project Settings → **API**: copy *Project URL* and the public client key (labelled `anon` or
   `publishable`) and the **service/secret key** (`service_role` / `secret`) — keep the secret one private.
5. Project Settings → **Database → Connection string → Session pooler** (IPv4 friendly): copy the URI
   and insert your DB password.
6. Account (avatar menu) → **Access Tokens** → generate a token for the CLI.
7. Fill **`.env.tools`** at the repo root (copy from `.env.tools.example`) with: `SUPABASE_URL`,
   `SUPABASE_PROJECT_REF`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_DB_URL`, and the two phones/names. And `web/.env.local` with the URL + public key.
   Tell the agent: "env files are ready" (not the values).
8. Run (or let the agent run) `python tools/create_users.py` — you will be **prompted for the two
   passwords** (min 10 chars). Pick passwords you'll both remember; store them in a password manager.

## #3 · Firebase project, for push only (needed for Milestone 5)
1. console.firebase.google.com → **Add project** (name `orbit`; Analytics can be OFF). Stay on the free **Spark** plan; skip any upgrade prompt.
2. **Add Android app**: package name **`app.orbit.couple`** (must match `capacitor.config.ts`). Download **`google-services.json`** → place at `web/android/app/google-services.json` (it is gitignored).
3. Project settings → **Service accounts → Generate new private key** → save the JSON **outside the repo** (e.g. `~/secrets/orbit-fcm.json`).
   Base64 it and put the single-line result in `.env.tools` as `FCM_SERVICE_ACCOUNT_B64`:
   - macOS: `base64 -i ~/secrets/orbit-fcm.json | tr -d '\n'`
   - Linux: `base64 -w0 ~/secrets/orbit-fcm.json`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\secrets\orbit-fcm.json"))`
4. Also base64 `google-services.json` for CI → GitHub secret `GOOGLE_SERVICES_JSON_B64` (same method).
5. If Google blocks service-account key creation for your account, tell the agent — we fall back to **Telegram-only** alerts.

## #4 · Telegram bot (optional, Milestone 7)
1. In Telegram, chat with **@BotFather** → `/newbot` → name + username → copy the token.
2. Put it in `.env.tools` as `TELEGRAM_BOT_TOKEN`; generate `TELEGRAM_WEBHOOK_SECRET` (agent can via `tools/gen_secret.py`).
3. Each of you opens the bot once and uses Settings → "Connect Telegram" in the app.

## #5 · Android signing key (needed for Milestone 9) — **back this up forever**
```bash
keytool -genkeypair -v -storetype JKS -keystore orbit.jks -alias orbit \
        -keyalg RSA -keysize 2048 -validity 10000
```
(Needs JDK; `keytool` ships with it. Use a strong password.) Save `orbit.jks` **outside the repo**
and keep two backups (password manager + cloud drive). Base64 it → GitHub secret `ANDROID_KEYSTORE_B64`;
add the passwords/alias secrets from #1. Losing this key = every future update requires uninstalling.

## #6 · Personal details to give the agent (non-secret; goes into `couple.config.ts`)
Names & nicknames · both phone numbers (E.164, `+91…`) · anniversary date · Google Meet link ·
favorite colors · timezone (`Asia/Kolkata`) · quiet hours · 5–10 inside jokes or captions for
onboarding/reveal copy · a couple of photos for avatars (JPG/PNG) · the **anniversary letter text**
(a heartfelt message for the reveal screen — this is the heart of the gift ❤️).

## #7 · Installing the APK on both phones
1. Download `orbit-vX.Y.Z.apk` from the GitHub Release (or the file the agent builds).
2. Open it → allow **Install unknown apps** for the browser/Files app.
3. Open Orbit → log in → follow **Tracking health** onboarding:
   Location **Allow all the time** · Notifications **Allow** · Battery **Unrestricted/Don't optimize** ·
   (Xiaomi/Oppo/Vivo/Samsung: also enable Autostart / lock the app in Recents).
4. After any phone reboot, open Orbit once.

## #8 · Ongoing care (put in README)
- Open the app regularly (also keeps the free Supabase project awake).
- Export memories monthly (Settings → Export).
- If Supabase says "project paused", click **Restore** in the dashboard (data is kept).
- Review free-tier usage (Supabase → Reports) every few months.

## #9 · The gift moment 🎁
Install on her phone beforehand (or do it together), set the reveal to the anniversary date, and
hand over a card with the website/APK link. The first launch on the anniversary plays the
reveal. Test the reveal on your own phone first (Us → Timeline → "Replay reveal").

---
## #2a · Email OTP sender (user-requested alternative added 2026-10-30)

The user's later request replaces phone/password login with email OTP and persistent
sessions. Both real-email accounts are already provisioned. No password choice is needed.

For the free Gmail SMTP option, the sender's account owner enables 2-Step Verification,
creates an app password at https://myaccount.google.com/apppasswords, and puts only that
generated app credential in local `.env.tools` as `SMTP_PASSWORD`. The sender host, port
and address can be prepared by the agent. Never provide a normal Google password.
The agent then configures Supabase's SMTP/template and verifies real OTP delivery.
If app passwords are unavailable, use another free/no-card SMTP sender.

Full steps and session behavior: `docs/AUTHENTICATION.md`. Supabase's default sender
is restricted to project-team addresses; do not grant a partner project access as a
workaround. Email OTP can stay free; SMS delivery is outside the no-cost constraint.
