# Orbit

A private, two-person space for location sharing, disappearing moments, chat and connection.
One React/TypeScript codebase targets the web and a sideloaded Capacitor Android app.

**Status:** Implemented: remembered email OTP, profiles/themes, live/background location,
push, disappearing photo/voice/text chat and moments, keepsakes/capsules, app lock and export.
V2 adds connected media flows, an anchored journey map, shared plans, personal reminders
and a date jar/want-to-go list. Device reliability, partner onboarding and final release gates
remain open; verified builds stay internal until the user's requested test batch.
See [tracking setup and test steps](docs/TRACKING.md) and
[authentication setup](docs/AUTHENTICATION.md).
Follow [PLAN.md](PLAN.md), [Plan v2](PLAN_V2.md) and [DEVLOG.md](DEVLOG.md) for scope/evidence.

See [local development](docs/DEVELOPMENT.md) for installation, verification, native builds,
and human setup gates. Start the app with `npm --prefix web run dev`.
All provider accounts must stay free and require no credit card. Never put secret keys,
keystores, or Firebase account JSON in source control.

The ten numbered documents are the implementation specification, preserved at the root.
The final end-user installation, release, recovery, and ongoing-care guide is due in M9.
