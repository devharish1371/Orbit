# V2.10 release checklist

This is a release gate, not a claim that automated verification proves phone reliability.
User instruction: no APK handover/install request until the consolidated test batch is asked
for. Vidya's phone is unavailable before the surprise; do not contact her during QA.

## Automated/software gate — current audit

- [ ] Whole-app visual/copy/focus cleanup, production-component responsive evidence.
- [ ] Text entry retains visible caret without a box/ring/glow or focus underline.
- [ ] Keyboard controls, labelled icons, reading sizes, reduced motion, empty/error states.
- [ ] Strict lint/types/format/build; web and worker checks.
- [ ] Complete hosted/tool regression with disposable accounts and Storage API teardown.
- [ ] Production dependency audit, source/evidence scan and no privileged client credentials.
- [ ] Cold/loading/error/offline/retry/update behavior reviewed with bounded evidence.
- [ ] Android compilation/native unit/manifest/signing checks; privately retained artifact
      passes ZIP integrity, signer continuity and private-material scan.
- [ ] Backup/restore/logout consequences and operational guidance current.

Exact source, results and any limitations: DEVLOG.md and V2_RELEASE_AUDIT.md.

## Deferred human task #7 — not waived

- [ ] One consolidated Nothing Phone (3a), Nothing OS 4.1 install-over/update test.
- [ ] Actual soft keyboard/predictive Back/gestures/safe areas and TalkBack; no typing highlight.
- [ ] Cold launch, cancel/fail/succeed unlock, native splash/cover and no pre-unlock content.
- [ ] Permissions/battery settings, screen-off/Recents/reboot and 24-hour ordinary-use soak.
- [ ] Offline walking queue and reconnect upload; reconnect hotspot only when practical.
- [ ] Actual native photo/voice capture/preview/background stop and offline media retry.
- [ ] SAF providers: save/cancel/readback, low space, interrupted/process-death backup/restore;
      independent ZIP can be found/opened outside Orbit and remains after app logout.
- [ ] Expired-session cold offline library, changed device/account, corrupt/missing copies.
- [ ] Actual two-phone opt-in, full mixed-memory copies, independent backup consent and recovery
      with disposable media; never test removal on irreplaceable real memories.
- [ ] Partner onboarding and partner-to-partner notification/location acceptance after reveal.
- [ ] Widget launcher/lock/privacy behavior and local speed uncertainty/false-positive/battery
      checks during ordinary safe use. No deliberate speeding, falling or phone drops.

## Owner release gate

- [ ] Long-term signing identity and independent owner backups verified. Current CI uses the
      stable internal test identity; successful assembly alone is not final production signing.
- [ ] Account/provider recovery and free-tier limits reviewed by the owner.
- [ ] Resolve material findings from the physical batch before a final production release.

The completed earlier screen-off/Recents/pause/Surprise/native voice/privacy/ZIP and test-push
checks remain documented in DEVLOG; they do not substitute for the final expanded build's
consolidated acceptance. The anniversary letter remains outside the app.
