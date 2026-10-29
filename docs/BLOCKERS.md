# Orbit blockers

## Human #2 — Supabase project configuration (2026-10-30)

The local environment copies contain placeholders. M1 requires the human to create the
free Supabase project, disable public signup, and fill `.env.tools` and `web/.env.local`
as described in `08_HUMAN_TASKS.md` #2. `bootstrap_check.py --require-config` reports
the missing configuration without printing values. Account passwords must be entered
interactively when the M1 admin user script is ready; never put them in env files or chat.

## Resolved — GitHub access

The first sandboxed `gh auth status` misleadingly reported invalid authentication.
Retesting outside the sandbox verified a valid OS-keychain session for `devharish1371`.
The existing public `devharish1371/Orbit` repository was inspected and is empty; it is
the remote for this project. No replacement token or new account is needed.
