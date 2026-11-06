# V2.10 visual and release evidence

Application source: `25fd54e04aee680d539c4aec8563bd7140de1a9e` (6 November 2026).
Earlier screenshots share this final CSS/layout; the final source correction only changes
Chat's visible Photo label to Photos. Both affected screenshots were refreshed afterward.

## Scope and results

- Production components and a verified disposable two-member Supabase fixture on isolated
  preview port 4176. No real member account was used for this audit.
- 22 regular routes, each in Day/Night, Standard/Larger/Largest and 320/360/412 px: 396
  measured cases. Expanded sheets/editors, long-name and daily-answer checks extend to 459.
- All 459 measurements have no document/control horizontal overflow. Projected map markers
  and intentional horizontal rails are clipped content; two reviewed marker observations
  are recorded separately. Map controls remain checked and Use map center actually opens.
- 17 flows pass, including focus return, keyboard focus, draft retention, local photo
  preview/caption/reorder, quiet motion and the observed route/session-preserving update.
- 16 editable fields show a visible caret without outline/shadow/background focus decoration.
  Buttons and contextual help retain keyboard focus. Text selection remains native.
- 65 PNGs include the two themes of 22 regular routes, expanded states, reduced motion and
  the viewport preview. Full-page captures show fixed navigation at the capture viewport;
  this alone does not represent inaccessible content below it.
- 63 final static audits: accessibility 100, browser best practices 100, no binary findings.
  Details: audit-summary.json. One explicitly excluded static-only case: audits-excluded.json.
- 241 web/44 worker tests, lint/types/format/build and all 105 hosted/tool checks pass.
  Final Android CI 42266311411 and private artifact checks pass. See verification.json.

## Harness corrections and limits

The first export had absolute lazy CSS pointing at the other localhost origin; CSP correctly
blocked it. Asset URLs were normalized to the same origin and exact disposable Storage bytes
were localized, preserving CSP. Native dialog open attributes lose the browser modal top
layer when serialized; the static harness reopens them with showModal, matching the actual
production DialogSheet. All affected cases were rerun. Chat's Photo/Choose photos advisory
was corrected in source; both final captures and audit results were refreshed.

The photo-set-caption HTML contains revoked local blob URLs after the actual preview was
removed. Its screenshot and successful interactive preview/reorder evidence are retained;
that one HTML case is excluded from Lighthouse instead of substituting invented images.
The file chooser automation's long transport/picker time is not an app processing benchmark.
No photo, message, reaction, safety timer or notification was sent during this visual pass;
no microphone or real tracking was started. Fixtures were cleaned through Storage API.

Static audits evaluate settled semantics/contrast, not the dynamic map canvas, startup or
phone frame pacing. A current cold-login measurement was declined; no new performance
score is claimed. Built-in Largest text is 125%; it does not prove Android OS font scaling
or TalkBack behavior. Android compilation/unit/manifest proof does not replace native
SAF/keyboard/gesture/low-space/process-death/offline/provider/soak/two-phone acceptance.
These remain in docs/RELEASE_CHECKLIST.md at the user's request.

Day/Standard/Follow phone and browser viewport were restored. Disposable sessions/tabs
were closed; temporary QA servers were stopped. User previews 5173/4173 were preserved.
The final APK stays private; no installation/handover was requested. The anniversary
letter stays outside Orbit.
