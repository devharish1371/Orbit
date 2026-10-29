# 05 · Android Background Location, Geofencing, Push & Notify

Target: Android 10–15, sideloaded APK, both phones Android. iOS is out of scope.

## 1. Permissions & manifest (`web/android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```
The background-geolocation plugin declares its own `<service … foregroundServiceType="location">`;
confirm after `npx cap sync` that it is merged (check the merged manifest). Set `targetSdk`
per Capacitor's template; `minSdk` 24+.

## 2. Permission onboarding flow (build as a full-screen stepper, one permission per step)

1. **Why we need this** (warm copy: "So we can look after each other 💛") + consent toggle.
2. **Location – while using** → request foreground fine location.
3. **Location – all the time** → explain; on Android 11+ this opens system settings: show a
   screenshot-style hint card ("Choose *Allow all the time*"). Re-check on return (`App` resume).
4. **Notifications** (Android 13+ `POST_NOTIFICATIONS`).
5. **Battery optimization** → custom plugin (below) + brand-specific tips card.
6. **Microphone** is requested lazily on first voice note, not here.
7. Health summary screen with ✅/⚠️ per item; re-openable from Settings → "Tracking health".

Never silently proceed with partial permissions: the Home screen shows a persistent amber
banner "Tracking is degraded – tap to fix" if any step is missing.

## 3. Custom micro-plugin: BatteryOptimization (Kotlin/Java, ~40 lines)

Methods: `isIgnoringBatteryOptimizations(): {value:boolean}` and `requestIgnore(): void`
using `PowerManager.isIgnoringBatteryOptimizations(packageName)` and
`Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName"))`;
fallback `Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`. Register in `MainActivity`.
Also expose `openAppSettings()` (`ACTION_APPLICATION_DETAILS_SETTINGS`).

OEM help card (static copy; link text "dontkillmyapp.com" for the brand):
Xiaomi/Redmi/POCO → Autostart ON + "No restrictions" battery · Samsung → "Never sleeping apps" ·
OPPO/Realme/OnePlus → Allow background activity + lock app in recents · Vivo → High background
power consumption · Stock/Pixel → "Unrestricted".

## 4. Tracker (`web/src/native/tracker.ts`)

```ts
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
```
Watcher options: `backgroundTitle: 'Orbit is connecting you two 💛'`, `backgroundMessage: 'Sharing location with <partner>'`,
`requestPermissions: false` (we handle onboarding), `stale: false`, `distanceFilter` by mode.

### 4.1 Adaptive modes
| Mode | Trigger | distanceFilter | Min upload gap | Notes |
|---|---|---|---|---|
| MOVING | speed ≥ 1.0 m/s or moved ≥ 50 m in last 2 fixes | 25 m | 15 s | upsert `live_location`; history if ≥30 m |
| STILL | no movement ≥ 3 min | 75 m | heartbeat 5 min | heartbeat re-upserts last fix (`updated_at` moves, `recorded_at` stays) |
| LOW_BATTERY | battery ≤ 15% & not charging | 100 m | 2 min | send `low_battery` event once per cycle |
| PAUSED | share_mode = paused | watcher stopped | — | write `members.share_mode`; partner sees banner |
| SURPRISE | share_mode = surprise | as above | as above | blur + `fuzzed=true`, no place events |

The plugin's `distanceFilter` is fixed per watcher → on mode change `removeWatcher` then `addWatcher`.
Debounce mode switches (≥60 s) to avoid flapping.

### 4.2 Fix filtering
Drop fixes with `accuracy > 100 m` (unless nothing better for 10 min), `time` older than 60 s,
speed > 70 m/s (GPS jump), or `mocked` location when detectable. Smooth displayed marker with
a short exponential filter; never alter stored data.

### 4.3 Upload pipeline (offline-first)
- Local queue in IndexedDB (`idb-keyval`) — max 500 points; drop oldest.
- `flush()` on: new fix, `online` event, app resume, 60 s timer. Batch: upsert latest to
  `live_location`; bulk insert history rows (only those passing the 30 m / 5 min rule).
- Exponential backoff 5 s → 5 min. Auth refresh errors → pause queue, show re-login.
- All HTTP from background goes through native HTTP (`CapacitorHttp` enabled) — verify by
  logging that updates continue for >15 min with screen off.

### 4.4 Surprise Mode blur (sender side)
```ts
export function fuzzPoint(lat: number, lng: number, gridDeg = 0.02) {   // ~2.2 km grid
  const snap = (v: number) => Math.round(v / gridDeg) * gridDeg + gridDeg / 2;
  return { lat: snap(lat), lng: snap(lng) };
}
```
Deterministic snapping (no random jitter → averaging can't reveal the true spot). Also null out
`speed/heading`, set `fuzzed = true`, skip place evaluation & arrive/leave events, show the
partner a "🎁 planning something" chip with the blurred circle. Auto-expires via `share_mode_until`
(max 24 h; default 4 h).

### 4.5 Geofence evaluation (pure function; unit-test heavily)
```ts
export type Presence = { inside: boolean; consecutive: number };
export function evaluate(
  fix: { lat: number; lng: number; accuracy: number },
  place: { id: string; lat: number; lng: number; radius_m: number },
  prev: Presence | undefined,
): { next: Presence; transition: 'arrive' | 'leave' | null } {
  const d = haversineMeters(fix, place);
  const enter = d <= place.radius_m && fix.accuracy <= Math.max(100, place.radius_m);
  const exit  = d >= place.radius_m * 1.2;                      // hysteresis
  const wasInside = prev?.inside ?? false;
  const wantInside = wasInside ? !exit : enter;
  const consecutive = wantInside === wasInside ? 0 : (prev?.consecutive ?? 0) + 1;
  if (wantInside !== wasInside && consecutive >= 2)             // need 2 consecutive fixes
    return { next: { inside: wantInside, consecutive: 0 }, transition: wantInside ? 'arrive' : 'leave' };
  return { next: { inside: wasInside, consecutive }, transition: null };
}
```
On transition: upsert `place_presence`, insert `events` (`arrive`/`leave`, `place_id`) honoring the
place's `notify_arrive/leave`. Server `place_presence` is the source of truth on cold start.
Optional later: Capgo's native geofencing plugin as an extra layer — not required.

### 4.6 Battery & device state
`@capacitor/device` → `getBatteryInfo()` each upload. Low-battery event rules: fire at ≤15% when not
charging; re-arm when >25% or charging. Include `charging` flag on the map avatar (⚡).

### 4.7 Lifecycle & reboot reality
- Foreground service survives swipe-away on most devices once battery exemption is granted.
- **After a reboot, Android 12+/14 won't let a location foreground service auto-start from boot.**
  The user must open Orbit once. Server `check_stale_members()` tells the partner
  "sharing stopped" so they can nudge. Add a gentle first-launch-after-reboot toast.
- Log last 200 tracker events in a ring buffer shown in Settings → "Tracking health → Diagnostics"
  (copyable). Essential for debugging OEM kills.

## 5. Push notifications (FCM, free, no card)

Client (`web/src/native/push.ts`): request permission → `PushNotifications.register()` →
on `registration` upsert `device_tokens(token, user_id)`; on `registrationError` log; handle
`pushNotificationActionPerformed` → deep-link by `data.route` (e.g. `/map`, `/moments/<id>`, `/call`).
Create channels: `alerts` (high importance, custom vibration), `social` (default), `quiet` (low).

### notify Edge Function (`supabase/functions/notify/index.ts`)
Input from DB trigger: `{ table, record }` + header `x-orbit-secret`.
1. Resolve **actor** (`user_id`/`author_id`) and **recipient** = the other member of the couple.
   (For `capsule_unlocked` the recipient is the *non-author*.)
2. Build message by type (copy in `functions/notify/messages.ts`, friendly + short, uses
   `display_name`/`nickname`):
   - `arrive`: "💛 {name} reached {place}" · `leave`: "👋 {name} left {place}"
   - `low_battery`: "🔋 {name}'s phone is at {pct}%" · `sharing_stopped`: "📵 {name} stopped sharing (last seen {t})"
   - `sharing_resumed`, `mode_changed`, `nudge`: "🫶 {name} is thinking of you", `call_request`: "📞 {name} wants to talk"
   - `sos`: "🚨 {name} needs you — tap to see location" (high priority, bypass quiet hours)
   - posts: moment → "📸 {name} shared a moment"; chat → "{name}: {preview or '🎙️ voice note'}"
   - comments / reactions: "{name} reacted ❤️ to your moment" (collapse)
3. Check recipient `notify_prefs`, **quiet hours** in `couples.timezone` (urgent types bypass:
   `sos`, `sharing_stopped`). Dedupe: same `(type, actor, place)` within 2 min → skip.
4. Send FCM HTTP v1: mint an OAuth access token from the service account JSON
   (`FCM_SERVICE_ACCOUNT_B64`) using a signed JWT (`npm:jose`), cache ~50 min in module memory;
   `POST https://fcm.googleapis.com/v1/projects/<project_id>/messages:send` per device token with
   `android.priority = 'HIGH'`, `android.notification.channel_id`, `android.notification.tag`
   (collapse key by type), and `data: { route, type, id }`. On `UNREGISTERED`/404 delete the token.
5. If `telegram_chat_id` is set, also `sendMessage` via Bot API (best effort).
6. Always return 200 quickly; never throw to the DB trigger.

### telegram-webhook (optional, P2)
Bot receives `/start <code>`; function verifies `X-Telegram-Bot-Api-Secret-Token`, maps a
one-time code (generated in Settings → "Connect Telegram") to `members.telegram_chat_id`.
Deploy `--no-verify-jwt`.

## 6. Calls, Meet, WhatsApp (`web/src/lib/connect.ts`)
- Call: `<a href="tel:+91…">` (APK opens the dialer).
- Meet: open `couple.meetUrl` externally (`window.open(url, '_system')` or Capacitor Browser/App) — Meet app intercepts the link.
- WhatsApp: `https://wa.me/<digits>?text=<encoded>` (chat; WhatsApp has no public "start call" deep link).
- "Call me?" inserts `events.call_request` → push with action route `/call` (shows Call / Meet buttons).
- "Meet in the middle": midpoint of both coordinates → `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` (works without any API key).

## 7. Biometric / PIN app lock
Plugin + fallback 4–6 digit PIN (hash with PBKDF2 via WebCrypto; store hash+salt in Preferences).
Lock on cold start and after 60 s in background. The tracker keeps running while locked.
Optional privacy screen (block screenshots / app-switcher preview) behind a Settings toggle.

## 8. Dev/test aids
- `tools/simulate_location.py --user B --route routes/chennai_loop.json --speed 12` upserts a moving
  partner so the map, trail, geofence and push can be tested without driving.
- Android emulator → Extended controls → Location → route playback for end-to-end tracker tests.
- Diagnostics screen (see 4.7) and a `?debug=1` overlay on web showing queue size, last upload, mode.
