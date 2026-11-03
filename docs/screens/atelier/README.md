# Orbit visual verification — 3 November 2026

All people, photos, posts, places and tracks in these captures are disposable synthetic
fixtures. Map rendering is real cartography; coordinates are not evidence of actual travel.

`layouts.json` records 72 browser measurements: Home, Map, Moments, Chat, Us, Person and
Keepsakes, plus note/photo-empty/photo-preview/voice-idle/mood composition, at 320/360/412 px
in both themes. No measured horizontal or visible-control overflow. Images carry those widths.

`orbit-layouts.json` records the later Ink/Glow/Paper and Orbit-control extension at the actual
460 px viewport. Requested overrides were ineffective in that browser session; duplicate
captures were discarded and the filenames reflect the measured width. These eight images
supplement the narrow-width baseline. `note-showcase.png` and `orbit-map-menu.png` are viewport
captures for handover. Draft text was cleared after capture.

`profile-flows.json` records origin-aware profile navigation. `map-actions.json` records own
and partner Directions/Profile/Message destinations. External navigation was not activated.
Co-located saved-place/person markers were checked to ensure the portrait menu wins the tap.

Static DOM snapshots were audited locally with Lighthouse for accessibility and best practices,
not authenticated performance. The baseline contains 24 route/composer theme cases, with eight
new note/map cases. Scripts are removed and captured assets are served locally; the upload
preview uses the same synthetic image. An omitted snapshot doctype and preview-origin asset
paths were corrected in the harness; application CSP was unchanged. Map avatar initials have
a reviewed, non-scoring visible-label advisory alongside full-name accessible labels.

Hosted tests cover security and saved note styles. Native keyboard/microphone/gesture edges,
physical refresh/offline/endurance and the deferred partner/soak checks remain human gates.
Preview accounts/media remain available while the user reviews this build.

Final static audit: 32 screens scored 100 accessibility / 100 best practices.
Source secret scan: 660 files, zero findings.
