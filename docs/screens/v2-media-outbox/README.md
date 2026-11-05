# Chat media outbox evidence

Captured 5 November 2026 at application source `a140993c3d6ed930ce9b8524d966a00dfd973422`.
These screenshots use synthetic photos and audio in an isolated browser harness. It mounts
production Composer, pending UI, encryption/store and queue engine with fake auth/space/live
providers and an injected local transport. No real accounts, microphone, partner contact or
external message delivery were used. QA controls are not packaged in the production app.

## Observations

- Two-photo set and captions survive reload in encrypted IndexedDB; the local viewer opens
  both images. A synthetic voice note survives reload, previews and ends normally at 1.621333s
  with no playback error.
- Cancelling discard retains the copy. Simulated permanent rejection retains it; explicit
  retry reuses the original identity and accepts once through the injected transport.
- Interrupted readback keeps composer media without an empty or duplicate pending group.
  Reload shows a staged copy; a ready transport does not auto-send it. Explicit Retry
  verifies the payload before promotion and consumption.
- `layouts.json` records 30 states at 320/360/412 × 800. No horizontal page overflow;
  measured visible product controls are at least 44 × 44 px.
- Ten captured static screens score 100/100 in accessibility and best practices, with no
  binary findings (`audit-summary.json`). These are rendered semantics/contrast checks,
  not authenticated live-app performance scores. Fixture media URLs were replaced with
  equivalent local assets for the static audit.

Screens cover Day/Night pending rows, photo and voice previews, discard confirmation,
rejected retry, retained composer and staged reload. `flow-results.json` records final
flow outcomes. Screens show fixture content, not a real conversation.

## Separate checks and limits

191 web and 24 worker tests, lint, strict types, formatting and production build pass.
All 85 backend regressions pass separately with disposable accounts. Android CI
[42012693712](https://github.com/devharish1371/Orbit/actions/runs/42012693712) passes native
unit tests, assembly, manifest and signing verification at the exact application source.
APK integrity, signing continuity and private-material checks pass; the artifact stays private.

Browser reload and the injected transport do not prove real internet delivery or Android
process-death recovery. Physical offline/background/process-death/full-storage, native
interaction and two-phone checks remain in the user-deferred task #7 batch. No APK handover
or installation is requested. Moments drafts remain in memory; cloud originals stay saved.
