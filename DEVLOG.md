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


## 2026-10-30 — Debug APK ready; human #7 handoff

Final source build `d9fff3d` passed the [updated Android debug workflow](https://github.com/devharish1371/Orbit/actions/runs/41028725065): web
lint/typecheck/format/build, 22 web + five worker tests, 15 local Python checks (24 hosted
checks intentionally skipped in CI), secret scan, native sync and Java/Gradle compilation.
The hosted suite was run locally with all **39 passing** before the checkpoint.

Downloaded `.artifacts/apk/d9fff3d/app-debug.apk` (6,792,525 bytes). ZIP CRC integrity passes,
Android's modern APK signing block is present, and scanning packaged web assets found no
secret patterns or real email identities. This is a packaging sanity check, not an independent
cryptographic apksigner verification; Android verifies the signature during human installation.
SHA256: `baecc6c3c492531f7564cdefa75088b37801e5308a4ff7e0efdb08d1b76db80a`.
The APK and checksum are ignored local artifacts; no binary/private screenshot enters git.

Dev's preview session was restored with an admin-generated one-use code (no email sent),
and the private handoff file was removed. The profile page is left open. Demo production
session/tab and owned production/static QA servers were closed; the user-facing dev preview
remains available. Temporary viewport override reset. Source scan: 207 files, zero findings.

**Stop at human task #7:** install this debug APK on an Android phone and perform M3's
mid-range WebView map performance check. Test profile editing/photo/theme persistence too.
Report phone model and findings; do not infer hardware performance from desktop screenshots.
M3 remains untagged; M4–M9 remain pending. No background tracking/push delivery claim is made.


## 2026-10-30 — Human M3 phone check accepted; start M4

The user reports Profile and Map work well on a Nothing Phone (3a), Nothing OS 4.1.
Accepting that direct human usability/smoothness check to close M3 and tag `m3-done`.
This is qualitative device feedback; no instrumented FPS measurement was supplied.
Automated/source/APK evidence remains the verified M3 checks recorded above.

Starting M4: explicit native permission onboarding, Android battery/settings helper,
foreground-service tracker with native HTTP, bounded offline queue/backoff, adaptive
location/battery modes, geofences and visible pause/surprise controls, tracking health
and coordinate-free diagnostics. M4 screen-off/swipe-away/offline acceptance is separate
and still requires human #7 using the next APK.


## 2026-10-30 — M4 implementation checkpoint

- Implemented an unbound Android location foreground service, native HTTP and bounded SQLite
  queue (500 items). The community plugin stops its service in onUnbind; inspected installed
  source and current maintainer docs, then replaced it rather than depending on WebView
  callbacks after activity destruction. Runtime screen-off/swipe-away behavior is not yet
  verified. Service is private, stopWithTask=false, with an ongoing visible notification.
- Native session storage uses Android Keystore AES-GCM. An adapter migrates the existing
  Capacitor Preferences session without OTP. Native service and JS refresh requests share
  one synchronized refresh owner using standard Supabase refresh tokens, avoiding competing
  token rotations. Logout stops tracking and clears native session/queue.
- Added one-step permission onboarding, Nothing OS battery guidance, Tracking Health,
  pause/surprise durations, degraded-state banner and coordinate-free diagnostics. Browser
  tracking keeps its explicit foreground-only flow; sharing controls work from either client.
- Native policies: fresh/accuracy/mock/GPS-jump filtering, movement/stillness/low-battery
  modes, 30s moving upload floor (free-tier budget), five-minute heartbeat, native network
  reconnect/backoff, hysteresis with two good geofence fixes and low-battery cycle handling.
- Migrations 0009/0010 add privacy generations, atomic batch ingestion, retry-safe history
  IDs, geofence state/events and server event dedupe. Pause/surprise transitions invalidate
  old queued generations. Generated public schema metadata refreshed without row data.
- 25 web tests and five worker tests passed, strict lint/typecheck/format/build passed.
  New hosted ingestion tests passed; the full run had 41 passes and two old retention tests
  hit connection resets. A full rerun outside the sandbox is in progress; not claiming green
  until it completes. Native policy JVM tests and merged-service/signature checks are added
  to debug CI and will be verified in the next build. M4 stays untagged pending human #7.


M4 pre-build verification: complete live suite rerun outside sandbox **43 passed** (28 hosted,
15 local); connection resets did not repeat. Updated web suite **28 passed** plus five worker
tests, lint/strict typecheck/format/build pass. Native asset sync passed after removal of
the community plugin. Added explicit, bounded upload wake locks and an inexact heartbeat
alarm that wakes only an existing consented service; it never starts tracking after reboot.
Alarm timing is OS-controlled, so real screen-off reliability remains a phone test.

Debug signing is being made persistent in private CI secrets with an ignored encrypted
PKCS12 backup. This is a debug identity only; release signing remains human #5. The earlier
M3 runner used a disposable debug key that cannot be recovered, so the first M4 install
requires uninstalling M3 once and signing in again. Later M4 debug builds will update in place.


M4 first native CI build [0454671](https://github.com/devharish1371/Orbit/actions/runs/41066011969)
succeeded: three native JVM policy tests, Android compilation, cryptographic apksigner
verification and private foreground-service merged-manifest assertion all pass, along with
web/Python/source checks. Browser Tracking health navigation and foreground-only copy render
correctly; zero console warnings/errors observed. A screenshot is ignored under .artifacts/qa.

Final review strengthened queued mode synchronization even before the service starts,
retries on reconnect/resume, removes private native caches on logout/account change, and
checks the queued account identity under the auth lock before HTTP. Added clock-skew
feedback and removal of invalid future batches. Final build will include these corrections.
Full web checks passed after changes; one targeted hosted privacy assertion is being verified.
Physical screen-off/swipe-away/offline/native refresh behavior remains human #7; see TRACKING.md.


## 2026-10-30 — M4 signed test APK ready; human #7 gate

Final source `721f87e` [CI build](https://github.com/devharish1371/Orbit/actions/runs/41067142247) succeeded: 28 web tests, five worker tests,
15 local Python checks (28 hosted intentionally skipped in CI), three native JVM policy
checks, strict lint/typecheck/format/build, native sync/Java compilation, cryptographic
apksigner verification, private foreground-service manifest checks and source secret scan.
The complete hosted/local suite passed all 43 tests separately; the four native hosted
checks passed again after the generation-column write restriction assertion was added.

Downloaded `.artifacts/apk/721f87e/app-debug.apk`, 6,751,361 bytes. ZIP integrity and a scan
of packaged web/Dex assets for configured private credentials/email identities pass.
No keystore/env files are packaged. SHA256:
`ad20212ec1450130f9bac2e64567f07f3ca50d777d6b406e36a6646ee9b82a18`.
The APK/checksum/debug-key backup and screenshots remain ignored; private env/key files
are owner-readable. Source scan is clean. Local user-facing preview remains on port 5173.

**Stop only for human #7:** one-time uninstall M3 (different old debug signing key), install
M4, sign in, complete Tracking health consent/permissions, and run the 30-minute screen-off,
swipe-away and airplane-mode queue-recovery checks on the Nothing Phone (3a) / Nothing OS
4.1. Also verify pause and surprise from the observer. Full steps: docs/TRACKING.md.
M4 remains untagged; no claim of real background/OEM reliability is made before those results.
M5–M9 remain pending. Firebase task #3 comes after M4 acceptance.


Final review before handoff found that adaptive transitions were triggered only by fresh GPS
callbacks. The native heartbeat now also enters still/low-battery mode when GPS is quiet,
and stops showing stale moving-speed values. This is required for the stationary battery
policy, so the human APK is being rebuilt from `42e45cb` with this correction. The earlier
721f87e artifact remains an intermediate verified build, not the final handoff binary.

While saving that correction, an extra write accidentally replaced DEVLOG with the native
service source. Restored the complete log from the preceding documentation commit 79c04ac
and appended this entry. No application source or private runtime data was lost.


Final M4 handoff build **42e45cb** [passed CI](https://github.com/devharish1371/Orbit/actions/runs/41069740547) after the idle-policy correction.
All web/Python/native policy, signature and merged-service checks passed. Downloaded
`.artifacts/apk/42e45cb/app-debug.apk` (6,751,361 bytes); ZIP/private-data scan passed and
its signing certificate matches the persistent debug key. SHA256: `15fa29f8f4a01bada10268969de01c4605054a5f8fe8e85de1a9cd41ea34a141`.
The source of this APK supersedes the intermediate 721f87e handoff above.

Final gate remains human #7 only: install and test 30-minute screen-off, swipe-away,
airplane-mode recovery and visible pause/surprise behavior. M4 is untagged. The test APK,
checksum, private debug-key backup and screenshots are excluded from Git; all intended
source/docs are committed. Nothing Phone (3a), Nothing OS 4.1 feedback is recorded for M3.


## 2026-10-30 — Real-phone short screen-off observation

The user asked for a second-device observer. Reused the existing Dev desktop web session,
opened Map → You, and left desktop GPS sharing off. The observer displayed the phone’s
marker, battery and accurate-fix metadata. No new login or account change was necessary.

The user confirmed screen off at about 20:02 IST. Started a read-only metadata sampler
(no coordinates queried or logged). Supabase recorded a fresh phone heartbeat at
**20:04:00 IST**, after that confirmation, with battery **49%**. GPS capture time remained
older while the phone was stationary; the fresh server upload time is the background signal.
Six metadata samples were collected over approximately six minutes. Private evidence is
in ignored `.artifacts/private/tracking-observation/`.

The user requested quicker verification, so the 30-minute observer was stopped. The short
screen-off heartbeat check is positive; the 30-minute endurance criterion was NOT completed.
Swipe-away, offline queue recovery and real pause/surprise tests remain unverified; M4 stays
untagged. Added a bounded read-only observation helper for subsequent explicitly requested
tests. Helper syntax/help and source secret scan checked; no production app code changed.


## 2026-10-30 — Swipe-away and real privacy controls

On the same Nothing Phone (3a) / Nothing OS 4.1 with APK 42e45cb, the user confirmed
swiping Orbit out of Recents while its notification remained around 20:12:46 IST.
Observed a fresh server heartbeat at 20:14:06 IST, battery 46%. This establishes a
post-swipe upload, without claiming measured moving-position latency.

An attempted offline check showed queue count zero. The user then clarified that the
Mac observer's internet comes from the phone's hotspot. Read-only observer connection
errors during disconnection are inconclusive. Uploads resumed at 20:22:38 IST, but
queue flushing is not established without a captured queued item. The user deferred the
separate offline movement/queue-count check until later; do not disconnect the hotspot.

The user confirmed pause, then surprise, then live on the phone. The server confirmed all
three modes; the browser verified pause and surprise. Thirteen paused samples had one
unchanged upload timestamp and the observer hid
the marker. A fresh surprise upload at 20:33:00 IST had fuzzed=true, null speed/heading,
blur-grid membership and >=2000 m accuracy. Only computed flags and metadata were returned;
no coordinates were logged. The observer showed approximate location. Resume produced
a fresh live upload. Private evidence remains ignored under .artifacts/private/tracking-observation.

Added observation labels to preserve separate test runs and read-only computed privacy
flags. No production application code changed. Full endurance, moving timing, timed-mode
expiration and verified offline queue flushing remain open; M4 stays untagged.

Validation: helper syntax/help and both one-minute live database observation runs passed,
with five samples each and zero observer errors. Source secret scan: 231 files, zero
findings; git diff whitespace check passed. Production source and APK are unchanged, so
the previously passing full web/Python/native suites and signed build remain applicable.


## 2026-10-30 — M5 implementation; M4 physical gate deferred by user

The user requested proceeding with the offline test later. Recorded an explicit exception
to milestone ordering in PLAN; M4 remains untagged with offline/endurance/moving checks
open. Human #3 then supplied Firebase Android and service-account files. Validated matching
project/package IDs, copied ignored local configuration, and set the private Android CI
secret. No key values or downloaded JSON files enter Git.

Implemented a metadata-only private notification outbox, leased retries/cron, atomic
two-minute dedupe, per-device partial-retry receipts and explicit UNREGISTERED cleanup.
FCM v1 uses WebCrypto RS256 and cached OAuth. Quiet hours follow the couple's time zone;
SOS/stopped-sharing bypass quiet hours. Preferences remain honored. Lock-screen copy is
generic and does not include chat bodies, media URLs or coordinates.

Added opt-in native token registration/channels, safe notification routes, token removal
before logout, per-person preferences/quiet hours, Activity, and Home nudge/call/urgent
actions. Attention RPCs derive ownership and enforce cooldown/idempotency. Android CI
receives Firebase config privately and preserves the existing stable debug signing key.

Initial dry-run deployment had an incorrect authorization-helper import, caught by the
strict type/hosted endpoint tests. Fixed and redeployed; the deployment helper now requires
passing strict type checks first. Initial full hosted run also exposed the expected cron
assertion needing both new jobs and two transient connection resets. Updated that assertion;
the next complete run passed **47/47**. All **31 web** and **15 worker** checks passed with
lint/typecheck/format/build. Source scan **251 files, zero findings** after eliminating
synthetic PEM-header false positives in test/validation source. Native compilation and
real phone delivery remain pending; APK preparation continues.

Final local web pass after adding urgent-confirmation/cooldown UI tests: **33/33**;
worker checks **15/15**. Source scan **254 files, zero findings**. Firebase OAuth and
FCM API access also passed a validate-only probe with an intentionally invalid device
token, which cannot deliver to a phone. Preferences and real activity loaded in the
authenticated browser. No real attention request was sent during this browser check.

M5 [CI run 41081000069](https://github.com/devharish1371/Orbit/actions/runs/41081000069)
passed for commit **333a4c6**: web/worker/Python checks, three native policy tests,
Android compilation, apksigner verification, private foreground-service manifest checks,
and Firebase native resource/messaging-service assertions. Downloaded the 6,761,971-byte
APK; ZIP integrity and private credential/contact scan passed. Its v2 signing certificate
matches the installed M4 build, so an in-place update is supported.
SHA256: `9a0ec62a3f09c49d4578602561e8ecddb087d4aa5c3b93a69451decfb0d094bb`.

Deployed the tested notify worker in live mode. Requested human #7 to install the APK,
opt in to notifications and explicitly authorize one labelled test push to Dev's phone.
Prepared a test helper that targets only the most recently registered Android device of
the requested person; it does not invent partner activity. A provider acceptance result
will not be described as phone delivery without confirmation. M5 remains untagged.


## 2026-10-30 — M5 real background push and Activity tap passed

The user confirmed the M5 APK update and notification readiness, swiped Orbit away, and
explicitly requested the single labelled Orbit test push. Ran the prepared helper for
Dev's most recently registered Android device. FCM accepted the one notification at
21:05:08 IST; no additional push or fabricated partner activity was sent.

The user confirmed **“Arrived and opened Activity.”** This verifies real registration,
background notification display after swipe-away and the Activity notification tap on
Nothing Phone (3a), Nothing OS 4.1. Provider metadata is ignored under
.artifacts/private/push-test; no token/credential appears in the public log.

The test used the production FCM sender directly, so it does not establish real
partner-event/outbox delivery or all alert types/routes/quiet-hour behavior on hardware.
Requested the next human #7 partner-phone check. M5 stays untagged pending those results;
M4 offline/endurance checks remain deferred. No application source changed in this check.

The user clarified that Vidya's phone is unavailable because the whole app is a surprise
gift. Her onboarding and second-phone acceptance will happen at the reveal. Continue
the build with disposable identities, keeping those hardware checks open and her account
untouched during further testing. Beginning M6 Moments/Chat implementation; M4 and M5
remain untagged until their outstanding acceptance checks can be completed.


## 2026-10-30 — M6 Moments/Chat implementation underway

Added shared text/photo/voice/mood composers, paginated feed/chat, signed-media caching,
photo thumbnails/full-screen viewing, comments/reactions, Keep/un-keep, expiry indicators,
Home expiring-soon strip and Settings storage/cleanup transparency. Photos are re-encoded
locally to WebP (maximum 1600px / 250KB, thumbnail 400px / 40KB) without EXIF. Voice capture
is opt-in, bounded to two minutes, released on background/unmount/cancellation, and is
never uploaded before Share. Added the normal Android MODIFY_AUDIO_SETTINGS permission
required by Capacitor's installed WebChromeClient microphone permission flow.

Migrations 0013/0014 add ownership-derived idempotent post creation with atomic Keep,
author-only unsend tombstones, immediate expired-content RLS, protected referenced media,
private typing policies and scoped storage summaries. Unsend requests the existing
Storage-API retention worker; no physical file is deleted through SQL. A content-free
couple revision invalidates clients when RLS hides an unsent row, so no hidden content
needs to enter Realtime payloads. Tests use disposable identities only.

First six new hosted post scenarios found only the expected 204 response for a void RPC;
that assertion was corrected. The next full run passed 52/53, with the older Storage test
still expecting partner access to unshared uploads. Updated it to assert pending files
are private and a properly shared photo is readable. Web unit checks pass 40 cases,
including ambiguous upload responses, expiry boundaries and microphone lifecycle. Full
typing/RLS/browser/native verification continues before the M6 checkpoint commit.


## 2026-10-31 — M6 familiar messenger and browser acceptance

The user requested a normal Instagram/WhatsApp-style chat. Reworked Chat to a partner
header, bottom textarea/photo/mic/send controls, date separators and personal bubbles.
Reactions/Keep/copy/unsend live behind press/hold or the message menu. Enter sends and
Shift+Enter inserts a newline. Expiry choices sit under More; no fake read receipt is
shown. Moments retains its feed, caption, comment and Keep controls.

Private typing initially failed membership authorization because subscribe raced initial
Realtime authentication. Awaiting setAuth fixed it; no permission broadening was needed.
The complete hosted/local run now passes **54/54**, including actual Presence delivery
between disposable members and rejection of stranger/other-couple joins. Final web pass
is **44/44**, worker pass **16/16**, with strict lint/types/format/build green.

Production browser QA on isolated port 4173 verified real text send, a synthetic photo
compressed to 1600×1018 then uploaded/displayed, full-photo viewer, persisted reactions,
Moment posting, comments and Keep. Dark/light layouts fit 412×915 and 360×800 without
horizontal overflow. The normal Dev login stayed on port 5173. No real partner message
was sent. Temporary preview/accounts/media were cleaned using the Storage API.

Fixed cached Chat entry scrolling (global route reset no longer overrides latest-message
position), a transient 8d label for a freshly created 7d post, and closing composer More
after a send. Added Android keyboard resize and native permission assertions to CI.
Source scan: **277 files, zero findings**. Full implementation/check details and outstanding
device voice/4G/reveal-phone gates are in docs/MOMENTS_CHAT.md. M6 stays untagged.


## 2026-10-31 — M6 Android build verified and handed off

Implementation commit **2133d94** is pushed. [Android CI run 41111763994](https://github.com/devharish1371/Orbit/actions/runs/41111763994)
passed web/worker/Python checks, three native policy tests, compilation, apksigner,
tracker/Firebase assertions, audio permissions and keyboard resize. Downloaded the
**6,781,149-byte** APK; its v2 signing certificate matches M5 for an in-place update.
SHA256: `641b1032cff5da08db01b6c09f01eaee546d75921052c125b16274c8b37b7d24`.

Added a repeatable local APK verification helper. ZIP integrity and configured private
material checks pass. An initial broad prefix check matched the Supabase SDK's literal
secret-key rejection prefix; complete credential patterns resolve that false positive
while retaining exact configured-secret checks. No private credential was found.

The temporary QA server/tab, disposable accounts/couple and synthetic uploaded media
are cleaned up; the normal Dev session is preserved. Requested human #7 to install the
M6 update and check short voice preview/playback, composer visibility with keyboard,
and microphone release on background. No message needs sending. Voice on both phones
and 4G timing remain unverified; M6 is untagged and Vidya's tests stay deferred until reveal.

## 2026-10-31 — M6 Dev voice and keyboard acceptance passed

The user installed M6 and confirmed **“Voice, keyboard and background stop all pass.”**
Recorded short voice preview/playback, keyboard composer visibility and background
microphone release as passed on Nothing Phone (3a), Nothing OS 4.1. The remaining
second-phone voice/4G acceptance stays open; no M6 completion tag. Continuing M7 under
the surprise-gift exception and requesting the human-authored anniversary letter (#6).

## 2026-10-31 — M7 memories, capsules and privacy implementation

The user clarified that the anniversary letter must stay outside the app. Implemented a
visual anniversary reveal/replay with generic copy, and no personal-letter field. Added
Keepsakes across both channels, a lazy Memory Map, timeline, daily questions and recap.

Migration 0015 is applied; schema types refreshed. Capsules use scoped/idempotent creation
and server-timed recipient opening. Daily replies use a canonical local day/index and
are immutable; direct inserts are revoked to prevent backdated-answer peeking. Permanent
Moment/arrival counters survive TTL; recap labels available GPS travel honestly. New
hosted scenarios pass, and the complete suite passes **58/58** with disposable identities.

Added a bounded ZIP export of kept media and RLS-readable memories, Android document
saving without broad permissions, native launch/60-second device lock and screenshot/
preview privacy. Web checks pass **49/49**, worker **16/16**, lint/types/format/build.
Native compilation and disposable browser QA continue; physical lock/export checks are
not yet claimed. Details and limitations: docs/MEMORIES_PRIVACY.md. M7 remains untagged.

## 2026-10-31 — M7 acceptance complete

Implementation **959314d** passed [Android run 41115767108](https://github.com/devharish1371/Orbit/actions/runs/41115767108),
including four native tests, build/signature and manifest assertions. APK 6,820,427 bytes;
SHA256 `5eeb1e354710d992c8594e17bf22bf16adb693b93ff42205074648b9c3d29a83`.
ZIP integrity, configured-private-material scan and signer continuity with M6 pass.

Disposable browser QA verified capsule seal/open and locked-content exclusion, reciprocal
daily answers, Memory Map/photo, timeline, replay, automatic anniversary trigger and
dismissal persistence. Narrow light/dark layouts fit. Independent Python ZIP validation
confirmed photo/thumbnail + readable JSON content and exclusion of a locked partner capsule.
Temporary preview/accounts/media cleaned through the Storage API; real accounts untouched.

Dev confirms **all privacy checks pass**, including 60-second background lock, cancellation
staying covered, authenticated unlock and screenshot/app-preview protection. He also confirms
**ZIP saved and opened** on Nothing Phone (3a), Nothing OS 4.1. M7 acceptance is complete;
tag m7-done. No in-app personal letter, per instruction. Begin M8 polish/performance;
M4/M5/M6's separately deferred physical checks are not waived by this milestone.

## 2026-10-31 — M8 polish and visual acceptance underway

Cold mobile Lighthouse on the production login scores **97 performance / 100 accessibility /
100 best practices** (LCP 2.5s in simulated mobile conditions). Initial app JS is ~161 KB
gzip, with MapLibre and its worker lazy. No speculative dependency/performance rewrite.

Expanded small chat reaction/menu and Memory Map pin targets to 44px, added textarea/select
focus rings, kept the Home greeting/countdown current across midnight, corrected combined
loading/error states, added cursor-window capsule pagination and return-to-latest controls
for capsules/keepsakes. Web **49**, worker **16**, lint/types/format/build pass. Preparing
disposable-only dark/light phone screenshots and authenticated-screen accessibility audits.
