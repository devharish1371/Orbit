# Native entrance and widget — V2.8

V2.8's reading/motion controls shipped in the preceding batch. This completes the remaining
software: theme-aware native entrance, safe unlock/readiness handoff and an optional Android
home-screen photo/plan widget. Physical acceptance remains in the user's deferred task #7
batch. No APK handover or installation is requested. V2.6 remains deferred; no safety sensor
or real partner notification is enabled.

## One entrance

The Android system splash uses the paired-planet vector and Day/Night resources. The activity
selects the persisted app palette before `super.onCreate`; native cover, window/background,
system-bar contrast and web opening artwork use the same palette. The OS can construct its
initial starting window before the activity reads preferences: a custom mode opposite to the
OS may still briefly inherit the system-selected launch resource. Cold-start first-frame
appearance and frame pacing need phone measurements; no pixel-perfect timing claim is made.

A native cover precedes the first WebView frame. It shows no account name, avatar, status or
personal picture. It remains until authentication policy and the current web-page readiness
ticket both allow reveal. Login, usable membership/error/offline screens and the app error
boundary signal readiness after a committed animation frame. Palette application precedes
that acknowledgement; failure to persist an optional palette does not strand the screen.
There is no minimum branding timer. Route loading retains app chrome and a quiet skeleton.

Native readiness tickets change on reload/destroy; an old web callback cannot release a new
cover. Cancelled/failed device authentication keeps locked content covered. A missing device
credential offers Android's security settings without changing credentials. A stalled web
start offers native Reload after 12 seconds; this is recovery, not an enforced loading delay.
Reveal uses a bounded 120ms fade, immediate under reduced motion/disabled OS animation.
Pause/new-lock cancels it; generation checks stop a late animation completion hiding a cover.
Existing one-minute monotonic re-lock and screenshot/recents protections remain.

Native text bundles the same Plus Jakarta Sans family under OFL, with an older-device fallback.
System font scaling and Orbit's reading scale combine; native cover content scrolls if needed.
The web loading state uses the same paired-world silhouette, without repeated helper sentences.

## Widget privacy and data

Private is the default, including the launcher picker/initial layout. It is a generic Orbit
shortcut. Personal modes require selecting an actual kept photo or future uncancelled plan
and a concrete in-app privacy confirmation. One device-local selection applies to all Orbit
widget instances. Removing the final widget clears its selection/private files.

Orbit lock **or** screenshot protection keeps personal widget content covered, even after
unlocking the app. Turning these protections off requires a fresh native verification before
personal content can render. Small/large-system-text layouts fall back to the private icon.
The widget is registered for home-screen use, explicitly not keyguard on supported Android.
Rendering additionally checks keyguard/host category, account, verification age and plan time.
A widget tap can only open an allowlisted internal destination through the native app lock.
A pin request is not labelled an installed widget; the launcher owns confirmation and the
installed count comes from AppWidgetManager.

Personal widget content is deliberately shared with the launcher after consent. Launchers can
retain previews; Orbit cannot erase copies already made by another app or guarantee an instant
remote revocation. The app does not claim FLAG_SECURE protects a third-party launcher's views.
These limits are disclosed before choosing personal content, with details collapsed afterward.

Native selection validates the account, couple membership and source through existing RLS.
Only current kept/non-unsent photos are eligible; source revision is rechecked after download.
A plan uses its current title/date/timezone/version, with cancelled/past plans excluded. No
location, chat excerpt, partner status, notes, venue, token or signed URL is stored in a widget.
The thumbnail is bounded, decoded/downsampled and re-encoded locally (up to 320×240 and 96KB).
An unchanged verified photo reuses its encrypted image after fresh server validation, avoiding
repeated media downloads. No cloud original is removed or changed.

One atomic AES-GCM record lives in no-backup app storage, bound to owner/couple and checked
against source ID/kind/revision. Full readback precedes acknowledgement. Epochs stop late
writes after privacy changes/clear; known removal, Keep-instance change, logout and account or
known couple change clear the record/key and send a full covered widget update. Network failure
marks it unverified without treating an acknowledgement as fresh content. Every full update
explicitly removes personal bitmap/text before applying new data.

Widget broadcasts only render/schedule work; a permission-protected JobService performs
bounded network validation. Periodic updates request 30 minutes; foreground/social changes and
explicit Refresh also validate the chosen source. The 30-minute freshness limit applies when
Orbit renders the widget. Android scheduling and launcher caching can delay its next render;
this is a checked snapshot with an Updated time, not a live feed or exact-expiry guarantee.
No new runtime permission, paid service, exact alarm, sensor or always-on foreground service
is added.

## Verification and remaining phone gates

Pure native tests cover cover policy/ticket mismatch, contrast, bounded Unicode snapshot
codec, account/couple/Keep-revision/freshness/keyguard/privacy checks, past plans, tampering
and encrypted identity isolation. Web checks cover frame/appearance/readiness ordering,
unmount interruption, palette-storage failure, internal-route allowlist, private defaults,
concrete photo consent, save failure, account change and honest launcher-request wording.
Hosted checks use disposable accounts for the exact source projections, signed path shape,
foreign access, Keep/unsend/version changes and plan cancellation.

Browser evidence uses synthetic content and an injected native bridge to exercise production
pages. It cannot prove native authentication, launcher rendering/pinning, OS transitions,
background scheduling or actual unlock frame pacing. Android CI compiles the real native
resources/bridge and runs JVM tests. Real Nothing Phone (3a) cold/warm start, cancelled/successful
unlock, fonts/gestures, launcher resize/pin, lock/privacy cover, offline/remote removal and
process-death/reboot checks remain in the user's later device batch. Final counts, source,
Android outcome and artifact checks are in DEVLOG.md.

## Primary references and font provenance

- [Android splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen/)
  and the installed Capacitor SplashScreen source: the plugin's zero-duration launch path
  returns without installing the compat splash, so MainActivity installs it before super.
- [Widget update/background guidance](https://developer.android.com/develop/ui/views/appwidgets/advanced):
  periodic widget updates have a 30-minute minimum; network work is kept outside broadcasts.
- [Widget discovery/pinning](https://developer.android.com/develop/ui/views/appwidgets/discoverability):
  pinning is launcher-controlled and a request does not establish successful installation.
- [Widget category reference](https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo):
  home-screen/not-keyguard categories are combined with conservative render guards.
- [Google Fonts Plus Jakarta Sans](https://github.com/google/fonts/tree/main/ofl/plusjakartasans),
  vendored `PlusJakartaSans[wght].ttf`; SHA-256
  `89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8`.
  The full OFL is packaged in `assets/licenses/PlusJakartaSans-OFL.txt`. No runtime font download.
