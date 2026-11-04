# V2.4 — Plans, ideas and want-to-go places

4 November 2026. Us has one next-plan entry; the secondary Plans screen holds the list,
date jar and want-to-go list without another bottom-navigation destination.

Plans are shared proposals. The author can edit; either member can confirm or cancel the
current version. An edit resets confirmation to the author. Server row locks and explicit
versions reject stale decisions. Creation retries reuse an ID; all mutations bind the account
and couple that composed them. Cancelled/past plans remain readable; the screen reads up to
200 recent/upcoming rows, with a thirty-day recent-history window and a 100-upcoming cap.

Reminders default off and belong only to the member choosing a lead time. The server queues
one job per plan/version/member once both members confirm. Before resolving any FCM token,
the worker rechecks current version, cancellation, time, both confirmations and personal
opt-in. Quiet hours and enabled Android notifications apply. A queued/sent job is not proof
of device delivery; an already delivered notification cannot be recalled. Pending old jobs
are invalidated by edits/cancellation/opt-out. Push text contains no title, notes or location.
No invitation/change push is sent merely by creating or editing a plan.

Ideas/places may be shared or “Only me.” RLS hides another member's private rows. Authors
alone edit/archive/delete; permanent removal uses explicit confirmation. The 500-item cap
can be managed through archived-item removal. The jar draws from real visible active ideas;
it creates no text or fabricated suggestions. Turning an idea into a plan opens a shared
proposal editor for explicit submission. Want-to-go rows create no geofence/arrival alert.

Editors retain drafts in the existing user-scoped in-memory FlowProvider. Failed saves keep
the same ID and text. Date entry resolves the couple's named timezone independently of device
timezone; missing/ambiguous daylight-saving times are rejected. Calendar files use escaped,
UTF-8-folded RFC 5545 content, UTC instants, stable UID/version and no invite recipients or
alarms. Files are user-triggered snapshots; later changes do not sync. Android reuses the
existing document picker/export stream with a narrowly allowed ICS filename/MIME type.

Migrations 0022–0025 are additive for installed clients. New tables expose SELECT through
RLS; writes use scoped RPCs. Private queue/cron helpers are not callable by app users. A
couple-scoped private queue entry point lets hosted tests enqueue only disposable fixtures.
Schema generation annotates three deliberately nullable RPC scalar arguments, whose NULL
behavior is tested against PostgreSQL. No dependency or paid service was added.

Verification and final Android/browser results are in DEVLOG.md and docs/screens/v2-plans.
Physical Android calendar import, reminder delivery/tap, keyboard and quiet-hour/device
behavior remain for the user's later batch. No real partner contact or APK handover.

Primary references checked: [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545) for calendar
escaping/folding/UTC event fields; [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
for default-deny row access and the need to constrain security-definer writes explicitly.
