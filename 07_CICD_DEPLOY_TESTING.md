# 07 · CI/CD, Deployment & Testing

All free: public GitHub repo + GitHub Actions + GitHub Pages. Check the latest major versions of
each Action when writing workflows (versions below are the expected current majors).
The repo is public, so **nothing secret may ever be committed** (`00` rule 5). The site/APK only
ship the public Supabase URL + anon key; RLS is the security boundary.

## 1. Workflows

### 1.1 `ci.yml` — on push & PR
```yaml
name: ci
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  web:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: web } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
  tools:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12', cache: pip, cache-dependency-path: tools/requirements.txt }
      - run: pip install -r tools/requirements.txt
      - run: pytest tools/tests -m "not integration"
```
Integration tests (RLS/retention) hit the real project and need the service key → run **locally**
by the agent/human (`pytest -m integration`), or in a manually-triggered workflow
(`workflow_dispatch`) using repo secrets. Never on PRs from forks.

### 1.2 `deploy-pages.yml` — on push to `main`
```yaml
name: deploy-pages
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci && npm run build
        working-directory: web
        env:
          VITE_BASE: /${{ github.event.repository.name }}/
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: web/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.d.outputs.page_url }}' }
    steps:
      - id: d
        uses: actions/deploy-pages@v4
```
Repo → Settings → Pages → Source: **GitHub Actions** (human task). Use HashRouter + copy
`index.html` → `404.html` as an extra safety net.

### 1.3 `android-apk.yml` — on tag `v*` or manual
```yaml
name: android-apk
on: { push: { tags: ['v*'] }, workflow_dispatch: {} }
permissions: { contents: write }
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web/package-lock.json }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: android-actions/setup-android@v3
      - name: Build web (native base)
        working-directory: web
        run: npm ci && npm run build
        env:
          VITE_BASE: ./
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
      - name: Inject Firebase config + keystore
        run: |
          echo "${{ secrets.GOOGLE_SERVICES_JSON_B64 }}" | base64 -d > web/android/app/google-services.json
          echo "${{ secrets.ANDROID_KEYSTORE_B64 }}" | base64 -d > "$RUNNER_TEMP/orbit.jks"
      - name: Sync + assemble release
        working-directory: web
        run: npx cap sync android && cd android && chmod +x gradlew && ./gradlew assembleRelease
        env:
          ORBIT_KEYSTORE_PATH: ${{ runner.temp }}/orbit.jks
          ORBIT_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ORBIT_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ORBIT_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      - run: mv web/android/app/build/outputs/apk/release/app-release.apk orbit-${{ github.ref_name }}.apk
      - uses: softprops/action-gh-release@v2
        with: { files: 'orbit-*.apk' }
```
Gradle signing (`web/android/app/build.gradle`) must read the env vars:
```groovy
android {
  signingConfigs {
    release {
      if (System.getenv("ORBIT_KEYSTORE_PATH")) {
        storeFile file(System.getenv("ORBIT_KEYSTORE_PATH"))
        storePassword System.getenv("ORBIT_KEYSTORE_PASSWORD")
        keyAlias System.getenv("ORBIT_KEY_ALIAS")
        keyPassword System.getenv("ORBIT_KEY_PASSWORD")
      }
    }
  }
  buildTypes { release { signingConfig signingConfigs.release; minifyEnabled false } }
}
```
**Keep the same keystore forever** — a different key means Android refuses to update the app
(uninstall/reinstall needed). The human backs it up (08 #5). Also set `versionCode` from the tag/run number.
The APK is attached to a public Release; it contains only public config, and login is required.
(Alternative if the human prefers: download the workflow artifact or build locally and share privately.)

### 1.4 `keepalive.yml` — secondary safety net
Cron every 2 days: `curl -s "$SUPABASE_URL/rest/v1/couples?select=id&limit=1" -H "apikey: $ANON"` (returns
no rows without a session, but it is a database request). **Primary** protection against free-plan pausing
is the in-DB cron + daily app traffic. Note: GitHub auto-disables scheduled workflows after 60 days
without repo activity — document this in README; don't rely on it.

## 2. Release procedure
1. `git tag v1.0.0 && git push --tags` → APK built and attached to a GitHub Release.
2. Human downloads on both phones → install (allow unknown sources) → onboarding → done.
3. Website auto-updates on every push to `main`.
Bump version in `package.json` + Android `versionName/Code`; keep `CHANGELOG.md`.

## 3. Test strategy

### 3.1 Unit (Vitest) — fast, no network
- `geofence.evaluate` (enter, exit, hysteresis, accuracy gate, 2-fix confirmation, flapping)
- `fuzzPoint` (deterministic, grid, never equals input), distance/midpoint helpers
- Retention math (`expiresAt`, expiry ring %), quota math, quiet-hours logic (incl. overnight window, IST)
- Queue (ordering, cap 500, backoff), phone→email mapping (`+91 98765 43210` → `u919876543210@example.com`)
- Formatting (last seen, distance), config validation (zod or manual) fails loudly on bad config

### 3.2 Component tests (Testing Library)
Login validation · Composer expiry chip · Keep button + quota error toast · PermissionBanner · ExpiryRing · Reaction bar.

### 3.3 Integration tests (pytest, **real Supabase**, marked `integration`, run locally)
Create three users via admin API: A, B (same couple) and C (stranger).
- **RLS isolation**: C selects every table → 0 rows; C insert into couple's tables → denied; C cannot read storage objects.
- A cannot insert rows with `couple_id`/`user_id` of another; cannot change `author_id`; cannot update B's `members` row.
- B can flip `keep` on A's post, cannot edit `body`; `KEEPSAKE_QUOTA_EXCEEDED` raised past quota.
- Capsule: B cannot read before `unlock_at`, can after.
- `question_answers`: B cannot read A's answer until B answered.
- **Retention**: upload a file, insert post, set `expires_at` in the past (service role), call retention function →
  row gone **and** `storage.list` no longer contains the path; kept post survives; orphan file (no row) is swept.
- **Stale**: set `live_location.updated_at` 31 min ago → `check_stale_members()` creates exactly one `sharing_stopped`; a new upsert creates `sharing_resumed`.
- **Notify** (with `FCM` mocked via env flag `NOTIFY_DRY_RUN=1`): event insert produces expected recipient & text; quiet hours respected.
- Clean up all created test data/users in teardown.

### 3.4 E2E (Playwright, optional but recommended for web)
Smoke: login → Home renders → Map chunk loads → post a text moment → appears → react → keep.
Run against dev server with a test project/user.

### 3.5 Static quality gates
ESLint, Prettier check, `tsc --noEmit`, `npm audit --omit=dev` (report, don't block), `gitleaks`-style
check: a simple script that greps the repo for `service_role`, `-----BEGIN`, `AIza`, `sb_secret`, and `.env` files.

## 4. Manual device QA checklist (two real Android phones)
**Tracking:** [ ] first-run permissions OK · [ ] screen off 30 min, walk around → partner sees updates ·
[ ] swipe-away from recents → still tracking · [ ] airplane mode 10 min → queue flushes on reconnect ·
[ ] battery saver on → degraded banner or still works · [ ] reboot → toast prompts to reopen ·
[ ] revoke background permission → red banner + partner gets "sharing stopped".
**Alerts:** [ ] arrive/leave at a real place · [ ] low battery at 15% · [ ] SOS long-press · [ ] nudge haptics ·
[ ] quiet hours silences non-urgent · [ ] push arrives with app killed.
**Social:** [ ] photo/voice/text both ways · [ ] reactions · [ ] expiry ring correct · [ ] Keep ✨ + quota meter ·
[ ] unsend deletes file (verify in Storage UI) · [ ] voice recording permission prompt.
**Modes:** [ ] pause with timer · [ ] surprise mode blur (~2 km) & no place alerts · [ ] auto-resume.
**Connect:** [ ] Call dialer · [ ] Meet opens · [ ] WhatsApp chat opens · [ ] Meet-in-the-middle opens Maps.
**Security:** [ ] app lock · [ ] privacy screen · [ ] logout clears local queue/caches.

## 5. Observability (free, privacy-respecting)
No third-party analytics. Use: Supabase Logs for Edge Functions, `retention_runs` table, the in-app
Diagnostics screen, and (optional) a tiny `client_logs` table is **not** added by default.

## 6. 24-hour soak test (required for Definition of Done)
Both phones, normal day. Pass if: ≥95% of expected 5-min windows have a location update; no crash;
battery drain attributable to Orbit < ~6–8%/day on a mid-range phone (Settings → Battery);
retention job ran ≥20 times with no errors; storage/DB graphs flat; no duplicate alerts.
Record results in `docs/DEVLOG.md`; tune distanceFilter/intervals if needed.

## 7. Backup & disaster recovery
Supabase Free has **no backups**. Provide: Settings → "Export memories" (ZIP of kept media + JSON +
places) and `tools/export_memories.py`. Document how to rebuild: new Supabase project → run
migrations → `create_users.py` → import `places.json`. Recommend exporting monthly.
