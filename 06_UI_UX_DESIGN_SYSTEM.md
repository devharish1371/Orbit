# 06 · UI / UX Design System

Goal: **modern, dynamic, state-of-the-art, intimate.** It should feel like a premium native app
— fast, tactile, cinematic — never like a tracking tool. Mobile-first (360–430 px), scales up to
a centered max-width 480 px "phone column" on desktop with an ambient aurora background.

## 1. Visual language
- **Dark-first** with a refined light theme; follow system, user override in Settings.
- **Aurora gradient** background (slow-moving blurred blobs in primary/secondary), **glass cards**
  (`backdrop-blur-xl`, 1 px inner border `rgba(255,255,255,.08)`, soft shadow), generous radius (20–28 px).
- Personal colors: each person has a color used for their avatar ring, marker, bubbles.
- Imagery: avatars are circular with a **battery ring** (SVG arc) and a ⚡ badge when charging.
- Iconography: lucide-react, 1.75 stroke; emoji used deliberately for warmth.

### Tokens (CSS variables on `:root`, switched by `[data-theme]`)
```css
:root {
  --bg: #0B0B12;  --bg-2: #12121C;
  --surface: rgba(255,255,255,.06);  --surface-strong: rgba(255,255,255,.10);
  --border: rgba(255,255,255,.08);
  --text: #F4F4F8;  --text-dim: #A7A7B8;  --text-faint: #6F6F82;
  --primary: #FF6B8A;  --secondary: #7C5CFF;  --accent: #3DE0C5;
  --danger: #FF4D5E;  --warn: #FFB84D;  --ok: #3DDC97;
  --radius-sm: 12px; --radius: 20px; --radius-lg: 28px;
  --shadow: 0 10px 40px rgba(0,0,0,.35);
  --grad-primary: linear-gradient(135deg, var(--primary), var(--secondary));
  --ease-spring: cubic-bezier(.22,1.2,.36,1);
}
[data-theme='light'] {
  --bg:#FBF7FA; --bg-2:#FFFFFF; --surface:rgba(255,255,255,.7); --surface-strong:#FFFFFF;
  --border:rgba(20,20,40,.08); --text:#17172A; --text-dim:#5B5B73; --text-faint:#8D8DA3;
}
```
Typography: **Plus Jakarta Sans Variable** (UI), **Fraunces Variable** (display accents: countdown,
reveal, titles). Scale: 12/14/16/20/28/40. Numbers use tabular figures. Self-host via `@fontsource-variable`.

## 2. Navigation & screens
Bottom tab bar (glass, floating, safe-area aware, haptic tick): **Home · Map · Moments · Chat · Us**.

1. **Lock / Login** — animated orbit logo; phone (+91 default) + password; "keep me signed in";
   biometric unlock when enabled.
2. **Onboarding / Tracking health** — stepper from `05` §2; confetti on "all set".
3. **Home** — greeting by time of day; partner status card (avatar ring, place name or "on the move",
   battery, "last seen"); distance chip; **quick actions** (Call · Meet · WhatsApp · Nudge 🫶 · Call me?);
   "Expiring soon" strip; anniversary countdown; Daily Question card; mini-map.
4. **Map** — full-screen MapLibre (OpenFreeMap liberty/dark by theme), animated markers (pulse,
   accuracy halo, heading arrow), place circles with emoji pins, 24 h trail (gradient polyline),
   draggable **bottom sheet** (peek → half → full) with partner details + actions,
   floating buttons: recenter, "fit both", share mode (live/pause/surprise), SOS (long-press 2 s).
5. **Moments** — vertical feed of cards: photo (blur-up from thumb), voice (waveform + play),
   text, mood; **expiry ring** around the timestamp; reactions bar (long-press for picker);
   comments sheet; **Keep ✨** button (with quota toast); composer FAB → sheet (camera/gallery, mic
   hold-to-record with waveform, text, mood, expiry chip 24h/7d/Keep, optional "pin to place").
6. **Chat** — bubbles in personal colors, grouped by day, voice/photo/text, swipe-to-react,
   "fades in 6d" micro-label on long-press, typing indicator via Realtime presence (no DB writes).
7. **Us** — Keepsakes grid + Memory Map toggle, Time Capsules (write/lock/unlock animation),
   Places manager, Timeline/countdown, Week in numbers, **Settings**.
8. **Settings** — profile, theme, notifications (per type) + quiet hours, privacy (app lock,
   privacy screen), share-mode defaults, retention info (last cleanup, items expiring, **storage
   meter** for media + keepsakes + DB), Tracking health & diagnostics, Export memories, About.
9. **Anniversary reveal** — full-screen cinematic: dim → particles → handwritten-style (Fraunces
   italic) letter with typewriter reveal → confetti → "Open our space". Triggered on the
   configured anniversary (and replayable from Us → Timeline). Doubles as first-run gift unwrap.

## 3. Motion (use `motion`; respect `prefers-reduced-motion` → fade only)
- Route transitions: shared-axis slide 24 px + fade, 220 ms spring.
- Tab bar: active pill morphs with `layoutId`.
- Marker movement: tween old→new coordinate over 800 ms (ease-out) — never teleport.
- Bottom sheet: spring physics with velocity-based snapping.
- Avatars: gentle breathing pulse when partner is moving; ring sweeps when battery changes.
- Reactions: pop + float-up emoji burst; Nudge: heart ripple + haptic pattern (`Haptics.vibrate` / impact ×3).
- Skeleton shimmer for loading; **no spinners > 300 ms without skeletons**.
- Aurora background: CSS-only blurred gradients, `will-change: transform`, paused when tab hidden.
- Confetti only for: anniversary, Keep milestones, onboarding complete.

## 4. Components to build (`src/components/ui`)
`Avatar` (battery ring, charging, status dot) · `GlassCard` · `Button` (primary/ghost/danger,
loading) · `IconButton` · `Chip` · `BottomSheet` · `Sheet/Modal` · `Toast` · `Tabs` · `Segmented` ·
`Switch` · `Slider` (radius) · `EmojiPicker` (lightweight, no heavy dep) · `ExpiryRing` ·
`Waveform` · `AudioPlayer` · `PhotoViewer` (pinch-zoom) · `MapView` · `Marker` · `Countdown` ·
`EmptyState` · `ErrorBoundary` · `OfflineBanner` · `PermissionBanner` · `StorageMeter`.

## 5. Copy & tone (`src/copy/en.ts`, all strings centralized)
Short, affectionate, specific. Examples: "She's home 💛", "Last seen 4 min ago", "Fades in 6 days —
keep it?", "Nothing here yet. Send the first one 🫶". Errors are kind and actionable ("Couldn't
reach the server. We'll keep trying."). Allow nicknames from config in greetings.
Prepare for a second locale (`ta`) by never hard-coding strings in components.

## 6. Accessibility & usability
WCAG AA contrast (check text over glass), 44×44 px targets, focus rings, labels on icon buttons,
`aria-live` for toasts, voice notes have transcripts-optional text note, dynamic font scaling up
to 130%, haptics optional, no color-only status (add icons/text), reduced-motion support.

## 7. Performance & quality bar
- Route-level code splitting; MapLibre in its own lazy chunk; preload on Map tab hover/idle.
- Images: `loading=lazy`, `decoding=async`, thumbs in lists, signed-URL cache keyed by path (TTL 50 min).
- Virtualize long feeds (windowing) when >100 items; Realtime updates batched ≤ 4 renders/s.
- Lighthouse (mobile) targets: Perf ≥ 90, A11y ≥ 95, Best Practices ≥ 95, PWA installable.
- No layout shift: reserve media aspect ratios from stored dimensions.

## 8. PWA (website)
Manifest (name, icons, theme color), standalone display, offline shell caching static assets only
(never cache API/signed URLs), update prompt toast. Website location sharing is **foreground-only**
— show a banner explaining that continuous tracking needs the Android app.

## 9. Visual QA checklist
[ ] Dark & light screenshots of every screen at 360×800 and 412×915 · [ ] Safe-area/notch correct ·
[ ] Long names / long text wrap · [ ] Empty, loading, error, offline states exist for each screen ·
[ ] Animations 60 fps on a mid-range Android · [ ] Text contrast verified · [ ] Reduced-motion verified.
