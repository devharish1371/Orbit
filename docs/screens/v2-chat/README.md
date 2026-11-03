# V2 chat evidence

Runtime d0cf727. 24 layouts: thread, quoted draft, edit sheet, confirmation sheet; two themes;
320/360/412 px. layouts.json records measured viewport/document/dialog widths. No overflow.
Eight 360px static DOM cases are audited for accessibility/best practices; scripts are removed
and compiled assets are served locally. These are semantics/contrast checks, not authenticated
performance measurements.

All accounts/messages are synthetic disposable preview fixtures. One labelled quoted reply
was sent/edited/reloaded and retained for review. No real partner contact. Temporary typing
drafts were cleared and edit/delete verification dialogs were cancelled. Screenshot names
describe the actual view; showcase.png shows the persisted edited quote and uncluttered input.
The preview fixture/server remain available. Full scope/results: ../../V2_CHAT.md.

All eight static states score 100/100. Modal top-layer stacking is replayed only in the
static harness. Native dialog focus/stacking is verified in the actual browser. Reviewed
non-scoring quote-label advisory is retained in audit-summary.json.
