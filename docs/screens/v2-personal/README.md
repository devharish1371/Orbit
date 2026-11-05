# Personal space and comfort evidence

5 November 2026. Application source `1c58d7c2bf1bfe464dfcaada47ff9577abef4ec0`.
V2.6 is deferred. This batch implements V2.7 and V2.8's reading/motion controls; it does
not complete native entrance/widgets, safety, cloud removal or the release audit.

## Browser scope

An isolated harness mounts production pages/components, router, query cache, theme and
comfort logic with synthetic people/media and injected auth/data providers. Status writes
use a local simulated transport. No real account, partner, sensor, microphone or external
message delivery is involved. QA controls/providers are excluded from the shipped app.
The harness loads global and feature styles in production order.

`layouts.json` records 198 states: ten pages plus the status sheet, at 320/360/412 × 800,
Day/Night and Standard/Larger/Largest reading sizes. Every measured state has a real heading
or open sheet; no horizontal page/sheet overflow. Measured product buttons, inputs and icon
actions retain 44px targets. Ordinary inline text links are not classified as icon controls.
These measurements do not replace real Android font scaling, TalkBack or keyboard/gesture tests.

Observed flows (`flow-results.json`): failed status save retains text, retry acknowledges and
reload restores the fixture status; partner thought bubble opens full status, Back returns to
Us; collection entry selects the intended collection; Largest/Less motion survive reload.
Reduced motion stops orbital rotation and hides its redundant local play/pause control.
Paused Home shows one labelled crossed-out location icon with no duplicate paused sentence.

Fourteen screenshots show Home/Us in both themes at Standard/Largest, on-this-day pages at
Standard, and Settings/status sheets at Largest. Thought previews shorten four-or-more-word
lines to three words plus an ellipsis and clip further to fit; full status remains available
through the profile/editor and accessible descriptions. Screens contain fixture content.

## Static audits and separate checks

All 14 captured static screens score 100/100 for accessibility and best practices, with no
binary findings (`audit-summary.json`). Scripts and the QA toolbar are removed for these
static audits; local fixture media and final production styles remain. Captures use Less
motion to avoid freezing an entrance fade. These are semantics/contrast checks, not live-app
performance, native frame pacing or recipient-delivery measurements.

203 web/24 worker tests, lint, strict types, formatting and production build pass. All 89
backend checks are validated with disposable accounts across the 88-pass full run and the
corrected cron inventory/schedule/private-permission rerun. Initial network interruptions
are recorded in DEVLOG.md; no real partner was contacted.

Android CI [42077458980](https://github.com/devharish1371/Orbit/actions/runs/42077458980)
passes native tests/build/manifest/signing checks at this exact application source. The
APK passes local ZIP integrity, signing continuity and private-material checks. Details
are in DEVLOG.md. APKs
remain private for the user's later device batch. Physical offline/process-death/endurance,
native gestures/font scaling and two-phone gates remain deferred. Cloud originals stay saved.
