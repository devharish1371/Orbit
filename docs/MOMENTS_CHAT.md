# M6 Moments, Chat and private media

Chat follows the user-requested messenger layout: partner header, chronological personal
bubbles, day/time separators, bottom text input, photo picker, voice recording and a send
button. Enter sends; Shift+Enter inserts a newline. Press/hold a message or open its menu
to react, Keep, copy text or request author-only unsend. Existing reactions appear as
small pills. No read/delivery receipt is invented. Moments has feed cards with captions,
reactions, comments, optional shared-place pins and expiry/Keep controls.

## Private media and lifecycle

Photos accept JPEG/PNG/WebP up to 20 MB and are re-encoded locally without EXIF. Full
images are bounded to 1600 px / 250 KB; thumbnails to 400 px / 40 KB. A preview stays local
until Share. Feeds load signed thumbnails near the viewport and full images on demand.
Signed URLs are cached per signed-in user for 50 minutes and last at most one hour.
Expired/unsent rows cannot mint new partner URLs. An already-issued URL can remain valid
until the file is removed; unsend does not retract a copy already downloaded by a person.

Voice capture requests microphone access only on Record. It chooses a supported Opus
WebM/Ogg codec (MP4 fallback), caps capture at two minutes and releases tracks on stop,
background, cancellation or unmount. Cancelling while permission is pending cannot leave
a later microphone grant recording. Waveform payloads are bounded to 60 samples. Audio
is not uploaded until Share. Android's RECORD_AUDIO/MODIFY_AUDIO_SETTINGS permissions
and adjustResize are checked in the APK workflow; actual device recording remains a gate.

The post RPC derives actor/couple from auth, reuses a draft UUID on network retry, stamps
expiry on the server and applies Keep atomically under the existing quota lock. Editing
a failed draft gives it a new UUID. An ambiguous response never causes the client to
remove a file from a successfully committed post; Storage RLS protects active references.
Custom emoji are grapheme validated, and reaction replacement is an atomic server RPC.
Comments apply only to Moments and are author-removable.

Unsend first hides the author's item for both members and queues the existing retention
worker. Physical deletion always uses the Storage API before final row deletion. An
hourly cleanup retries interrupted work. Expired items leave visible queries immediately.
A content-free couple revision invalidates post/comment/reaction/storage queries even
when RLS hides the changed tombstone. No message bodies are broadcast for invalidation.
Pending notification jobs check canonical post availability before sending.

Private typing uses a couple-scoped Presence channel. Authentication is awaited before
joining; updates are throttled, stop after inactivity/background, and do not write typing
records to the database. Strangers cannot join. Feed pagination uses a stable timestamp/
UUID cursor and holds at most 90 cards at once. Home shows expiring-soon items; Settings
shows authoritative physical-media usage, keepsake quota, and latest cleanup status.

## Verification

- Complete hosted/local Python suite: **54 passed**, including uploaded media permissions,
  atomic Keep, author-only unsend + API deletion, expiry visibility, reaction replacement,
  storage scope, and actual private Presence delivery/rejection over WebSocket.
- Web suite: **44 passed**. Worker suite: **16 passed**. Lint, strict types, format and build
  pass. Recorder tests cover the time cap, background stop, abort and late permission.
- Isolated production-preview browser QA used disposable accounts on port 4173, preserving
  the user's existing port-5173 session. Text sending, synthetic photo compression/upload,
  full-photo view, persisted reactions, Moment posting/commenting and Keep passed.
- Selected photo preview measured **1600 × 1018 px** after local compression. Dark/light
  layouts passed at **412 × 915** and **360 × 800**, with no horizontal overflow. Private
  screenshots are ignored under `.artifacts/qa/`. No real partner message was sent.
- Disposable accounts, their couple and all synthetic media were removed after browser
  QA, deleting files through the Storage API before removing database fixtures.

## Verified Android build

Commit **2133d94**, [CI run 41111763994](https://github.com/devharish1371/Orbit/actions/runs/41111763994),
passed web/worker checks, Python tools, three native policy tests, Android compilation,
apksigner verification, tracker/Firebase manifest assertions, audio permissions and
keyboard resize assertions. Artifact: `orbit-m6-debug` (retained seven days by Actions).
Local copy: `.artifacts/apk/2133d94/app-debug.apk`, **6,781,149 bytes**.

SHA256: `641b1032cff5da08db01b6c09f01eaee546d75921052c125b16274c8b37b7d24`.

`python -m tools.verify_apk --apk <download> --baseline <installed-build>` confirmed
ZIP integrity, the same v2 signer certificate as M5, and exclusion of configured private
credentials/contact emails. Complete credential shapes are checked because the Supabase
SDK itself contains a literal secret-key prefix for validation. Signature cryptography
is verified by apksigner in CI; certificate comparison alone does not replace it.

## Remaining physical checks (human #7)

Install the M6 APK update on Dev's phone. In Chat, record a short voice note, stop,
preview it, and verify playback; sending is optional because the actual partner account
belongs to the surprise gift. Check that the keyboard leaves the composer visible and
that backgrounding stops capture. Real 4G upload latency and voice on both phones are
not claimed from browser/CI results. Vidya's onboarding and second-phone checks remain
deferred until the reveal, as requested. M6 stays untagged pending outstanding acceptance.
