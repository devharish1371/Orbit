# Orbit — Plan v2

Approved by the user on 3 November 2026: implement all proposals in
docs/FULL_APP_AUDIT.md, plus speeding/fall-related alerts. This extends the working app;
the original PLAN.md and deferred physical release gates remain valid.

## Working rules

- Work in the order below, in complete, tested slices. Commit and update DEVLOG per slice.
- Keep the two-person, free/no-card architecture, existing accounts, privacy modes and
  expiry/Keep rules. Never contact the real partner during QA or enable sensors/alerts silently.
- Use original code-native art, shared tokens, concise copy, accessible icon labels, 44 px
  targets, large-text support and reduced motion. Preserve drafts, scroll and map camera.
- Additive migrations must support installed older clients. Test cross-couple isolation,
  retries, expiry, cleanup and stale/conflicting writes before deployment.
- Human-only validation remains task #7: install/physical permissions, keyboard/gestures,
  background/offline/endurance and sensor behavior on the Nothing Phone (3a). No dangerous
  driving/fall testing. Use recorded/synthetic traces and ordinary safe use.
- Each milestone requires relevant unit/hosted tests, lint/types/format/build, phone-sized
  browser verification, Android CI and current docs. Never equate a server acknowledgement
  with recipient delivery, a GPS estimate with driving recognition, or an impact with a fall.
- User preference: continue building/automated verification, retain verified builds internally,
  and do not hand over APKs or request a phone install until the user asks for their test batch.

## Milestones

| Phase | Deliverable | Acceptance |
|---|---|---|
| V2.0 — Foundation | Extract common surfaces/control/spacing/motion rules from accumulated screen overrides; shared confirmation sheets; incremental migration of remaining styles | Current visual baseline retained, meaningful confirmation/cancel/focus behavior tested; no foreign browser confirm boxes in migrated flows |
| V2.1 — Chat essentials | Quoted replies with tap-to-original, author-only recent text editing with edited label/concurrency checks; pending/sent/retry states; one expiring pinned item | Reply content follows original expiry/unsend, edits cannot extend expiry or change identity, no false delivery/read receipts, retry remains idempotent |
| V2.2 — Connected flow | Avatar/profile and photo/viewer transitions; consistent sheets and Back; keyboard/media tray; preserve navigation context | Reduced-motion fallback, no duplicate transition names, no animation waits, Back closes overlays before leaving, physical keyboard/gesture checks |
| V2.3 — Atlas | Anchored map and compact snap sheet, person/freshness/actions, journey overview and selected-route scrubbing when data permits | Map gestures and sheet scroll coexist; GPS gaps/age/privacy stay honest; safe-area/large-text checks |
| V2.4 — Plans and places | Shared plans with confirmation/reminders and optional ICS; want-to-go list separate from arrival geofences; date jar from user-written ideas | Membership/ownership, timezone, reminder dedupe, cancellation and opt-in verified; no external booking/calendar account or paid service |
| V2.5 — Media and collections | Photo sets/reordering/captions and continuous viewer; named memory collections; one pinned chat message | Atomic quota accounting, interrupted-upload cleanup, author/partner rights, explicit Keep/expiry; collection/pin does not retain content silently |
| V2.6 — Personal keepsakes | Photo with a voice on its back; one memory with two voluntary contributions | Mixed-media storage/cleanup/export, accessible alternative to flip gesture, deletion/partial-contribution states; no anniversary letter in the app |
| V2.7 — Personal space | Optional expiring emoji/status, on-this-day kept memories, Us shared shelf and restrained Home hierarchy | User-authored status only, real saved memories only, no inferred mood/relationship score or streak pressure |
| V2.8 — Native entrance and comfort | Theme-aware privacy cover/splash/unlock handoff; text size/ambient-motion controls; private photo/plan widget | Lock cancel/failure keeps cover; no pre-unlock personal content, privacy-safe widget defaults; measured phone behavior |
| V2.9 — Safety | Opt-in sustained high-speed alerts, timed journey check-ins and experimental impact/fall check-in research/prototype | See safety contract below; no unvalidated emergency or medical claim; simulation and safe phone validation before enabling |
| V2.10 — Release audit | Consolidated CSS/component system, performance/large text/TalkBack/reduced motion, cold/slow/offline flows, complete acceptance/backup/recovery documentation | Original deferred device/partner/soak/signing gates resolved before a final production release |

## Safety contract and research

**High speed:** an opt-in threshold chosen by the person sharing. Use valid native speed and
speed uncertainty, sustained multiple recent fixes, cooldown/hysteresis and visible enablement.
Call it a speed estimate: the phone may be in a car, bus or train, and Orbit has no road-limit
database. Local prompt first; partner alerts require explicit sharing consent. Pause/Surprise
privacy is not bypassed. Never label a person a dangerous driver from GPS alone.

**Journey check-in:** a chosen destination/deadline and explicit check-in/cancel/extend controls.
Overdue means no confirmed check-in, not proof of an accident. Show connectivity/delivery
state; no automatic emergency-service call.

**Impact/fall:** research and prototype a phone-motion check-in, disabled by default. A phone
drop, exercise or vehicle movement may resemble a fall; a phone left on a table misses a
person's fall entirely. Treat it as an experimental candidate signal, with a local confirmation
and cancel flow. Phone-specific validation and false-positive/battery evidence precede any
partner escalation setting. No medical assurance or background guarantee. Do not ask anyone
to fall, drop their phone or drive fast to test it. Raw motion stays local and short-lived.

Primary references, verified 3 November 2026:
- [Android sensors](https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview):
  background continuous sensors require an appropriate foreground execution path.
- [Android Location](https://developer.android.com/reference/android/location/Location):
  hasSpeed/hasSpeedAccuracy and uncertainty must bound speed-based decisions.
- [AOSP sensor types](https://source.android.com/docs/core/interaction/sensors/sensor-types):
  accelerometer/linear acceleration semantics and non-wake-up behavior.
- [Pixel Watch safety](https://support.google.com/googlepixelwatch/answer/12663810?hl=en):
  even dedicated wrist fall detection can miss falls and trigger during high-impact activity;
  this does not validate a phone classifier.

## Status

- V2.0 foundation slice implemented: shared token/surface stylesheet extracted; message,
  capsule and place deletion share a native confirmation sheet with busy/error/cancel behavior.
  84 web/16 worker tests and lint/types/format/build pass; 320/360/412 px sheet checks fit,
  cancellation restores focus. Remaining legacy screen rules migrate during subsequent phases.
- V2.1 reply/edit slice implemented: menu reply, live quote references/tap-to-original,
  author-only 15-minute edits with version checks, edited/sent-to-server indicators and
  retained-draft retry. One shared 24-hour pin now follows original expiry/unsend and protects
  a replacement from a stale unpin. Text-only encrypted outbox now persists before clearing
  the composer, retries with stable identity and UUID, and confirms pending-copy discard/logout.
  Physical offline/process-death validation remains in the user's requested test batch.
  89 web/16 worker checks and all 64 hosted tests pass; browser quote/edit/reload verified.
  Pin follow-up passes 91 web/16 worker checks and all 66 hosted tests.
  Outbox follow-up passes 105 web/16 worker checks and all 67 hosted tests; native/browser
  verification is tracked in DEVLOG.md. Photo/voice offline persistence remains for V2.5.
- V2.2 first slice: Android Back prioritizes dialogs/temporary layers, safe history/fallback
  and Home minimize; Escape closes temporary web layers. Place editing uses the shared
  focus-contained sheet, with busy/error/retry and return-focus checks. 117 web/16 worker
  checks and final Android CI 41687906057 pass for code head 4c5ff9b. The small Map route
  now stays cached across web updates; tiles stay network-only. Native gestures and the
  remaining avatar/photo/keyboard work stay open. Build retained privately, no handover.
- V2.2 connected-image/media software slice: unique portrait→profile handoffs, shared
  profile/post photo viewer with preview/retry/zoom and focus/scroll return; interruption and
  reduced-motion fallbacks; three-action media shelf, voice cancel/Back and restored draft
  sizing. 125 web/16 worker checks and all 67 backend checks validated (one network retry).
  Android CI 41861182765 passes. Six static screen audits score 100/100 for accessibility
  and best practices; quote-label advisories are resolved. The daily-answer focus highlight
  is contained inside the field, verified at 320/360/412 px. Physical gates remain deferred.
  Physical keyboard/predictive-Back/gesture tests remain for the user's batch. See
  docs/V2_CONNECTED_IMAGES.md and DEVLOG.md for final browser/Android results.
- V2.3 software implemented: anchored map/two-position sheet, actual-sample journey scrubbing,
  session-scoped browsing context and privacy/freshness guards. 135 web/16 worker and all
  67 hosted checks pass. Final browser/a11y/Android rollup is in progress; see DEVLOG.md.
- V2.4–V2.10: planned and approved. Safety defaults remain off until implemented and validated.
- The approved audit is the scope reference; its earlier “await selection” wording is superseded
  by this approval. Keep every proposal on this plan, even when it ships in a later phase.
