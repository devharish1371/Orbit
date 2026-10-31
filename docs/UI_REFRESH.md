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
