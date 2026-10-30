# M4 native tracking and phone acceptance

M3 Profile/Map usability was accepted by the user on Nothing Phone (3a), Nothing OS 4.1.
M4 adds background tracking; the physical tests below are a separate gate. M4 stays untagged
until they pass. Phone push alerts are M5 and are not active yet.

## Native implementation

Orbit uses a private unbound `location` foreground service with an ongoing notification.
The service owns GPS/network location, native HTTPS, a bounded 500-item SQLite queue,
retry/backoff and geofence evaluation. It does not depend on WebView callbacks. Android
Keystore encrypts its standard Supabase session; one synchronized native refresh owner
serves both the service and SDK refresh requests. Existing Preferences login migrates on
an in-place upgrade. Logout clears native auth, queues and cached private tracking data.
Requests are checked against the queue's account identity before upload.

Native permissions are opt-in and requested one at a time in Settings → Tracking health.
Precise location, All the time, the visible service notification, device location and battery
access must be ready before starting. Nothing OS guidance is included. Degraded state is
visible. Reboot does not silently start tracking: open Orbit once afterward.

Moving uploads are at least 30 seconds apart, still heartbeats approximately five minutes,
and low-battery uploads at least two minutes apart. Accuracy/mock/jump/old fix filters and
60-second adaptive-mode debounce limit noise and battery use. Two accurate fixes plus
20% exit hysteresis are required for a geofence transition. Brief upload wake locks are
bounded to 90 seconds and released on completion; an inexact OS alarm wakes only an existing
service for heartbeat. Android may delay alarms, so the phone test must verify real timing.

Atomic backend ingestion derives ownership from auth.uid, deduplicates client history IDs,
prevents latest-location regression, and commits geofence state/events together. Server
privacy generations discard fixes queued before pause/surprise changes. Surprise snaps
coordinates to a fixed grid on the sender and server, removes speed/heading, and suppresses
history/place events. Offline mode changes stop capture immediately; confirmed mode is
shown separately until synchronization. Automatic expiration resumes only after server sync.

Tracking health shows service state, GPS/upload times and queue count. Diagnostics store
200 event codes/timestamps without coordinates, keys or tokens. GPS timestamps remain the
capture time; a stationary heartbeat does not pretend a new GPS fix happened.

Verified [M4 build `42e45cb`](https://github.com/devharish1371/Orbit/actions/runs/41069740547).
Local APK: `.artifacts/apk/42e45cb/app-debug.apk` with adjacent `.sha256` checksum.

## One-time M3 → M4 installation

M3's CI runner used a temporary Android debug signing key; that private key is unavailable.
The first M4 build uses a stable debug identity, stored only in private CI secrets and an
ignored encrypted local backup. **Uninstall M3 once, install M4, then sign in with an email
code.** This clears old local app data/queued items; cloud profiles/memories remain in Supabase.
Future M4 debug builds use the stable key and can update in place. The backed-up release
signing key in human task #5 is still a separate M9 requirement.

## Human task #7 — Nothing Phone (3a), Nothing OS 4.1

1. Install the new M4 APK and open Settings → Tracking health. Opt in, complete the permission
   steps, and tap Start background sharing. Confirm the persistent notification and a recent
   Last upload. Use a second signed-in browser/phone to observe the map.
2. Turn the screen off for **30 minutes**, including a short walk. The observer should keep
   receiving moving positions within roughly 30 seconds, with battery and actual GPS time.
3. Swipe Orbit out of Recents and walk again. Confirm the observer still receives updates
   and the ongoing notification remains. A force-stop from Android Settings is a different
   action and stops tracking; reopen the app afterward.
4. Enable airplane mode briefly, move, then restore connectivity. Confirm Last upload recovers
   and queued items drain without a fresh login. Read diagnostics if it does not recover.
5. Pause sharing: the observer must show paused and receive no new exact fixes. Resume, then
   test surprise: the observer must show planning a surprise with a broad area and no precise
   trail/speed/heading. Test a timed mode returning to live after its deadline.
6. Optional continuation into the M9 soak: leave it running beyond an hour to exercise native
   token refresh, reopen the app, and confirm sign-in remains saved. The later 24-hour soak is
   still required; a successful build is not evidence of background reliability.

Report which steps passed, any gaps/delays, and whether queue count returns to zero. If a
step fails, provide the coordinate-free diagnostic text and the phone OS/build information.
Do not share email codes or session tokens. No new Firebase setup is needed for M4.

## Automated verification

The full hosted/local Python suite passed 43 tests; web suite passed 28, worker suite five.
JVM policy tests cover filtering, blur, geofence hysteresis and adaptive upload rates.
CI runs these tests, compiles the APK, verifies its signature with apksigner and checks the
merged manifest for a private location foreground service with stopWithTask=false.
Native Keystore/permissions/OEM behavior require the physical acceptance test above.


## Short observation recorded

On 2026-10-30 the user confirmed the Nothing Phone screen was off around 20:02 IST.
The desktop observer/server metadata showed a fresh heartbeat at 20:04:00 IST with 49%
battery. The user requested a shorter check, so observation ended after about six minutes.
This verifies an initial screen-off upload, not 30-minute endurance, swipe-away or offline
recovery. M4 acceptance remains open for those items.
