# V2.4 planning evidence

4 November 2026. Source 7b11edf. Only the retained disposable couple and synthetic examples
were used. No real partner contact or notification; no sensor/permission prompt or APK handover.

- `plans-360.jpg`: shared proposal/confirmed list with compact date markers and actions.
- `jar-360.jpg`: real-idea draw, illustrated jar and picked idea.
- `editor-360.jpg`: timezone-labelled date input and contained keyboard focus.
- `places-night-360.jpg`, `idea-editor-night-360.jpg`: independent want-to-go list and editor.
- `layout.json`: fifteen final measurements across 320/360/412 × 800. No horizontal overflow
  or visible button/link targets below 44 px in the measured areas.
- `audit-summary.json`: six static states, each 100 accessibility / 100 best practices with
  no binary findings. Plans/jar/editor/reminder in Day; places/idea editor in Night.

Browser checks: Us entry → Plans; a draft title survives the Us roundtrip. Date/venue survive
closing/reopening the editor after direct input-event correction. A disposable proposal saves
as Awaiting reply at 12 November, 19:00 Asia/Kolkata. Reminder saves as on, then back off.
The downloaded calendar file contains DTSTART:20261112T133000Z with no ATTENDEE/VALARM.
Cancelling the disposable proposal moves it into Recent plans. Private ideas announce Only me;
the jar selects an actual visible idea. Want-to-go opens an explicit Google Maps search.
Initial editor focus lands in its first field. Theme and viewport restored; no console errors.

Static HTML remains ignored/private because it may contain short-lived fixture signed URLs.
Scripts/module preload are removed; normal doctype and matching local production CSS remain.
Modal replay marks the background inert and restores its top-layer paint in the saved copy.
These are rendered semantics/contrast checks, not authenticated performance or Android proof.

145 web / 22 worker tests and lint/types/format/build pass. All 72 hosted checks validated:
the complete run passes 71; retention's global-counter race and missing-object status assumption
were replaced with exact row/file-list assertions, and all five retention checks pass on retry.
Five planning checks include a three-round concurrent archive/removal regression.
Android bundle 7b11edf passes CI 41877567905; integrity/signing/private scan pass. Schema-only
0026 leaves the compiled bundle unchanged. Native calendar import, keyboard,
push delivery/tap, quiet-hour and physical-device behavior stay in the user's later test batch.
