# Plan v2 — first chat slice

Runtime `d0cf727`, 3 November 2026. Full approved scope and remaining phases are in
../PLAN_V2.md. This delivers reply/edit/retry foundations; durable encrypted outbox, pins,
connected transitions, map sheet and other planned features are still outstanding.

## Shipped behavior

- Message options → Reply selects an original ID and shows a compact removable quote in
  the route-safe composer. A successful send stores that ID, never a copied snippet/media.
- Quotes are batched through ordinary membership/expiry RLS. A cached original is checked
  again against expiry/unsend in the UI. Deleted/expired/unsent originals show unavailable.
- Tap a quote to scroll to a loaded original. An older original outside the loaded pages
  opens in a sheet using the current authorized query result.
- Own text messages can be edited for 15 minutes from server creation. The RPC locks the
  row, checks membership/author/channel/kind/visibility/window and expected edit version.
  A conflicting write is rejected. An identical retry after a lost response is idempotent.
  Editing changes only body, edited_at and edit_version, preserving original expiry.
- Pending send has a visible state. A failure keeps the draft and offers Retry send with
  the same ID; changing a failed draft creates a fresh attempt. A stored own message shows
  one "Sent to Orbit" mark, with no delivered/read claim. This is memory-only draft recovery,
  not a durable offline outbox.
- Removed the chat textarea's external focus box and composer focus halo/shadow. Text focus
  uses a contained underline; the + and attachment controls retain their own focus indicators.

Migration 0018 is additive. Installed older clients continue with null reply/edited fields
and version zero. Authenticated direct updates remain keep-only. Reply IDs intentionally have
no foreign key, allowing a retained reply to show an unavailable reference after retention
deletes its target. The create RPC validates all new references; no foreign content is copied.

## Verification

89 web / 16 worker tests and lint/types/format/build pass. All 64 hosted Python tests pass
(111.31 s), including new reply boundaries, original deletion, edit authorization, direct-write
denial, version conflicts/retries, expiry, unsend and time-window checks.

Browser testing used the disposable preview couple only. Sent one labelled test reply, edited
it, reloaded and followed its quote to the original. The example remains for preview review.
No real partner messages or alerts. A coarse display-clock lag initially hid Edit on a fresh
message; UI eligibility now accommodates the known tick lag while the server keeps its strict
window. Confirmed typing has no external outline or composer shadow and stays separate from +.

24 phone-layout captures cover chat, reply draft, edit and confirmation in both themes at
actual 320/360/412 px, with no horizontal/dialog overflow. Typed test drafts were cleared;
cancelled edit/delete dialogs made no mutation. Screen evidence is in screens/v2-chat.
Foundation confirmation/focus evidence is in screens/v2-foundation. Native keyboard/gesture,
offline/background/partner/soak checks remain human gates.

## Safety scope

Speed, journey check-in and experimental impact/fall work is planned in V2.9, not enabled by
this build. See PLAN_V2's research/acceptance contract: explicit consent, valid sustained GPS
speed estimates, confirmation/cancellation, mode privacy, cooldown/deduplication and safe sensor
validation. No automatic emergency-service calls or medical fall-detection assurance.

All eight static cases score 100 accessibility / 100 best practices. Static captures replay
the native dialog top layer, which outerHTML cannot serialize. Quote-label advisories were
reviewed; the actual accessible name contains author and excerpt. Android run 41646856489
passes. Verified APK retained internally at user request: 6,918,923 bytes, SHA256
13c2907025583419c3555ff8649a3dda56b572f68ad9fcf61cb61b23546f0227. ZIP integrity, signing
continuity and configured-private-data scan pass. No APK handover until the user asks.
