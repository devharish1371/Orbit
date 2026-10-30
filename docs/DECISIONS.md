# Orbit decisions

## D013 — Repository layout (2026-10-30)

Use `orbit-agent-docs/` as the project root with `web/`, `supabase/`, `tools/`, and
`.github/workflows/`. Keep the numbered input documents intact at the root. Keep
`PLAN.md` and `DEVLOG.md` at the root per the user's explicit paths, and put supporting
engineering records in `docs/`. References in the original documents to `docs/PLAN.md`
and `docs/DEVLOG.md` refer to these root files in this checkout.

## D014 — Current scaffold tooling (2026-10-30)

Verify dependencies against their current official documentation and installed package
metadata; pin direct dependencies and commit both npm and Python lockfiles. Use Tailwind's
Vite plugin and CSS import, not the older PostCSS setup.

Sources consulted:
- [Vite setup](https://vite.dev/guide/)
- [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite)
- [Capacitor setup](https://capacitorjs.com/docs/getting-started)
- [Capacitor environment](https://capacitorjs.com/docs/getting-started/environment-setup)

Capacitor's current documentation specifies Node 22+. The installed Node 24 satisfies
that minimum. Exact installed versions and Android Java/SDK requirements will be recorded
after scaffolding; the source's JDK 17 must not be assumed compatible with current Capacitor.

## Pending verification

Supabase/Firebase/GitHub free-tier limits and provider-specific deployment behavior must
be rechecked before the milestone that uses them. No provider account or quota has been
verified without authenticated project access.

## D015 — Compatible TypeScript and current lint tooling (2026-10-30)

`create-vite@9.3.3` generated TypeScript 7.0.2, but `typescript-eslint@8.72.1`
declares `typescript >=4.8.4 <6.1.0`. npm rejected that dependency tree. Pin
TypeScript 6.0.3, within the supported range, without force or legacy-peer-deps.
The template used Oxlint; replace it with the required ESLint. Use current ESLint 10,
whose compatibility is declared by all installed lint plugins. ESLint 9 was marked
unsupported by npm and was replaced before the initial commit.

Use Vite 8's `build.rolldownOptions.output.codeSplitting` to reserve a MapLibre chunk,
per the [current build options](https://vite.dev/config/build-options), instead of the
removed object form of `manualChunks`. MapLibre remains unimported until M3.
Fontsource 5.3's published files expose package-root variable font CSS, not `latin.css`;
use the package-root imports verified by a production build. Fonts are self-hosted.

## D016 — Android toolchain and native asset base (2026-10-30)

Capacitor 8.6.0 generated Java 21 source compatibility, SDK 36 compile/target, minimum
SDK 24, Gradle/AGP versions recorded in VERSIONS.md. Use these rather than the input's
JDK 17. This is supported by the generated template and
[Capacitor 8 migration guide](https://capacitorjs.com/docs/updating/8-0).
Local APK compilation remains optional; there is no installed local Java runtime.

The [background-geolocation maintainer](https://github.com/capacitor-community/background-geolocation)
requires legacy bridge and native HTTP to avoid background throttling. Both are configured.
These settings are not evidence of on-device reliability: M4 must verify them on phones.
Declare permissions now but request them only in M4's explicit consent/onboarding flow.
Disable Android OS app backup for the private app.

`npm run cap:sync` uses a small cross-platform Node wrapper to build with `VITE_BASE=./`
and disable the PWA worker in native builds. Web builds generate a static-asset-only
worker; its update registration UI is deferred to M2.

## D017 — Supabase CLI and configuration gates (2026-10-30)

Pin the CLI as a root-local dev dependency, as recommended by
[Supabase CLI setup](https://supabase.com/docs/guides/local-development/cli/getting-started).
`supabase init` requires its standard per-user `.supabase` directory; sandbox approval
was granted for initialization. No login or hosted project linking was attempted.
Disable signup in generated local config. Hosted signup must still be disabled and
verified at M1 using human #2's real project.

Bootstrap distinguishes scaffold readiness from missing account credentials. Its default
gate checks tools and local env-file presence. `--require-config` rejects placeholders
before M1, while `--local-android` requires Java for optional local compilation. Report
optional checks explicitly; do not present them as verified.

## D018 — Harden the initial schema rather than copy unsafe sample behavior (2026-10-30)

The supplied migrations were a starting point. Add explicit grants (RLS does not govern
TRUNCATE), private helper functions with empty search paths, composite ownership FKs,
serialized member/quota checks, protected insert columns, real Storage byte accounting,
and post-specific media filenames. Add tests for the attack paths corrected, not just
successful reads. The hosted integration suite proves these rules with temporary users.
See [BACKEND.md](BACKEND.md) for client contracts and error semantics.

Sources: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [function security](https://supabase.com/docs/guides/database/functions).

## D019 — Atomic cleanup claims and orphan reservations (2026-10-30)

Deleting files before rows alone is insufficient: Keep can race between those operations.
Use server-only post leases, and reject Keep while a lease owns the post. Reserve old orphan
paths under the same advisory locks used when references are created. Check all references
inside the DB, so default REST row limits cannot cause a kept object's deletion. Storage
errors retain rows/reservations for retry; never delete `storage.objects` through SQL.

Sources: [Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects)
and [Storage metadata](https://supabase.com/docs/guides/storage/schema/design).

## D020 — Modern API key and deployment support (2026-10-30)

Use the supplied publishable/secret keys under the existing role-named env aliases. They
are not JWTs. Send them in `apikey`; authenticated user sessions use bearer JWTs. Edge
runtime secrets now include the JSON `SUPABASE_SECRET_KEYS`; select its default entry with
an old-key fallback. Retention keeps `verify_jwt=false` and validates its separate private
function secret. CLI deployment uses its account PAT, not a project API key, and deploys
via `--use-api` so Docker is unnecessary. Live deployment and real Storage cleanup passed.

Sources: [API key migration](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys),
[function headers](https://supabase.com/docs/guides/functions/auth-headers), and
[deployment](https://supabase.com/docs/guides/functions/deploy).

## D021 — Stable capsule notification dedupe and timezone rollup (2026-10-30)

Store capsule notification state on the capsule; an expired event no longer re-arms its
unlock notification. Run the previous-local-day rollup hourly instead of only at 00:10 IST,
so configured timezones work. Include the first point in daily point counts.

## Free-tier recheck (M1)

The [official pricing](https://supabase.com/pricing) and
[billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase)
still list 500 MB database and 1 GB Storage on Free. This implementation uses no paid
features or upgrade action. The project's billing dashboard and realtime message quota
have not been inspected; verify account-specific usage before realtime rollout at M3.

## D022 — Respect the actual hosted password policy (2026-10-30)

The user requested four-digit account passwords. The project's Management API reports
`password_min_length=6`, email enabled/auto-confirmed, and signup disabled. Do not silently
pad the requested values or weaken the policy. Admin tools now read and enforce the hosted
minimum rather than imposing the input document's ten-character recommendation. Replacement
passwords are entered privately at the local prompt. Account provisioning remains human
#2 until acceptable values are chosen. See [password security](https://supabase.com/docs/guides/auth/password-security).

## D023 — User selects email OTP with persistent sessions (2026-10-30)

This later user instruction supersedes the original phone/password spec and D022's
password-choice blocker. Provision both supplied real emails as confirmed passwordless
accounts and preserve the private phones in members. No password is generated or stored.
Provisioning ran twice successfully to verify idempotency and sends no email.

Use Supabase's standard email OTP (`shouldCreateUser:false`, `verifyOtp` type email),
not a custom OTP/session implementation. The real project has no session timebox or
inactivity expiry and does not enforce a single session. The M2 client will persist
sessions and refresh short-lived JWTs automatically; logout, cleared local data or
revocation can require OTP again. Do not promise that a session can never be lost.

SMTP is absent. The default sender restricts recipients to the org team. Gmail SMTP via
an owner-created app password is a free option for two users; the required owner-only
credential is task #2a. The prepared configurator keeps signup disabled and uses the
project's existing eight-digit OTP length, with a ten-minute expiry once SMTP is ready.
No SMTP/Auth setting has been changed prematurely and no mail has been sent.

Sources: [email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp),
[session lifecycle](https://supabase.com/docs/guides/auth/sessions), and
[Google app passwords](https://support.google.com/accounts/answer/185833).


## D024 — Auth-gated personalization and accessible appearance (2026-10-30)

The user requested production-quality editable profiles. Store names, nicknames, phone,
private avatar path, personal color, theme mode and app accent on the existing self-editable
member row. Couple date and Meet URL remain shared. Public source contains no couple PII.
New constraints reject invalid lengths/colors/phones/themes. Live tests prove self-only writes.

Resize avatar JPEG/PNG/WebP to WebP ≤600px with EXIF removed, upload to a private UUID-bound
path, then update the member reference. Delete the previous file only after that succeeds;
clean failed uploads. Use 1-hour signed URLs cached for 50 minutes. Compression runs locally
without fetching worker scripts from a CDN. No personal photo was supplied; the upload and
remove flow was verified with the disposable Orbit icon and cleaned up.

Per-user appearance loads from the profile across devices, with a local cache for startup.
Custom accents are adjusted for readable text contrast; saved colors are not modified.
Day/Night/Match device and reduced-motion preferences are supported. Source metadata uses
only the public client key; secret-key shapes are rejected before creating the client.

## D025 — Verified SMTP, persistent sessions and production CSP (2026-10-30)

Gmail accepted the owner-provided app credential over TLS. Supabase's current Management
API requires smtp_port as a string; corrected after a sanitized 400 response. Configured
8-digit, 10-minute email codes with signup disabled and no session timebox/inactivity expiry.
Real code delivery and Dev's login succeeded; both UI accounts restore without a new code.
Transient restoration network failures show reconnect state instead of clearing sign-in.

Add font-src data: to permit Fontsource's tiny bundled font subset; production Lighthouse
then reports 100 accessibility and 100 best practices, with no browser-console CSP errors.
Home accessibility 100 in both themes uses exact authenticated DOM snapshots served locally;
live account, theme, contact links and logout behavior were exercised separately in-browser.
This does not claim Android performance or the later M8 full-app performance gate.


## D026 — Realtime map, foreground privacy and test-only simulation (2026-10-30)

Follow current [OpenFreeMap Vite setup](https://openfreemap.org/quick_start/) with a bundled
MapLibre worker and local CSS; use Fiord for night readability and Liberty by day. Keep
attribution visible. Animate DOM markers with requestAnimationFrame interpolation (short
longitude path, reduced-motion bypass); update GeoJSON radii/trail sources. Re-read snapshots
behind RLS from one channel, coalesced at 250ms, with reconnect/visibility reconciliation.
[Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) remains subject
to subscriber-based authorization costs. Avoid duplicate channels and polling refetch loops.

Current [Supabase billing reference](https://supabase.com/docs/guides/platform/billing-on-supabase)
lists **2 million Realtime messages/month** on Free. Two senders at a 15s maximum rate and
two subscribers produce at most ~691,200 location deliveries/month if continuously moving;
normal stationary five-minute heartbeats are much lower. This worst case exceeds the 25%
design target, so actual usage needs monitoring before broad native tracking/soak. The
account-specific dashboard override/usage has not been inspected; do not claim it has.

Web location requires explicit opt-in, suspends when hidden, and respects pause/surprise.
Server history guard closes a share-mode race. The synthetic simulator only creates and
updates disposable users; it never writes fake locations to either real partner. Desktop
visual/functional tests cannot satisfy M3's mid-range Android WebView 60 fps item. Prepare
a manual debug APK CI job now to unblock human #7; release signing remains M9.

Official actions refs were resolved via GitHub API and pinned to commit hashes: checkout v6,
setup-node v6, setup-java v6, upload-artifact v7. The job has read-only repository permission,
no persisted checkout credential, a timeout, and only public app configuration.


## D027 — Independent native tracking and one refresh owner (2026-10-30)

The installed community geolocation service intentionally stops in onUnbind when its activity
is disconnected. See [maintainer source](https://github.com/capacitor-community/background-geolocation/blob/master/android/src/main/java/com/equimaps/capacitor_background_geolocation/BackgroundGeolocationService.java).
Use an unbound private Android foreground service for locations, SQLite queue and native
HTTP; it continues independently of JS/activity lifecycle. Removed the unused dependency.
No paid plugin, new service account or custom login token scheme is introduced.

Use standard Supabase refresh sessions in an Android Keystore encrypted store. The service
and SDK refresh fetch adapter serialize refresh through one native owner; native SDK auto
refresh ticker is disabled. Read/migrate existing Preferences login on upgrade, then remove
its unencrypted session value. The native service never logs coordinates, tokens or URLs.

Android foreground-service types/permissions follow [current Android guidance](https://developer.android.com/develop/background-work/services/fgs/service-types).
Fine/background/notification grants are explicit; battery exemption and location services
are visible in health. No boot receiver silently starts tracking. Restart once by opening
Orbit after reboot. The M4 physical phone tests remain required; code/CI success is not
proof of OEM behavior. Moving uploads use 30s instead of the source minimum 15s to keep
worst-case two-sender/two-subscriber traffic under 25% of the published Free message quota.

## 2026-10-30 — M5 continuation and notification delivery

The user explicitly deferred the remaining M4 physical tests and asked to proceed.
Continue M5 while retaining the incomplete M4 gate; neither milestone is tagged on code
checks alone. Firebase human #3 files are supplied and validated privately.

Use the already pinned Capacitor Push Notifications 8.1.3. Verified its installed Android
source and [v8 API](https://capacitorjs.com/docs/apis/push-notifications): explicit
permission/registration, channels and retained notification-action events. Registration
enables Firebase auto-init; unregister disables it and deletes the token. Android
configuration goes only into native resources and private CI secrets.

Use [FCM notification + data messages](https://firebase.google.com/docs/cloud-messaging/customize-messages/set-message-type)
so Android can display notifications without a running WebView. No data-only JS background
handler is required. Follow [HTTP v1 OAuth](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
using built-in WebCrypto RS256 rather than adding a JWT dependency. Clean tokens only on
[explicit UNREGISTERED](https://firebase.google.com/docs/cloud-messaging/error-codes), not
every generic 404. Do not send actual chat previews or exact location on lock screens.

Added a private metadata-only outbox and retry cron in addition to the source's best-effort
webhook. SQL leases and dedupe serialize concurrent calls; successful device hashes survive
partial retry. Delivery remains at-least-once across a provider/receipt crash boundary.
Human Android delivery testing is still required; see docs/NOTIFICATIONS.md.
