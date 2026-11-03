# Orbit — full-app audit and next direction

3 November 2026. Cleanup runtime: `5810ab7`. This document separates implemented cleanup
from proposed features and a larger design phase. The latter two await the user's selection.

## Assessment

Orbit has a recognizable palette, paired-planet identity, useful map and working communication
features. Its biggest design weakness was inconsistency: the main screens had evolved, while
secondary screens still resembled a settings dashboard. The remaining opportunity is connection
between screens, rather than adding decoration to each screen independently.

This is a source, browser, regression and dependency audit. It does not replace physical Android
gesture/keyboard, background/offline/endurance, partner-device, accessibility-service or soak
testing. Those existing release gates remain open. Synthetic preview data is not real GPS proof.

## Cleanup implemented

| Area | Finding | Change |
|---|---|---|
| Settings / Profile | Nested bordered panels, repeated helper paragraphs | Open sections, spacing and light dividers; circular paired-world theme samples; redundant photo/color/sync prose removed |
| Tracking / Notifications | Secondary pages inherited heavier containers | Same open-section system; permission, confirmed-mode and quiet-hour explanations remain readable |
| Moments | Abrupt small corners on large notes/photos; small portrait targets | Continuous rounded canvases, retained note styles, 44 px portrait links |
| Keepsakes | Older card treatment differed from the same content in Moments | Shared author/media/text/action styling, unframed photo collection |
| Chat | Full text search control repeated an obvious action | Search icon with accessible label; plain search field when expanded |
| Us / Map | A few asymmetric corners still looked cut off | Softened the memory doors and map frame |
| Capsules | Dashed create box and duplicate heading | Open create row and simpler form; date/timezone and sealed-content meaning retained |
| Activity | Boxed event rows competing with content | Open chronological rows with quiet separators |
| Storage | Routine cleanup paragraphs always visible, including zero counts | Meter remains visible; details disclosed on demand; zero-expiry line omitted |
| Shared controls | Text/arrow Back, rectangular secondary buttons | Labelled 44 px back icon, pill controls and visible keyboard focus |
| Person profile | Own profile offered a phone call to oneself | Own call removed; partner call remains |

Icons replace recognizable actions. Inputs, mode choices, ambiguous actions and destructive
decisions retain words. Privacy/consent meaning is preserved. There is no backend migration,
new permission, retention change or real partner notification in this cleanup.

## Findings that deserve the next phase

**Navigation and motion.** Most transitions are still route transitions. They do not yet show
the relationship between the item touched and its destination. Avatar-to-profile and
photo-to-viewer transitions would make the app feel substantially more continuous. Android
predictive Back, edge gestures and keyboard motion need physical measurements before a claim
of native-level fluidity.

**Map.** The custom cartography is established. The surrounding experience is still a scrollable
page. A map anchored behind a two-position detail sheet would put the person, freshness and
journey controls within reach without consuming map area. A location's recorded time must
remain distinct from a refresh request. A midpoint is a geometric suggestion, not a verified
accessible meeting venue or a computed route.

**Chat.** Text/photo/voice, reactions, copying, unsend, expiry, search and typing work. The next
valuable gaps are quoted replies, explicit pending/failed send states and editing typos. No
read receipt or recipient-delivery promise should be invented from a successful database write.

**Moments and memory.** Text styling is persistent and reactions/replies work. Collection
organization, multi-photo composition and moving through a photo set would add more utility
than additional feed decorations. The underlying content must stay legible in its original
order and retain expiry/Keep behavior.

**Home and Us.** Home already has several actions and entry points. Keep the immediate daily
actions there; put future plans and memory organization in Us. Personal content and photos
should carry the warmth, with short functional labels around them.

**Copy.** Visible slogans are largely gone. There are still strings split between copy files
and components. Consolidate future wording as screens are revised; retain actionable error
messages instead of replacing failures with unexplained warning icons.

**Implementation.** The app has roughly 8,000 lines of CSS across an initial stylesheet and
three successive visual passes. Later overrides make individual fixes harder to predict.
Before the next major visual phase, consolidate tokens and shared control/surface rules,
then migrate screen styles incrementally with the captured screens as regression evidence.
This is maintenance work, not a new dependency or a reason to rewrite the working app.

**Native entrance and confirmations.** The Android privacy cover currently uses a fixed
midnight palette and the device sans font. Its security behavior is established, but the
visual handoff into a personalized Day theme can feel abrupt. Adapt the cover/splash palette
without exposing account details before unlock. Some destructive actions still use standard
confirmation prompts; a future shared confirmation sheet can match the app while retaining
an explicit final decision. Large-map bundle warnings also remain; cold-map loading and
frame pacing need measurement before a performance claim.

## Feature shortlist — proposed, not built

Effort is relative: small = localized UI; medium = schema/state plus several screens;
large = native/platform work or significant background synchronization.

| Priority | Feature | Intended flow | Effort and requirements |
|---|---|---|---|
| 1 | Quoted chat replies | Swipe or message menu → compact quote above composer → tap quote to original | Medium. Store a reference, handle expired/unsent originals honestly, retain a visible menu alternative |
| 1 | Send / retry state | A quiet pending mark becomes sent after server confirmation; failed draft offers retry | Medium. Idempotent IDs already exist. A durable outbox needs encrypted local persistence and logout/expiry cleanup; do not imply recipient delivery |
| 1 | Edit a recent text | Message menu → edit with an edited indicator | Medium. Author-only, bounded edit window and concurrency/security tests; preserve expiry |
| 2 | Shared plans | Us → small plan with place/date → both can confirm; optional reminder | Medium. Private shared records and free existing push infrastructure; no external calendar account needed; optional ICS download |
| 2 | Want-to-go places | Save a café/idea to a shared list, add a note, navigate when ready | Medium. Separate aspirational pins from geofences so saving an idea does not silently enable arrival alerts |
| 2 | Photo sets | Choose several photos → reorder/caption → post as one coherent set | Medium. Compression/quota checks, interrupted-upload cleanup and viewer paging |
| 2 | Memory collections | Keep → optionally add to a named collection; search/filter within it | Medium. Metadata only; collection membership must not silently change retention |
| 3 | One pinned chat item | Pin a useful plan/address above chat, dismiss when finished | Medium. A pin still expires unless explicitly kept; never retain disappearing content secretly |
| 3 | Optional short status | A chosen emoji/line on profile/Home, with an expiry | Medium. User-authored; no inferred mood, surveillance or relationship scoring |
| 3 | On-this-day memory | A quiet Us entry when a real kept memory matches a past date | Small/medium. Use saved content only; no fabricated memories or automatic letters |
| Later | Home-screen widget | A chosen photo or next shared plan | Large. Android widget lifecycle; privacy-safe default for visible phone screens |
| Later | Personal comfort controls | In-app text size and reduced ambient motion alongside OS preferences | Small/medium. Test large text, focus and all theme combinations |

Suggested order: reply/send-state polish → shared plans and want-to-go places → photo sets and
collections. These improve daily usefulness while the interface remains calm. A small feature
should have a clear home and a complete error/offline/privacy story before another is added.

### Three more personal possibilities

These are original product proposals rather than claims from the reference products:

- **A photo with a voice on the back.** A postcard-like kept moment: photo first, tap/turn to
  hear the short voice note that belongs to it. A few words and an optional chosen place are
  enough. This needs a mixed-media record, attachment/quota cleanup and an accessible
  alternative to the flip gesture. The personal material comes from the two people.
- **One memory, two sides.** Each person contributes a photo or line to the same shared
  keepsake. The result shows both perspectives together. Either contribution is voluntary;
  no streak, overdue state or inferred relationship score. Requires contribution ownership,
  deletion/expiry rules and a clear partially-complete state.
- **A date jar made from your own ideas.** Add a tiny idea privately or together; draw one
  when you want a plan. Turn the chosen idea into a shared date/place. Keep this in Us, with
  a simple list alternative to the playful interaction. No AI-written date suggestions or
  external booking service is required.

I would choose one signature feature after the chat foundations. Building all three at once
would dilute the focus and increase the number of incomplete states to maintain.

## Taking the theme further — proposed, not built

### A living sketchbook for two

Keep Orbit's paired worlds, warm paper and midnight blue. Make the orbital line a consistent
connecting detail: a photo's edge, the motion into a profile, a sheet handle, a voice progress
arc. Avoid filling every free area with planets, stars or permanent movement. Personal photos,
notes and real shared history should be the expressive layer.

1. **One visual grammar.** A small set of radii, spacing steps, icon weights and emphasis levels.
   Jakarta for controls, Fraunces only where a personal note benefits from it. No additional
   display font on every screen. Colors derived from each person's accent with tested contrast.
2. **Connected navigation.** An avatar expands into the person page; a photo expands from its
   actual position; Back returns it to the same spot. Preserve scroll, draft, playback intent
   and map camera. An open sheet closes before leaving its parent screen.
3. **One motion model.** A restrained press response, short settling transitions and one sheet
   behavior. Motion explains an action or state. Reduced-motion substitutes immediate/fade
   behavior. Do not delay successful loading for an animation or animate an invented GPS fix.
4. **Map as an atlas.** Map stays in place, compact person controls float over it, details live
   in an anchored sheet. Journey history uses clear beginnings/stops/gaps and a time scrubber
   only when enough data exists. Walk/Drive stay labelled estimates.
5. **Moments as a journal.** Photos, notes and voice can have distinct editorial rhythm without
   becoming separate boxes. Reactions emerge from the tapped post; replies grow from that
   context. A multi-photo viewer is continuous and respects reader order.
6. **Chat for long conversations.** Calm background, consistent bubble geometry, compact
   reply/send states, a media tray that follows the keyboard. Voice controls should remain
   visible and predictable while the waveform carries character.
7. **Us as a shared shelf.** One upcoming plan, collections and capsules, then timeline. Keep
   diagnostics/statistics in their secondary destinations; avoid a second dashboard on Home.
8. **Lock and loading as one entrance.** Native cover, splash and web shell share color and
   paired-world geometry. Unlock reveals content without a second branded pause. Keep the
   privacy cover in place on cancel/failure; hardware behavior must be tested on the phone.

Acceptance for that phase: measured frame pacing on the Nothing phone, large-text and
reduced-motion checks, keyboard/safe-area/Back verification, cold/slow/offline paths and the
same security/expiry behavior. Visual novelty alone is not acceptance.

## Research behind the proposals

- [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion):
  purposeful, optional motion supports using shared transitions selectively.
- [Android mobile design](https://developer.android.com/design/ui/mobile): native gestures,
  accessibility and device surfaces inform the Android flow/widget proposals.
- [Signal pinned messages](https://signal.org/blog/pinned-messages/): demonstrates a bounded
  pin that still follows disappearing-message expiry. Proposed Orbit pins should do the same.
- [Signal message editing](https://signal.org/blog/new-features-fall-2023/): supports editing
  as an ordinary messaging utility, rather than a decorative feature.
- [Google Maps saved places](https://support.google.com/maps/answer/3184808?hl=en): informs
  a separate shared want-to-go collection and explicit navigation.
- [Paired's product scope](https://support.paired.com/en/articles/164632-what-is-paired): daily
  conversations and special dates are established couple-app patterns. Orbit already has
  these; a larger question library is lower priority than improving its everyday flows.

These are design inferences from primary sources and this app's existing implementation,
not claims that borrowing a feature makes Orbit equivalent to those products.

## Verification

82 web and 16 worker tests, lint/types/format/build pass. Hosted regression: 60 passed; one
request hit a connection reset, and the interrupted test passed on targeted retry. Normal
fixture teardown completed. Production dependency audit: zero published vulnerabilities.
150 measured layouts cover 14 pages plus 11 expanded states, both themes, 320/360/412 px;
no measured horizontal/control overflow. Browser recording remained idle and no real partner
contact occurred. Static audit results and Android build status are recorded with the screens.

All 50 final static cases score 100 accessibility / 100 best practices. The audit caught a
dark-theme timeline palette regression after removing its pale panel; theme inheritance
was corrected and both cases passed. One Keepsakes capture was an update/loading transition;
it was replaced with the loaded page and rerun. Map-avatar initial/full-name advisories remain
reviewed non-scoring items. Screens and audit-summary.json retain the bounded evidence.

Final Android [run 41640760934](https://github.com/devharish1371/Orbit/actions/runs/41640760934)
passes for `5810ab7`, including native tests and signing/manifest checks. The [cleanup APK](https://github.com/devharish1371/Orbit/actions/runs/41640760934/artifacts/13232777835)
is for install-over review. Deferred physical/background/offline/partner/soak gates are unchanged.
Local APK verification passes ZIP integrity, stable signing against the M7 baseline and
configured-private-data scanning. 6,915,116 bytes; SHA256
`9839e33d38841a46e8367dd7c7615c2438e8ab16868cc0c8f7297114094386e4`.
