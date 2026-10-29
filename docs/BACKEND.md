# Backend security and retention

The five initial migrations implement the supplied schema, with the corrections below.
All domain tables have RLS; infrastructure tables deny ordinary client writes. Private
helpers live in `orbit_private`, outside the Data API schemas, with a fixed empty search
path. Only three membership/answer predicates are executable by authenticated users.
Public retention RPCs require `service_role`; neither public keys nor signed-in users can
invoke them. The function independently requires the internal `x-orbit-secret` header.

## Auth and configuration

Public email/SMS signup is disabled locally and was tested disabled on the hosted project.
The user's latest request selects real-email OTP with persistent refresh sessions.
Both permanent, confirmed passwordless accounts and their couple membership are provisioned.
No email was sent or password created during provisioning. SMTP sender setup remains human
#2a before real OTP delivery. See [AUTHENTICATION.md](AUTHENTICATION.md).
The earlier E.164 phone → synthetic-email/password mode remains a legacy tool option;
it is not the current login requirement. Phones remain private contact metadata.

The existing env variable names `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` accept
current publishable/secret keys as well as legacy keys. They are role aliases, not a demand
for old JWT keys. The CLI's `SUPABASE_ACCESS_TOKEN` is a separate account credential.
The REST adapter places new keys only in `apikey`; a real user JWT belongs in Authorization.
The Edge Function reads `SUPABASE_SECRET_KEYS.default`, with the legacy environment fallback.

## Ownership and updates

- A couple row lock serializes member insertion/moves, enforcing at most two members.
- Composite foreign keys ensure a post/reaction/comment/place/presence refers to its own
  couple's parent, including privileged inserts. UUID knowledge does not grant access.
- Members edit only their own profile/preferences/mode columns. Posts accept partner
  updates only for `keep`; body, author, expiry and cleanup state are protected.
- Table privileges are explicit: authenticated users cannot TRUNCATE or write job/status
  infrastructure. RLS alone would not stop TRUNCATE.
- Live-location upserts may include their conflict identity columns, but RLS pins those
  identities to the authenticated member and that member's couple. Server time is stamped.
- Paused members cannot upload; surprise uploads require `fuzzed=true` and null speed/heading.
  Sender-side grid snapping remains M4's responsibility. Mode changes emit visible events.
- Stale detection handles users with no initial fix, dedupes atomically, and emits one resume
  event on the next location write. No mobile heartbeat is required for stale detection.
- Capsule content is inaccessible to the partner before unlock. Notification dedupe is stored
  on the capsule, so expired event history cannot cause repeated unlock notifications.

## Media contract

The bucket `media` is private and limits individual files to 5 MiB and approved MIME types.
A post with ID `post_id` uses:

```
{couple_id}/{author_id}/{post_id}.{webp|jpg|jpeg|png|webm|ogg|m4a|mp4|mp3|aac}
{couple_id}/{author_id}/{post_id}_t.webp
```

Avatar names use `{couple_id}/{user_id}/avatar_{uuid}.{webp|jpg|jpeg|png}`. Paths are immutable;
create a fresh UUID for a replacement. Upload first, then create/update the DB reference.
The DB verifies ownership/existence and derives byte counts from Storage metadata. Clients
cannot under-report file sizes to evade the keepsake quota or share one file between posts.
Failed insert uploads must be removed by the client; the orphan sweep is the safety net.

## Retention races and failures

`claim_expired_posts` locks eligible rows with SKIP LOCKED and issues deletion leases. Keep
wins before a lease is claimed, or receives `POST_CLEANUP_IN_PROGRESS` while cleanup owns
it. A worker removes files through the Storage API, then finishes only the matching lease.
Failed removal retains the row for retry after ten minutes; a late worker cannot finalize
another worker's lease. No SQL deletes physical objects or their Storage metadata.

Orphan listing is recursive and paginated. Only objects older than 24 hours are candidates.
The DB rechecks age and all post/avatar references under path advisory locks, then reserves
unreferenced paths in `media_gc`. Reference creation uses the same locks and rejects reserved
paths. Successful API deletion releases the tombstone; failure preserves it for retry. This
protects both reference pagination and uploads that are attached to a post late.

All backend errors make the job fail visibly and are recorded in `retention_runs`; errors
are sanitized to avoid credential/path leakage. File counts include orphan removals;
`orphans_deleted` is the subset. Listings and processing are bounded for free-tier runtime.

## Schedules and verification

Five cron jobs exist: hourly retention, five-minute stale/mode expiry, hourly previous-local-
day rollup, and ten-minute capsule unlock. Hourly rollup supports configurable timezones;
it is idempotent. Notifications are best effort and the delivery function is due in M5.

Verified with 20 hosted integration checks: RLS/role isolation, parent/couple mismatch,
protected columns, quota rejection, private media, hidden capsule/answers, disabled signup,
real row/file expiry, kept/avatar survival, old orphan removal, fresh upload preservation,
cleanup leases/tombstones, cron jobs, location upsert and stale/resume/mode behavior.
Five local worker tests cover storage/backend/status failures and lease accounting.
Native/device tests, FCM delivery, performance, and soak testing remain later milestones.
