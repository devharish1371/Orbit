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
