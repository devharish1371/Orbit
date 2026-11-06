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

## Findings under review

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

Implementation and evidence are recorded in DEVLOG.md as each gate completes.
