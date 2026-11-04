# V2.5 phone-keepsake software evidence

5 November 2026. `keepsakes-web-360.png` shows the browser compatibility state with the
retained disposable couple and synthetic photo. It is not an Android offline-file proof.
`layouts.json` records 320/360/412 × 800 checks with no horizontal overflow.
`audit-summary.json` records 100 accessibility / 100 best practices and no binary findings.
The static capture strips scripts, module preload, manifest and signed media URLs; matching
production styles/fonts are served from the same local origin under the original CSP.
An initial audit replay used absolute stylesheet links from the preview origin; fixing the
snapshot asset paths resolved its console/CSP findings. App security policy was not relaxed.

Native cipher tests, compilation, signing and build checks pass in Android CI 41918291192
(07468b7) and 41918882265 (95ef298). The last efficiency refinement reuses fresh receipt
evidence, acknowledges missing/repaired copies again, renews daily and scans every five
minutes as fallback; revision/resume/manual triggers remain immediate. Final exact-bundle
verification and artifact integrity are recorded in DEVLOG.md.
Final code f0fdf4a passes CI 41920390183 (3m44s); its private retained artifact passes ZIP,
matching signing identity and private-material scanning. No application source changed after
that run; the final checkpoint records only documentation.

159 web / 22 worker tests pass; all 75 hosted checks validated across the full run plus the
private-helper privilege correction and five-test retention rerun. The browser preview
requests no phone-storage permission and never pretends it has native files. No real
partner notification, account mutation, phone opt-in or APK handover was performed.
Physical cold/expired-session/offline/process-death, media playback, disk-full and two-phone
acceptance remain in the user's later device batch. Cloud originals remain saved.
