# Safety — V2.9 implementation contract

Default off. Speed reminders use the existing explicitly enabled Android tracking service;
they never start tracking or request permissions silently. API 26+ native speed uncertainty,
valid fresh monotonic fixes, a 45-second sustained window, hysteresis and a 15-minute cooldown
are required. This is a configurable speed estimate, not road-limit or driver recognition.
The prompt is local. No automatic partner speed/impact escalation ships before physical
validation. A user may separately choose the existing call request after reviewing safely.
Pause and Surprise suppress the speed candidate. No raw speed/motion history is added.

Journey check-ins work on both platforms: choose a destination label and deadline, then
check in, extend or cancel. Private is the default. Sharing the timer and overdue reminder
requires explicit sender consent, recipient safety-notification opt-in and live sharing.
The timer adds no location collection or automatic arrival inference. Overdue means no
confirmed check-in. Server acknowledgements and FCM acceptance never claim phone delivery.
Notifications revalidate state/version/consent/privacy, expire one hour after the deadline,
respect quiet hours, and can be delayed or missed. No emergency-service call is made.

The motion prototype is a QA/research component, excluded from the shipped Safety screen.
It uses synthetic acceleration traces only. It adds no sensor listener,
background process or partner escalation switch. A phone drop can resemble a fall; a phone
left elsewhere cannot monitor a person. Hardware, false-positive and battery evidence must
precede real monitoring. Never fall, drop a phone or drive fast to test these features.

Primary research checked 6 November 2026:
- [Android Location](https://developer.android.com/reference/android/location/Location) — speed accuracy is an
  optional API 26+ estimate; elapsed realtime is monotonic. The selected two-uncertainty
  margin is a conservative product heuristic, not a calibrated probability guarantee.
- [Android sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview) —
  continuous background sensor limits and listener lifecycle.
- [AOSP sensor types](https://source.android.com/docs/core/interaction/sensors/sensor-types) — accelerometer
  includes gravity; free-fall/impact patterns concern the device, not a validated human fall.

Automated checks use disposable accounts and synthetic traces. No real partner contact,
permissions, sensors or settings changes during QA. Physical task #7 gates and APK handover
remain deferred. V2.6 stays deferred. Final verification is recorded in DEVLOG.md.

## Verified software and deferred acceptance

Exact source ce81729 passes Android CI 42132581549 and native policy tests. 224 web/38 worker
and all 96 hosted/tool checks pass; 15 browser flows and 60 responsive states are verified
with injected native replies and synthetic content. Ten static screen audits score 100/100.
The motion preview is QA-only; installed users see working timer/local-reminder controls,
not a prototype monitoring switch. Recipient safety notifications remain default off.
A processed job never claims phone delivery, including when unregistered tokens are removed.

Physical speed-uncertainty availability, notification channel/routing, safe-use false-positive
evidence, background/reboot/battery checks remain deferred. No automatic partner speed or
impact escalation is shipped before that evidence. See DEVLOG.md and
docs/screens/v2-safety/README.md for the artifact and proof limits.
