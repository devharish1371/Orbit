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
