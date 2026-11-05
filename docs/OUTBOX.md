# V2 Chat outbox contract

Extended on 5 November 2026: Chat text, photo sets and completed voice notes now use the
private durable outbox. See V2_MEDIA_OUTBOX.md for media limits, recovery and verification.
The text contract below remains the compatibility baseline.

- Persist a send intent before clearing its composer. Store id, original owner/couple, body,
  reply reference, TTL/Keep choice and pending deadline. Max 50 intents; pending deadline is
  at most 24 hours, even when the eventual post is explicitly kept.
- Android: AES-256-GCM files in no-backup app storage, per-owner Android Keystore key;
  owner/id authenticated as associated data. Native bridge verifies the current session owner.
- Web: AES-GCM ciphertext in IndexedDB, per-owner non-extractable CryptoKey. This protects
  serialized message content; it does not protect a compromised origin or unlocked browser
  profile. Commit before reporting queued; request strict durability where supported.
- Retry only while the app is open/active and online, on enqueue/reconnect/resume or explicit
  retry. Same immutable post ID across retries; no fake recipient-delivery/read indicator.
- Server checks expected owner/couple before accepting the new client's request, including
  ambiguous retries. Older clients remain compatible. Logout immediately stops work, clears
  queued ciphertext/keys and prevents a late write from recreating the cleared queue.
  Explicit logout reports a failure if storage/push cleanup cannot finish; it does not
  silently claim success. External session invalidation also stops the engine and attempts cleanup.
- A failed/uncertain send remains pending; permanent quote/authorization failures require
  action. Discard stops retries and warns that an already accepted message needs Unsend.
  No expiry extension, automatic Keep, silent quote removal or plaintext localStorage fallback.
- Recover after reload; prune expired/invalid records; authenticate ciphertext and reject wrong
  owner/id or tampering. Storage failure preserves the composer instead of claiming queued.

Verify: crypto tampering/identity, concurrent clear/write, retry after lost response, account
switch, bounded retention, storage failure, safe cancel/discard, UI widths/themes, native CI.
Physical offline/process-death testing waits for the user's requested test batch.

Automated baseline: 105 web / 16 worker tests and all 67 hosted tests pass, including
real AES-GCM/IndexedDB reload, tamper and concurrent-clear cases. Three Android cipher
unit cases cover round-trip/random IV, wrong key/identity/tamper, and malformed records.
Native CI and browser verification are recorded in DEVLOG.md; automated storage tests are
not a claim of physical airplane-mode or OS process-death validation.

Primary references: [Android cryptography](https://developer.android.com/privacy-and-security/cryptography),
[Chrome WebCrypto storage](https://developer.chrome.com/docs/modern-web-guidance/guides/security/client-side-encryption),
[IndexedDB transactions](https://www.w3.org/TR/IndexedDB/),
[durability](https://developer.chrome.com/blog/indexeddb-durability-mode-now-defaults-to-relaxed/).
