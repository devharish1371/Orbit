# 03 · Environment Setup — from absolute zero

Goal: an empty folder → a running dev environment, with a **Python venv**, pinned
**requirements**, the Node toolchain, Capacitor Android project, and Supabase CLI.
Detect the OS first (`uname -s` / `$env:OS`) and use the matching commands.

## 1. Prerequisites check (install anything missing)

| Tool | Version | Needed for | Install hint |
|---|---|---|---|
| Git | any recent | VCS | git-scm.com / `winget install Git.Git` / `brew install git` / `apt install git` |
| Node.js | **LTS (≥20)** + npm | web, Capacitor, Supabase CLI via `npx` | nodejs.org or `nvm` / `fnm` |
| Python | **≥3.11** | `tools/` scripts | python.org / `winget install Python.Python.3.12` |
| JDK | **17** | *only* local APK builds | Temurin 17 |
| Android Studio + SDK | latest | *only* local APK builds / emulator | optional — CI builds the APK |
| Docker | — | **not required** | skip |

> Local APK builds are optional. The GitHub Action in `07` produces the signed APK. Prefer CI.
> Still install Android Studio if the human wants to test on an emulator.

Write `tools/bootstrap_check.py` (see §5) that prints ✅/❌ for each tool and exact fix hints.

## 2. Create the project & git

```bash
mkdir orbit && cd orbit
git init -b main
mkdir -p docs supabase/migrations supabase/functions tools .github/workflows
# copy the provided .md docs into ./docs
```

`.gitignore` (create at repo root):
```gitignore
# deps / builds
node_modules/
dist/
.venv/
__pycache__/
*.pyc
web/android/app/build/
web/android/.gradle/
web/android/build/
web/android/local.properties
.idea/
.vscode/*
!.vscode/extensions.json

# secrets — NEVER commit
.env
.env.*
!.env.example
!.env.tools.example
*.jks
*.keystore
google-services.json
**/service-account*.json
firebase-adminsdk*.json

# OS
.DS_Store
Thumbs.db
```

## 3. Python venv + requirements (tools only)

```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # if blocked: Set-ExecutionPolicy -Scope Process Bypass

python -m pip install --upgrade pip
pip install -r tools/requirements.txt
```

`tools/requirements.txt` (create exactly; then run `pip freeze > tools/requirements.lock.txt`
after a successful install so versions are reproducible):
```text
supabase>=2.5
psycopg[binary]>=3.1
httpx>=0.27
python-dotenv>=1.0
pillow>=10.3
rich>=13.7
typer>=0.12
pytest>=8.2
pytest-asyncio>=0.23
pyyaml>=6.0
```

Always run Python tools **inside the venv**. Never `pip install` globally.

## 4. Environment files

`.env.tools.example` (commit) → copy to `.env.tools` (gitignored) and let the human fill it:
```ini
# ===== Supabase (human provides — see 08) =====
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=            # for CLI: supabase login --token
SUPABASE_DB_URL=                  # use the *Session pooler* URI (IPv4 friendly); includes DB password

# ===== Orbit internal =====
ORBIT_FN_SECRET=                  # random 32+ chars; agent may generate via tools/gen_secret.py
ORBIT_FN_BASE_URL=https://<project-ref>.supabase.co/functions/v1

# ===== Accounts to create (passwords are prompted, never stored) =====
USER_A_PHONE=+91XXXXXXXXXX
USER_A_NAME=
USER_B_PHONE=+91XXXXXXXXXX
USER_B_NAME=

# ===== Push =====
FCM_SERVICE_ACCOUNT_B64=          # base64 of Firebase service-account JSON
TELEGRAM_BOT_TOKEN=               # optional
TELEGRAM_WEBHOOK_SECRET=          # optional, random
```

`web/.env.example` (commit) → `web/.env.local` (gitignored):
```ini
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>      # public by design; RLS protects data
VITE_BASE=/                            # '/<repo-name>/' for GitHub Pages builds
```

## 5. Python tools to create (each with `--help`, typed, rich output, idempotent)

| Script | What it does |
|---|---|
| `bootstrap_check.py` | checks git/node/npm/python/java, venv active, env files present |
| `gen_secret.py` | prints a random URL-safe secret; can write into `.env.tools` |
| `apply_sql.py` | applies `supabase/migrations/*.sql` in order via `SUPABASE_DB_URL` (psycopg), tracks applied files in table `public._migrations` |
| `seed_vault.py` | creates Vault secrets `orbit_fn_secret`, `orbit_fn_base_url` from `.env.tools` (never prints values) |
| `create_users.py` | uses the Admin API: creates 2 users (`email=u<digits>@example.com`, `email_confirm=true`), inserts `couples` + 2 `members` rows. Prompts for passwords with `getpass`. |
| `reset_password.py` | admin password reset by phone number |
| `gen_icons.py` | builds Android adaptive icon + splash + PWA icons with Pillow from a source image, or from a generated gradient "orbit" mark if none provided |
| `simulate_location.py` | upserts fake moving points for a user along a polyline (to test map/geofence without driving) |
| `retention_run.py` | calls the retention Edge Function (manual run) and prints stats |
| `export_memories.py` | downloads kept posts + media to a local folder + `memories.json` |
| `keepalive.py` | pings REST so the free project never pauses |
| `tests/test_rls.py`, `tests/test_retention.py` | integration tests (see `07`) |

## 6. Scaffold the web app

```bash
cd orbit
npm create vite@latest web -- --template react-ts
cd web
npm install
```
Then install (use latest stable; consult each official install guide — Tailwind's Vite
plugin setup changes between majors):
```bash
# runtime
npm i react-router-dom @tanstack/react-query zustand motion lucide-react maplibre-gl \
      @supabase/supabase-js browser-image-compression canvas-confetti idb-keyval \
      @fontsource-variable/plus-jakarta-sans @fontsource-variable/fraunces date-fns
# styling
npm i -D tailwindcss @tailwindcss/vite
# pwa + test + quality
npm i -D vite-plugin-pwa vitest @vitest/coverage-v8 jsdom @testing-library/react \
         @testing-library/user-event @testing-library/jest-dom \
         eslint prettier eslint-config-prettier typescript-eslint \
         @types/canvas-confetti
# capacitor
npm i @capacitor/core @capacitor/app @capacitor/haptics @capacitor/device @capacitor/preferences \
      @capacitor/push-notifications @capacitor/local-notifications @capacitor/status-bar \
      @capacitor/splash-screen @capacitor-community/background-geolocation
npm i -D @capacitor/cli @capacitor/android
# plugin choices to verify on npm before installing (free, maintained, Android 14 compatible):
#   biometric: @aparajita/capacitor-biometric-auth   voice: capacitor-voice-recorder
#   screenshot block (optional): @capacitor-community/privacy-screen
```
Add npm scripts: `dev`, `build`, `preview`, `test` (vitest run), `test:watch`, `lint`,
`typecheck` (`tsc --noEmit`), `format`, `cap:sync` (`npm run build && cap sync android`).

`tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, path alias `@/* → src/*`.
`vite.config.ts`: `base: process.env.VITE_BASE ?? '/'`, aliases, `vite-plugin-pwa`,
manual chunk for `maplibre-gl`. Use `HashRouter`.

## 7. Add Capacitor + Android

```bash
cd web
npx cap init "Orbit" "app.orbit.couple" --web-dir=dist
npx cap add android
```
`web/capacitor.config.ts` essentials:
```ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'app.orbit.couple',
  appName: 'Orbit',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { useLegacyBridge: true },          // prevents bg location updates halting after ~5 min (verify on device)
  plugins: {
    CapacitorHttp: { enabled: true },          // native HTTP → not throttled in background
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 0 },
  },
};
export default config;
```
Edit `web/android/app/src/main/AndroidManifest.xml` and gradle per `05`. Place the human's
`google-services.json` at `web/android/app/` (gitignored) and apply the Google Services
Gradle plugin per Firebase's current Android setup guide.

## 8. Supabase CLI & project link
```bash
npx supabase@latest init                 # creates supabase/config.toml (if not present)
npx supabase@latest login --token $SUPABASE_ACCESS_TOKEN
npx supabase@latest link --project-ref $SUPABASE_PROJECT_REF
```
Apply SQL with either `tools/apply_sql.py` (preferred, uses pooler URL) or `supabase db push`.
Deploy functions: `npx supabase functions deploy retention --no-verify-jwt` (same for `notify`,
`telegram-webhook`). Set function secrets: `npx supabase secrets set ORBIT_FN_SECRET=... FCM_SERVICE_ACCOUNT_B64=... TELEGRAM_BOT_TOKEN=...`
(secret names must not start with `SUPABASE_`).

## 9. Editor/agent hygiene
- `.vscode/extensions.json` recommending ESLint, Prettier, Tailwind IntelliSense.
- Pre-commit: simple `npm run lint && npm run typecheck` via `husky` **or** a documented manual step.
- After everything installs: write `docs/VERSIONS.md` (node, npm, python, key package versions).

## 9b. Smoke test of the toolchain (end of Milestone 0)
1. `python tools/bootstrap_check.py` → all ✅
2. `cd web && npm run dev` → blank styled page loads at localhost
3. `npm run build && npx cap sync android` succeeds
4. `npm test` passes (include one trivial test)
5. First commit: `chore: scaffold orbit (web, tools, supabase, docs)`
