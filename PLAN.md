# Orbit implementation plan

Source: all ten supplied documents, read in order from `00` through `09` on 2026-10-30.
The existing `orbit-agent-docs/` folder is the repository root. The numbered source
documents stay here; planning and development logs also live here as explicitly requested.
Architecture notes and version records live in `docs/`.

## Working rules

- Complete each milestone's acceptance criteria before starting the next.
- User exception (2026-10-30): proceed to M5 while the remaining M4 physical tests are
  deferred. M4 remains untagged; this does not waive release reliability checks.
- The app is a surprise gift: Vidya's phone is unavailable before the reveal. Continue
  implementation with disposable test identities; defer her onboarding and second-phone
  acceptance until the reveal. Preserve incomplete device checks in the release checklist.
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
| M3 | Foreground location, realtime map/trail, places, distance/midpoint, simulator. Smooth verified partner updates and map interactions. | Complete; user confirms Profile/Map work well on Nothing Phone (3a), Nothing OS 4.1; qualitative check |
| M4 | Android permissions/tracker, native HTTP, offline queue, battery/geofences, pause/surprise, diagnostics. Unit tests and real-device screen-off/swipe/offline checks pass. Human #7. | APK `42e45cb`: short screen-off/swipe-away heartbeats, pause, surprise and resume verified; offline queue and full endurance gate open |
| M5 | FCM notify/push, preferences/quiet hours/dedupe, stale/resume, SOS/nudge. Alerts delivered to killed app and invalid tokens removed. Human #3. | Implementation/hosted tests complete; APK `333a4c6` installed; Dev confirms swiped-away test push arrived and opened Activity; partner/event-specific delivery checks pending |
| M6 | Moments/chat/media/voice, reactions/comments, expiry, keepsakes/quota, storage/cleanup status. End-to-end media/retention tests and real-device voice pass. | Dev confirms voice, keyboard and background microphone stop pass on APK `2133d94`; automated/browser checks pass; partner-phone voice and 4G timing deferred; untagged |
| M7 | Memory map, capsules/questions/reveal/recap, app lock/privacy, export, optional Telegram. Unlock/reveal/export/lock acceptance passes. Human #6; optional #4. | In progress; user wants letter outside the app; visual anniversary reveal only; hosted capsule/question security checks pass |
| M8 | All states, motion/accessibility/performance, copy and visual QA. Lighthouse targets and dark/light screen captures pass. | Pending M7 |
| M9 | CI/Pages/signed APK/keepalive, release docs, secret scan, manual QA and 24-hour soak. Full definition of done passes. Humans #1/#5/#7. | Pending M8 |

## Current next steps

1. M3 is tagged `m3-done`; the Nothing Phone (3a) / Nothing OS 4.1 usability check is recorded.
2. Human #7: the verified M4 APK is installed. Complete offline queue/recovery and full
   screen-off/moving endurance tests in `docs/TRACKING.md`. Short screen-off/swipe-away
   heartbeats and pause/surprise/resume passed. Keep M4 untagged until the gate passes.
3. M5's Dev background test passed; second-phone alerts remain deferred. Keep real-phone
   delivery acceptance separate from M4's deferred offline/endurance gate.
4. M6 Dev voice/keyboard/background-stop checks passed. Keep the remaining 4G and
   second-phone acceptance open. Continue M7 implementation with disposable identities;
   the personal letter stays outside the app per user instruction. Do not use Vidya's account for testing.

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
