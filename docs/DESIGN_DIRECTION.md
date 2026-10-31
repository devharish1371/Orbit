# Orbit — two worlds, one orbit

## Research and decision, 31 October 2026

The user rejected the first two passes as too generic and asked for an app-wide rethink.
The earlier pale glass cards, serif headings and decorative orbit lines were insufficient.
Considered three directions: immersive space observatory; handwritten scrapbook; expressive
editorial objects. Selected the third: clearer daily-use controls, ownable paired geometry,
and room for photographs and messages without simulated handwriting or a perpetual starfield.

Primary references (research, not copied assets):
- [Google expressive design research](https://design.google/library/expressive-material-design-google-research): use size, shape, colour and containment to make important actions legible; retain familiar interaction paradigms.
- [Android theming](https://developer.android.com/design/ui/mobile/guides/styles/themes): keep personal themes and light/dark choices; test contrast across custom surfaces.
- [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion): brief, interruptible response to input; respect reduced motion, avoid perpetual peripheral movement.
- [Linear's redesign](https://linear.app/now/how-we-redesigned-the-linear-ui): design coherent chrome and hierarchy across complete flows; stress-test appearance and environment.
- [Google typography](https://design.google/library/choosing-web-fonts-beginners-guide): distinguish expressive headings from legible reading text.

## Visual grammar

Two equally prominent planets, no central dominant planet and tiny companion. One coral,
one periwinkle; their shared elliptical path remains recognizable at small icon sizes.
Use the same geometry in the app mark, launcher, navigation and interactive objects.
Warm off-white/light and deep blue-black/dark bases; solid tactile surfaces; intentional
colour blocks. Plus Jakarta Sans becomes the strong display voice as well as body face;
Fraunces is reserved for anniversary numbers. Existing personal accent colours remain saved.

## Screen choreography

| Area | Composition | Interaction |
| --- | --- | --- |
| Navigation | Five custom paired glyphs; compact solid dock | Selected orbit moves between destinations; immediate press response |
| Home | Pair portrait scene and bold connection card | Profile/chat access; compact real communication actions |
| Moments | Photo journal with a clearly marked composer | Expand while preserving draft; tactile reactions and photo opening |
| Chat | Continuous conversation surface, paired header identity | Rounded composer, expandable attachments, message actions, waveform seeking/speed |
| Map | Large atlas viewport and connected person selector | Fit both, add place, switch person, expandable details and trail |
| Us | Couple identity plus collectible memory objects | Photo stack, envelope and timeline interactions with touch/focus equivalents |
| Capsules | Sealed correspondence; creation expands on request | Form remains mounted; opening/cancellation still server-authorized |
| Timeline | Large day count and connected dated entries | Reveal replay; factual weekly counters |
| Profile | Identity card plus visual appearance studio | Draft name/colour and miniature theme preview before saving |
| Settings | Organized controls, preview cards, clear state | Theme selection; real privacy, storage and notification controls |

No meaningless live/online indicators, fabricated memories, or automatic messages. Keep
privacy/permission/retention explanations where needed. No personal letter in the app.
Reduced motion disables ornamental transitions. Motion never delays the action or blocks
input. Keyboard controls remain visible; hover is enhancement rather than a requirement.

## Verification

Recapture all affected routes at 360 and 412 px in both themes; check long content and
expanded states. Re-run web/worker checks, static accessibility audits, secret scan and
Android CI. Icon assets are generated from geometric source. Physical touch/keyboard and
gesture-inset acceptance on Nothing Phone (3a) remains human task #7 after packaging.

## Everyday flows, 1 November 2026

Additional primary product research:
- [Google Maps sharing](https://support.google.com/maps/answer/15437054?co=GENIE.Platform%3DAndroid&hl=en): person selection, last shared position and explicit navigation context.
- [Life360 accuracy](https://support.life360.com/hc/en-us/articles/23053384044311-Improve-Location-Accuracy) and [status explanations](https://support.life360.com/hc/en-us/articles/30582985820311-Understanding-My-Jiobit-s-App-Status): distinguish connectivity, accuracy and last known position. Do not infer a dead battery or movement from a missing update.
- [Day One journal views](https://dayoneapp.com/guides/day-one-for-mac/journal-views-in-day-one-for-macos/): different ways to find the same memories, including media filters and map browsing.
- [WhatsApp voice controls](https://blog.whatsapp.com/making-voice-messages-better): preview, waveform, seeking and speed should support listening rather than decorate it.

Implemented a collapsible explorer in both Chat and Moments with server-side text search
and media-kind filters, debounced input, scoped query caches and existing pagination/RLS.
Empty search results have a recovery action. Map person details distinguish recent, old,
waiting, paused and approximate data. Directions appear only for a recent precise shared
point, and launch Google Maps only when tapped. No estimated ETA or reverse-geocoded address
is invented. Tracking puts the confirmed shared mode first and groups phone setup readiness
separately from diagnostics; a running native service is still reported independently.

The visual system remains geometric and code-native. No generated personal memories,
AI-written relationship messages, covert tracking or automatic partner communication.
Existing voice preview/speed and memory-map browsing remain part of these flows. Further
features should follow real use, rather than expanding the navigation indefinitely.
