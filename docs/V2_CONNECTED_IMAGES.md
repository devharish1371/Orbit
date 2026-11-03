# V2.2 — Connected portraits and media

Implemented on 3–4 November 2026. This completes the next software slice of V2.2;
physical keyboard/predictive Back/gesture acceptance stays in the user's requested batch.
No APK handover or phone install request.

## Portraits and photos

- A portrait carries a unique per-link identity into its profile. The document nonce prevents
  a key preserved in browser history from colliding with a new header after reload. Repeated
  authors have distinct keys; persistent header portraits opt out at their own destination.
- React's existing ViewTransition support coordinates warm portrait/photo handoffs. Cold
  images open immediately with a compact loading state; network work is never an animation
  prerequisite. Unsupported/reduced-motion/hidden contexts render normally.
- One full-screen viewer serves profile photos, Chat, Moments and Keepsakes: local preview,
  full-resolution loading/error/retry, fit/zoom and double-click zoom, stable close controls,
  scroll/focus return. Native Back/Escape dismiss urgently. Interruptions cancel snapshot
  animations; logout, hiding and history navigation also cancel active motion when supported.
- An avatar path change remounts the profile's photo state, so removed/replaced avatars do
  not leave an old preview open. URLs stay in the member-scoped query cache and local React
  state, never navigation state or localStorage. RLS/expiry/Keep rules are unchanged.
- Viewer styles are consolidated in image-viewer.css; obsolete photo rules were removed from
  index/worlds/atelier styles. No additional library or service was introduced.

## Composition

The + shelf contains Photo, Voice and expiry. The redundant inline photo icon and decorative
emoji shortcuts are removed. Choosing Voice preserves text and does not start the microphone;
Record is explicit. Cancel restores typing. Back stops a recording into a local preview or
cancels a pending recording intent; late permission responses cannot restart it. Recording never publishes a message.
Multi-line text resizes before paint and after width/navigation changes. IME composition guards
and the existing Android adjustResize behavior remain; physical verification is still deferred.

## Verification

125 web / 16 worker tests plus lint/types/format/build pass. Full backend run: 66 passed and
one read was interrupted by a network reset; the isolated retry passed, validating all 67 checks.
Browser fixture: repeated keys unique, selected portrait preserved after profile/reload with
no console errors; shared/profile photos load, zoom and dismiss; feed scroll was 1237 px before
and after dismissal; an eight-line draft remained eight lines / 132 px after a profile roundtrip.
Voice selection/cancel preserved typed text and restored focus without opening a permission
prompt. No real partner contact, new message, photo upload or microphone recording during QA.
Responsive/a11y and exact Android rollup are recorded in DEVLOG.md and docs/screens/v2-connected.

Primary implementation references verified during this pass:
- [React ViewTransition](https://react.dev/reference/react/ViewTransition): React coordinates
  named shared boundaries with transitions/Suspense; unique names and unsupported-browser
  fallbacks are required. No imperative document.startViewTransition calls were added.
- [Active view transition](https://developer.mozilla.org/en-US/docs/Web/API/Document/activeViewTransition):
  the native handle is feature-detected; older hosts use transition pseudo-animation cleanup.
- [Native dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog):
  focus containment and cancellation remain native.
