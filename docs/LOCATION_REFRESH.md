# Manual location refresh

On Map, select either person and tap **Refresh location**. This creates one short-lived
request for that person's sharing phone and reloads the latest shared fix. The selected
person's actual fix time remains visible while waiting. A successful API request alone
does not mean a new GPS location was obtained.

- Both members can request their own or their partner's update. Unrelated accounts cannot
  read or create requests. Direct client writes to the request table are denied.
- One row per recipient is retained; repeated requests within a minute return the same
  request. Requests expire after two minutes and never enable sharing or start a stopped
  service. No push notification or message is sent.
- The Android sharing service checks for requests during its existing policy sync, normally
  once a minute while awake. Refreshing this device also wakes that sync immediately.
  Android power restrictions, force-stop, missing permissions, offline status or an older
  APK can prevent a response. There is no instant-delivery guarantee.
- A valid request asks GPS/network providers for an update for at most 30 seconds. A new
  fix can bypass the stationary upload interval. Existing quality, mock/jump filtering,
  auth, privacy-generation and offline-queue rules still apply. Listeners stop on a fix,
  timeout, privacy change or service destruction.
- Foreground web sharing receives the same request through Realtime or a one-minute
  fallback read. It requests uncached updates only after that browser's sharing opt-in;
  hidden pages do not collect location.
- Paused sharing cannot be refreshed. Surprise updates remain approximate with no precise
  history. Requests from an earlier privacy generation are ignored.
- The UI reports success only when the recorded fix is at or after the request and newer
  than its saved baseline. An unchanged timestamp cannot become “updated” merely because
  data was reloaded. A bounded five-second poll stops after success or timeout.

Verification: 72 web tests, 16 worker tests and the complete 60-test hosted Python suite
pass with lint, types, formatting and production build. Tests use disposable identities.
Android build and browser geometry results are recorded in DEVLOG.md after completion.
Actual remote fresh-GPS delivery on a sharing phone remains human task #7; existing offline,
screen-off endurance, second-phone and soak gates remain open.

References: [Android LocationManager](https://developer.android.com/reference/android/location/LocationManager)
for bounded listener lifecycle; [Life360 location accuracy guidance](https://support.life360.com/hc/en-us/articles/23053384044311-Improve-Location-Accuracy)
for the distinction between connectivity, device location availability and UI refresh.
