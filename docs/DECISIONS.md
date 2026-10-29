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
