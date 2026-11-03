# Orbit visual and interaction pass

User brief, 3 November 2026: less boxed-in UI, fewer explanatory paragraphs, more space and
personality throughout; custom themed map, compact refresh, day journeys/navigation,
modern Moments/replies/reactions, chat-linked person profiles and a roomier Us page.

Scope: original light/dark cartography; compact person/refresh strip; last-24-hour journeys
derived from existing fixes, retaining gaps and privacy; tappable places/POIs with explicit
Google Maps navigation; editorial Moments with a summoned reaction palette and modal reply
conversation; read-only partner profile/full photo; Home signals and Us memory shelf spacing.
GPS travel modes are estimates, not certified activity/driver recognition. Keep meaningful
permission, privacy and destructive-action information while removing repetitive prose.

Verify journey math/privacy, modal focus, routes, themes/widths, all automated checks,
hosted regression and Android build. Use disposable accounts; no real partner contact.
Existing physical/offline/endurance/soak gates remain open.

Further user steering: Orbit-specific map controls and a dotted paired-location connection
(decorative relationship between current fixes, never a route); real north-reset compass;
Ink/Glow/Paper text treatments previewed in the writing canvas and persisted per post.
The additive schema defaults older clients to Ink, validates style names and keeps the
existing post identity, retry, media, quota and retention checks. Long notes can expand from
a compact reading preview. No anniversary letter content is introduced.

Additional references: [Meta text-style engineering](https://engineering.fb.com/2022/07/18/developer-tools/building-text-animations-for-instagram-stories/),
[MapLibre navigation controls](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/NavigationControlOptions/),
[Material motion](https://m3.material.io/styles/motion).

References: [MapLibre](https://maplibre.org/maplibre-style-spec/layers/),
[OpenFreeMap](https://openfreemap.org/quick_start/),
[OpenMapTiles](https://openmaptiles.org/docs/schema/),
[Life360 detection](https://support.life360.com/hc/en-us/articles/23053499870487-Drive-Detection-Analysis).

## Verification and handover

Runtime commit: `a06b7df`. Migration 0017 deployed; hosted coverage checks default/valid/invalid
note styles, partner visibility, membership boundaries and existing post behavior. Web tests
also cover the composer, journey math and overlapping map-marker selection. All 82 web and
16 worker tests pass, with lint, types, formatting and production build; all 61 hosted Python
tests pass. One earlier full-suite attempt hit a network connection reset; the complete retry
passed, and its abandoned disposable records were removed with identity/time guards.

CUA verified Home/Moments/Chat/Us profile routes and return navigation, modal reply posting
and removal on dummy accounts, Escape/focus restoration, photo selection/preview/removal,
reaction feedback, journey selection and both portrait menus. The directions URLs match each
selected synthetic coordinate. Glow/Paper posts retain their style after reload. No real
partner messages, notifications or location requests were sent. Microphone recording was not
repeated in browser; the existing native recording/background-stop path is unchanged.

72 responsive captures cover seven routes and five composer states at 320/360/412 px in both
themes with no horizontal/control overflow. Eight additional map/note-style captures record
their actual 460 px viewport: a browser viewport override did not apply, so they are not
claimed as extra narrow-phone measurements. See the screen README for audit scope.

Android workflow [41635237900](https://github.com/devharish1371/Orbit/actions/runs/41635237900)
passed native tests, signing and manifest checks. Latest [APK artifact](https://github.com/devharish1371/Orbit/actions/runs/41635237900/artifacts/13230242454)
contains `a06b7df`, including the portrait-overlap fix and saved note treatments. Local
`.artifacts/apk/a06b7df/app-debug.apk`: 6,914,115 bytes; SHA256
`8f20bf46d06345a0e6b22f8c69728784f0b9977d0e9805e1ec13375eb2a28058`.
ZIP integrity, signing identity against the M7 baseline and configured-private-data scan pass.

The user-facing preview and its disposable fixture are retained for review. Day journeys are
GPS estimates from existing samples, not verified driving recognition. Physical refresh,
offline/endurance, second-phone, soak and release gates remain open; no final release claim.

Final static audit: 32 screens scored 100 accessibility / 100 best practices.
Source secret scan: 660 files, zero findings.
