# Photo-set verification — 5 November 2026

Captured through CUA from the disposable You / Your person couple on the production
preview, using six synthetic PNGs. No real accounts, messages, partner devices or push
notifications were used. Application source: 4a32eaa16f920efd7e9716ad7b2068de5c6445b2.

Six screenshots cover Day/Night Moments drafts, Chat drafts and the continuous viewer.
`layouts.json` records 18 states at 320/360/412 × 800: no horizontal page overflow, every
visible new control at least 44 px, and the selected thumbnail fully inside its scrollable
strip. Hidden background controls under a modal have zero dimensions and are counted
separately, rather than being treated as visible touch targets.

`audit-summary.json` contains six Lighthouse accessibility/best-practices static-screen
audits, all 100/100 with no binary findings. Captures retain the app CSP and styles, remove
scripts/private signed image URLs, and use local placeholders for photo bytes. These
measure rendered semantics/contrast, not authenticated performance or Android behavior.

Browser flow checks: multi-file pick, six-photo limit, ordering/captions, route-safe drafts,
selected-thumbnail visibility after resize, shared Keep for a three-image post, per-image
viewing and caption order. The actual downloaded ZIP has two kept posts, a three-image set,
all six set files, eight media files total, preserved captions and no duplicate ZIP entries.
ZIP integrity passes. Day appearance and default browser viewport were restored.

Native unit tests/build/signing pass in Android CI 41994769622. Private artifact integrity,
signing continuity and private-material checks pass. Physical keyboard/swipe/process-death,
offline/full-storage and two-phone delivery remain in the user's later device batch.
