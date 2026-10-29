# Orbit

A private, two-person space for location sharing, disappearing moments, chat and connection.
One React/TypeScript codebase targets the web and a sideloaded Capacitor Android app.

**Status:** M0 scaffold and M1 backend security/retention are implemented. The hosted backend
is deployed and integration-tested. Both passwordless accounts are provisioned. The latest
login plan is email OTP with persistent sessions; human task #2a's SMTP sender credential
is the next step. See [authentication setup](docs/AUTHENTICATION.md).
The current UI is a welcome scaffold; product screens start at M2.
Follow [PLAN.md](PLAN.md) for the ordered milestones and [DEVLOG.md](DEVLOG.md) for evidence.

See [local development](docs/DEVELOPMENT.md) for installation, verification, native builds,
and human setup gates. Start the scaffold with `npm --prefix web run dev`.
All provider accounts must stay free and require no credit card. Never put secret keys,
keystores, or Firebase account JSON in source control.

The ten numbered documents are the implementation specification, preserved at the root.
The final end-user installation, release, recovery, and ongoing-care guide is due in M9.
