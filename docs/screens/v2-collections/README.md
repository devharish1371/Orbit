# Shared collection evidence

5 November 2026. Final application source eaaefc2. Only the retained disposable couple and
synthetic photo are used. No real partner contact, phone opt-in, sensor prompt or APK handover.

- `shelf-360.png`, `shelf-night-360.png`: original collection artwork, shared counts and
  organization entry; phone storage sits below the memories.
- `picker-360.png`, `picker-night-360.png`: one photo in two collections; real saved
  membership, original Keep identity and visible labels matching accessible names.
- `editor-360.png`, `editor-night-360.png`: long unsaved name, four color options, contained
  input focus and draft retention. `manager-night-360.png`: rename/archive/restore controls.
- `layouts.json`: 21 final-source measurements at 320/360/412 × 800. No horizontal document
  or sheet overflow; new collection controls have at least 44 px targets. The existing inline
  author-name link is listed separately; its adjacent avatar is the larger profile target.
- `audit-summary.json`: seven final static accessibility/best-practice audits, all 100/100
  with no binary findings. The initial audit caught spoken-label mismatches; intrinsic picker
  labels now have whitespace, and the organization label includes its visible Collections text.

Browser flow verified: name/color survives close → Us → Keepsakes → reopen; new group empty
state returns to the saved content; one photo joins both groups; Photos filters a group;
archive hides the group while preserving the photo; restore keeps membership; rename/color
save. Actual browser ZIP opens with two collections, two associations, one post and one copy
each of its original/thumbnail. ZIP integrity passes. No signed URLs are retained in the ZIP.

Static replay strips scripts, module preload, manifest and signed media URLs. Styles/fonts
are served from the original build on the same local origin under its unchanged CSP. For a
modal snapshot, the application root is inert/hidden and the sheet's top-layer paint order
is restored; these are rendered semantics/contrast checks, not Android performance proof.
Day theme and the normal viewport were restored; the temporary browser/audit server closed.

166 web / 22 worker and all 80 backend checks pass. Final source passes Android CI
41926210764; exact-source integrity/signing/private-material results are in DEVLOG.md.
Physical touch/keyboard/export and partner-device checks remain in the user's later batch.
Photo sets and cloud archive policy remain open in V2.5.
