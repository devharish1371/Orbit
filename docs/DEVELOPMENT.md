# Local development

The repository root is the existing `orbit-agent-docs/` directory. Numbered documents
are the source specification. Current progress is in `../PLAN.md` and `../DEVLOG.md`.

## Install from locks

Requirements: Node 24 LTS (minimum 22.12), Git, Python 3.11+. Run from the repo root:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r tools/requirements.lock.txt
npm ci
npm --prefix web ci
cp .env.tools.example .env.tools
cp web/.env.example web/.env.local
```

On Windows use `py -m venv .venv`, `.venv\Scripts\python.exe` instead of
`.venv/bin/python`, and `Copy-Item` instead of `cp`. Dependencies are never installed
globally. Placeholder environment files are enough for the M0 welcome screen.
Keep real keys in the ignored copies; do not paste them into chat.

## Checks before each commit

```sh
.venv/bin/python tools/bootstrap_check.py
.venv/bin/python -m pytest -m "not integration"
.venv/bin/python tools/secret_scan.py
npm run check:web
npm --prefix web run cap:sync
```

`check:web` runs ESLint, strict TypeScript checks for both app and tooling, Vitest,
Prettier, and the web production build. `cap:sync` builds with `VITE_BASE=./`,
disables the service worker for the native bundle, and syncs Android. It is
cross-platform and must be run before any local Android build. Do not copy a Pages
bundle into Android: Pages has a different asset base and service worker behavior.

Run `npm --prefix web run dev` and open `http://127.0.0.1:5173/` for the scaffold.
`npm --prefix web run preview` previews the most recent build. A web production build
uses `VITE_BASE=/` by default; Pages builds must set `VITE_BASE=/<repository-name>/`.
HashRouter avoids server-side SPA fallback requirements.

`npm --prefix web run format` formats application/tooling source. The provided numbered
specifications are intentionally preserved. `npm --prefix web audit --omit=dev` is a
reporting check, not permission to run automatic breaking dependency updates.

## Python helpers available in M0

- `bootstrap_check.py --help`: required local tools and scaffold files. Optional JDK
  absence is reported separately, not counted as a required failure. `--local-android`
  makes Java 21 a required check. SDK/Gradle compilation is verified only when available.
- `bootstrap_check.py --require-config`: rejects placeholder Supabase/account configuration;
  required before M1 integration tests. This does not replace authenticated service checks.
- `gen_secret.py --write`: initializes `ORBIT_FN_SECRET` in `.env.tools`, preserves an
  existing secret, and prints no value. Running without `--write` prints a new secret.
- `gen_icons.py`: regenerates local PWA and Android icons/splash. Supports `--source PATH`.
- `secret_scan.py`: scans tracked and unignored untracked source, reports filenames/rules
  only. Ignores actual secrets through `.gitignore`; tests cover key/JWT detection.

## Backend and native gates

Supabase CLI is pinned at the root: `npm run supabase -- --help`. `supabase init` has
already created `supabase/config.toml`. Public email and SMS signup are disabled locally.
The hosted project's Auth settings still require human #2 and explicit verification.
Docker is not required; use the hosted free project for M1 integration tests.

Capacitor Android is generated under `web/android/`, with Java 21 source compatibility,
minimum SDK 24 and compile/target SDK 36. Android Studio + JDK/SDK are optional for M0;
CI APK compilation is planned for M9. APK compilation, merged manifests, real background
tracking, runtime permissions, and killed-app push have not been verified in M0.
No permissions are requested by the M0 welcome screen.

Firebase's Google Services Gradle integration is already conditional on the ignored
`web/android/app/google-services.json` (human #3). Push cannot work until that task.
Biometric/voice/privacy plugins will be selected and verified in their feature milestones.

## Human #1 handoff

Create the free public GitHub repository and authenticate the GitHub CLI locally with
`gh auth login --hostname github.com`. Supply the repository URL, or set `origin`
locally. Tokens go into the OS credential store, never source files or chat.
M0 remains incomplete until its initial commit is pushed; tag `m0-done` only afterward.
