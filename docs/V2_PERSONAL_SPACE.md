# Personal space and comfort

The user asked to combine compatible V2 work and defer V2.6 on 5 November 2026. This batch
implements V2.7 personal space and the reading/motion portion of V2.8. Native entrance and
widgets, V2.5 archive/cloud-removal policy, V2.9 safety and the final release audit remain open.
No anniversary letter, inferred mood, relationship score, streak or automatic personal message
is added. No sensor or alert is enabled and no partner is contacted during verification.

## Your status

Choose an emoji and/or a line of up to 80 characters from your profile or Us. The partner's
active status appears on Home, Us and their profile. Us uses a thought bubble above each
portrait; four or more words shorten to the first three and an ellipsis, with further visual
clipping when space is tight. Tap the partner bubble for full text in their profile; tap your
own to edit. Full text remains in accessible names/descriptions. Home places a smaller
status beneath the name and uses one crossed-out location icon for paused sharing. Durations are 1, 4 or 24 hours, calculated
by the server. Nothing is suggested or inferred from tracking data. Clear is explicit.

Status records are private to the couple; only the author can write through the guarded RPC.
Expected account/couple/version reject a stale device or account switch. Failed saves retain
the editor; a stale-device conflict asks for close/reopen with fresh data. Direct table writes
and anonymous execution are denied. Partner RLS excludes expired/cleared rows immediately.
The UI also hides cached content at its next 30-second clock tick. A five-minute private cron
sweep erases expired text/emoji and retains only an empty version tombstone. The tombstone
prevents stale edits from recreating an old status. No status change emits a push.

## Memories and the Us shelf

On this day queries actual kept, non-unsent posts from earlier calendar years. The server uses
the couple timezone and current date; no caller-supplied date is trusted. Exact month/day
matching means February 29 appears on February 29. The Us preview stays absent when there
are no results; the full page has explicit loading/error/empty states and cursor pagination.
Original retention, reactions, authorship, media viewing and unsend still apply. Query refresh
uses existing couple revisions, foreground/reconnect and a periodic open-page refresh.

Us now presents the next plan, relevant past-year memories and a shelf of active collections,
with capsules/timeline below. A collection opens that particular collection in Keepsakes;
subsequent selection/new-collection actions clear the entry parameter. The daily question stays
on Home rather than appearing a second time in Us. Only real saved data supplies these entries.

## Reading and motion

Settings offers Standard (100%), Larger (112.5%) and Largest (125%) text on this device.
CSS font sizes use root-relative units; geometry, touch targets and map coordinates keep their
existing dimensions. Standard preserves the previous 16px-default rendering. OS/browser font
preferences still apply; this does not certify TalkBack or native font-scale behavior.

Less motion disables ambient CSS animation/transitions, shared image transitions, orbital
rotation and animated map movement. The motion library also receives the reduced preference.
Follow phone always respects OS reduced motion; it cannot force motion back on. Existing
background/visibility safeguards remain. These choices are local and contain no personal data;
storage failure permits the choice for the current session. Changes and clears sync across
browser tabs. Theme and profile accent settings remain independent.

## Verification

Regression coverage includes status ownership, expiry, erasure, stale/concurrent edits, direct
write/anonymous denial, past-year timezone/cursor/Keep/unsend scope, retained editor contents,
account switches, collection links, OS motion precedence and unavailable/cross-tab storage.
The full client pipeline passes 203 web and 24 worker tests, lint, strict types, format and
production build. Final hosted/native/browser evidence is recorded in DEVLOG.md.

Browser screenshots use an isolated harness with synthetic people/media and injected auth/data
providers; actual production components and comfort logic render them. Local simulated status
saves/reloads do not prove internet delivery; hosted RLS and server-clock checks run separately
with disposable accounts. Physical font scaling, accessibility service/gestures and endurance
remain in the user's deferred task #7 batch. No APK handover or installation is requested.

Final browser checks cover 198 responsive page/sheet states and fourteen static screen
audits, all 100/100 with no findings. See [evidence](screens/v2-personal/README.md). All 89
backend checks are validated across the full run and corrected cron-inventory rerun.
Application source 1c58d7c passes Android CI 42077458980, including native unit tests,
assembly, manifest and signature checks. The privately retained APK passes ZIP integrity,
signing continuity and private-material checks. Details are recorded in DEVLOG.md.
