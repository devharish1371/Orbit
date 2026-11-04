# V2.5 — Shared collections

Keepsakes now has a quiet horizontal shelf with original orbit-line artwork, named groups
and four color choices. All/Photos/Memory Map work inside a selected collection. A compact
Collections action on a saved item opens one membership picker; it can belong to several
collections. Empty collections offer a direct route back to the saved items.

Either member may organize a currently kept item. Only a collection's creator may rename,
change its color, archive or restore it. Archiving hides the group from the shelf and retains
its contents; it does not unkeep or delete posts. Collection names remain shared, including
archived groups. This is organization, not a private-content or access-control feature.

The shelf selection and unsaved name/color stay in the signed-in shell's memory through
navigation; they are cleared with the shell on logout/account change. A failed write retains
the draft and stable UUID. Existing metadata versions reject stale writes; the picker binds
the exact Keep timestamp as well as the member, couple and collection version. Removing Keep
then keeping again does not resurrect old grouping. Unsent/expired items and their old
associations are hidden by RLS immediately. Caption edits retain grouping while Keep remains.

## Storage and compatibility

- Collections link existing posts. They never upload a second media copy, toggle Keep or
  extend expiry. Existing authoritative media-byte/quota rules remain unchanged.
- Memory ZIPs add collections and visible collection-item links to memories.json. A shared
  file is still downloaded and stored in the ZIP once, even when in several collections.
- The private phone library remains a flat content snapshot; collection metadata is online
  in this slice. Independent phone-copy sync follows global Keep, not collection membership.
- Up to 32 active / 128 retained collection records per couple, with 64-character names,
  unique active names and 2,000 stored associations per collection. Archived groups can be
  renamed/reused. Old associations do not become visible again after a new Keep; eventual
  post retention cleanup cascades their metadata rows. No raw Storage SQL deletion added.
- Additive tables/RPCs preserve installed older clients. Direct API writes to collection
  tables are denied. Reads and writes remain scoped to the two authenticated members.

## Verification

Migrations 0029/0030 deploy collection metadata, RLS, scoped versioned writes, summary counts
and cursor-paginated kept-post reads. Collection advisory locks serialize metadata/link
writes; post-before-couple row locking follows existing Keep writes. Archiving touches no
post rows or child associations, preventing inverted cleanup locks.

Five hosted tests exercise cross-couple/non-member isolation, creator rights, forged identity,
direct-write denial, retry/version behavior, authoritative storage totals, partner organization,
unkeep/rekeep/unsend, equal-timestamp pagination, photo filtering, archive/restore and six
concurrent archive/unkeep versus organization races. The initial focused run had a connection
reset during an identity check; the complete 80-test backend suite then passes in 154.92s.
Seven new web tests cover failed/pending draft saves, original account binding, unknown/stale
membership, owner-only controls, malformed counts and collection-preserving ZIP export with
one photo download. Full client pipeline passes 166 web / 22 worker tests, lint, types,
format and production build. Secret scan: 1,001 files, zero findings.

Browser, static accessibility and Android exact-source results are recorded in DEVLOG.md.
Only the retained disposable couple is used for write tests. No real partner contact,
notification, phone opt-in or APK handover. Native touch/keyboard/export and two-device checks
remain in the user's later batch. Photo sets, reordering/captions and cloud archive policy
remain open; shared collections do not claim that those later parts are complete.
