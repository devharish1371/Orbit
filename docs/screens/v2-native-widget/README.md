# V2.8 entrance and widget evidence

Production web components with synthetic content and an injected Android bridge. These are
browser illustrations of widget setup, consent, private/covered/photo/plan state and web
opening artwork. They are not screenshots of an installed launcher widget or native lock.
No real partner data, messages, permissions or account settings were changed.

- `flows.json`: nine checks passed: cancel preserves Private, failure retains consent/retry,
  successful acknowledgement selects the photo/plan, pin request does not claim installation,
  privacy/stale states omit personal imagery, reduced motion stops breathing, and browsers
  expose no native-only controls.
- `layouts.json`: 60 measured phone states with no horizontal overflow or out-of-bounds
  widget actions. Plan, Private and opening screens cover both themes, all three reading
  sizes and 320/360/412px. Photo picker/consent also cover those widths at the largest size.
  Additional capture records document the consent/failure/covered/refresh screens.
- PNGs show representative Day/Night and largest-reading states. `widget-preview.png` crops
  only the harness toolbar, preserving the page. The actual Android widget is rendered by
  RemoteViews, so launcher geometry still needs the deferred device batch.
- All seventeen static audits score 100/100 with zero binary findings; see `audit-summary.json`.
  These settled static copies disable animation and include the document doctype. The first
  audit attempt encountered a missing doctype and animation-driven NO_FCP in the copied
  document; both are capture issues, corrected without changing production CSS. Live
  reduced-motion behavior is checked separately. These audits measure semantics and
  contrast, not authenticated startup speed.

App source `dcb1995` passes Android CI
[42117158960](https://github.com/devharish1371/Orbit/actions/runs/42117158960), including native
unit tests, resource/Java compilation, assembly, merged manifest/bridge/provider/service/font
checks and signing verification. 215 web/24 worker and all 91 hosted checks pass.
The privately retained artifact passes ZIP integrity, signer continuity and private-material
scanning. No APK handover or phone installation requested.

Native cold/warm starts, cancelled/successful authentication, first-frame contrast/pacing,
process death, launcher pin/resize/font scale, offline/removal/privacy redraw and reboot
remain human task #7 gates. Android scheduling and launcher-held previews prevent a claim of
instant remote clearing. See [the implementation contract](../../V2_NATIVE_ENTRANCE_WIDGET.md).
Temporary QA tabs are closed and viewport/Day/Standard/Follow phone restored. User previews
on 5173/4173 are preserved.
