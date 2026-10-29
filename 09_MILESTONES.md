# 09 · Milestones — ordered work plan

Rules: finish a milestone's acceptance criteria before moving on · commit per milestone (tag
`m<N>-done`) · update `docs/DEVLOG.md` · tests green · stop for human tasks (`08`) when listed.
Estimated effort is relative; quality beats speed.

---
## M0 — Scaffold & toolchain  *(human: #1 repo)*
- Do `03` fully: folders, `.gitignore`, Python venv + `tools/requirements.txt`, `bootstrap_check.py`,
  Vite+React+TS, Tailwind, Capacitor + Android project, Supabase CLI init, env templates.
- Write `docs/PLAN.md`, `DECISIONS.md`, `DEVLOG.md`, `VERSIONS.md`.
**Accept:** `bootstrap_check.py` all ✅ · `npm run dev/build/test/lint/typecheck` pass · `npx cap sync android` ok · first commit pushed.

## M1 — Database, auth & security  *(human: #2 Supabase)*
- Write migrations `0001–0005`; `apply_sql.py`; `seed_vault.py`; `create_users.py`; `reset_password.py`.
- Deploy `retention` function (with orphan sweep complete) and wire cron.
- `tests/test_rls.py`, `tests/test_retention.py`, stale/keep/capsule tests.
**Accept:** all integration tests pass · stranger user sees nothing · retention deletes row + file ·
cron jobs visible in `cron.job` · signup disabled (verify a signup attempt fails).

## M2 — App shell, design system, login
- Tailwind tokens (06), fonts, theme switch, aurora background, core UI components, router (Hash), query client.
- Supabase client + auth store; **phone+password login** (phone→hidden email mapping); session refresh; logout.
- Config file + validation; copy file; `OfflineBanner`; `ErrorBoundary`; PWA manifest.
- Home skeleton with partner card, quick actions (Call/Meet/WhatsApp wired), countdown.
**Accept:** both users log in on web · themes persist · Lighthouse a11y ≥ 95 on Login/Home · unit tests for phone mapping/config.

## M3 — Map & realtime (web, foreground)
- MapLibre (lazy chunk) + OpenFreeMap style by theme · markers with battery ring/accuracy/heading ·
  animated movement · **Realtime subscription** to `live_location` + `members` with batching ·
  distance chip · "fit both" · bottom sheet · places CRUD (tap map to add; radius slider; emoji).
- Web geolocation (foreground only) writes `live_location`; banner explaining web limits.
- `simulate_location.py` for partner testing.
**Accept:** moving simulated partner animates smoothly · places render · distance + midpoint link work · 60 fps on mid-range Android WebView.

## M4 — Android native tracker  *(human: install debug APK on a phone)*
- Capacitor config per `03`/`05`; manifest permissions; permission onboarding stepper; BatteryOptimization micro-plugin.
- `tracker.ts` (adaptive modes, filtering, offline queue, native HTTP), battery info, geofence `evaluate` + presence/events writes, share modes (pause/surprise + blur).
- Tracking Health + Diagnostics screens.
**Accept:** with screen off 30 min, partner's map still updates · swipe-away keeps tracking · queue flushes after airplane mode ·
geofence unit tests pass · pause shows banner on partner · surprise coordinates are grid-snapped and `fuzzed=true`.

## M5 — Push & alerts  *(human: #3 Firebase)*
- `push.ts`, channels, token registration, deep links · `notify` function (FCM v1, quiet hours, prefs, dedupe, token cleanup, `NOTIFY_DRY_RUN`) ·
  deploy with secrets · events UI (activity list) · low-battery + stale + resumed flows · SOS and Nudge · "Call me?" action.
**Accept:** arrive/leave/low-battery/stale/nudge/SOS reach the other phone with the app **killed** · quiet hours respected · unregistered tokens cleaned.

## M6 — Moments, Chat & auto‑delete
- Composer (photo compress + thumb, voice record/play with waveform, text, mood, expiry chip, pin-to-place) · feed + chat UIs ·
  reactions, comments, unsend · signed-URL cache · expiry ring · "Expiring soon" strip ·
  **Keep ✨/un-keep** with quota meter · storage meter in Settings · retention status (last run).
**Accept:** upload→display <2 s on 4G for a 250 KB photo · expired item disappears after retention run and file is gone from Storage ·
quota error shown nicely · voice works on both phones · RLS tests still green.

## M7 — Delight & trust features
- Keepsakes grid + **Memory Map** · time capsules (write, lock, unlock animation, push) · daily question ·
  anniversary countdown/timeline + **reveal animation** · week-in-numbers (from `daily_summary`) ·
  notification prefs + quiet hours UI · app lock (biometric/PIN) + privacy screen · export memories ·
  Telegram connect (optional) · haptic/sound polish.
**Accept:** reveal plays on configured date and on replay · capsule hidden until unlock · export zip opens correctly · app lock works after 60 s background.

## M8 — Polish, performance, accessibility
- Visual QA checklist (06 §9) · skeleton/empty/error states everywhere · reduced-motion · font scaling · virtualization ·
  bundle audit (map lazy) · image/aspect-ratio shifts · copy pass in the couple's voice.
**Accept:** Lighthouse mobile: Perf ≥ 90, A11y ≥ 95, BP ≥ 95 · no console errors · every screen has dark+light screenshots (store under `docs/screens/`).

## M9 — CI/CD, release & soak  *(human: #1 secrets, #5 keystore, #7 install)*
- Workflows (`07`), Pages deploy, signed APK release on tag, keepalive, `CHANGELOG.md`, human README.
- Secret scan clean; `git log -p | grep` for keys shows nothing.
- Run the **24-hour soak** and manual QA checklist; fix findings.
**Accept:** Pages site live · tagged release has a signed APK that installs and updates over a previous build ·
Definition of Done in `00` fully ticked · final summary posted in `DEVLOG.md`.

---
## Stretch backlog (only after M9)
No-show alerts (`expectations` table + SQL check) · Tamil locale · shared playlist link tile ·
"movie night" Meet scheduler · seasonal themes · widget-like Android quick-tile for Nudge ·
driving summary (speed/hard-brake from tracker) · trip replay on Memory Map · iOS PWA notes.

## Risk register (watch these)
| Risk | Mitigation |
|---|---|
| OEM kills tracker | onboarding + diagnostics + stale alert + battery exemption plugin |
| Supabase free pause | app traffic + hourly cron + keepalive; README restore steps |
| Realtime message quota | throttle upserts; coalesce; log numbers in DECISIONS.md |
| Plugin/API drift | verify docs at build time; pin versions; DECISIONS.md |
| Free-tier policy change | portable design; export tool; avoid vendor lock-in in `lib/` wrappers |
| Lost keystore | backups (08 #5) |
| Privacy mishap | RLS tests, secret scan, no analytics, symmetric visibility |
