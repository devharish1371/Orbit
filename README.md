# Orbit

A private, two-person space for location sharing, disappearing moments, chat and connection.
One React/TypeScript codebase targets the web and a sideloaded Capacitor Android app.

**Status:** M0–M3 are complete: secured hosted backend, remembered email login, private
Home/settings, personal profiles, realtime map and shared places. The user accepted Profile
and Map on Nothing Phone (3a), Nothing OS 4.1. M4’s native background tracker is implemented
and awaiting its separate phone reliability tests. Push, moments/chat and the remaining
product milestones follow.
See [tracking setup and test steps](docs/TRACKING.md) and
[authentication setup](docs/AUTHENTICATION.md).
Follow [PLAN.md](PLAN.md) for the ordered milestones and [DEVLOG.md](DEVLOG.md) for evidence.

See [local development](docs/DEVELOPMENT.md) for installation, verification, native builds,
and human setup gates. Start the app with `npm --prefix web run dev`.
All provider accounts must stay free and require no credit card. Never put secret keys,
keystores, or Firebase account JSON in source control.

The ten numbered documents are the implementation specification, preserved at the root.
The final end-user installation, release, recovery, and ongoing-care guide is due in M9.
