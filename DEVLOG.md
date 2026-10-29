# Orbit development log

## 2026-10-30 — M0 started

- Read all numbered documents (`00` → `09`) before implementation.
- Inspected the workspace: ten supplied Markdown files, no application and no Git repository.
- Created `PLAN.md`; using the existing folder as project root rather than nesting another app repo.
- Detected macOS, Node 24.7.0, npm 11.5.1, Python 3.13.7, Git 2.51.0.
- GitHub CLI exists, but its saved authentication is invalid. Human task #1 is required
  before M0's first-push acceptance can pass. Local scaffold work can proceed.
- No local Java runtime is installed. Local APK builds are optional; Android project
  generation and Capacitor sync will be checked separately from APK compilation.
- Verification and exact installed versions will be recorded after setup. M0 is not complete.

## 2026-10-30 — M0 local verification complete

Implemented:
- Initialized Git on `main`; preserved the ten input specifications at the root.
- Scaffolded Vite/React with strict TypeScript, unchecked-index checking, `@/` aliases,
  Tailwind's Vite plugin, HashRouter, centralized welcome copy and self-hosted fonts.
- Added credential-free welcome shell, Vitest/Testing Library, ESLint and Prettier.
- Added PWA manifest/static-only precache generation; native builds use relative asset
  paths with PWA disabled. Update registration UI belongs to M2.
- Generated Capacitor Android project (`app.orbit.couple`), declared future feature
  permissions, configured legacy bridge/native HTTP, disabled OS app backup, and created icons/splash.
- Initialized pinned Supabase CLI config with signup disabled locally. No hosted Auth setting
  has yet been changed or verified.
- Installed the Python venv and requirements lock; added bootstrap, secret generation,
  icons, secret scan and their applicable unit checks. Created ignored env copies and
  initialized the internal function secret locally without displaying it.
- Added development/decision/version records. TypeScript 6 is pinned because the generated
  TypeScript 7 template conflicts with the installed ESLint tooling's declared support range.

Verification:
| Check | Result |
| --- | --- |
| Clean `npm ci --offline` at root and under `web/` | Passed against committed lockfiles |
| `bootstrap_check.py` | 14 required checks passed; optional local JDK absent |
| `pytest` | 7 passed |
| Web ESLint / strict TypeScript / Prettier | Passed |
| Vitest component smoke | 1 passed |
| Web production build | Passed; entry JS ~82 KB gzip |
| Dev server and browser inspection | Welcome screen visibly renders with local fonts/icon |
| Native relative-base build + `cap sync android` | Passed; 9 plugins detected |
| Production `npm audit --omit=dev` | 0 vulnerabilities |
| Python dependency consistency | `pip check` passed |
| Secret scan / Git whitespace check | Passed; env files, Firebase config, venv and dependencies ignored |
| `bootstrap_check.py --require-config` | Expected failure: Supabase/account placeholders rejected |

Corrected the generated Android instrumentation smoke's default package assertion to
`app.orbit.couple`, and normalized Git line endings while retaining Windows batch checkout format.

Limitations: no local JDK/SDK, native test execution or APK compilation, hosted integration tests, merged-manifest
verification, live login, device background tracking or soak results yet. These belong to
later milestones; no completion claim is made for them.

GitHub correction: sandboxed auth status was misleading. Outside the sandbox, the existing
keychain login works. Confirmed the public repository `https://github.com/devharish1371/Orbit`
is empty and suitable for the initial push. Human #1 is satisfied. Publishing the initial
scaffold is next; M0 remains open until push succeeds.

## 2026-10-30 — M0 complete; stopped at human #2

- Created scaffold commit `97bac05` (`chore: scaffold orbit web tools supabase and android`).
- Successfully pushed `main` to `https://github.com/devharish1371/Orbit`; origin tracking is set.
- All required local M0 acceptance checks passed as recorded above. A final documentation
  commit records completion and will be tagged `m0-done` and pushed with that tag.
- M1 has not started. Stopped at `08_HUMAN_TASKS.md` #2 because a real Supabase project
  and populated local environment files are needed. The copies already exist:
  `.env.tools` (server/admin/account configuration) and `web/.env.local` (public URL/key only).
- Human next: create the Free project, configure Auth as documented in #2, fill those local
  files, and say "env files are ready". Keep passwords out of files/chat; account creation
  will prompt for them after the M1 admin tooling is implemented.
- Native APK compilation/device tests remain unrun because the optional local JDK/SDK
  is unavailable. No live integration, background tracking, push, or soak claim is made.
