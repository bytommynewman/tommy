#!/usr/bin/env bash
# One-shot setup for the quit tracker: applies migration 0011 and redeploys
# the scratch-agent edge function. Safe to re-run.
#
# Needs, as environment variables (set them in the cloud environment's
# settings, or export them in your terminal — never commit them):
#   SUPABASE_DB_URL        Postgres connection string.
#                          Dashboard → Project Settings → Database → Connection
#                          string → URI (use the "Session pooler" one if direct
#                          is IPv6-only for you). Include the password.
#   SUPABASE_ACCESS_TOKEN  (optional, for the function deploy)
#                          https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_REF   (optional, for the function deploy)
#                          the <ref> in https://supabase.com/dashboard/project/<ref>
#
# Usage:  bash scripts/setup-quit.sh

set -euo pipefail
cd "$(dirname "$0")/.."

MIGRATION="supabase/migrations/0011_quit_cannabis.sql"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is not set. See the header of this script." >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed (brew install libpq && brew link --force libpq)." >&2
  exit 1
fi

echo "→ Checking the database…"
applied=$(psql "$SUPABASE_DB_URL" -Atc "select to_regclass('public.quit_attempts') is not null;")
if [[ "$applied" == "t" ]]; then
  echo "  migration 0011 already applied (quit_attempts exists) — skipping."
else
  echo "→ Applying $MIGRATION…"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -f "$MIGRATION"
  echo "  done."
fi

echo "→ Verifying tables…"
psql "$SUPABASE_DB_URL" -Atc "
  select string_agg(table_name, ', ' order by table_name)
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('quit_attempts','withdrawal_checkins','cravings','coping_tools','if_then_plans','quit_milestones','support_contacts');" \
  | sed 's/^/  present: /'

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" && -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "→ Deploying scratch-agent…"
  npx -y supabase@2 functions deploy scratch-agent --project-ref "$SUPABASE_PROJECT_REF"
  echo "  deployed."
else
  echo "→ Skipping the scratch-agent deploy (SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF not set)."
  echo "  Scratch still works; he just won't know about the quit until you deploy:"
  echo "    supabase functions deploy scratch-agent"
fi

echo
echo "All set. Open the app → Recovery → Start the quit."
