# 02 · Architecture & Stack

## 1. Overview

```
 ┌──────────────── Android APK (Capacitor) ───────────────┐      ┌──── Website (GitHub Pages) ────┐
 │ React UI  ─ same codebase ─                             │      │ React UI (foreground-only GPS) │
 │ Native: bg-geolocation FG service • push • biometrics   │      └───────────────┬────────────────┘
 └───────────────┬────────────────────────────────────────┘                      │
                 │ HTTPS (native HTTP so it isn't throttled in background)        │
                 ▼                                                                ▼
        ┌─────────────────────── Supabase (Free) ───────────────────────┐
        │ Auth (password) • Postgres + RLS • Realtime • Storage (media)  │
        │ Edge Functions: retention • notify • telegram-webhook          │
        │ pg_cron: retention hourly • stale-check every 5 min            │
        └───────────────┬───────────────────────────────┬───────────────┘
                        │ DB trigger → pg_net            │ pg_cron → pg_net
                        ▼                                ▼
                 notify fn ──► FCM (push) / Telegram      retention fn ──► Storage API delete
```

## 2. Stack (pin exact versions after install in `docs/VERSIONS.md`)

**Frontend:** Vite · React 18+ · TypeScript (strict) · Tailwind CSS (current stable, official
Vite plugin) · `motion` (Framer Motion) · React Router (**HashRouter** — GitHub Pages has no
SPA fallback) · TanStack Query · Zustand (UI-only state) · lucide-react · MapLibre GL JS ·
`browser-image-compression` · `canvas-confetti` · `@fontsource-variable/*` (self-hosted fonts,
no Google Fonts requests) · `vite-plugin-pwa` (installable web) · Vitest + Testing Library ·
ESLint + Prettier.

**Native wrapper:** Capacitor (current major) · `@capacitor/android` · `@capacitor/app` ·
`@capacitor/haptics` · `@capacitor/push-notifications` · `@capacitor/local-notifications` ·
`@capacitor/device` · `@capacitor/preferences` · `@capacitor/status-bar` ·
`@capacitor/splash-screen` · `@capacitor-community/background-geolocation` (free; Android
foreground service) · a biometric plugin (e.g. `@aparajita/capacitor-biometric-auth`) ·
a voice recorder plugin (e.g. `capacitor-voice-recorder`) · optional
`@capacitor-community/privacy-screen`. A tiny **custom plugin** for battery-optimization
exemption (see `05`).

**Backend:** Supabase (Auth, Postgres, Realtime, Storage, Edge Functions/Deno, pg_cron, pg_net,
Vault). Firebase project **only** for FCM. Telegram Bot API optional.

**Tooling (Python venv):** `supabase`, `psycopg[binary]`, `httpx`, `python-dotenv`, `pillow`,
`rich`, `typer`, `pytest` (see `03`).

## 3. Key design decisions

| # | Decision | Why |
|---|---|---|
| D1 | Supabase over Firebase | Firebase Storage/Functions/phone auth need a paid plan; Supabase free needs no card |
| D2 | Phone+password with synthetic email | free, no SMS; admin-created accounts only |
| D3 | `live_location` (1 row/user, upsert) + `location_history` (append, TTL) | cheap realtime + bounded storage |
| D4 | One `posts` table with `channel` = moment/chat | reuse UI, TTL, reactions, media pipeline |
| D5 | TTL via `expires_at` set by trigger; deletion by Edge Function using Storage API | SQL deletes orphan files |
| D6 | Cron inside Postgres (`pg_cron` + `pg_net`) as primary scheduler | GitHub scheduled workflows get auto-disabled after 60 days of repo inactivity |
| D7 | Geofence evaluated on-device, deduped by `place_presence` row | works offline-first, easy to unit test, no server geo math |
| D8 | Stale detection server-side (SQL) | catches dead/killed phones |
| D9 | Native HTTP (`CapacitorHttp`) in the APK | WebView network calls are throttled ~5 min after backgrounding |
| D10 | HashRouter + relative `base` for Pages; `base: './'` for Capacitor | avoids 404s |
| D11 | Signed URLs for private bucket, cached client-side | privacy + egress control |
| D12 | Surprise Mode blur applied on the **sender** | partner device never receives exact coords |

## 4. Data flows

### 4.1 Location upload (APK)
1. Foreground service watcher emits a fix → `tracker.ts` filters (accuracy ≤ 100 m unless stationary
   fallback, min 15 s apart, min distance by mode).
2. Compute `is_moving`, battery (`@capacitor/device`), apply share-mode (paused → drop; surprise → blur & suppress places).
3. Enqueue in a local queue (Preferences/IndexedDB). Flush when online: **upsert `live_location`**;
   insert into `location_history` only if moved ≥30 m or ≥5 min since last stored point.
4. Evaluate places → on state change write `place_presence` + insert `events` (arrive/leave).
5. DB trigger on `events` → `pg_net` → `notify` Edge Function → FCM/Telegram to partner.
6. Partner app (if open) receives the row via Realtime and animates the marker.

### 4.2 Post with media
1. Compress → upload `thumb` + `full` (or voice) to `media/{couple_id}/{user_id}/{uuid}.ext`.
2. Insert `posts` row (trigger sets `expires_at`). If the insert fails, remove uploaded files.
3. Partner gets Realtime + push (`notify`). Reactions/comments are plain rows.
4. Hourly retention: delete expired non-kept posts + their files; sweep orphans; trim history/events.

### 4.3 Keep ✨
Update `posts.keep = true` → trigger checks quota, clears `expires_at`, stamps `kept_by/kept_at`.

## 5. Security model
- RLS on **every** table; `anon` has no privileges; `authenticated` only via policies in `04`.
- `my_couple_id()` is `SECURITY DEFINER` with fixed `search_path`.
- Storage policies gate by folder `{couple_id}/{user_id}/…`.
- Edge functions called by DB/cron require header `x-orbit-secret` (constant-time compare);
  deployed with `--no-verify-jwt`; secret kept in Vault + function secrets.
- Web CSP meta tag: `default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org; img-src 'self' data: blob: https://*.supabase.co https://tiles.openfreemap.org; media-src 'self' blob: https://*.supabase.co; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'`. Adjust after testing MapLibre.
- No third-party analytics, no remote fonts, no tracking SDKs. Only Firebase Messaging SDK in the APK.

## 6. Performance budget
Web first load < 250 KB gz JS before map (lazy-load MapLibre chunk), LCP < 2 s on 4G, 60 fps
animations, Realtime updates coalesced (≤4 renders/s), images lazy + `decoding=async`.

## 7. Failure modes to handle explicitly
Offline / airplane mode (queue + banner) · token expired (silent refresh; re-login screen) ·
permission revoked (blocking card explaining how to fix) · OEM battery kill (stale alert →
partner nudge) · Supabase paused (clear status screen) · FCM token rotation · clock skew
(use server `now()` for expiry, client time only for display) · storage quota near-full (warn at 80%).
