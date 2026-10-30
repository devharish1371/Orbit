# Orbit

A private, two-person space for location sharing, disappearing moments, chat and connection.
One React/TypeScript codebase targets the web and a sideloaded Capacitor Android app.

**Status:** M0–M2 are implemented: secured hosted backend, passwordless email login with
remembered sessions, private Home/settings, and editable personal profiles. Each person can
set a photo, nickname, partner nickname, contact number, personal color, and app appearance.
SMTP delivery and both web logins have been verified. The foreground realtime map and shared places are implemented; M3’s Android device
performance check is next. Background tracking and the remaining product features follow. See [authentication setup](docs/AUTHENTICATION.md).
Follow [PLAN.md](PLAN.md) for the ordered milestones and [DEVLOG.md](DEVLOG.md) for evidence.

See [local development](docs/DEVELOPMENT.md) for installation, verification, native builds,
and human setup gates. Start the scaffold with `npm --prefix web run dev`.
All provider accounts must stay free and require no credit card. Never put secret keys,
keystores, or Firebase account JSON in source control.

The ten numbered documents are the implementation specification, preserved at the root.
The final end-user installation, release, recovery, and ongoing-care guide is due in M9.
