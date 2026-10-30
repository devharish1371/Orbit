# M3 map and phone acceptance

M3 is accepted after the user reported Profile and Map work well on a Nothing Phone (3a)
with Nothing OS 4.1. This is a qualitative smoothness/usability check, not an instrumented
60 fps measurement. M4 can proceed; its background reliability tests remain separate.

## Disposable partner simulation

From the repository root:

```sh
.venv/bin/python -m tools.simulate_location --minutes 20
```

This creates two disposable confirmed identities and a private demo couple. It never edits
the permanent couple or users. A one-use login is held in owner-readable
`.artifacts/private/demo-login.json`, which is ignored. Use the demo email/code with “I
already have a code”; no email is sent. Never share the file or commit it. Synthetic points
move around a public map area every 15 seconds. Ctrl+C removes the users, couple, places
and history; the handoff file is also deleted. A hard process kill can prevent cleanup;
inspect only identities prefixed `orbit-test-map-` if recovery is necessary.

Browser checks performed: live marker/distance/midpoint/time updates, fit both, 24-hour
trail, tap-to-add place, emoji/name save, radius edit. Places and user colors render on the
map. Fiord is the readable night style; Liberty is the day style. Visible attribution stays
on-screen. Failed WebGL/style loading has a retry path and text details remain usable.

## Debug APK

Verified build: [d9fff3d / Android debug workflow](https://github.com/devharish1371/Orbit/actions/runs/41028725065).
Local APK: `.artifacts/apk/d9fff3d/app-debug.apk`, with adjacent `.sha256` checksum.

The manual **Android debug test build** GitHub workflow runs all web checks and the source
secret scan, syncs Capacitor, compiles with Java 21, then uploads `orbit-m3-debug` for seven
days. It receives only the project URL and public client key as repository variables.
The private project key, SMTP credential and account PAT never enter this job.

This is a disposable debug signing identity, not the future release keystore. M9 uses the
backed-up human #5 release key. Switching from this debug app to a differently signed release
may require uninstalling/reinstalling and signing in again.

Human #7: download/install the APK from the workflow artifact (or the local downloaded
artifact provided with the handoff), sign in using your normal email code, and check Profile
and Map on an Android phone. Upload a real profile photo only if you want to. Check panning,
zooming, fit both and marker movement; report phone model and any stalls. M3 requires a
60 fps check on a mid-range Android WebView; a desktop screenshot is not evidence of that.
Use the disposable simulator for movement without putting synthetic locations in real history.

Location permission is requested only after **Share my location**. This build shares only
while its page is visible; background/screen-off/swipe-away tracking belongs to M4 and is
not implemented yet. 

## Automated evidence

`npm run check:web`: strict TypeScript, ESLint, formatting, 22 web tests, five retention
worker tests, production build. `pytest --run-integration`: 39 tests including 24 live checks.
Native asset build/sync passes. RLS restricts live/history writes to the current member;
precise history writes are rejected while paused or in surprise mode. The SDK subscriptions
use one couple-scoped channel and re-read authorized rows in batches no more than four times
per second. Reconnect and visibility restoration fetch a current snapshot.

Web sharing: explicit opt-in, watcher cleared on hide/stop/logout, accuracy ≤100 m, fresh
fixes only, moving writes ≥15 s apart and still writes ≥5 min apart. History is stored only
on ≥30 m movement or a five-minute interval, and omitted in surprise mode. Native offline
queue/adaptive battery handling is M4 work. MapLibre, its worker and MapPage are lazy and
excluded from service-worker precache; private data/tiles are never cached by the worker.
