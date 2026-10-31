# Orbit whole-app journey pass — 1 November 2026

The user explicitly requested UI composition, app structure, navigation and continuous
flows, then reported timeline misalignment/overflow. This pass changes connected journeys
rather than adding a new colour pass or unrelated features.

| Dimension | Implemented behavior |
| --- | --- |
| UI | Timeline has a fixed marker column, continuous connectors, wrapping dates, contained day count and compact recap values. At narrow widths recap metrics become readable rows. Photo viewing has a stable control bar and full-screen image stage. |
| App structure | Keepsakes offers All / Photos / Memory Map; the photo view is a server-filtered, paginated collection. Storage/export remains in Settings, linked from the collection. |
| Navigation | Internal links record their entry point; Back returns through that history, with predictable parents for direct links. Reselecting a root tab returns to its start/latest messages. Modified clicks retain browser behavior. |
| Continuity | Window scroll, chat reading position, filters, composer visibility, text/media drafts and ongoing upload/send state survive internal navigation. The live map retains its camera. |
| Motion | Root tabs crossfade; detail entry/return use short opposite horizontal motion. Reduced motion is respected. No artificial loading delay. |
| Recovery | A temporary refresh error with an existing session retains the current screen and draft. Signed-out/initial restoration remains gated. Server authorization is unchanged. |

## Memory/privacy boundaries

Drafts and selected media stay in memory only, scoped to the signed-in shell. They clear
when that shell closes or the user changes; they are not written to browser storage or
sent automatically. Draft identifiers/attempt status are retained across route changes so
retry idempotency is preserved. Recording is still local and stops on unmount/background;
recording activity is not kept alive by draft retention. Draft and view contexts are separate
so typing does not itself invalidate the message-list view context.

Window restoration waits for deferred content to grow, stops on user input and has bounded
cleanup. It is not a minimum loading delay. Chat has its own scroll container. Map camera
memory clears with the same signed-in shell; location sharing/precision rules are unchanged.

## Verification

64 web tests and 16 worker tests pass with lint, types, format and production build. Full
hosted Python/security suite: 58 passed in 83.03 seconds. Regression coverage includes
route-safe text/media drafts, reset for a different signed-in shell, direct-link Back
fallback, photo zoom/close/Escape focus return, and transient session-refresh continuity.

Disposable browser checks verified draft return, photo zoom/fit/Escape/source focus,
Keepsakes Photos → Settings → Back retaining the collection view, and Settings scroll
return (1147 px before and after a tab round trip). Initial 320 px timeline checks confirm
36 px aligned markers and contained recap cells. Final theme/width, authored large-type
stress and accessibility results follow in DEVLOG.md. Native lock policy is unchanged;
the user replied that the reported lock issue works. Prior deferred hardware gates remain.

Primary implementation references:
- [React Router navigation type](https://reactrouter.com/api/hooks/useNavigationType)
- [Native dialog behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [Dialog focus requirements](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/dialog_role)
