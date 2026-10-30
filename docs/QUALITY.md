# M8 quality and polish

Verified 2026-10-31 with disposable identities; no real partner messages or phone changes.

## Measured results

- Final cold-load **mobile production Login** Lighthouse: **98 Performance / 100 Accessibility /
  100 Best Practices**, LCP **2.4s**, CLS **0.002**, total blocking time **0ms**. This is the
  real compiled app with a clean browser profile. It does not measure authenticated API
  latency, actual 4G upload speed or native frame rate.
- **32/32** signed-in rendered screen/theme audits score **100 Accessibility / 100 Best
  Practices**. These use DOM exported from the running app, with scripts removed and
  local stylesheet/image assets retained. They measure rendered semantics/contrast;
  they are not authenticated-app performance results. See `screens/m8/audit-summary.json`.
- Clean live browser traversal of all routes: **zero console errors/warnings**, and no
  horizontal overflow in all **64 authenticated route/theme/size captures**.
- **68** regular captures cover 17 views × two themes × 360×800 / 412×915, plus six
  enlarged-type/long-content fixtures and one update-recovery capture. See
  [the screen index](screens/m8/README.md). All imagery and contact details are synthetic.
- All six 130% root-font fixtures fit 360px after wrapping fixes. This checks CSS with
  long names/unbroken messages; Android system text zoom remains a separate device check.
- Web **50 passed**, worker **16 passed**; lint, strict types, format and production build
  pass. The most recent full hosted/backend run is **58 passed** (M7); backend unchanged.

## Corrections from QA

Small chat menus/reaction pills and memory pins now have 44px targets. Textareas/selects
show focus rings. The light accent algorithm accounts for tinted surfaces, fixing active
tab contrast that was 4.47:1 against its actual background. Expiry icons have a valid
image role/name. Map graphics are decorative within a button whose name includes person
and battery. The map label-content-name advisory was manually reviewed against that name.

Home greeting/countdown refresh across local midnight. Capsule/keepsake pagination keeps
a 90-item window with earlier/latest controls. Error and empty states no longer overlap,
and a disabled answer query no longer displays endless loading after a daily-question
failure. Headings/paragraphs and Map person selectors wrap long unbroken names.

Reveal confetti uses its own decorative canvas and resets on unmount, preventing particles
from following the person to the next screen. Reduced motion skips confetti and entrance
motion; existing map movement and CSS reductions remain in place. Media dimensions reserve
photo space; long post lists stay below 100 cards. Initial JS is ~161 KB gzip; MapLibre
and its worker remain separate lazy chunks. No additional dependency was needed.

## Website update recovery

An actual stale-client deployment test reproduced a missing lazy Map chunk. The previous
update prompt was inside the failed app subtree, so it disappeared with the error screen.
It now lives outside the error boundary. Vite's preload-error event checks for a fresh
service worker, preserving the explicit update choice. Clicking Update Orbit recovered
the Map with the existing session. There is no forced reload of an open draft. A regression
component test verifies the update action stays usable after a lazy route throws.

Official references:
[Vite load errors](https://vite.dev/guide/build#load-error-handling),
[Vite PWA prompt updates](https://vite-pwa-org.netlify.app/frameworks/react).

## Reproduce

`npm run check:web` runs all web/worker quality checks. Capture rendered states using CUA
and disposable identities (`python -m tools.ui_fixture`, optional `--polish`), preserving
the normal user's browser session. The static audit runner is `node tools/audit_screens.mjs`;
it expects the private captured HTML/assets served on localhost:4174. Reports stay ignored
under `.artifacts/qa/m8-reports`. Clean the fixture with `python -m tools.ui_fixture --clean`;
files are removed through the Storage API. No live user credentials enter the captures.

Older M4/M5/M6 offline/endurance/partner/4G gates remain in their own records. Quantified
60fps, Android text zoom, older-device authentication fallback and a very large ZIP are
not claimed from these browser measurements. Release/soak acceptance remains M9.
