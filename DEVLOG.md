# Orbit development log

## 2026-11-03 — App-wide visual and interaction pass

Further research/implementation requested during review: saved Ink/Glow/Paper text styles
with a live writing canvas and compact long-note expansion. Added 0017 and regenerated
schema types. Old clients default to Ink; style values are constrained; existing creation
identity, idempotency, TTL/media/quota checks are preserved. Text stays text (no rasterized
accessibility loss). Draft style remains in the same route-safe composer memory.

Map controls now use the app theme, a real north-reset compass and paired-planet focus
glyph. A subtle dotted connection links recent shared fixes; it is never used as a route
or recorded history, and disappears when a fix is old or sharing is unavailable. No real
GPS marker is animated to an invented position. References are in docs/ATELIER_PASS.md.

Additional media-flow correction requested during review: hide the native file input and
replace the stacked photo/voice form with one shared media tray, compact preview/caption,
aligned action dock and quiet expiry/place metadata. Photo selection is local-only until
posting; replace/remove remain explicit. Studio voice capture reuses the existing recorder
and real level samples, preserving foreground/background microphone cleanup. Verification
of picker, preview and recording states follows before the final APK handover.

Final browser check found overlapping saved-place/person markers could send a portrait tap
to the place underneath. Person markers now paint above saved places and stop click bubbling
to POI hit testing. Verify the co-located synthetic café/profile case before packaging.

Implemented the user's detailed Home/Map/Moments/Chat/Us brief. Home signals are separated
from the profile composition. Original OpenMapTiles-based light/dark cartography replaces
stock styles; compact refresh and instruments replace stacked location panels. Last-24-hour
journeys are derived from existing reliable fixes, with explicit GPS-estimate labelling,
confirmed dwell completion and disconnected gaps. Places/POIs offer Google Maps navigation.

Moments uses a photographic/note composition, summoned reaction palette and native modal
reply conversation with avatar, time and send/removal actions. Partner profiles are read-only
and support full authorized photo viewing. Us separates portraits and memory objects. Copy
that repeats visible states is removed; permission/privacy/destructive-action information stays.

Follow-up steering: profile taps should be consistent everywhere; map portraits open three
icon actions (Directions, Profile, Message), including navigation to the user's own recent
shared location. Home/header/Moments/comment/profile-editor portraits link to the person view.
Reactions gain a compact one-row palette, pointer/focus movement and a reduced-motion-aware
confirmation burst. Posting becomes a quieter Post action and open writing canvas.

Initial browser tests use only disposable identities/photos/GPS. Verified walking/driving
sample segmentation, journey selection, saved-place Google Maps URL, reaction mutation,
reply posting/removal, Escape return focus, chat→profile→full photo→Back to chat, and Us.
Final responsive/a11y checks, full tests and Android packaging follow. Physical GPS activity
classification/delivery remains unclaimed. The user is actively reviewing the local preview;
retain its disposable fixture while that review continues, rather than invalidate their tab.

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

## 2026-10-31 — M8 acceptance passed

Final mobile production Login Lighthouse: **98 performance / 100 accessibility / 100 best
practices**; LCP 2.4s, CLS 0.002, TBT 0ms. All **32** rendered signed-in screen/theme audits
score **100/100** for accessibility/best practices. These DOM audits are explicitly separate
from actual authenticated load performance. All 64 live signed-in layout measurements fit
360/412 widths, with zero steady-state console errors. Saved 68 regular screenshots,
six enlarged-type/long-content fixtures and one update-recovery capture under docs/screens/m8.

QA fixed tinted active-tab contrast, expiry-label roles, long names/Map selector wrapping,
and confetti cleanup. A real two-build test caught an old lazy Map chunk failing after
deployment; the update prompt now survives outside the error boundary and recovers without
signing out. Added its regression test. Settings shows a public build identifier.

Final web **50/50**, worker **16/16**, lint/types/format/build pass; source scan clean.
Backend unchanged since full **58/58** hosted pass. Updated Android CI will package the
final polish; no native behavior changed after M7's physical acceptance. M8 acceptance is
complete; tag m8-done. See docs/QUALITY.md for exact scope and remaining hardware limits.

## 2026-10-31 — UI redesign following user review

Release preparation paused for the user's UI feedback and full creative direction. Chat
now uses a bounded conversation scroll region with continuous rounded header/composer
surfaces. Voice notes and previews share a custom waveform player with seeking, speed,
retry, exclusive playback, background pause and Blob cleanup. A rounded composer-level
focus treatment replaces the square textarea outline. Message menus no longer cover text.

Removed repeated sentimental headings, decorative footers and implementation chatter from
the main flows. Home uses the member profiles in an interactive orbital scene; Us has a
combined couple header and illustrated photo-stack/envelope/timeline navigation. Moments
has a collapsible composer that retains drafts, full-width photos, and daily questions now
expand on request. Appearance continues to use each user's saved theme/accent.

First pass: 53 web tests, 16 worker tests and the full 58-test hosted suite pass. Initial
26 rendered-screen audits are 100/100; 34 layout captures have no horizontal overflow.
The second, more substantial visual pass is implemented and passes web checks; final
screenshots/audits and Android packaging are underway. No real partner messages sent.

## 2026-11-01 — Two-world visual system

User requested a more distinctive app-wide direction after reviewing the prior pass.
Research and screen decisions are recorded in docs/DESIGN_DIRECTION.md. Replaced pale glass
styling with solid paper/ink surfaces, bold sans headings, paired custom navigation glyphs,
and two equal planets across SVG/PWA/Android launcher assets. Home, Moments, Chat, Us,
Map, Profile, Settings, notifications, capsules and timeline share the new geometry.
Appearance controls now show miniature previews; capsule creation expands with retained
draft and focus; map tools sit within the atlas; press feedback follows contact position.

Web checks pass: 53 component/unit tests, 16 worker tests, lint/types/format/build. Hosted
backend remains unchanged since the full 58-test pass. Final browser audits and Android
packaging are underway. No messages or pushes sent to the partner. Physical phone review
and previously deferred offline/endurance/partner checks remain open.

## 2026-11-01 — Research-led daily flow improvements

After further user direction, studied official Maps, Life360, Day One and WhatsApp flows
(links and decisions in docs/DESIGN_DIRECTION.md). Added scoped server-side search/media
filters for Chat and Moments; factual map freshness with guarded precise-location directions;
and a tracking overview separating confirmed sharing mode, service health, setup and diagnostics.
55 web tests and 16 worker tests pass, including stale/paused/fuzzed navigation guards.
The prior visual commit e342cdc passed Android CI 41234683772. Packaging the flow additions
requires a new build; final visual/interaction QA continues with disposable identities only.

## 2026-11-01 — UI/flow verification and handoff

Final code e7b41e6 passes Android CI 41235338093 (native tests, APK signature and manifest
assertions). All 26 settled screen/theme audits score 100 accessibility / 100 best practices;
34 phone layouts have no horizontal overflow. Hosted suite: 58 passed in 85.13 seconds.
Search, literal wildcard handling, media filtering, capsule draft retention/focus and map
rendering reviewed with disposable data. See docs/UI_REFRESH.md and its screen captures.

Local APK download approval was declined. Local signer continuity, packaged-private-data
scan and checksum verification are therefore outstanding; do not report them as passed.
Artifact orbit-ui-refresh is available from the successful CI run. Human task #7 remains
for the new icon, gesture/keyboard insets, touch interactions and voice controls on phone.
No partner messages or pushes were sent. Previous offline/endurance/partner/soak gates remain.

## 2026-11-01 — App-wide refinement after detailed user review

Reduced the planets in both the profile scene and launcher mark, exposing the shared orbit;
removed redundant navigation dots and ornamental stars/hearts in the orbital scene. Across
all routes, tightened heading spacing/weight, quieted heading glyphs and settings rows,
standardized corners, simplified reactions and replaced boxed disclosure markers with chevrons.
Retention/place/duration choices now share a native-modal choice sheet with plain rows.

57 web tests and 16 worker tests pass; lint/type/format/build and source scan pass. Added
meaningful form-value, keyboard and focus-return coverage for the choice sheet. Browser
keyboard checks verified arrow movement, Escape cancellation and trigger focus restoration.
Final whole-app visual review and Android packaging follow. No backend schema changes.

## 2026-11-01 — Lock cover and loading continuity

User added lock-screen/loading polish to the ongoing app-wide pass. Native lock cover now
uses original orbital Canvas artwork, clear unlock action, authentication-busy state and a
scrollable layout for larger text/short viewports. It contains no names, photos, messages
or account data. Android's real biometric/device-credential prompt still authenticates;
WebView hiding, screenshot flags and the monotonic one-minute lock policy are preserved.

Cold/session loading uses a restrained branded view. Route loading is now handled inside
Shell, retaining navigation instead of blanking the whole app. Added a regression test that
suspends a route and proves navigation retains its DOM identity through completion. No
artificial progress percentage, forced reload or minimum loading delay. Native appearance
and actual authentication-to-content smoothness require human task #7 on the phone.

Loading checks: 58 web tests and 16 worker tests pass, plus lint/types/format/build. Cold
production Login Lighthouse: 98 performance, 100 accessibility, 100 best practices; LCP
1.7 s, CLS 0, TBT 10 ms in simulated mobile conditions. These do not measure hardware
biometric timing. Native Android run 41236753394 is compiling the final 266123d update.

Final verification: Android run [41236753394](https://github.com/devharish1371/Orbit/actions/runs/41236753394)
passed for 266123d, including native compilation/tests, signature and manifest checks. All
26 refined route/theme DOM audits score 100 accessibility / 100 best practices; 34 phone
layouts fit, with expanded choice/composer captures. Test fixtures and Storage files removed.
Prior local APK download refusal remains respected; local signer-continuity/private-payload
verification is not newly claimed. Native lock visual/cancellation/background-return and
sheet/back/keyboard acceptance remains human task #7. No partner contact or content sent.

## 2026-11-01 — Compact moving profile orbit

User requested the Home profiles orbit each other, then asked for a smaller composition with
no clipped path. Added a shared CSS elliptical path, opposite phases, upright profiles and
32-second revolution. Motion pauses on hover, touch hold, keyboard focus, hidden document,
off-screen scene and an explicit pause control; reduced-motion retains a static composition.
Bounded the path to at most 230×66 px in a 164 px scene, with 34 px portraits inside 44 px
tap targets and clearance for the path/focus outline. Visual/geometry verification continues.

Compact orbit verified: 36 authored geometry samples across 320/360/412/480 px show no
clipped track bounds or 44 px tap targets. Actual CSS offsets advance in lockstep, half a
revolution apart, with counter-rotation keeping profiles upright. Added pause/resume,
touch-cancel and hidden-document coverage. Web 59, worker 16, lint/types/format/build pass.
Home communication actions are now icon-only with accessible names/tooltips and a distinct
phone-in-chat WhatsApp glyph. Live DOM checks confirm all icons fully contained and centered
(to within 0.004 px), with 48 px-high targets. No call or external app was activated.

Android [run 41237794055](https://github.com/devharish1371/Orbit/actions/runs/41237794055)
passed for 9fff4b0, packaging the compact orbit and centered icon-only Home actions, along
with the previous native lock/loading update. Artifact: orbit-ui-refresh. Local downloaded
APK continuity/private-payload checks remain unclaimed after the earlier download refusal.
Human #7 phone review still applies to native unlock/cancel/back/keyboard behavior.

## 2026-11-01 — Whole-app journey pass and timeline correction

User clarified that the pass must include UI composition, app structure, navigation and
fluid journeys, and reported timeline misalignment/overflow. Rebuilt timeline marker/date
alignment as fixed marker + flexible content columns, contained the day count and recap
numbers, and added explicit upcoming status. Browser at 320 px confirms aligned marker
columns and contained recap cells; further theme/large-type checks continue.

Implemented origin-aware internal links/back controls, per-route window scroll restoration,
retained chat reading position, filters, draft text/media and active send/upload state in
memory. Draft/view contexts are separate to avoid rerendering the message list on typing;
all memory clears with the signed-in shell. Map camera survives route changes. Photo viewer
has a full-screen stage, stable date/zoom/close controls and return focus. Browser testing
caught a native-dialog Escape focus issue; explicit close/focus restoration is now tested.
Keepsakes gains a paginated photo collection view; storage/export navigation replaces the
operational storage panel in that browsing flow. Root/detail/back entrances are consistent
and reduced-motion remains respected. End-to-end checks and final test/build follow.

User reported a lock issue, then replied “okay it works cool.” This resolves that reported
issue; no native lock-policy change was made in this journey pass. No new claims about the
unspecified build or individual hardware test cases are inferred from that reply.

User additionally reported the Today’s question Answer action overflowing. Replaced its
fixed minimum-width / separate arrow bubble arrangement with one internally padded,
wrapping content-sized button and a decorative SVG arrow. The expanded save action and
form/grid children are constrained to the card width. Final browser and enlarged-text
containment checks follow. Web 64 / worker 16 checks pass after this correction.

## 2026-11-01 — Whole-app pass verified; latest APK handed over

Final code 7e43813 passed Android [run 41240931505](https://github.com/devharish1371/Orbit/actions/runs/41240931505).
All 26 route/theme DOM audits score 100 accessibility / 100 best practices, including a
targeted Home/Us rerun after the question-button fix. Normal timeline/question containment
and authored larger-text fixtures fit 320/360/412/480 px; timeline markers share a fixed
column. Eight collapsed/expanded question checks and eight larger-text checks have no
visible control or content overflow. Authored stress fixtures are not physical Android font
zoom measurements. See docs/screens/journeys and docs/APP_JOURNEYS.md.

The user's request for the latest APK renewed download authorization. Downloaded and verified
.artifacts/apk/7e43813/app-debug.apk: 6,895,139 bytes; SHA256
4bc731922d3b0afa193f3c15ce9b3cce45b4f7cf9e8d50bd81ff38b6b2d7fbad.
ZIP integrity, signing identity against M7 baseline and configured-private-material scan pass.
Artifact 13057396978 (orbit-ui-refresh) handed over for phone review. This supersedes the
previous pending local APK verification for this build. Older deferred hardware gates remain.

## 2026-11-01 — Mutual location refresh and map refinement

User requested manual current-location refresh for either person and continued UI work.
Deployed 0016: private, recipient-bounded refresh requests, one row per member, one-minute
deduplication and two-minute expiry. The RPC checks couple membership and paused sharing;
clients cannot write the table directly. No real-person request, notification or message
was generated during testing.

Android checks requests on its existing minute policy sync and makes a bounded 30-second
GPS/network attempt, bypassing stationary upload throttling only for a fresh fix. Local
refresh can wake that sync but never enables a stopped service. Privacy changes cancel
the attempt; expired/old-generation requests are ignored. Browser sharing remains opt-in,
foreground-only and requests uncached fixes after receiving a valid request.

The map now has a compact Refresh action with waiting/success/unavailable states and
actual recorded fix time. It cannot mark an unchanged baseline as a successful refresh.
Person heading/freshness are grouped, repeated stale paragraphs removed, metrics gain
small semantic icons, and Call/Meet/WhatsApp are centered accessible icon actions.

72 web / 16 worker tests, lint/types/format/production build and all 60 hosted Python tests
pass. Added regression coverage for mutual/isolated requests, dedupe, privacy generations,
uncached opt-in browser requests, timeout polling cleanup and honest success state.
Browser responsive checks and Android CI follow; hardware fresh-fix delivery is unclaimed.

## 2026-11-03 — Refresh build verification and finishing checks

Android run 41302912043 passed for 0392aec, including native unit tests and APK signing.
Final review found that a stored request could leave its success/timeout message visible
on a much later visit. Added an explicit feedback lifetime (request expiry plus one minute)
and clock updates; the stored row remains bounded and reusable. Final checks and rebuilt
APK follow. No real partner phone/account is used for QA.

Final c575f08 passes 72 web / 16 worker tests, lint/types/format/build. Hosted suite remains
60 passed; no backend change followed that run. Android run 41506678950 passed, including
native unit tests, signing and manifest checks. Downloaded .artifacts/apk/c575f08/app-debug.apk
is 6,897,295 bytes, SHA256 f0b1a80b74206ae7af1047dfece17576a96cca1d7c3ffd5a5646b514b7dcf649.
ZIP integrity, stable signing against 959314d and configured-private-data scan pass.
Artifact 13172040414 (orbit-ui-refresh) handed over for install-over review.

Eight actual viewport layouts (320/360/412/480, light/dark) and a narrow pending-state check
fit without horizontal/control overflow; refresh is 44 px tall, communication actions 48 px.
Both updated map DOM audits score 100 accessibility / 100 best practices. The initial
snapshot audit caught an absolute preview-origin stylesheet blocked on the separate static
audit origin; normalized captured asset paths and reran successfully. App CSP is unchanged.
The remaining non-scoring marker-initial advisory was reviewed against full-name/battery
accessible labels. Screens and scope are in docs/screens/refresh/README.md.

Old-request feedback clearing, request waiting with unchanged fix time, and a synthetic
new-fix success transition are verified. This does not claim real remote GPS delivery.
Human #7: install this APK and check manual refresh on the sharing phone. Existing offline,
endurance, second-phone and soak gates remain open; no contact with Vidya was made.
Disposable browser identities/media were deleted through the normal admin/Storage APIs;
the QA tab and its preview/audit servers were closed. Source scan: 559 files, zero findings.

## 2026-11-03 — Orbit atelier and media composition

User requested a complete creative pass and then refined map identity, profile navigation,
reactions and the photo/voice/text composer. Implemented original theme-aware cartography,
compact controls/compass and paired-location tether, explicit person/place directions,
last-day GPS journey estimates, read-only person/full-photo pages and consistent portrait
links. Home signals and Us have more space. Moments gains an editorial feed, animated
reaction palette and conversation sheet; photo/voice entry uses a compact shared dock.

Added Ink/Glow/Paper writing canvases and persisted note_style through migration 0017. The
RPC retains identity, retry, quota, media and retention checks; old clients default to Ink.
Long notes have More/Less. The anniversary letter remains outside the app.

Browser testing found and fixed a saved-place marker intercepting a co-located person tap;
the regression test checks stopped map bubbling. Corrected the light metadata token's
contrast and profile labels. Verified profile return flows, dummy reply/focus behavior,
local photo preview/removal, reactions, both map menus and saved Glow/Paper styles on reload.

Final runtime a06b7df: 82 web / 16 worker tests, lint/types/format/build and all 61 hosted
tests pass. An earlier hosted run hit a network reset; its complete retry passed and the
failed run's guarded disposable records were cleaned. 72 measured 320/360/412 px layouts
fit in both themes. The final extension's viewport override did not apply; its eight
additional captures honestly record 460 px instead of claiming new narrow-width checks.

Android run 41635237900 passed. APK artifact 13230242454 is 6,914,115 bytes, SHA256
8f20bf46d06345a0e6b22f8c69728784f0b9977d0e9805e1ec13375eb2a28058. Local ZIP/signing/private
checks pass. Preview accounts/media and port 4173 remain available for the user's active
review. No real partner contact. Existing physical/offline/endurance/partner/soak gates remain.

Final static audit: 32 screens scored 100 accessibility / 100 best practices.
Source secret scan: 660 files, zero findings.

## 2026-11-03 — Full-app audit and cleanup

User authorized cleanup first, then asked for detailed feature/design proposals before the
next expansion. Flattened Settings/Profile/Tracking/Notifications/memory sections, removed
hard panel borders, softened media/map/note corners and made theme samples paired circular
worlds. Kept labelled inputs, focus indicators, privacy instructions and destructive labels.
Back/search use accessible icon controls. Storage's routine cleanup detail is disclosed on
request; zero-expiry/redundant profile/logout prose is removed. Own profile no longer offers
a call to oneself. Moments and Keepsakes share reading treatments and portrait tap targets.

82 web / 16 worker tests, lint/types/format/build pass. Hosted run: 60 passed and one network
connection reset; the interrupted test passed on targeted retry (1 passed, 11.54 s), with normal
fixture teardown. Production npm audit: zero published vulnerabilities. CUA measured 150
phone layouts across 14 pages plus 11 expanded states in both themes at 320/360/412 px;
no horizontal/control overflow. Static accessibility audits and Android packaging follow.
Proposed product features and the next visual direction remain unimplemented pending selection.

Static audit caught dark timeline text inheriting the old pale-card palette after its panel
was removed. Reset the local palette to inherit the actual theme; both themes verified in
browser. Full web/worker/lint/types/format/build checks pass again. A captured update transition
in Keepsakes was replaced with its loaded state before the targeted audit rerun.

Final 5810ab7: all 50 static audits score 100 accessibility / 100 best practices. Android
CI 41640760934 passes, including native tests/signing/manifest checks. Source scan: 816
files, zero findings. Full audit, bounded evidence, feature priorities, signature concepts
and the proposed connected visual direction are recorded in docs/FULL_APP_AUDIT.md and
docs/screens/cleanup. Larger changes await the user's selection. Preview data/server retained.

Final local APK: 6,915,116 bytes; SHA256
9839e33d38841a46e8367dd7c7615c2438e8ab16868cc0c8f7297114094386e4. ZIP integrity,
stable signing against the M7 baseline and configured-private-data scan pass. Artifact
13232777835 supersedes the intermediate 87831eb artifact for this cleanup.

## 2026-11-03 — Plan v2 approved; foundation slice

User approved all audit proposals and requested speed/fall-related alerts. PLAN_V2.md now
tracks every feature in ordered phases, with the original free/two-person/privacy/retention
and human gates intact. Official Android sensor/location and Pixel Watch sources informed
the safety contract: opt-in GPS speed estimates; timed check-ins; experimental phone impact
check-in only after validation, no medical/emergency-service promise or silent activation.

Extracted common controls/open surfaces into orbit-foundation.css with shared tokens.
Message unsend, sealed capsule deletion and place deletion now use ConfirmSheet; busy
operations block dismissal, failures stay visible and cancellation restores focus. No actual
message/capsule/place deletion was performed in browser QA. 84 web/16 worker tests and full
lint/types/format/build pass. Native dialog fits actual 320/360/412 px viewports; cancel
restores Unsend focus. V2.1 reply/edit implementation follows, with Android rollup packaging.

User reported the typing highlight colliding with the + control. Removed the textarea's
external focus outline and composer focus halo/shadow; a contained underline preserves a
visible text focus indicator. Updated 360 px preview verifies no external outline and the
textarea does not overlap +. Production build passes; retained only a synthetic unsent draft
during QA and cleared it afterward. Included in the V2 Android rollup.

## 2026-11-03 — V2.1 reply/edit slice

Applied additive 0018. Replies store only a validated same-couple chat ID, with no duplicated
text/media and no cascade that would erase the unavailable-quote marker after retention.
Quote rows are read in batches through ordinary RLS and revalidated for expiry in the UI.
Realtime/social invalidation covers quote queries. Tap scrolls to the loaded original or
opens a current authorized original in a sheet. Author-only text edits use a 15-minute
server window and expected version, preserving creation, expiry and identity. Identical
ambiguous-response retries do not increment the edit twice; stale edits are rejected.

Composer shows sending/retry state and retains the same id for an unchanged failed send;
success gets a single "Sent to Orbit" mark, never recipient delivery/read claims. Durable
encrypted outbox/pinning remain in V2.1. Fix for typing outline/halo is included.

89 web/16 worker tests, lint/types/format/build pass. All 64 hosted tests pass in 111.31s.
Browser dummy quote/send/edit/reload/original navigation works. Browser testing exposed a
fresh-message edit eligibility delay from the coarse display clock; allowed its known tick
lag in UI eligibility while the server remains authoritative. Narrow layout/a11y and Android
rollup follow. No real partner contact or safety feature activation.

Final chat accessibility review adds the visible excerpt to each quote's accessible name,
so voice control and screen readers retain the actual text. All 89 web/16 worker and full
lint/types/format/build checks pass again. Native modal stacking was absent from static
HTML captures; replayed its top layer in the audit harness without changing application
stacking. All eight new states pass 100/100 after that correction; final labelled captures
and Android rollup follow.

## 2026-11-03 — Shared expiring chat pin

Added 0019/0020: one membership-scoped shared pin per couple, explicit read-only table
privileges and scoped RPC. Pin lasts at most 24 hours and never beyond message expiry;
unsent/expired originals disappear immediately under ordinary RLS. Pinning never sets Keep.
An old unpin action is conditional on the selected post ID, so cannot clear a replacement.
Social revision invalidates the shared row without exposing deleted message content.

91 web/16 worker checks, lint/types/format/build pass. Browser pin/reload/open-original/
unpin verified on disposable data only. Six settled 320/360/412 px light/dark layouts fit;
44 px pin control, no overflow. Replaced transient viewport captures after checking actual
dimensions; unpinned afterward. Full hosted regression and Android rollup recorded below.

User explicitly deferred APK handovers and phone installs until they request a larger test
batch. Retain verified builds internally; do not send APK links or ask for installation meanwhile.

Pin full hosted suite: 66 passed in 137.00s. Earlier reply/edit Android run 41646856489 and
local APK integrity/signing/private scan pass; retained privately. Eight reply/edit static
audits score 100/100. Pin follow-up rolls into the next verified build without a handover.

## 2026-11-03 — V2.1 durable text outbox

Added a bounded text-only outbox: encrypted IndexedDB records with non-extractable keys on
web, and AES-GCM no-backup files with per-owner Android Keystore keys on Android. The composer
clears only after a committed/read-back send intent, or an online direct-send acknowledgement
when local storage is unavailable. Photos/voice retain their existing draft/manual retry flow.
Open-app reconnect/resume retries preserve UUID, owner/couple, quote and Keep/TTL choice;
server migration 0021 rejects identity changes before idempotence lookup. Pending copies
expire within 24 hours and can be explicitly retried/discarded. No delivery/read claim.
Logout stops in-flight work and confirms discarding pending text; failed explicit storage or
push cleanup keeps login and reports failure. Store generations reject late writes after a
clear. Account-filtered context prevents a previous owner's pending UI from flashing. Chat
styles moved out of the shared foundation into a dedicated stylesheet.

Automated verification: 105 web / 16 worker tests; all 67 hosted tests passed in 136.23s,
including new expected-author/couple guards. Real WebCrypto/IndexedDB tests cover reload,
tamper, concurrent clear/write, expiry and non-extractable keys; engine tests cover lost
responses, storage failure, immutable retry, account change and logout races. Three native
AES-GCM unit cases added; Android compile/CI and browser rollup follow below. Production
npm audit: zero vulnerabilities; source scan: 889 files, zero findings. Physical offline,
process death and Keystore behavior remain in the deferred user-requested test batch.

Browser rollup: disposable fixture text passed persisted-intent → Sending → Sent to Orbit;
reload shows exactly one acknowledged copy. Actual 320/360/412 px chat layouts fit without
horizontal overflow. Screenshot in docs/screens/v2-outbox. No real partner contact or network
interruption. A coarse display-clock edge briefly showed 25h for a 24h pending lifetime;
2fe4dee clamps the display to the original intent lifetime. Full local check rerun passes.

Outbox Android rollup: exact code head 2fe4dee passes CI 41683148775, including native unit
suite, build, signature verification and merged manifest checks. Retained privately locally:
6,925,763 bytes, SHA256 844bce7052fecc434fad27626d36ac7a03455949efd488ef69cce53614bfb7d8.
ZIP integrity, signing continuity against 959314d and configured-private-material scan pass.
No APK link or install request was sent.

## 2026-11-03 — V2.2 Back layers and place-editing slice

Added a native Android Back boundary: open dialogs first (existing busy/cancel lifecycle),
then temporary menus/trays/map selections, then known router history or a safe parent.
Home minimizes instead of traversing unrelated WebView history. Escape shares temporary
layer handling on web. Subscriptions clean up on navigation/unmount; stale callbacks stop.
Moved place editor into the shared modal sheet, disabled fields during save, preserved
failed-save values and exposed photo/profile trigger dialog state. A new cancellation test
caught child autofocus replacing the sheet's return-focus target; shared capture now happens
before that commit, and place cancellation returns to the opener.

117 web / 16 worker tests plus lint/types/format/build pass. Nine mocked-native-navigation
cases and three place cancel/error/retry cases cover this slice. Browser/native rollup
follows below. No database change: prior full 67-hosted pass remains applicable. Native
keyboard/predictive-Back gestures stay in the user's batch; avatar/photo handoff and the
rest of V2.2 remain planned, not declared complete. See docs/V2_FLOW.md.

Refinements: round place-alert controls and a quiet radius track use the theme, with native
input semantics, keyboard focus and forced-colors fallback. Feature-specific CSS lives in
map/place-editor.css, outside the shared foundation. Visual review caught inherited text-input
padding/min-height stretching the round checkboxes; scoped dimensions/padding now fix that.
A web deployment rollover also reproduced a missing MapPage route hash. Removed that small
route from the precache exclusion; MapLibre renderer/worker remain deferred and tiles stay
network-only. Final generated service worker includes MapPage JS and CSS. See DECISIONS.
117 web / 16 worker checks and full lint/types/format/build pass after these changes.

Browser checks: place Cancel returns to Edit place; final 360px day capture and settled
320/360/412px light/dark geometry fit, including 24px circular controls and 44px labels.
Excluded transient viewport captures from the evidence folder. Chat expiry-sheet Escape
keeps the tray and restores its choice trigger; a second Escape closes the tray and focuses
+. Browser message-menu Escape exposed a pre-existing local handler bypassing focus return;
it now uses the same close callback and does not consume cancellation from a modal above it.
Regression assertions cover Moments/Chat focus. Clipboard-unavailable hosts report failure
instead of throwing synchronously. All work uses disposable data; no place save/delete or
real partner contact. Physical acceptance remains deferred; no APK handover.

Final browser regression: after replacing the web build, Map reloaded and remained usable
before Update Orbit was applied (previous missing-route error no longer reproduced). After
applying the focus fix, Escape on a message action returns to Message options and stays in
Chat. Place sheet screenshots/geometry and original day-theme restoration are retained.
Native 013a263 run 41686916998 passes; final 4c5ff9b rollup follows below.

Final 4c5ff9b Android CI 41687906057 passes web/Python/source checks, native unit tests,
build, apksigner and merged-manifest checks. Retained locally without handover: 6,927,446
bytes; SHA256 910db46f6789dd45d5e6e45826b70618cf640ff0bb710ca963db61bfa5e429f9.
Local ZIP integrity, baseline signing continuity and configured-private-material exclusion
pass. Source scan: 900 files, zero findings. 117 web / 16 worker checks are green; last full
backend regression remains all 67 passing. V2.1 software slice and first V2.2 Back/place-sheet
slice are verified; physical gates and remaining V2 phases stay open in PLAN_V2.md.

## 2026-11-04 — V2.2 connected portraits, viewer and media shelf

Portrait links carry per-link, document-namespaced identities into the profile, preventing
repeated-author and post-reload header collisions. React 19.3's installed ViewTransition API
handles warm shared images; cold/reduced-motion/unsupported paths remain immediate. Photo
controls can interrupt ongoing motion; native handle and pseudo-animation cleanup cover
logout/hiding/Back. One viewer now serves profile/shared photos with preview, full-image
retry, zoom, caption and focus/scroll return. Removed old photo CSS rather than stacking
another global override. Unified signed media queries explicitly include session owner;
removed/replaced avatars remount/clear an open profile preview.

Chat + is a three-action Photo/Voice/expiry shelf. Voice selection keeps typed text and
requires an explicit Record action. Cancel restores typing; Back stops into a local preview
or cancels a pending recording intent. Eight-line drafts resize correctly after navigation.
No microphone request, media upload, new message, real partner contact or APK handover in QA.

125 web / 16 worker tests, lint/types/format/build pass. Full backend run validates all 67
checks across 66 passes and the isolated retry of one connection-reset read (retry 6.61s).
Production audit: zero vulnerabilities. Browser: six repeated portrait keys all unique;
selected identity survives reload alongside a new header with no collision/console errors.
Shared/profile viewer loads and zooms; Escape returns focus, feed scroll 1237 px retained.
Eight-line draft returns as eight lines at 132 px. Voice cancel keeps text/focus; tool buttons
are 72 px and voice Record is 44 px high. Final responsive/native/a11y rollup follows.
See docs/V2_CONNECTED_IMAGES.md. Physical keyboard/predictive Back/gestures remain deferred.

Six initial static accessibility/best-practice audits score 100/100, with a non-scoring
label-content advisory on the existing quote preview. Added a real space between the visible
author/excerpt and removed the intervening colon from its accessible name, so visible text
is an exact substring for voice control. Regression assertion covers the complete visible
label; both quote tests pass. Full 125 web/16 worker/lint/types/format/build also pass.
Affected captured-state audits and the final Android rollup are rerun below.

Final rollup: implementation 179c0f2 and quote-label fix 49971a9 pass Android CI; the
contained daily-answer focus fix 6cac899 passes Android CI 41861182765, including the full
125 web/16 worker/lint/types/format/build pipeline. Local build and formatting also pass
after the CSS change. The daily textarea keeps its 2 px focus outline inside its own rounded
boundary (offset -2 px); focused browser checks at 320/360/412 px report no horizontal
overflow. No answer was submitted. Screenshot: docs/screens/v2-connected/question-focus-360.jpg.

All six static accessibility/best-practice states score 100/100 with no binary findings.
Chat/voice were recaptured after the quote fix; the initial harness-only missing-doctype
finding was corrected and those four states rerun. Photo/profile states retain their earlier
completed results. These static audits measure rendered semantics/contrast, not authenticated
app performance, TalkBack or device gestures. Layout evidence and scope are in
docs/screens/v2-connected/README.md. Theme/viewport restored, local preview retained.
No real partner contact, microphone recording, submitted answer or APK handover.

Retained final build internally: 6,931,513 bytes; SHA256
`d6f0b97ed73ff4d8c3622e2d2e35e07f90b202ad384f92fa554387b1275b4ad2`.
ZIP integrity, signing identity against 959314d and packaged private-material scan pass.
The temporary 4176 audit server is stopped; existing 4173/5173 servers are preserved.

## 2026-11-04 — V2.3 Atlas implementation

Replaced the scrolling map/details stack with an anchored map and two-position, nonmodal
browsing sheet. Drag is confined to its handle; keyboard/click expansion and independent
sheet scrolling remain available. Person/freshness/refresh and Now/24 hours/Places stay
visible. Journey playback steps through actual recorded timestamps, with range semantics,
previous/next controls and a distinct historical marker. Scrubbing pans without resetting
zoom. Session-scoped map browse state and camera survive profile roundtrips.

Privacy regression: Pause/Surprise remove cached precise markers, trails and cursors;
history reads stop. Stale pair distances read “last shared”; midpoint directions require
both recent precise fixes. Saved places/POIs share the detail sheet; existing edit/delete
dialogs remain. Map styles consolidated out of global atelier/worlds overrides.

135 web / 16 worker tests plus lint/types/format/build pass. Full hosted regression:
67 passed in 100.48 s. Source scan: 932 files, zero findings. Browser drag/keyboard, actual
sample stepping, profile roundtrip and 320/360/412 px Now/expanded layouts pass. A spacing
review caught sheet/nav overlap and scroll anchoring; corrected workspace sizing leaves
11 px navigation clearance at 800 px height with zero outer scroll. Remaining browser,
static-audit and Android rollup follows. Synthetic fixture only; no real partner contact,
new permission, recording, APK handover or install request. See docs/V2_ATLAS.md.

Audit follow-up: all five static states initially scored 100/100 but reported a non-scoring
voice-control advisory on the inherited map avatar's visible initial versus full-name label.
Map-only avatar fallback now uses Orbit's paired glyph; real photos and descriptive member
labels remain. Also corrected stale approximate-pair wording and tested recent/stale Surprise
without midpoint navigation. A gesture regression verifies Enter still works if a touch host
omits the click after dragging. Full suite: 136 web / 16 worker plus lint/types/format/build.
Initial implementation 714853f passes Android CI 41866405108; final follow-up rollup follows.

Final static review found one partly clipped current-position marker during historical replay
and a saved-place Directions label mismatch. Playback now focuses the map on the recorded
route/dot while person controls remain in the sheet. Directions' accessible label includes
the visible action. Targeted captured-state audits are refreshed after this correction.

V2.3 final rollup: code eddf5f0 passes Android CI 41868838371. All five static states score
100 accessibility / 100 best practices with no binary findings after the corrections; final
summary is in docs/screens/v2-atlas/audit-summary.json. Seventeen responsive measurements
fit, including 360×640; no summary targets below 44 px, no horizontal overflow and 11 px
navigation clearance. Map pan leaves outer scroll at zero; sample End reaches 16/16;
Escape restores the journey row, then the sheet handle. Day theme and normal viewport
were restored; no browser warnings/errors observed. Existing preview servers remain intact;
the temporary 4176 audit server is stopped. Physical gates remain deferred.

Full final client checks: 136 web / 16 worker plus lint/types/format/build; hosted regression
67 passed in 100.48 s. Source scan reports zero findings. Build retained privately:
6,934,713 bytes, SHA256 `e93acd7ab3730f768ce3b0614a37f965938b8347444160682540414d2d78141e`.
ZIP integrity, baseline 959314d signing identity and packaged private-material scan pass.
No APK handover, install request or real partner contact. V2.4 shared plans/places is next.

## 2026-11-04 — V2.4 shared planning implementation

Added shared versioned plans, mutual confirmation, author editing, cancellation and personal
opt-in reminders. The server queue dedupes by version/member; notification context revalidates
consent/current row before resolving only that member's devices. Quiet hours remain respected.
Added private/shared date ideas, a real-idea jar, independent want-to-go places and owner-only
archive/removal. The shared editor uses retained drafts and couple-timezone date entry.
Us gets one next-plan entry; all other controls live in the secondary Plans screen.

Calendar export uses escaped/folded UTF-8 ICS, stable IDs/versions and UTC instants, with no
attendees or alarms. Android's existing private export picker now accepts a narrowly bounded
ICS filename/MIME as well as memory ZIPs. Calendar files explicitly do not sync later edits.
Migrations 0022–0025 applied; RLS and request-account binding protect all new writes. Notify
worker deployed with existing live configuration retained. No real reminders opted in.

145 web / 22 worker tests and lint/types/format/build pass. Four new hosted security tests
pass. Full hosted regression: 70 passed; the cron allowlist test expected the old seven jobs.
Updated its exact expected set for the plan-reminder job; isolated retry passes (5.41 s),
validating all 71 checks. Browser review caught a datetime input-event draft issue and initial
editor focus; corrected with direct input handling and post-dialog focus, covered by tests.
Final responsive/a11y/Android rollup follows. Only verified disposable fixtures used; no real
partner contact, permission prompt, notification send or APK handover. See docs/V2_PLANS.md.

Browser rollup: Us entry, retained title/date/venue, local proposal save (12 Nov at 19:00
Asia/Kolkata), personal reminder on→off and cancellation into Recent plans pass. Calendar
download succeeds with DTSTART:20261112T133000Z and no attendee/alarm. Jar selects a real
visible idea; private-row marker announces Only me. Fifteen final phone measurements across
320/360/412 px fit with 44 px targets. Six static audits score 100/100 with no findings.
Day theme and viewport restored; zero browser warnings/errors. Source scan: 959 files, zero
findings. Evidence: docs/screens/v2-plans. Android CI 41877567905 is queued for 7b11edf;
waiting for its exact outcome before recording native verification.

Concurrency follow-up while waiting for the runner: migration 0026 makes reminder changes
and idea removal acquire the same couple→record locks as other planning writes. This avoids
opposite lock ordering through foreign keys/social revisions. Added a hosted race test with
three simultaneous archive/removal attempts. No frontend/native bundle changes.

Final V2.4: concurrency/planning checks 5/5 pass (16.42 s). Full hosted run: 71/72 pass;
retention's run-global orphan counter can lose a race to the hourly scheduler. Changed the
test to verify its exact rows and Storage API object listings (including repeat cleanup),
also accounting for Supabase's HTTP 400 missing-object response. All five retention checks
then pass in 20.50 s, validating all 72 hosted checks. Backend fixture repr is disabled so
future failed assertions cannot print credential-bearing fixture fields.

Android bundle 7b11edf passes CI 41877567905 after runner queueing. Retained internally:
6,948,086 bytes; SHA256 `debc91c86cf7477e13ed32289ca758e0b10718de7d195fa3f73b05b967dd5823`.
ZIP integrity, baseline 959314d signing identity and private-material scan pass. Schema-only
0026 changes no bundled web/native source. Six static audits remain 100/100 with no findings;
145 web/22 worker plus lint/types/format/build pass. Existing preview servers remain intact;
temporary audit server stopped. Physical native-calendar/reminder tests stay in the user's
later batch; no APK handover or real partner contact.

User storage steering recorded for V2.5: Keep by either member should download private,
verified offline copies on both opted-in phones. The cloud remains the bridge until both
copies are confirmed; explicit owner policy and backup/recovery checks precede cloud removal.
This is planned, not implemented or claimed as copied to the unavailable partner phone.
# 2026-11-05 — V2.5 private phone keepsakes, first slice

Continued the approved V2 plan with the user's request that a Keep by either person can
save on both phones. Implemented independent Android opt-in, one designated phone per
member, bounded encrypted no-backup files with atomic writes and readback/SHA-256 checking,
revision-bound per-phone receipts, sync cancellation/retry and a separate local library.
The library needs neither the space query nor a successful session refresh; native files
remain tied to the saved account. Old phone, removed Keep, edited/unsent post and corrupt
copy states invalidate evidence. Logout/account switching clears private phone copies/keys.
No GPS dependency, broad media permission, real partner contact or cloud deletion added.
Cloud originals remain saved; caching alone does not reduce hosted storage consumption.

Applied migrations 0027/0028 and regenerated public schema types. New hosted ledger checks
pass on disposable identities. Full backend run passed 74/75 checks; the privilege audit
caught default execution on a private trigger helper. Migration 0028 explicitly revokes
API-role execution; all five retention/privilege tests pass on retry (19.17 seconds), so all
75 hosted checks are validated across the full run and targeted correction.
158 web and 22 worker tests, lint, types, format and production build pass. New sync tests
exercise interrupted/failed manifests, missing files, quota/size/revision failures, retries,
account/background cancellation and concurrent unkeep; standalone UI tests prove cold local
reading without Auth/Space/Query providers and fail-closed/logout clearing. Native cipher
tests cover bytes/metadata, unique IVs, wrong identity/key, tampering and size limits.
Android native tests, compile and signing checks pass in CI 41918291192 for code 07468b7
(2m26s). Browser review found a development warning from the cache-only sync-status observer;
it now explicitly uses skipToken, and the full 157/22 web/worker pipeline passes again.
The cache-observer follow-up passes CI 41918882265 (95ef298, 2m56s). Its retained artifact
passes ZIP/signing/private-material checks against 7b11edf (6,975,387 bytes; SHA-256
cab7d3d36a6765fbaaace5682325bc4c8e295d29118887efa0fdf0a710e373a8).
Final efficiency refinement avoids rewriting unchanged receipts on each pass, renews daily
and reduces fallback native scans to five minutes. Missing/repaired files still acknowledge
again after forgetting stale evidence. The new retry test passes; 158 web/22 worker checks,
types, format and production build pass. Final review added an optional live-account guard
to the independent library: a changed account hides prior metadata/media immediately and
revalidates native identity, without requiring a successful session refresh for cold access.
The regression passes; the full pipeline now passes 159 web/22 worker tests. Final source
f0fdf4a passes Android CI 41920390183 (3m44s): native unit tests, compilation, merged manifest,
signing and upload checks all pass. Its retained private artifact is 6,975,615 bytes; SHA-256
d42f29fb8047626623efdd3d6eb3296d8cadf3f6e063f6e1ee1e6e34ab7d5ccb. ZIP integrity,
signing identity against 7b11edf and private-material scans pass. Source secret scan checks
988 files with no findings. Final documentation changes do not alter the compiled sources.
Three browser widths fit; the static accessibility/best-practices audit scores 100/100 with
no findings after fixing the replay's local asset paths under unchanged CSP. Physical cold offline
launch with expired auth, process death, phone storage failures, playback and real two-phone
propagation remain in the requested device batch. No APK handover or install request.
See docs/V2_PHONE_KEEPSAKES.md. Photo sets, collections and cloud archive policy remain open.

## 2026-11-05 — V2.5 shared collections

Added an original orbit-line collection shelf to Keepsakes, with name/color, selection across
All/Photos/Memory Map, an item membership picker, creator-only metadata/archive/restore and
both-member organization. Phone storage setup moves below the memories. Archiving preserves
posts and grouping; removing Keep/unsending hides associations immediately. A later Keep of
the same post does not silently restore old memberships. ZIP export includes visible groups
and associations without duplicating shared files. The phone library remains a flat offline
snapshot; collection organization is online in this slice.

Applied additive migrations 0029/0030; generated types and preserved installed-client media
behavior. Scoped RPCs bind account, couple, collection version and original Keep timestamp.
Collection advisory gates plus post-before-couple locks avoid inverse Keep/cleanup ordering.
New hosted tests cover privacy/creator rights, forging/direct writes, retries, unchanged media
bytes/quota, unkeep/rekeep/unsend, 31-row tied-time pagination and six concurrent write races.
The first focused run had a connection reset; the complete backend suite passes all 80 tests
in 154.92s. Seven new web checks cover pending/error recovery, stable draft identity/account,
membership freshness, creator controls, malformed totals and ZIP group/file consistency.
166 web/22 worker tests, lint/types/format/build pass. Source scan: 1,001 files, zero findings.

Browser flow with disposable data passes: name/color draft survives Us round-trip, new empty
group offers a return to Keepsakes, a saved photo joins the group, Photos filters it, and
archive/restore preserves the photo and membership. Rename/color edits save. One photo joins
two groups without duplication. The actual browser ZIP contains two collections, two links,
one post and its two original/thumbnail files once each; ZIP integrity passes.

Final visual verification covers 21 layouts at 320/360/412 × 800 with no horizontal overflow
and all new collection controls at least 44 px. Seven Day/Night static audits score 100/100
for accessibility/best practices with no binary findings. Initial audits caught label-content
mismatches; the picker now uses properly spaced intrinsic names, and the organization action's
spoken name includes its visible Collections label. Source eaaefc2 passes the 166/22 full
pipeline and Android CI 41926210764. The earlier 6b6d816 build also passed CI 41924577662.
Final private artifact: 6,981,407 bytes, SHA-256
bb8e5c51d8aeaf2c696b187fef7fba32bd37df31751989bd7ebff2572565897d. ZIP integrity,
signing identity against f0fdf4a and private-material scanning pass. Final source secret scan:
1,012 files, zero findings. Only documentation and
evidence are changed after the verified application source. Temporary audit server closed;
both user preview/dev servers remain running. Day/viewport restored and QA tab closed.
No real partner contact, APK handover or phone install requested; physical gates remain in
the later batch. Photo sets and cloud archive policy stay open. See docs/V2_COLLECTIONS.md.

### 5 November — V2.5 photo sets (verification in progress)

Added one-post photo sets (up to six), local ordering and per-image captions in Moments and
Chat, numbered/swipe/keyboard viewer, complete ZIP file manifests, and independent encrypted
phone records for every image. Existing installed clients retain the cover fields and old
receipt API. Full-set verification requires every photo on both current opted-in phones.
New compound native identities keep old cover filenames/AAD unchanged and exclude path traversal.
Cloud originals stay saved; no archive/cloud-removal policy is enabled.

Applied additive migrations 0031/0032. Storage metadata supplies all byte counts; a shared
Keep lock charges originals and thumbnails for the whole set. Path locks and references cover
all uploads. Updated/deployed the retention worker; an older worker cannot remove metadata
while extra files remain. Disposable hosted photo tests pass 5/5, and the complete backend
suite passes all 85 checks in 176.30s. Tests caught and fixed selected-photo drift after reorder.
The 173-web/24-worker pipeline passed before the final cover accessibility follow-up; final
pipeline, responsive/audit evidence and Android CI are pending below. No real partner contact,
phone install or APK handover requested.

Final source 4a32eaa passes 174 web/24 worker checks plus lint, strict types, formatting and
production build. All 85 backend checks pass; retention was deployed before set cleanup
validation. Six Day/Night static screen audits score 100/100 with no binary findings.
Eighteen final phone layouts fit at 320/360/412 px; visible controls are at least 44 px.
A browser check caught the selected sixth thumbnail slipping outside the strip on resize;
scoped horizontal reveal now keeps it visible without moving the page. Draft ordering and
captions survive navigation. Browser ZIP verification confirms a three-photo set has all
six files, correct captions/order and no duplicate entries (eight media files/two posts total).

Android CI 41994769622 succeeds for 4a32eaa, including native unit tests and signing checks.
The privately retained artifact is 6,985,685 bytes, SHA-256
d8a49368b7950d93eb0c59b37e118c599d71a4b9fd336ce958046abd2e4c52c6.
ZIP integrity, signing continuity against eaaefc2 and private-material scanning pass.
The photo-set software slice is verified; physical/offline/process-death/two-phone checks
remain in the requested later batch. Persistent offline media drafts and cloud archive/removal
policy remain open. Cloud originals stay saved. No real partner contact or APK handover.
See docs/V2_PHOTO_SETS.md and docs/screens/v2-photo-sets/README.md for scope/evidence.
Final source/evidence secret scan: 1,031 files, zero findings. Only documentation/evidence
changed after the verified application commit. Temporary audit server and QA tab closed;
user dev/preview servers remain running. Day appearance and default viewport restored.

### 5 November — V2.5 durable Chat media (verification in progress)

Extended the encrypted text outbox to Chat photo sets and completed voice notes. Native
atomic authenticated packages use bounded bridge chunks and preserve old text files; web
schema upgrade preserves old text keys/records and commits media plus metadata together.
Enqueue verifies readback and individual asset hashes before clearing the composer. Pending
photos/voice have local previews; discard/expiry/logout remove both metadata and bytes.
Limits: six photos, 120-second/4.5 MB voice, 8 MB package, 32 MB pending budget, 50 messages.
Moments remain in-memory drafts; cloud originals/cache and the archive-removal policy stay unchanged.

Background/offline pauses the sending pass. The installed SDK cannot cancel an upload fetch;
the wrapper releases an interrupted wait and prevents a late upload from continuing into
publication. Stable post IDs resolve lost responses. Unit checks cover this interruption,
quota rollback, corrupt/missing media, account/clear races, failed-save composer retention,
native chunks and v1 database migration. The 188-web/24-worker full pipeline passed before
the last migration regression was added; final checks follow below. All 85 backend checks
pass in 154.67s with disposable accounts. Browser reload restored the queued photo set and
captions; synthetic voice reload/preview and responsive checks are ongoing. No real partner
contact, microphone use, APK handover or phone install requested. See docs/V2_MEDIA_OUTBOX.md.

Follow-up review found an interrupted-readback edge: a durable but unverified package could
become eligible for automatic retry while the composer still retained its draft. Media is
now staged until verification/promotion; unfinished staging requires explicit Retry and a
fresh integrity check. Operational staging/blocked flags do not change immutable send intent.
A regression covers interruption followed by a skipped automatic pass and verified manual retry.
Accessibility follow-up: an empty labelled pending container remained when the active composer
held the only staged copy. It now renders nothing; populated pending messages have an explicit
group role. A regression covers both states, and browser fault injection reconfirms retained
composer → Retry → one accepted test-transport message. Legacy media without a verified-state
flag also waits for an explicit integrity-checked retry. No duplicate pending row is shown
while that same media draft is held in the composer.


Final Chat media software verification: source a140993 passes 191 web/24 worker tests,
lint, strict types, formatting and production build. All 85 backend checks pass in 154.67s
with disposable accounts. Thirty final responsive states fit at 320/360/412 px; measured
visible product controls are at least 44 px. Ten static screen audits score 100/100 for
accessibility and best practices with no binary findings. Browser reload restores both
photo captions and synthetic voice; playback ends normally at 1.621333s without error.
Injected rejection, cancelled discard, interrupted save/staged reload and explicit verified
retry pass. The harness uses real components/encryption with fake providers and a local
test transport, so it does not establish external delivery or physical process-death recovery.

Android CI 42012693712 succeeds at a140993, including native unit tests, manifest and
signing checks. Privately retained APK: 6,989,265 bytes, SHA-256
6a3c37b6a3fc10bacbff9ac985788fb6d95b4b82d255df509668ee734ada82e1.
ZIP integrity, signing continuity against 4a32eaa and private-material scan pass. Only
documentation/evidence changed after the verified application commit. See
docs/screens/v2-media-outbox/README.md and docs/V2_MEDIA_OUTBOX.md. Physical gates,
Moments persistence and archive/cloud-removal policy remain open; cloud originals stay saved.
No real partner contact, microphone use or APK handover. QA tabs closed, Day appearance
and default viewport restored. User dev/production preview servers restored on 5173/4173.
Temporary QA servers on 4176/4177 stopped; app previews remain available. Final
source/evidence secret scan: 1,052 files, zero findings.

### 5 November — Combined personal space and comfort batch

User asked to combine compatible work to save time and explicitly defer V2.6. Implemented
V2.7 voluntary expiring status, real past-year kept memories and the Us shelf, together with
V2.8 device-local text size and reduced-motion controls. Native entrance/widget and safety
remain open. Cloud originals remain saved; no archive/removal policy is activated.

Migrations 0033/0034 add guarded/versioned status writes, author/partner RLS, server-time expiry,
five-minute private text erasure with empty version tombstones, and timezone-scoped cursor
queries over actual retained memories. Status changes do not send notifications. Us opens
specific collections and keeps daily questions on Home. Existing CSS font sizes now use rem;
default size is unchanged, larger settings scale typography independently from map/touch
geometry. OS reduced motion always wins over a local Follow phone choice. Background,
shared-image and orbital motion safeguards remain. No new permissions or real partner contact.

201 web/24 worker checks plus lint, strict types, format and production build pass. Initial
hosted testing encountered a network interruption; the next run passed 87/88, with the timed-out
anonymous-read check and new-table stranger checks passing on targeted retry. A final full run
including expired-status erasure is in progress. Browser fixtures cover 180 layout combinations
across ten pages, 320/360/412 px, both themes and all three text sizes without horizontal page
overflow; measured visible product button/input/icon targets are at least 44 px. A narrow
Moments All tab found in the first pass now has a full touch target. Isolated browser status
failure preserves text, retry saves and reload restores it; collection deep links select the
intended shelf. This harness has fake providers/local transport, not real partner accounts.
Final Android CI and screen audits follow. No APK handover. See docs/V2_PERSONAL_SPACE.md.

User refinement during verification: Home repeated the paused-location sentence. Replaced
both rows with one labelled crossed-out location icon beside Chat. Personal status is smaller
beneath the name, with a two-line visual limit; full text stays on the person profile. The
paused state no longer renders a waiting/fix row. Surprise mode retains its accuracy label.
The new regression passes in the 202-web/24-worker pipeline. An expanded-sheet check caught
short status-duration targets; they now retain 44px width/height at every reading size.
Hosted verification passes 88/89; the remaining assertion was the expected cron-job inventory,
updated for orbit-status-expiry and verified with its schedule and authenticated denial.
Android CI 42069313442 passed at 55dab3c before the Home refinement; final source follows.

Us follow-up requested during verification: statuses now sit in small thought bubbles above
their portraits, with two connecting dots. Four-word-or-longer lines shorten to three words
and an ellipsis; narrow layouts add visual clipping while full text stays accessible. Partner
bubble opens the person profile with the complete status; own bubble opens the editor.
Removed the previous separate status row and excess bond spacing. The new shortening/link
regression brings the client suite to 203 web/24 worker checks. Final browser evidence covers
198 page/sheet states, with no horizontal overflow and measured targets at least 44px.
Largest text and Less motion survive fixture reload; rotation is stopped and its redundant
local toggle is absent. Full partner status and Back-to-Us were observed. All 89 hosted checks
are validated across the 88-pass full run and corrected cron-inventory/schedule/privilege rerun.
The injected local fixture is distinct from hosted server checks; no real partner contact.

Accessibility follow-up: visible thought/collection/memory labels now provide their own
accessible names, with full status/action details in descriptions. This resolves the speech-input
label mismatch advisory without extra visible wording. Strengthened Us feature selectors and
matched the isolated harness stylesheet order to production; all 198 final states fit again.
203 web/24 worker and the full client pipeline pass after these changes. Android CI
42071973843 passed at 167652d; the final accessibility source is being verified below.


Final combined-batch verification: application source 1c58d7c passes 203 web/24 worker
tests, lint, strict types, formatting and production build. All 89 backend checks are
validated across the 88-pass full run (146.63s) and corrected cron inventory/schedule/private
privilege rerun (5.30s). Fourteen final static audits score 100/100 with no binary findings;
198 phone-sized page/sheet states fit across both themes, all three reading sizes and
320/360/412px. Thought bubbles shorten long status text, open full profile text, and preserve
44px actions; Home has one paused-location icon and compact personal status. Browser fixtures
use synthetic content/local simulated writes; hosted security/expiry checks are separate.

Android CI 42077458980 succeeds at exact head 1c58d7c2bf1bfe464dfcaada47ff9577abef4ec0,
including native unit tests, assembly, manifest and cryptographic signing verification.
Privately retained APK: 7,000,115 bytes; SHA-256
685306e74163e3eb7ec3f57c871f5790ed82e69ca360a61018adbf794ecde59b.
Local ZIP integrity, signing continuity against a140993 and private-material scanning pass.
No APK handover or phone install requested. No real partner contact, microphone/sensor use
or cloud-original removal. V2.6 is deferred; V2.8 native entrance/widget, V2.9 safety, V2.10
release audit and V2.5 archive/cloud-removal policy remain open, alongside physical gates.
See docs/V2_PERSONAL_SPACE.md and docs/screens/v2-personal/README.md. Only docs/evidence
changed after the verified application source. QA tabs and temporary 4176/4177 servers are
closed; Day/Standard/Follow phone and the default viewport restored. User app previews stay
running on 5173/4173.
Final source/evidence secret scan: 1,088 files, zero findings.

### V2.8 — native entrance and private widget

User requested finishing V2.8. Implemented themed native splash/cover, window/bar contrast,
shared typography/artwork, authenticated/current-page readiness and interruption-safe reveal.
No timed minimum opening pause. A stalled start offers Reload; failed/cancelled auth stays
covered. Native tickets invalidate on reload/destroy; optional palette persistence failure
cannot strand an otherwise usable web screen. Existing screenshot/monotonic lock rules remain.

Added private-by-default Android widget with explicit photo/plan consent and launcher pin
request. Lock/screenshot protection keeps it covered. Native source validation, encrypted
atomic/bounded snapshots, revision/identity/epoch guards, metadata-only foreground checks and
reuse of unchanged encrypted thumbnails preserve privacy and reduce downloads. Known removal,
logout/account/couple changes clear content; full RemoteViews updates remove old bitmap/text.
JobService handles background network work; launcher scheduling/caching limits are explicit.
Google Fonts Jakarta TTF/OFL are vendored for native typography. No new runtime permission,
cloud deletion, real partner contact, sensor use, APK handover or phone-install request.

215 web/24 worker checks and lint/types/format/build pass. All 91 hosted backend checks pass
in 158.11s, including two exact widget-source/RLS/signing-path scenarios; the earlier targeted
widget checks pass 2/2. Pure native policy/codec/encryption/contrast tests and Android resource
compilation are next in CI. Browser verification uses an injected native bridge with synthetic
content; real native/launcher/cold-start/physical gates stay deferred. Scope, limits and primary
references are in docs/V2_NATIVE_ENTRANCE_WIDGET.md.

Android resource compilation caught unquoted variable-font axis settings in the first run
42090053495; quoted the style values in dcb1995. Final Android CI 42117158960 passes
215 web/24 worker checks, native JVM tests, resource/Java compilation, APK assembly, merged
manifest/bridge/widget/service/font assertions and signing verification.
Privately retained APK: 7,114,025 bytes; SHA-256
5be14cf65305eb0bf0e1f7a7dd60089dc7cb40b797960b9c7099c804dfbebad1.
Local ZIP integrity, signer continuity against 1c58d7c and private-material scan pass.

Nine browser flow checks pass with production components and an injected native bridge.
60 responsive states fit at 320/360/412px, both themes and all reading sizes; largest-size
photo picker/consent also fit. Covered/stale previews contain no photo, failed saves retain
consent, and pin requests never imply installation. Reduced-motion opening animation is
disabled. Browser snapshots cannot prove native cover, launcher caching/scheduling or
physical start/unlock frame pacing. These remain deferred task #7 gates, with no APK handover
or installation requested. V2.6 remains deferred; safety, release audit and archive/cloud
removal policy remain open. See docs/V2_NATIVE_ENTRANCE_WIDGET.md and
docs/screens/v2-native-widget/README.md.

Static audit capture corrections: restored the HTML doctype (outerHTML omits it) and
disabled animation only in copied documents after Lighthouse NO_FCP on replayed entrance
animations. This does not change production CSS or substitute for the live reduced-motion
check. The corrected covered-state sample scores 100/100 before the complete static suite.

Final V2.8 result: all seventeen static screen audits score 100/100 for accessibility and
best practices, with no binary findings. The V2.8 software slice is complete and verified
at dcb1995; physical phone/launcher acceptance remains explicitly deferred. Final source
and evidence scan: 1,139 files, zero findings. QA tabs and temporary 4176/4177 servers are
closed; user app previews 5173/4173 are preserved, viewport and Day/Standard/Follow phone
restored. Only docs/evidence change after the verified application source.

Publication note: application source dcb1995 is already pushed and Android-verified.
Final evidence commit faf5d23 remains local after three GitHub `commit_refs` rejections,
including an HTTP/1.1 retry. Remote main is unchanged; no force/history rewrite attempted.
The worktree is committed and verification evidence is available locally. See
`docs/BLOCKERS.md`; this does not change the passing build or deferred physical gates.

### V2.9 — safety (implementation underway)

User asked to proceed to the next phase. V2.6 and physical gates remain deferred. Reviewed
Android Location uncertainty/monotonic timing, sensor lifecycle and AOSP acceleration semantics.
Building private timed journey check-ins, local sustained-speed reminders on existing opted-in
tracking, and a synthetic motion prototype. No automatic impact/driver inference or partner
escalation; permissions/settings remain unchanged. Design contract: docs/V2_SAFETY.md.

Implemented additive 0035 journey schema, scoped sender/recipient opt-in queue, cancellation/
check-in/extension version guards, bounded expiry and service-only cron functions. Deployed
notification worker revalidates current consent/version/privacy before resolving recipient
tokens; safety reminders are non-emergency and respect quiet hours. Private speed reminders
use native speed/uncertainty on existing tracking, a sustained monotonic window, hysteresis
and persistent cooldown. Account changes clear local configuration/pending prompts. Motion
lab uses synthetic traces only; phone-drop ambiguity is intentional, no sensor is subscribed.
224 web/38 worker checks, lint/types/format/build pass. Full hosted run passes 92/95; two
connection-reset failures pass their isolated rerun and the updated cron inventory/private-
privilege audit passes. Native/browser verification continues. V2.8 evidence push recovered
normally through 24258e3; no history rewrite or force update was needed.

Final V2.9 verification: all 96 hosted/tool tests pass in 151.59s after worker deployment,
including the additional concurrency test. All 224 web/38 worker checks and lint/types/
format/build pass. Native speed policy tests, resource/Java compilation, assembly, merged
manifest/bridge and signing pass in Android CI 42132581549 at exact source
ce8172947c3d88e6c9b5960390108cb0729088c6. Earlier Android builds c92bc0a and 0ba7525 pass
as well. Follow-ups report generic worker processing honestly (sent can also mean token
cleanup), check blocked local notification channels, and keep the motion research component
outside the installed screen. No sensors were registered or real partner contacted.

15 browser flows pass (12 app and three QA-only research checks). 60 responsive states fit
(54 production web and six research) at 320/360/412px, both themes and reading sizes, including
largest-size sheets. All ten static audits score 100/100 with no binary findings; these are
settled DOM semantics/contrast checks, not startup or hardware proof. Countdown validation
uses the exact 15-minute acknowledged deadline delta rather than a ticking display label.

V2.9 software slice is verified; actual Nothing Phone speed uncertainty, local notification
channel/tap, ordinary safe-use/background/reboot/battery behavior and physical gates remain
in task #7. Motion monitoring/automatic partner speed or impact escalation is not enabled or
exposed. V2.6 stays deferred; release audit and archive/cloud-removal policy remain open.
No APK handover or phone install requested. Source/contract: docs/V2_SAFETY.md; complete
browser evidence: docs/screens/v2-safety/README.md. QA tabs and temporary 4176/4177 servers
are closed; viewport/Day/Standard/Follow phone restored; user previews 5173/4173 preserved.

Privately retained final APK: 7,122,184 bytes; SHA-256
0ea5ca75d6620802bd23559e356a1e85bd0f31d94c38ce3d0a7ffc711dd94d53.
Local ZIP integrity, signer continuity against dcb1995 and private-material scan pass.
Final source/evidence secret scan: 1,174 files, zero findings. Only docs/evidence changed
after the verified application source ce81729.

### V2.5 completion and V2.6 — implementation underway

User explicitly requests both remaining phases, superseding the earlier V2.6 deferral.
The mixed-media manifest comes first so backup/removal includes the entire memory rather
than its cover. Design: one voluntary owner-controlled side per member on a kept photo;
photo/text/voice, accessible turn controls, atomic quota/revision/retention, complete export
and phone copies. Cloud archive requires explicit two-member consent, fresh compatible
copies and verified portable backups, with a restore path. No real cloud file is removed
or partner contacted during QA. Physical gates/APK handover remain deferred.

V2.6 mixed-memory implementation: 0036/0037 add owner-versioned contributions and exact
request replay on the current Keep instance, immutable canonical media references, authoritative
quota totals, revision/receipt invalidation and complete Storage API retention. An ambiguous
PL/pgSQL identity was caught by the first targeted tests and corrected additively in 0037.
All three original targeted hosted scenarios then pass, including both-member concurrent
contributions, cross-couple denial, mixed-file signing/receipts and old-worker completion guard.
Updated retention is deployed. 230 web/40 worker checks and lint/types/format/build pass;
new tests exercise turn/profile flow, StrictMode acknowledgement/retry, own-only removal,
complete file manifests, pair receipts and safe cleanup. Full hosted/native/browser checks
continue while the V2.5 archive layer is developed; no real memories are removed or recorded.

V2.5 archive implementation: additive 0038–0040 bind both members' current protocol-2
phone receipts, read-back ZIP proofs and explicit approvals to the exact Keep/revision.
Author-only final removal uses scoped service leases and Storage API cleanup. References
shared with an avatar/other post block removal; concurrent references cannot capture files.
Restores reserve quota and use isolated generation paths, verify every file/hash before
acknowledgement, retain author/asset identities and support partial retry/cancel. Hosted
checks caught the legacy root-path constraint; corrected additively in 0040. All four
focused hosted scenarios pass, including complete sets with photo/voice contributions.

New archive shelf, bounded ZIP STORE reader/writer, independent-backup acknowledgement,
Android SAF save/readback bridge and pure-Java proof checks are implemented. Current native
copy manifests retain archived roots; missing archived copies never attempt cloud downloads.
Logout/disable and ordinary export now distinguish cloud archives and separate backup ZIPs.
237 web and 44 worker tests, lint/types/format/build pass. Authenticated archive endpoint and
retention support deployed; nothing auto-queued and no real memory removed. Full hosted,
responsive browser and Android CI verification continue. APK handover remains deferred.

Full hosted/tool regression passes 105/105 in 211.63s, including the deployed archive
endpoint's JWT/scope guards, wrong-file rejection, exact retry/readback and complete restore.
Android source b3551b1 passes CI 42169366307 and private artifact integrity/signer checks.
Browser checks pass 78 layouts and ten flows; ten settled static audits score 100/100 for
accessibility/best practices. An initial static-only missing favicon was supplied and audited
again; no app defect was hidden. Native SAF/provider/process-death and two actual phones remain
unverified, deferred task #7. The browser bridge is a synthetic UI fixture, not native proof.

Final review added complete paginated archive/proof reads and access to older keepsakes.
Selection is compact and opens one backup form at a time. Interrupted manifest reads fail
instead of presenting partial readiness. The older-item selection flow and page-failure/abort
checks are tested. 239 web/44 worker checks and lint/types/format/build pass; final Android
UI build and evidence cleanup continue. No real memory archive or partner contact performed.

### V2.5 / V2.6 — final software verification (6 November)

Final source `9b427ec94d6823b6692c89e58f0b5008ed3ac4b9` passes Android CI
42170571273: full web checks, Python/source scan, native unit tests (including ZIP proof),
Java/resources, manifest/bridge checks, assembly and signing. 239 web/44 worker tests;
all 105 hosted/tool checks pass in 211.63s. Backend migrations and authenticated archive/
retention endpoints are deployed. Earlier native builds 8557284/b3551b1 also passed.

Final browser evidence: docs/screens/v2-archives. Ninety responsive states and twelve
flows pass; all twelve settled static audits score 100/100 with no binary findings.
The final picker accesses earlier memories, uses compact rows and opens one backup form.
Browser contribution retry evidence initially needed the fixture to include the server's
canonical zero-byte text metadata; corrected in the isolated harness, then verified. Native
save/readback is covered by pure-Java tests and compilation, not claimed from the browser mock.
Day/Standard/Follow phone and the viewport are restored; temporary QA tabs/4176/4177 servers
are closed. User previews 5173/4173 are preserved. The initial refused-connection tab was
unmarked and remains temporary; it is not a delivered app screen.

V2.5 and V2.6 software acceptance is complete. Actual phone SAF/provider/process-death,
expired-session/offline/two-phone/capture/playback and battery gates stay deferred in task #7.
No real memory was cloud-archived, microphone started or partner contacted. The anniversary
letter stays outside Orbit. No APK handover or install requested. V2.10 release audit remains
next; milestone completion does not waive the existing physical release gates.

Privately retained final APK: 7,152,817 bytes; SHA-256
2f382c15f96ce95658258b9d4b9e51b655f710327838a0ce3c27636d5d4e7fb3.
ZIP integrity, signer continuity against ce81729 and private-material scan pass. Final
source/evidence scan: 1,233 files, zero findings. Plans/contracts and verification.json are
current; no application changes follow the verified source 9b427ec.

### V2.10 — whole-app visual cleanup and release audit underway

User explicitly adds the complete visual/copy/typing-focus cleanup to V2.10 and asks to
proceed. Plan: docs/V2_RELEASE_AUDIT.md. Consolidate competing input focus rules; normal
caret for editing, visible keyboard focus for other controls. Trim filler/repeated copy,
use accessible familiar icons, group Settings, open spacing and reveal occasional guidance
on demand while retaining consent/recovery consequences. Initial source audit also found
logout warning bypass with an empty outbox and an inaccurate skipped-archive sync message;
fix these before verification. No real partner contact, sensor, archive or APK handover.

V2.10 first implementation: removed competing composer/field focus rings and the chat
underline at their sources; centralized caret-only editable fields across pages and sheets.
Non-text/read-only controls retain keyboard focus. Home portrait hero is unframed, quick
connection actions are open icons, attention actions are circles with short labels, daily
answer entry is ruled with a compact save action. Settings groups appearance/details/device/
privacy/storage; collapsed groups and contextual profile help replace repeated explanations.
Profile actions and keepsake organization use labelled icons; repeated footers/choice notes
are trimmed. No consent, error or backup consequence is removed from its decision.

Release review fixes: logout always confirms removal of private phone copies even with an
empty outbox; skipped archived-copy feedback no longer promises cloud files exist. Both have
meaningful regression coverage. 240 web/44 worker checks and lint/types/format/build pass;
all 105 hosted/tool tests pass in 223.65s. Production dependency audit: zero findings; Python
requirements consistent. Production browser checks use the verified disposable UI couple on
isolated port 4176; no real account/contact/sensor change. Complete responsive/native evidence
continues; care/recovery and explicit deferred release checklist are drafted.

Production browser review confirms visible caret with no field outline/shadow, keyboard focus
on contextual help, latest web-update route/session continuity, and compact Settings with no
duplicate Appearance title. The first full-page Chat capture was a transient skeleton and
was replaced after waiting for its labelled loading state. Additional inspection removed
Chat's squared header cap and extended calm entry styling to native date/time fields while
retaining native segment selection. Initial 66 route/width checks fit; complete theme/text-size
and expanded-state verification continues. Final small CSS refinement is checked below.

Photo QA clarification: both selected local files produced previews and retained captions
when reordered, with no console errors and no post sent. The long file-chooser automation
call includes picker/transport time, so it is not an image-processing benchmark and does
not justify changing the WebP pipeline. A separate UI defect was real: photo preparation
used the same busy label as posting. Added a route-safe preparation phase, an honest status,
and a deferred-promise regression proving it cannot post before preview. New-plan draft copy
also stops saying confirmation is already pending before the plan is proposed. Final web
checks now include 241 tests; native verification is refreshed for this small correction.
