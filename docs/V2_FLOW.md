# V2 connected-flow pass

First slice: Back and focused place editing. This is not completion of the avatar/photo
handoff, keyboard and wider connected-motion work in PLAN_V2 phase V2.2.

- Android Back requests cancellation from the open native dialog first. Each existing
  sheet/viewer owns its close/focus lifecycle; busy confirmations remain covered.
- Temporary chat actions/reactions, the composer options tray and map person/place/pin
  selection close before route navigation. Escape shares the temporary-layer behavior on web.
- Android traverses known router history; direct detail entry has a safe in-app parent;
  root-tab fallback is Home, then minimize. No traversal into unrelated WebView history.
  Native subscriptions are removed on route/unmount; stale callbacks are inactive.
- Place editing opens in the shared focus-contained sheet instead of an inline form down
  the map page. Disabled fields and dismissal guard protect an in-flight save; errors keep
  the edited values for retry. Cancel restores its trigger without changing a place.
- Shared sheet focus is captured before child autofocus commits. Photo/profile triggers
  announce that they open a dialog and expose their expanded state.

117 web / 16 worker tests, lint/types/format/build pass at this slice. Nine native-navigation
cases simulate Back priority, busy guards, layers, safe direct links, history/minimize and
cleanup. Place tests cover cancel/focus and insert/update error/retry. Physical Android
keyboard/predictive-Back/gesture behavior remains for the user's requested batch; these
are mocked-bridge tests, not device acceptance. No backend change in this slice; the last
complete hosted regression remains 67 passing tests.

Verified primary API reference: [Capacitor App v8](https://capacitorjs.com/docs/apis/app#addlistenerbackbutton-),
including replacement of default Back handling when an application listener is installed.
Browser screenshots and exact Android build outcome are recorded in DEVLOG.md.
