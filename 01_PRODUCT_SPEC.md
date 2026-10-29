# 01 · Product Spec

## 1. Vision
Orbit is a **private two-person app**: "where are you, are you okay, I'm thinking of you" —
without ads, strangers, subscriptions, or a feed full of noise. It replaces Life360 for one
couple and adds the personal layer Life360 never will: disappearing moments, voice notes,
a shared memory map, time capsules, and a surprise reveal on the anniversary.

**Tone:** warm, playful, a little cinematic. Short copy. Never creepy or surveillance-y.

## 2. Principles
1. **Mutual & visible.** Symmetric visibility. Pause/stop is always shown to the partner.
2. **Ephemeral by default, memorable by choice.** Things fade after 7 days; you *keep* what matters.
3. **Free forever.** No card. Stay far below free-tier limits (budget table below).
4. **Battery-kind.** Adaptive tracking; batching; no polling loops.
5. **Private by construction.** RLS everywhere, two accounts only, no analytics/trackers.
6. **Resilient.** Offline queue, stale detection, graceful degradation, data export.

## 3. Personas
Two people, both on Android phones (one in Chennai, IN; timezone `Asia/Kolkata`). Comfortable
with WhatsApp/Telegram. Install the APK by sideloading. Website is the secondary client.

## 4. Feature list (with priority)

### A. Identity & access — P0
- Login with **phone number + password** (no SMS OTP — it costs money). Client maps the
  number to a hidden email `u<digits>@example.com`; accounts are created by an admin script.
- Optional **app lock** (biometric / PIN) in the APK. Auto-lock after 1 min in background.
- Profile: display name, nickname, avatar, personal color.

### B. Live location — P0
- Live map: both avatars, battery ring, charging bolt, speed, heading, accuracy halo,
  "moving / still since 14:05", "last seen 3 min ago".
- **Distance between us** + "Meet in the middle" (midpoint → opens Google Maps directions via
  URL scheme; no API key).
- **Places** (named geofences): name, emoji, radius 50–2000 m, per-place arrive/leave alerts.
- **Share modes:** `live` · `paused` (1h / 4h / until tomorrow / until I resume) ·
  `surprise` 🎁 (blurred to ~2 km grid, suppresses place alerts, auto-expires, partner sees
  "planning a surprise 🎁" — never a silent hide).
- **Alerts** (push): arrived / left place, low battery (≤15%), sharing stopped (stale >30 min),
  sharing resumed, paused/resumed, nudge, SOS.
- **SOS**: long-press 2 s → sends a high-priority push with last location + call button.
- **Recent trail**: partner's last 24 h path (history retained 7 days, then rolled up).

### C. Moments (feed) & Chat — P0/P1
One data model, two channels (`moment`, `chat`):
- Types: text, photo, voice note (≤2 min), mood sticker.
- Reactions (❤️ 😂 🥺 🔥 👏 + custom emoji picker), comments (moments only), unsend (delete for both).
- **Expiry choice per post:** 24 h · 7 d (default) · **Keep ✨**. Expiry ring shows time left.
- **Keepsakes:** kept items never expire, capped by a quota (default 300 MB) with a meter.
  Keepsake grid + **Memory Map** (kept posts pinned where they were made).
- "Expiring soon" strip on Home: tap to Keep before it fades.
- Client-side compression: photos → WebP ≤1600 px (~250 KB) + 400 px thumbnail; voice → Opus.

### D. Connect — P0
- **Call** (`tel:`), **Google Meet** (configured URL), **WhatsApp** (`wa.me` chat link),
  **Nudge** ("thinking of you" → push + haptic pattern), "**Call me?**" request.
- Home quick-action bar + Map sheet shortcuts.

### E. Delight — P1/P2
- Anniversary countdown + milestone timeline; **reveal animation** on the day (confetti +
  letter) — also usable as the gift unwrap on first launch.
- **Time capsules**: write a note that unlocks for the partner on a future date.
- **Daily question** (rotating prompt both answer; revealed when both have answered).
- **"Our week in numbers"** recap (distance apart avg, places visited, moments shared) built
  from permanent daily summaries (tiny rows kept after raw history expires).
- Haptic + sound design (subtle), seasonal accent themes.

### F. Trust & safety — P0/P1
- Notification preferences per event type; **quiet hours** (default 23:00–07:00 IST,
  urgent events — SOS, sharing_stopped — can bypass).
- **Privacy screen** option (block screenshots / app-switcher thumbnail).
- **Export our memories** (zip of kept media + JSON) — free plan has no backups.
- **Retention transparency**: Settings shows last cleanup time, items expiring, storage meter.
- Clear first-run **permission onboarding** incl. Android battery-optimization exemption.

## 5. Refinements (added beyond the original brief)
1. Unified `posts` model for feed+chat (less code, one TTL engine).
2. Thumbnails + signed-URL caching to protect the 5 GB egress budget.
3. Orphan sweeper in retention job (files without DB rows).
4. Adaptive tracking (moving/still/low-battery), batching, offline queue, heartbeat.
5. Server-side **stale detection** via `pg_cron` (works even when the phone is dead).
6. Place hysteresis (enter at r, exit at 1.2 r, accuracy gate, 2 consecutive fixes).
7. Surprise Mode with deterministic grid blur (prevents averaging attacks).
8. Keepsake quota enforced by DB trigger, not just UI.
9. Un-keep returns an item to normal expiry.
10. Daily roll-up table so "week in numbers" survives raw-history deletion.
11. Notification dedupe/collapse keys + quiet hours + per-type prefs.
12. Admin scripts for create-user / reset-password (no email infra needed).
13. Keepalive (cron + app traffic) to avoid free-tier project pausing.
14. i18n-ready copy file (English now; Tamil optional later).
15. Strong CI: typecheck, lint, unit, RLS & retention integration tests.

## 6. Non-goals (do NOT build)
Public profiles, more than two users, ads/analytics, video calls inside the app (use Meet),
paid SMS/WhatsApp APIs, iOS build (website works on iOS but without background location),
Google Maps SDK (needs billing), reverse-geocoding services with strict usage policies.

## 7. Free-tier map (verify each at build time — limits change)

| Need | Free choice | Card? | Notes |
|---|---|---|---|
| Frontend hosting | GitHub Pages (public repo) | No | Safe: data protected by RLS, not by hiding the site |
| DB + Auth + Realtime + Storage + Edge Functions | Supabase Free | No | 500 MB DB, 1 GB storage, 5 GB egress, 500k fn calls/mo; **pauses after 7 days of no DB requests**; no backups |
| Push notifications | Firebase Cloud Messaging via a Spark (no-card) Firebase project | No | Needs `google-services.json` + service-account key |
| Chat-app alerts | Telegram Bot API | No | Optional second channel |
| Maps | MapLibre GL JS + **OpenFreeMap** (`https://tiles.openfreemap.org/styles/liberty`, also `bright`, `positron`, `dark`, `fiord`) | No | No API key; keep attribution visible; provider can change/discontinue → keep style URL in config |
| CI & APK build | GitHub Actions (public repo) | No | |
| Phone login | Password flow (no OTP) | No | OTP SMS is paid |
| WhatsApp | `wa.me` links only | No | Official automation API is not free |

### Budget sanity (design target: stay < 25% of each cap)
- DB: `live_location` = 2 rows; history ≈ 2 users × ~1,500 pts/day × ~120 B ≈ 0.4 MB/day → ~3 MB for 7 days.
- Storage: 20 photos/day × 250 KB × 7 d ≈ 35 MB + voice ≈ 15 MB + keepsakes ≤ 300 MB.
- Egress: thumbnails in feeds; cache signed URLs for ≥50 min; lazy-load full images.
- Realtime: location upsert ≥15 s apart while moving, ≥5 min heartbeat while still.
  **Check the Realtime message quota in the dashboard** and log the number in DECISIONS.md.
- Edge fn calls: retention hourly (~720/mo) + notify (~ a few thousand/mo) ≪ 500k.

## 8. Personalization config (`web/src/config/couple.config.ts`)
```ts
export const couple = {
  appName: 'Orbit',
  people: [
    { key: 'a', name: 'YOU',  nickname: '…', phone: '+91XXXXXXXXXX', color: '#7C5CFF' },
    { key: 'b', name: 'HER',  nickname: '…', phone: '+91XXXXXXXXXX', color: '#FF6B8A' },
  ],
  anniversary: '2025-01-01',          // YYYY-MM-DD — drives countdown + reveal
  meetUrl: 'https://meet.google.com/xxx-xxxx-xxx',
  timezone: 'Asia/Kolkata',
  quietHours: { start: '23:00', end: '07:00' },
  retentionDays: 7,                   // mirrored in DB `couples.retention_days`
  keepsakeQuotaMB: 300,
  mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
  mapStyleDarkUrl: 'https://tiles.openfreemap.org/styles/dark',
  theme: { primary: '#FF6B8A', secondary: '#7C5CFF', accent: '#3DE0C5' },
  dailyQuestions: [ /* ≥ 60 prompts, rotate by day-of-year */ ],
} as const;
```
