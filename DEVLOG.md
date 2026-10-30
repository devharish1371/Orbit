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

## 2026-10-30 — M1 started with real Supabase connectivity

- Stored user-supplied project credentials only in ignored `.env.tools` and public values
  in ignored `web/.env.local`; set file permissions to owner-only. No credential values
  are included in this log, source code, commits, or command output.
- Verified both API keys against the hosted Auth settings and connected to PostgreSQL 17.11
  over TLS through the session pooler. Hosted public signup is disabled.
- Separate account access for Edge Function deployment and the two permanent names/phones
  remain human #2 dependencies. Asked for those in the local environment file while building
  migrations and integration checks. Do not substitute a project key for an account token.
- Warned that deleting a chat does not revoke credentials; key/password rotation should
  be performed by the account owner and replacements saved in the ignored files.

## 2026-10-30 — M1 backend acceptance passed

Implemented and deployed:
- Five numbered migrations, applied atomically over TLS, checksum tracked and re-run
  successfully to prove idempotency. Supabase project linked using local account access.
- RLS and narrow grants on all tables; private security helpers; related-couple constraints;
  concurrent membership/quota protection; immutable post media paths and actual file sizes.
- Expiry, Keep/un-keep, visible modes, stale/resumed checks, daily summaries and durable capsule
  notification dedupe. Five cron jobs are present. Notify delivery remains M5.
- Private media bucket and deployed retention Edge Function. Real Storage API deletion,
  recursive/paginated orphan listing, post leases and orphan tombstones prevent Keep/reference
  races. Backend errors retain data for retry and produce an error status, not false success.
- Admin tools for migration/Vault/deployment, interactive user creation/password reset and
  manual retention. Current publishable/secret keys work; no project/CLI secrets are committed.
- Secret scanner now also detects account PATs and password-bearing database URIs.

Verification:
- Full initial Python run: 33 passed, including 20 live Supabase checks. One additional scanner
  regression was then added; the updated local Python suite passed all 14 checks (34 total
  distinct checks across the current suite, 20 hosted and 14 local).
- Live checks created disposable Auth users, tested isolation/column restrictions/quota/hidden
  content/Storage access, proved expired rows AND physical files disappear while kept files,
  avatars and fresh uploads survive, and verified cron/leases/stale/mode behavior.
- All temporary Auth identities, couple rows and test media were torn down through their
  corresponding admin/Storage APIs. No permanent users' data was used for test fixtures.
- Five retention worker tests passed, including file-deletion failure, backend/status errors
  and stale lease completion. Web smoke, strict TS (including function source), ESLint,
  Prettier and production build passed. Bootstrap with real config: 16 required checks passed.
- Secret scan passed with zero findings. The optional local Android JDK/SDK is still absent.

Remaining human #2 step 8: run `.venv/bin/python tools/create_users.py` in a local terminal
and privately choose the two permanent account passwords. Identities are already configured.
The script requires an interactive terminal and never stores/echoes passwords. No password
was invented. M1 backend acceptance criteria pass; M2's real two-user login depends on this
human-only step. No M2 implementation has started.

Password follow-up: the user supplied two four-digit choices. Read the actual hosted Auth
configuration (only allowlisted policy flags were printed): minimum six characters, email
provider enabled, email auto-confirm enabled, signup disabled. No permanent account was
created with an altered or padded password. Updated admin tools to enforce the actual
hosted policy; replacement password choice remains human #2. No passwords appear in this log.

## 2026-10-30 — Email OTP request supersedes password setup

- User chose passwordless OTP and provided both real email identities. Added the explicit
  authentication amendment and human #2a SMTP setup instructions; the original password
  requirement is superseded. Removed the password-choice blocker from the active plan.
- Provisioned both permanent, confirmed passwordless Auth users and shared memberships;
  a second run preserved them. No passwords were generated, stored or sent. No email was sent.
- Verified hosted session timebox/inactivity limits are zero, single-session restriction is
  disabled, JWT life is one hour, and existing code length is eight digits. M2 will persist
  and refresh sessions, allowing normal reopens without OTP. Storage clearing/revocation
  can still require another login.
- Custom SMTP is absent. Prepared the free Gmail sender defaults locally, leaving only
  SMTP_PASSWORD empty for the sender's Google app password. The configurator and safe
  readiness check are implemented. Actual delivery/template configuration awaits human #2a.
- Added a live disposable-user check for OTP verification, session refresh and explicit logout
  without sending email. This tests backend token flows, not real email delivery or client UI.

Final M1 verification after the OTP amendment: the complete updated Python suite passed
**36 tests (21 live integration + 15 local)**. Both permanent passwordless users were created
and idempotency verified separately. The five retention worker tests and web smoke passed;
web and backend ESLint, strict typechecks, formatting, production build and real-config
bootstrap passed. The final worker source was synchronized to the hosted function and a
sanitized health run was requested. SMTP/inbox delivery and the M2 client remain unverified.

M1 is ready for its Conventional Commit and `m1-done` tag. The current human gate is #2a,
`SMTP_PASSWORD` in ignored `.env.tools`; no account passwords or email addresses are needed
again. PLAN, BLOCKERS and authentication setup instructions reflect this latest scope.

Final hosted cleanup health check passed with zero errors. A count-only audit confirmed
exactly two permanent Auth users, one couple and two members; zero disposable test users,
post rows, cleanup tombstones or media objects remain. The staged milestone will be
published under `m1-done`; current SMTP setup instructions are ready for the owner-only step.

## 2026-10-30 — SMTP configured; M2 implementation started

- Stored the user-supplied app credential only in ignored owner-readable `.env.tools`,
  removing Google's display spaces. Supabase SMTP/template configuration succeeded;
  Gmail accepted SMTP authentication over TLS. The sender and credential were not printed.
- Corrected a Management API format mismatch: `smtp_port` must be a string, as verified
  by the current official reference and a sanitized HTTP 400 diagnostic.
- A normal Supabase OTP request to the user returned HTTP 200; the user confirmed arrival
  by supplying the eight-digit code. SMTP is no longer a human blocker.
- Starting M2: real email OTP client, session persistence/refresh, auth-gated private data,
  themeable shell, shared connection settings and Home. Generated types from live schema
  metadata (no row data). Added `0006_couple_connect.sql` for the shared Meet URL behind RLS.


## 2026-10-30 — M2 shell, login and personal profiles

- Built the auth-gated, mobile-first shell, Home/Us/settings and personal profile editor,
  with shared copy/config validation, offline/error/reconnect states, PWA update prompt,
  self-hosted fonts, reduced motion and Day/Night/Match device appearance.
- Verified actual Dev email OTP sign-in, session reload without OTP, explicit logout,
  Vidya login (admin-generated one-use code, no email send), correct partner contact links,
  and anniversary countdown. Saved the user-provided shared date/Meet URL behind RLS.
- Added private avatar compression/upload/reference/cleanup/signing, editable identity and
  nicknames, separate partner alias, personal color and synced app appearance. Browser test
  saved nickname/Day/violet accent, reloaded successfully, then restored initial values.
  Orbit icon upload/removal succeeded; no fabricated personal photo remains.
- New migrations 0006/0007 applied and generated schema types refreshed. Full Python suite
  **38 passed (23 live integration + 15 local)**, including self-only profile preferences,
  validation and own-upload avatar references. Fixtures were torn down via admin/Storage APIs.
- Web checks passed: 16 tests across 8 files, 5 worker tests, backend/web ESLint, strict
  typechecks, formatting and production build. Initial JS is ~155 KB gzip; profile
  compression is lazy. MapLibre remains outside first-load JS. Build warns on >500 KB raw
  entry chunk; gzip is below the 250 KB budget.
- Lighthouse: production login accessibility 100, best practices 100 after bundled-font CSP
  fix; Home authenticated DOM snapshots accessibility 100 in dark and light. Snapshots and
  screenshots containing private data stay ignored under .artifacts/qa, never public git.
- Native sync and the final profile accessibility result are recorded below after verification.

Final M2 checks: profile authenticated DOM accessibility **100**; Android native build/sync
passed (Java compilation not attempted). Full web checks passed after the theme-save
concurrency guard. Secret scan: 187 files, zero findings. The temporary profile nickname,
accent/theme changes and icon photo were restored/removed. Milestone ready for `m2-done`.


## 2026-10-30 — M2 published; M3 web map implemented

- Published M2 as `88ed64a`, tagged/pushed `m2-done`.
- Implemented lazy MapLibre with bundled Vite worker, OpenFreeMap Fiord/Liberty styles,
  visible attribution, animated personal/photo markers with battery/heading, accuracy/place
  radii, fit both, distance/midpoint directions, details sheet, connection status and trail.
- Added shared places create/edit/delete, radius/emoji/alert preferences and keyboard-friendly
  center selection. Alert copy states push is not yet active. Foreground sharing starts only
  on tap and clears watchers on hide/stop/logout. Tested consent/visibility lifecycle and
  filtering/throttling with mocked geolocation; actual browser GPS permission was not requested.
- One Realtime channel batches snapshot invalidation at 250ms, refetches on reconnect/visibility,
  and keeps Home location status current. Migration 0008 rejects precise history writes during
  pause/surprise (including an in-flight sender race), and publishes shared couple settings.
- Simulator creates disposable users/couple and synthetic public-area points, with private
  one-use login handoff and automatic cleanup. Browser confirmed live marker, distance,
  midpoint link and timestamp updates without reload; added a demo café and changed radius
  from 150 to 200m. User profiles/history were not used as simulation fixtures.
- Full checks: **22 web tests + 5 worker tests**, strict typechecks/lint/format/build pass;
  **39 Python tests (24 live + 15 local)** pass. Android asset sync passes. The initial entry
  is ~156 KB gzip; map engine ~292 KB gzip is lazy. Excluded map/worker from PWA precache.
- Preparing a pinned GitHub Actions Java 21 debug build for the human #7 Android WebView
  performance gate. Only public client variables configured on the existing repository.
  M3 remains untagged until that hardware acceptance check; M4 has not started.


M3 checkpoint `f8a34cd` and CI dependency correction `d04d921` are pushed. The first
[debug build](https://github.com/devharish1371/Orbit/actions/runs/40967068486) succeeded,
including Java/Gradle APK compilation, web checks, local Python checks and secret scan.
The compiled production map/worker rendered under CSP with zero console warnings/errors.
A local preview route briefly hit removed chunks during a concurrent dist rebuild; reloading
the finished assets recovered. Do not rebuild dist while testing a loaded production preview.

Authenticated map DOM accessibility scored 100. An additional label-content warning found
battery text omitted from marker accessible names; corrected the accessible label to include
battery/charging. Full web checks passed again after that fix (22 + 5 tests).
The simulator finished and removed its disposable users, couple, places and history.
A final APK build will include the accessibility correction; M3 still awaits human #7.
