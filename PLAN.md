# Orbit implementation plan

Source: all ten supplied documents, read in order from `00` through `09` on 2026-10-30.
The existing `orbit-agent-docs/` folder is the repository root. The numbered source
documents stay here; planning and development logs also live here as explicitly requested.
Architecture notes and version records live in `docs/`.

## Working rules

- Complete each milestone's acceptance criteria before starting the next.
- Implement, verify, update this plan and `DEVLOG.md`, then commit with Conventional Commits.
- Tag completed milestones `m<N>-done` only when all acceptance criteria pass.
- Use only free services without a credit card. Never commit secrets or personal credentials.
- Verify current official tooling documentation and record departures in `docs/DECISIONS.md`.
- Stop for the human-only tasks in `08_HUMAN_TASKS.md`; keep keys in ignored local files.

## Milestones

| Milestone | Work and acceptance gate | Status |
| --- | --- | --- |
| M0 | Scaffold strict React/TypeScript + Vite/Tailwind, Capacitor Android, Supabase CLI config, Python venv/tools, environment templates. Bootstrap, dev smoke, build, tests, lint, typecheck, format and Android sync pass; first commit pushed. | Complete; scaffold commit `97bac05` pushed |
| M1 | Database migrations, auth/admin tools, RLS, TTL/quota/stale/rollup, Storage API retention and cron. Real-project isolation/retention tests pass; signup disabled. Human #2. | Backend acceptance complete; deployed/tested; both passwordless identities provisioned |
| M2 | Design system, HashRouter/query/auth, config/copy, email OTP login with persistent refresh, home, PWA. Both users log in; themes persist; accessibility and unit checks pass. | Complete; `88ed64a` / `m2-done` pushed; login/profile/accessibility verified |
| M3 | Foreground location, realtime map/trail, places, distance/midpoint, simulator. Smooth verified partner updates and map interactions. | Web implemented/tested; awaiting human #7 Android WebView performance check |
| M4 | Android permissions/tracker, native HTTP, offline queue, battery/geofences, pause/surprise, diagnostics. Unit tests and real-device screen-off/swipe/offline checks pass. Human #7. | Pending M3 |
| M5 | FCM notify/push, preferences/quiet hours/dedupe, stale/resume, SOS/nudge. Alerts delivered to killed app and invalid tokens removed. Human #3. | Pending M4 |
| M6 | Moments/chat/media/voice, reactions/comments, expiry, keepsakes/quota, storage/cleanup status. End-to-end media/retention tests and real-device voice pass. | Pending M5 |
| M7 | Memory map, capsules/questions/reveal/recap, app lock/privacy, export, optional Telegram. Unlock/reveal/export/lock acceptance passes. Human #6; optional #4. | Pending M6 |
| M8 | All states, motion/accessibility/performance, copy and visual QA. Lighthouse targets and dark/light screen captures pass. | Pending M7 |
| M9 | CI/Pages/signed APK/keepalive, release docs, secret scan, manual QA and 24-hour soak. Full definition of done passes. Humans #1/#5/#7. | Pending M8 |

## Current next steps

1. Publish the M3 implementation checkpoint and build a debug APK for human #7.
2. Run M3's Android WebView smoothness/performance check on a mid-range phone; keep M3
   untagged until it passes. Details: `docs/MAP_TESTING.md`.
3. Then begin M4 background tracking. Phone screen-off/swipe/offline acceptance remains
   a separate human #7 gate; M5 also needs Firebase human #3.

## Human dependencies observed

- #1 satisfied: authenticated as `devharish1371` outside the sandbox; existing empty public
  repository `https://github.com/devharish1371/Orbit` verified. The earlier authentication
  failure came from sandbox access limits, not an invalid credential.
- #2 project/configuration satisfied: real API, database, Vault, CLI deployment, disabled
  signup and live security/retention checks verified. Both identities are configured privately.
  Both permanent email-OTP accounts and shared membership are now provisioned without passwords.
- #2a satisfied: free Gmail SMTP configured; actual inbox delivery and Dev's code login
  verified. Both users logged in on web; sessions restore without a fresh OTP. See
  `docs/AUTHENTICATION.md`. Default sessions have no timebox or inactivity expiry.
