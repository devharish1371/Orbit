# V2.10 — release audit and visual cleanup

Requested 6 November: a whole-app cleanup with minimal copy, visual controls, generous
spacing and coherent flow. No typing box/ring/glow/highlight. This extends V2.10; it does
not waive the user's deferred phone tests or authorize an APK handover.

## Work and acceptance

1. Consolidate text-field focus rules rather than add another override stack. Native caret
   indicates text entry; keyboard focus remains visible on links/buttons/selects/ranges and
   read-only controls. Keep labels, error messages, selected state and text selection.
2. Audit Home, Map, Moments, Chat, Us and every secondary route/editor. Remove repeated
   labels, filler subtitles, explanatory footers and nested panels. Use labelled icons for
   familiar local actions; retain words for navigation, ambiguous actions and consent.
3. Group Settings by purpose; give forms, shelves, map controls and media room. Reveal
   occasional guidance on demand. Never hide privacy/expiry/backup/safety consequences at
   the decision that needs them. Keep drafts/Back/focus/scroll behavior intact.
4. Review session/logout, loading/error/offline/retry and backup/recovery. Run source/security,
   production dependency, strict web/worker, hosted and Android gates. Record findings and fixes.
5. Verify phone-width Day/Night/all text sizes/reduced motion and text-entry states using
   production components with disposable fixtures. Check caret visibility/no focus decoration,
   keyboard actions, icon names, overflow, empty/error states and settled accessibility audits.
6. Update operation/recovery guidance and the release checklist. Retain the APK privately.
   Full production release stays blocked on explicitly deferred task #7/partner/soak/signing
   gates; software verification is not phone reliability evidence.

## Original findings — resolved below

- Text focus rules exist in base, foundation and several feature styles; chat also retains
  an input underline and composer focus glows in older layers. Consolidate at the source.
- Settings mixes navigation, appearance, connection, privacy and backup on one long page.
- Repeated descriptions/badges and media/diagnostic footers compete with primary content.
- Logout confirmation currently runs only with a pending outbox, even though logout also
  clears private phone copies. It must warn about archive backups even with an empty outbox.
- Missing archived phone copies share a skipped-sync count whose message says cloud files
  remain saved. Correct that statement and offer the archive recovery path.

## Design references

W3C's [Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) and
[G149](https://www.w3.org/WAI/WCAG22/Techniques/general/G149) explicitly describe the native
insertion caret as a text-field focus indicator. Use the normal visible caret, without
removing the focus indicator on non-text controls. Chromium's
[UI writing guide](https://chromium.googlesource.com/devtools/devtools-frontend/+/main/docs/styleguide/ux/writing.md)
supports concise, contextual language; icon choices and page hierarchy are Orbit-specific
implementation decisions, not claims about equivalence to another product.

Final results and limitations follow; implementation history is in DEVLOG.md.

## Software verification — 6 November 2026

Final application source: `25fd54e04aee680d539c4aec8563bd7140de1a9e`.
Implementation commits: `6ace3db`, `8e1be13`, `7ae0d00`, `0721148`, `25fd54e`.

- Shared caret-only editable fields replace competing focus frames, glows and underlines.
  Date/time segment selection and native caret remain; non-text controls retain focus.
- Home has open connection icons, smaller attention actions, one location freshness line
  and a compact daily-answer action. Chat has no squared name-header cap.
- Settings opens by purpose with native disclosures; profile explanations appear on demand.
  Profile/collection controls use labelled icons and copy is shorter throughout.
- Logout always warns about private phone copies and independent archive ZIPs, including
  with an empty outbox. Skipped archived files no longer promise cloud originals exist.
- Photo preparation has its own state before preview/explicit Post. Photos in the Chat tray
  matches its spoken action. A new plan no longer claims confirmation is pending.
- The Map add-place instruction no longer covers Use map center at Largest text; its
  accessible instruction remains. The action was hit-tested/opened at all three widths.

Strict lint/types/format/build pass with 241 web and 44 worker tests. The full hosted/tool
suite passes 105/105 in 223.65 seconds, covering isolation, retention, identity, location,
notifications, mixed media, phone receipts and archive/restore. No backend deployment was
needed for these UI-only changes. Production dependency audit has zero vulnerabilities;
Python requirements are consistent.

Production browser verification records 459 measured layouts, 17 flows and 16 focused
editable fields. The base matrix covers 22 routes × Day/Night × Standard/Larger/Largest
× 320/360/412 px; expanded editors, sheets, long names and the daily-answer field extend it.
No page/control horizontal overflow remains. Geographic markers outside the map camera and
intentional horizontal rails are clipped content, not document overflow. Less motion stops
orbital animation; buttons/help retain keyboard focus; Escape returns to the trigger; drafts
survive tools and the observed update flow. See [screen evidence](screens/v210-release/README.md).

## Loading, recovery and performance boundaries

- AuthProvider tests restore saved sessions, preserve temporary refresh failure/reconnect and
  clear private caches on explicit logout. App continuity keeps an existing screen/draft on
  refresh failure. Shell loading preserves navigation; lazy-load errors retain Update Orbit.
- OfflineBanner reconnect and encrypted outbox tests cover stable retry identity, changed
  account/expiry guards, interrupted staging, byte verification, quota and blocked corrupt media.
- Native surface tests cover frame/appearance readiness, storage failure and obsolete-page
  guards. This is bridge/unit evidence, not a measured physical unlock or cold-launch pass.
- The production map renderer remains separately lazy loaded (1,076.03 KB, 292.01 KB gzip),
  excluded from service-worker precache; map tiles remain network-only. Main JS is 513.56 KB,
  149.62 KB gzip. Vite retains a >500 KB advisory. These are asset measurements, not a claim
  about 60 fps or startup on the phone. Precache is 132 entries / 1,375.81 KiB.
- Static audits evaluate settled DOM semantics/contrast/browser practices. They do not measure
  actual app performance, map canvas rendering, recipient delivery, OS text scaling or TalkBack.
  Native keyboard/gestures, low space, true offline walking, SAF providers/process death,
  battery/soak and partner onboarding remain deferred task #7.
- File-chooser automation wall time included picker/transport delay. Local preview/reorder was
  verified, but no 4G upload or photo-processing performance result is inferred from that call.

## Final audit and native results

All 63 settled static audits score 100/100 for accessibility and browser practices, with zero
binary findings. One revoked-blob photo-preview HTML case is explicitly excluded from static
Lighthouse; its real preview/caption/reorder interaction and screenshot remain documented.
Native-dialog captures restore showModal top-layer behavior; exact disposable image bytes
and local CSS are used without weakening CSP. See the evidence README for harness limits.

Final Android CI 42266311411 passes web/tool/native tests, Capacitor sync, Java/resources,
merged-manifest/bridge checks, assembly and signing. The exact APK passes ZIP integrity,
signer continuity with `9b427ec` and private-material scan. Its hash is in verification.json.
An optional current cold-login performance measurement was declined; no new startup score
is claimed. Actual physical launch/keyboard/tracking/performance gates remain unverified.

## Release boundary

V2.10 software verification does not waive [the physical and owner release gates](RELEASE_CHECKLIST.md).
The stable internal-test APK is retained privately; no handover or installation requested.
The anniversary letter remains outside Orbit. No real partner contact, sensor activation,
recording or real-memory archive/removal occurred during this pass. Independent backup,
archive/restore, logout and ongoing-care guidance is in [care and recovery](CARE_AND_RECOVERY.md).
