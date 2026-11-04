# V2.3 — Atlas

4 November 2026. The map, person controls and browsing sheet form one workspace.

- A two-position nonmodal sheet keeps the selected person, recorded age, refresh and
  Now/24 hours/Places within reach. Only its handle captures a drag. Click/Enter provides
  the same expansion; sheet scrolling and map gestures keep their own input surfaces.
- The actual map resizes above the sheet. Route fitting uses its visible area, with no
  route hidden behind a panel. Normal phone heights leave clearance above navigation.
  Short landscape screens retain document scrolling. Attribution stays visible.
- Selected person, view, sheet, journey and recorded sample survive route roundtrips in
  the existing session-scoped FlowProvider. Map camera uses the existing camera memory.
  Reload/logout clears browsing state; no new location persistence or backend table.
- Journey scrubbing selects recorded timestamps from the existing conservative 24-hour
  segmentation. The native range has time/sample-count semantics and previous/next buttons.
  A distinct historical dot marks the selected sample. Scrubbing pans immediately while
  preserving zoom. Missing/removed journeys clear the dot; gaps are never joined by playback.
  Playback focuses the map on its route/dot, with person controls available in the sheet.
- Pause/Surprise remove cached precise markers and replay data immediately. Surprise only
  paints an already-fuzzed fix. History requests stop in these modes. Navigation requires a
  recent precise fix; an older pair reads “last shared” and loses its midpoint navigation.
- Saved places and map POIs open in the same sheet with explicit Google Maps directions.
  Editing/deletion keep existing shared dialogs. Back dismisses selections before the
  expanded sheet and restores useful keyboard focus.
- Map styling moved from accumulated global Atlas overrides into feature-owned atlas.css.
  Reduced motion skips detail settling, camera animations and existing portrait interpolation.
  No extra library, service, sensor, retention rule or permission was added.

Verification: 136 web / 16 worker tests; lint/types/format/build; 67 hosted checks. Browser,
static accessibility and exact Android CI evidence are recorded in DEVLOG.md and
docs/screens/v2-atlas. Synthetic GPS fixtures exercise UI only. Physical touch, TalkBack,
background/offline/endurance and real partner acceptance remain in the user's later batch.
No APK handover or phone install request.

Primary API references checked for this implementation:
- [MapLibre fit padding](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/PaddingOptions/).
- [WAI slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/): range labels/value text,
  keyboard controls and the need for physical touch-assistive-technology validation.
