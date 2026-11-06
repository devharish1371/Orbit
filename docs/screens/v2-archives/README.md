# V2.5 archives and V2.6 mixed memories

Application source: `9b427ec94d6823b6692c89e58f0b5008ed3ac4b9`. Mixed-memory implementation
started at `8557284`; archive protocol/native implementation at `b3551b1`. Current source
adds complete paginated evidence reads and compact selection of older keepsakes.

239 web and 44 worker tests pass with lint, strict types, formatting and production build.
The full hosted/tool suite passes 105/105 in 211.63s. Hosted tests use disposable accounts
and files only; no real member setting, memory or partner message is changed. They cover
independent contributions and exact retries, author/cross-couple/Keep identity, concurrent
writes, complete quota/signing/receipts/retention, two-member archive gates, device/proof
freshness, RLS and private RPC grants, Storage-first leased removal, partial restore and
cancel, isolated generations, original author/asset identities and actual Edge JWT/scoping,
wrong-file rejection, readback and retry. Final Android CI/artifact details are recorded in
verification.json and DEVLOG.md. Final Android CI [42170571273](https://github.com/devharish1371/Orbit/actions/runs/42170571273) passes native unit tests, strict web checks, compilation, assembly, manifest/bridge checks and signing.

- `layouts.json`: 90 states fit at 320/360/412 px, with no horizontal overflow or actions
  outside the viewport. Coverage includes both themes/all reading sizes for proposals;
  queued/removing/archived/restoring and final confirmation; front/back and all contribution
  editors at largest text; both sides together and reduced motion. Twelve final checks
  cover compact selection and its single backup form.
- `flows.json`: twelve browser flows pass. Backup failure/retry does not approve prematurely;
  final removal and side removal require separate confirmations with working cancellation;
  explicit turn links profiles; failed contribution save preserves words and retry reveals
  the acknowledged side; reduced motion and compact single-form selection are verified.
- `audit-summary.json`: settled, script-free static captures are audited for accessibility
  and best practices; all twelve score 100/100 with zero binary findings. These assess the web controls and contrast, not startup performance
  or native phone behavior. The initial temporary static server omitted the app favicon;
  it was supplied and the audits rerun. No application audit was suppressed.
- PNGs use synthetic names, words and a code-native landscape. `preview.png` crops only the
  harness strip. The normal app includes none of the QA controls or fixture modules.

The browser uses production components with an isolated backend/native UI bridge. A mock
native success is **not** evidence of a real document-provider write or a partner backup.
The native pure-Java ZIP proof tests and Android compilation are separate automated gates.
No browser microphone is started, real ZIP exported, real sensor/permission enabled or real
cloud file removed. Actual Nothing Phone SAF provider/cancel/readback, process death,
expired-session/offline, capture/playback, battery and two real opted-in phones stay in the
user's deferred task #7 batch. The APK is retained privately; no handover/install is requested.

Cloud archive approval is explicit and default off. Authenticated receipts are client
verification evidence, not hardware attestation or protection against losing every backup.
See [the archive contract](../../V2_CLOUD_ARCHIVE.md), [mixed-memory contract](../../V2_MEMORY_SIDES.md)
and [the devlog](../../../DEVLOG.md). V2.10 release audit remains next.
