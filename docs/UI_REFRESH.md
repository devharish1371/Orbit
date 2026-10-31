# Orbit UI and daily-flow update — 1 November 2026

Design research and decisions: [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md).

## Delivered

Two equal planets across launcher/PWA/app branding; five custom paired navigation glyphs;
solid paper/ink themes; bold typography; contact-position press highlights; reduced-motion
fallbacks; and preserved saved accent/theme/profile choices. All main and secondary routes
use the same visual vocabulary. No added runtime dependencies.

Chat has a continuous header, bounded conversation scroll and rounded focus treatment.
Voice notes use an accessible custom waveform with seek, retry, exclusive playback,
background pause, preview and speed controls. Moments has a draft-preserving expandable
composer. Chat and Moments now offer scoped server-side caption/text search and media-kind
filters with pagination. Filters are separate from the existing kept-only choice.

Map tools sit directly on the atlas. Person details explain recent/old/waiting/paused/
approximate positions; navigation is offered only for a precise live-mode fix no older than
five minutes. It opens Google Maps only after a tap. Tracking separates confirmed sharing
mode, actual service health, phone setup and diagnostics. No ETA, address or online status
is fabricated. The map's connection label describes the data connection, not GPS freshness.

Us uses collectible photo-stack, envelope and timeline objects. Capsules fold their writing
form while retaining the draft and restoring title focus. Profile/Settings have visual theme
previews; notifications have accessible checkbox switches. Unnecessary slogans, decorative
footers and repetitive instructions were removed; privacy/retention explanations remain.

## Verification

- Web: 55 tests. Worker: 16 tests. Lint, typecheck, format and production build pass.
- Full hosted Python/security/integration suite: 58 passed in 85.13 seconds.
- Source secret scan: 431 files, zero findings (values never printed).
- Browser: server search for a remembered word; literal-percent no-match result; clear
  recovery; photo-kind filtering; capsule draft retention and restored focus. Earlier checks
  covered retained Moment draft and actual saved Dev voice playback/seeking/speed.
- 34 settled phone captures at 360/412 px, light/dark: no horizontal overflow. Two additional
  expanded-control captures. Test content/identities only; no partner messages or pushes.
- All 26 final rendered-screen/theme audits: 100 accessibility / 100 best practices.
  The label-content-name advisory on decorative avatar initials/map labels was manually
  reviewed; no contrast failures remain.
- Android CI [41235338093](https://github.com/devharish1371/Orbit/actions/runs/41235338093)
  passed for e7b41e6, including native tests, APK signature and manifest assertions.
  Artifact: orbit-ui-refresh. The local APK download approval was declined, so local
  signer-continuity, ZIP/private-material scan and checksum verification are not claimed.

Screens: [screens/ui-refresh](screens/ui-refresh/). Static DOM accessibility audits check
rendered semantics and contrast, not authenticated load performance or Android frame rate.
Native hardware smoothness, keyboard/gesture insets and updated launcher appearance require
human task #7 on the Nothing Phone (3a). Earlier offline/endurance/partner/4G/soak gates are
still open. M9 release acceptance is not claimed by this UI update.

## App-wide refinement and return flow

The later refinement (2f0f354, 493ce20 and subsequent loading change) further reduces boxed
controls, tightens hierarchy across routes, removes nav dots and shrinks orbital planets.
Retention, place and duration controls use a shared native-dialog choice sheet. Browser
checks cover keyboard movement, Escape cancellation, return focus and actual duration/place
selection; no content was sent. Native lock cover now has matching orbital artwork, busy
state and large-text/short-screen scrolling. Authentication and privacy remain native.

Route loading now keeps Shell/navigation mounted, covered by a regression test. Cold/session
loading uses the shared brand mark. The loading/lock additions require a newer Android run
than e7b41e6 above. Updated run and final audit results are recorded in DEVLOG.md. Native
visual acceptance and real unlock transition timing are not inferred from browser QA.

Final cold-login Lighthouse after loading changes: **98 performance / 100 accessibility /
100 best practices**, LCP 1.7 s, CLS 0, TBT 10 ms under simulated mobile conditions. These
are browser measurements, not physical Android biometric/unlock timing. Web suite is now
**58 tests**, worker suite **16**, with lint/types/format/build passing. Hosted suite remains
58 passing from the prior full run; no backend schema or authorization change in this pass.
The final refined-screen audits are separate from this cold-load measurement.

Final Android build for the lock/loading update: [41236753394](https://github.com/devharish1371/Orbit/actions/runs/41236753394),
code 266123d, passed native tests/compilation, signature and manifest checks. Artifact
`orbit-ui-refresh`. All 26 final refined screen/theme audits are 100/100. New screenshots:
[screens/refinement](screens/refinement/). Local APK signer-continuity/private-payload
verification remains unperformed after the earlier download refusal. Human task #7 must
review the native cover and real return-to-app flow; browser results do not replace this.
