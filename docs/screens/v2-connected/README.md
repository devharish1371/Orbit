# V2.2 browser evidence

Disposable fixture accounts and synthetic photos only. Captured 3–4 November 2026.
Source: 179c0f2, quote-label correction 49971a9, daily-answer focus correction 6cac899.

- `photo-360.jpg`, `profile-photo-360.jpg`: unified viewer, stable zoom/close controls.
- `media-shelf-360.jpg`, `voice-draft-360.jpg`, `voice-dark-360.jpg`: compact media flow;
  choosing Voice does not request microphone permission or publish anything.
- `question-focus-360.jpg`: focused answer field; its highlight stays inside the edge.
- `layout.json`: eleven measured shelf/voice/viewer states at 320/360/412 px as applicable;
  no horizontal overflow, undersized visible controls or controls outside their container.

Focused answer-field checks at 320/360/412 px: active focus retained, 2 px outline with -2 px
offset, no horizontal overflow. No answer submitted. Day theme and normal viewport restored.

Six saved-DOM audits: Chat and Voice in both themes, shared photo and profile photo in Night.
All score 100 accessibility / 100 best practices, with no binary findings. Chat/Voice captures
were refreshed after the quote-label correction; photo/profile results are from the original
completed run. A missing doctype in the refreshed static harness was fixed before the final
four-state rerun. Script-free HTML stays ignored/private because it can contain short-lived
fixture signed URLs. Modal replay uses an inert root and top-layer styling in the saved copy.
These are static semantics/contrast checks, not authenticated performance or TalkBack proof.

125 web + 16 worker tests, lint/types/format/build pass; all 67 hosted checks validated across
66 main-run passes and one network-interrupted read retry. Android CI 41861182765 passes for
6cac899. Physical keyboard, predictive Back, gestures, offline/background/endurance and real
partner gates stay in the user's later test batch. No APK handover or install request.
