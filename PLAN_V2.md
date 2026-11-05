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
| V2.5 — Media and collections | Photo sets/reordering/captions and continuous viewer; named memory collections; private phone cache/offline access and explicit phone archives; one pinned chat message | Atomic quota accounting, interrupted-upload cleanup, author/partner rights, explicit Keep/expiry; local cache follows expiry/privacy/logout; cloud removal needs explicit owner consent and verified archive/backup, with honest other-device availability |
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

Phone storage extension requested on 4 November: cache to reduce downloads; explicit private
phone archives for kept media. A cache alone does not free cloud space. Cloud deletion must
use the Storage API and remain an explicit owner-authorized action after archive verification
and backup guidance. Shared content stays in the cloud unless its changed availability is
reviewed; a phone-only archive is not presented as available to the other person. Browser
storage cannot be treated as the only durable copy. This belongs to V2.5; no cloud copy is
removed during the current planning milestone.

User refinement: a Keep by either person should fan out to both phones after each device
enables keepsakes offline. Store private, user-scoped copies and verify file contents after
writing before acknowledging them. Show Waiting for the other phone / Saved on both from
real per-device receipts. Keep cloud originals as the transfer/recovery bridge until both
devices are ready; before cloud removal also require explicit owner policy, backup/recovery
guidance and compatible clients. Offline/missing/full/uninstalled devices must not count as
a verified durable copy. Never claim that enabling this has already copied anything to
the real partner's unavailable phone. Physical two-phone verification stays for after reveal.

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
  verification is tracked in DEVLOG.md. Photo/voice persistence is extended in the V2.5
  Chat media slice described below.
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
  session-scoped browsing context and privacy/freshness guards. 136 web/16 worker and all
  67 hosted checks pass. Final code eddf5f0 passes Android CI 41868838371; five static
  audits score 100/100 with no findings, and 17 responsive states fit. Software slice verified;
  physical touch/TalkBack and background/offline gates stay in the user's later batch.
- V2.4 implemented: versioned shared plans/confirmation, personal reminders, calendar files,
  private/shared ideas and date jar, independent want-to-go list. 145 web/22 worker and all
  72 hosted checks validated. Six static audits score 100/100; 15 phone layouts fit.
  Android bundle 7b11edf passes CI 41877567905 and integrity/signing/private scan. Schema
  lock-order follow-up 0026 passes concurrency/hosted checks. Physical gates stay deferred.
- V2.5 phone-copy slice implemented: independent Android
  opt-in, encrypted private files with readback/hash verification, account/device/revision-bound
  receipts and a server-independent local library. Cloud originals stay saved. Physical
  expired-session/offline/process-death/two-phone gates remain in the later device batch.
  159 web/22 worker checks pass; all 75 hosted checks are validated across the full run and
  the corrected private-helper privilege audit. Android native tests/build/signing pass in
  CI 41918291192 and 41918882265. Final code f0fdf4a passes CI 41920390183 and local
  integrity/signing/private-material checks. The phone-copy software slice is verified.
  Shared collection slice is implemented: creator-owned names/colors/archive/restore,
  both-member organization of already-kept posts, scoped Keep-instance/version guards,
  collection filters and ZIP metadata without duplicated files. 166 web/22 worker and all
  80 backend checks pass; 21 final phone layouts fit and seven static audits score 100/100
  with no findings. Final source eaaefc2 passes Android CI 41926210764 and artifact checks.
  The collection software slice is verified. Photo-set implementation now adds up to six
  ordered/captioned photos, continuous viewer, complete export/retention and per-photo
  encrypted copies with all-image receipts. All 85 backend, 174 web/24 worker checks pass;
  18 final layouts fit and six static audits score 100/100. Source 4a32eaa passes Android
  CI 41994769622 and artifact checks. Photo-set software is verified; physical gates,
  archive/cloud-removal policy remain open. The Chat media outbox now persists verified
  photo/voice packages with local previews and verified explicit retry after interrupted staging.
  Final source a140993 passes 191 web/24 worker and all 85 backend checks; 30 phone layouts
  fit and ten static audits score 100/100 with no findings. Android CI 42012693712 and
  artifact integrity/signing/private scan pass. The Chat media software slice is verified;
  physical gates remain deferred. Moments drafts remain in memory. See docs/V2_PHONE_KEEPSAKES.md, docs/V2_COLLECTIONS.md
  and docs/V2_MEDIA_OUTBOX.md.
- 5 November priority update: user asked to combine compatible work to save time and explicitly
  defer V2.6. Build V2.7 personal space together with V2.8 reading/motion comfort controls.
  V2.6 remains deferred, not cancelled. V2.5 cloud-removal/archive policy, V2.8 native
  entrance/widget, V2.9 safety and V2.10 release audit remain open. No sensor is enabled
  silently and no APK handover/phone install is requested during this batch.
- The approved audit is the scope reference; its earlier “await selection” wording is superseded
  by this approval. Keep every proposal on this plan, even when it ships in a later phase.

Combined batch underway: V2.7 personal space and V2.8 reading/motion controls are implemented;
201 web/24 worker checks pass. Final browser/hosted/Android evidence follows in DEVLOG.md and
docs/V2_PERSONAL_SPACE.md. V2.6 remains deferred at the user’s request.
