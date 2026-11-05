# V2.9 safety verification

Source: `ce8172947c3d88e6c9b5960390108cb0729088c6`. Android CI
[42132581549](https://github.com/devharish1371/Orbit/actions/runs/42132581549) passes native
unit tests, resource/Java compilation, assembly, manifest/bridge and signing verification.
224 web/38 worker checks and all 96 hosted/tool checks pass. No APK handover requested.

Browser verification uses production components, synthetic couple/timer data and an injected
native bridge. It does not operate the real tracking service, register sensors, send partner
messages or change real notification preferences. The motion research component is a separate
QA-only route; it is excluded from the shipped Safety screen and production App routes.

- `flows.json`: all 15 checks pass: 12 app checks plus three research-preview checks.
  Private defaults, shared consent/cancel, server acknowledgement, exact 15-minute extension,
  closing/cancelling/checking in, local reminder setup/dismissal, offline retry, browser
  fallback and exclusion of the research controls are verified. Countdown assertions use
  the exact acknowledged timestamp because visible remaining minutes tick during QA.
- `layouts.json`: 60 responsive states fit at 320/360/412px without horizontal overflow or
  out-of-bounds dialog/page actions. This includes 54 production web states (active/overdue,
  both themes, all reading sizes, largest-size consent/editor/speed-choice sheets) and six
  separate research-preview states.
- `audit-summary.json`: all ten settled static audits score 100/100 for accessibility and
  best practices with no binary findings. Nine cover app screens/sheets; one covers research.
  Static copies include the doctype, exclude the harness toolbar and disable copied
  animations. These measure semantics and contrast, not app startup performance.
- PNGs illustrate the final web controls, not native service or notification delivery.
  `preview.png` crops only the harness toolbar. The research image is explicitly QA-only.

Hosted tests use disposable couples only. They prove private/cross-couple visibility, owner
rights and expected-account guards, exact replay/version checks, deadline limits, one active
timer, concurrent extend/check-in serialization, explicit sender/recipient opt-in, live-mode
privacy, scoped/deduplicated metadata-only queue and private function/cron privileges. Worker
checks revalidate changed/closed/expired/early/private timers and opt-out before token lookup.
A full final run passes 96/96 in 151.59s. An earlier run had two connection resets (isolated
rerun passed) and an outdated cron inventory assertion (updated and verified).

Native unit tests use synthetic monotonic speed fixes for sustained quality/uncertainty,
privacy/mock/stale rejection, duplicate/gap handling, hysteresis and cooldown. Physical
Nothing Phone (3a) uncertainty availability, notification channel/tap routing, safe ordinary
use, background/process-death/reboot behavior and battery/false-positive evidence remain
human task #7 gates. No fast driving, fall or phone-drop testing is requested. There is no
automatic partner speed/impact escalation, medical detection or emergency call.

The final build stays private and passes integrity, signing continuity and private-material
scanning; final byte/hash details are in `verification.json`. Temporary QA tabs/servers are
closed; Day/Standard/Follow phone and the viewport are restored. User previews 5173/4173
are preserved. See [the contract](../../V2_SAFETY.md) and [the devlog](../../../DEVLOG.md).
