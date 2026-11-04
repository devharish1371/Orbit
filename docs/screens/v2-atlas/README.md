# V2.3 Atlas evidence

4 November 2026. Synthetic GPS and disposable identities only. Source 714853f, followed
by label/freshness/gesture corrections a7b7747 and playback/label correction eddf5f0.
Journey/place captures use eddf5f0; unchanged Now/person states retain the a7b7747 capture.

- `now-360.jpg`: compact person/freshness controls and room for the map.
- `journey-360.jpg`, `journey-night-360.jpg`: recorded-sample cursor and accessible playback.
- `place-night-360.jpg`: saved-place detail actions in the same sheet.
- `layout.json`: seventeen measured states at 320/360/412 × 800 and 360 × 640. No horizontal
  overflow or undersized summary controls; outer scroll stays zero. Sheet/nav clearance is
  11 px in these layouts. A shorter landscape screen retains document scrolling as fallback.
- `audit-summary.json`: five static states, 100 accessibility / 100 best practices with no
  binary findings after the marker-target and label corrections.

Browser checks: upward handle drag expands; click/keyboard toggles; independent map pan
changes rendered marker positions without moving the page. Arrow/End reaches real samples
2/16 and 16/16 with recorded timestamps. Escape removes playback and focuses its journey row,
then collapses the sheet and focuses its handle. Profile roundtrip preserves selected sample
and sheet state. Place selection exposes explicit Google Maps navigation; stale person fixes
disable directions. Day theme/normal viewport restored; no browser warnings/errors observed.

Static audit states: Now (Day), journey (Day/Night), place (Night), person actions (Night).
These script-free DOM captures measure semantics and contrast of controls. They do not render
the live WebGL map or measure authenticated performance, frame pacing or Android TalkBack.
HTML is ignored/private because it can contain short-lived fixture signed URLs. Each capture
has the normal doctype; local assets refer to the matching production build. Android code
eddf5f0 passes CI 41868838371; APK integrity/signing/private scan pass. Build identity is
recorded in DEVLOG.md; the build stays internal for the later batch.

136 web / 16 worker tests, lint/types/format/build pass; 67 hosted tests pass. Tests cover
sheet gestures/keyboard, recorded-sample identity/irregular times, route roundtrips, Back/focus,
cached privacy transitions, stale approximate distance, camera/cursor cleanup and reduced-motion
camera behavior. Physical touch/TalkBack, background/offline/endurance and partner acceptance
remain deferred to the user's requested batch. No APK handover or install request.
