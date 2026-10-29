# 00 · START HERE — Agent Operating Manual (Project "Orbit")

You are an autonomous coding agent building **Orbit**: a private, two-person, free-to-run
"couple's space" — live location sharing, disappearing moments/chat, voice notes, reactions,
one-tap call / Google Meet, smart alerts — delivered as **(a) a website on GitHub Pages** and
**(b) a sideloaded Android APK** (same codebase, Capacitor) with real background location.

The human is gifting this to their girlfriend for an anniversary. It must feel **polished,
warm, fast and trustworthy**. It will be used by exactly **two people**, daily, for years.

---

## 0. Non‑negotiable constraints

1. **Everything must be free and require NO credit card.** If any step would need a card or a
   paid plan, STOP and propose a free alternative (see `01`, section "Free-tier map").
2. **Exactly two users.** Public sign-up is disabled. Every table is protected by Row Level
   Security (RLS). No data is readable by anyone except the two members.
3. **Mutual, transparent location sharing.** Both people see each other. Pausing is *visible*
   to the partner. No hidden/covert modes. (The only "hidden" feature is the *consensual*
   Surprise Mode, which visibly says "🎁 planning something" and blurs, never hides silently.)
4. **Messages & media auto-expire** (default 7 days) unless explicitly kept as a Keepsake.
   Storage deletion MUST go through the **Supabase Storage API**, never raw SQL on
   `storage.objects` (that orphans files). See `04`.
5. **Secrets never enter git or the web bundle.** The Supabase `service_role` key, FCM service
   account, Telegram token, keystore passwords live only in: local `.env.tools` (gitignored),
   GitHub Actions secrets, Supabase secrets. The web app only gets the public URL + anon key.
6. **Verify against current official docs.** Library/CLI/free-tier details drift. Where these
   docs and reality disagree, follow reality and log it in `docs/DECISIONS.md`.
7. **Build from absolute zero.** Assume an empty folder and a machine with nothing installed
   except an OS and a browser. `03_ENVIRONMENT_SETUP.md` covers every step incl. Python venv.

## 1. Reading order (read ALL before writing code)

| # | File | Purpose |
|---|------|---------|
| 00 | this file | rules, workflow, repo layout, definition of done |
| 01 | `01_PRODUCT_SPEC.md` | what we build, every feature, refinements, free-tier map |
| 02 | `02_ARCHITECTURE.md` | stack, data flows, decisions, folder structure |
| 03 | `03_ENVIRONMENT_SETUP.md` | zero-to-running: toolchain, venv, requirements, scaffolding |
| 04 | `04_DATABASE_SECURITY_RETENTION.md` | full SQL, RLS, auto-delete pipeline, edge function |
| 05 | `05_ANDROID_LOCATION_AND_PUSH.md` | background tracking, geofence, push, battery, notify fn |
| 06 | `06_UI_UX_DESIGN_SYSTEM.md` | screens, tokens, motion, copy, accessibility |
| 07 | `07_CICD_DEPLOY_TESTING.md` | GitHub Actions, APK signing, tests, QA checklist |
| 08 | `08_HUMAN_TASKS.md` | the ONLY things the human must do by hand |
| 09 | `09_MILESTONES.md` | ordered work plan with acceptance criteria |

## 2. How to work

1. Create `docs/PLAN.md` — your own concise plan derived from `09`. Keep it updated.
2. Work **milestone by milestone** (`09`). For each: implement → run tests → commit → update
   `docs/DEVLOG.md` (what changed, how verified). Do not start milestone N+1 while N's
   acceptance criteria fail.
3. **Commit often**, Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
   One logical change per commit. Never commit `.env*` (except `*.example`), keystores,
   `google-services.json`, service-account JSON, or `node_modules`/`.venv`.
4. **Human-only steps** (creating accounts, copying keys, installing the APK) are listed in
   `08_HUMAN_TASKS.md`. When you reach one, STOP and send the human a short message:
   *which task #*, *exact thing needed*, *which file to paste it into*. Never invent keys.
   Never ask the human to paste secrets into chat — tell them to put them in the local file.
5. If blocked >2 attempts on the same error, write the error + what you tried into
   `docs/BLOCKERS.md`, then ask the human one focused question.
6. Prefer **boring, well-supported tech**. Don't add a dependency when ~30 lines will do.
7. Make every personal detail configurable in `web/src/config/couple.config.ts`
   (names, nicknames, anniversary, phones, Meet URL, colors, timezone, quiet hours, retention).
8. Write TypeScript in strict mode. No `any` without a comment. Lint + typecheck must be clean.

## 3. Repository layout (target)

```
orbit/
├─ docs/                       # these .md files + PLAN.md, DECISIONS.md, DEVLOG.md, BLOCKERS.md
├─ web/                        # Vite + React + TS app; web/android is the Capacitor project
│  ├─ src/{app,components,features,hooks,lib,native,styles,config,copy}/
│  ├─ public/
│  ├─ capacitor.config.ts
│  └─ package.json
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/              # numbered .sql files (see 04)
│  └─ functions/{retention,notify,telegram-webhook}/index.ts
├─ tools/                      # Python helper scripts (own venv)
│  ├─ requirements.txt
│  └─ *.py
├─ .github/workflows/{ci,deploy-pages,android-apk,keepalive}.yml
├─ .env.tools.example          # template only
├─ .gitignore
└─ README.md                   # human-facing quick start (write at the end)
```

## 4. Command cheat-sheet (fill in as you go)

```
# Python tools
python -m venv .venv && <activate> && pip install -r tools/requirements.txt
# Web
cd web && npm ci && npm run dev | build | test | lint | typecheck
# Android (local build optional — CI builds the APK)
cd web && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
# Supabase
npx supabase@latest login | link --project-ref <ref> | db push | functions deploy <name> | secrets set
```

## 5. Definition of Done (whole project)

- [ ] Both users can log in (phone number + password) on website **and** APK.
- [ ] Phone A's background location appears on phone B's map within ~30 s while moving, with
      battery %, speed, "last seen", and place names; survives app swipe-away and screen-off.
- [ ] Arrive/leave alerts, low-battery, sharing-stopped (stale) alerts delivered as push.
- [ ] Moments feed + chat: text, photo, voice, reactions; expiry ring; Keep ✨ with quota.
- [ ] Hourly retention job deletes expired rows AND storage files (verified by test).
- [ ] Call / Meet / WhatsApp / Nudge actions work from Home and Map.
- [ ] RLS test proves a third user sees nothing and cannot write anything.
- [ ] GitHub Pages deploys on push; tagged release produces a signed APK.
- [ ] `README.md`, `DEVLOG.md`, `DECISIONS.md` are accurate. Zero secrets in git history.
- [ ] 24‑hour on-device soak test passes (`07`, section 6).

## 6. Starter prompt the human may paste

> Read every file in `/docs` in order (00 → 09). Then create `docs/PLAN.md` and begin at
> Milestone 0. Work autonomously; stop only for human-only tasks in `08`. Commit per
> milestone, run all tests, and keep `docs/DEVLOG.md` current.
