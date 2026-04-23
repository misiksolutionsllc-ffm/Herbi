#!/usr/bin/env bash
# Herbi — one-shot end-to-end deploy.
#
# Reads credentials from .env.local, then:
#   1. Applies Supabase migrations via psql.
#   2. Pushes env vars to Vercel + deploys to production.
#   3. Registers the Stripe webhook against the production URL.
#   4. Redeploys with STRIPE_WEBHOOK_SECRET set.
#   5. Smoke-tests the deployed URL.
#
# Re-runs are idempotent: migrations use CREATE ... IF NOT EXISTS /
# ON CONFLICT DO NOTHING; webhook creation is skipped if an endpoint
# already points at your deploy URL; Vercel env vars are replaced in place.
#
# Prerequisites (the script checks and exits with a hint if missing):
#   psql   — PostgreSQL client. macOS: `brew install libpq && brew link --force libpq`
#   node   — Node 18+. For Vercel CLI.
#   curl   — almost always present.
#   jq     — JSON parser. macOS: `brew install jq` / apt: `apt install jq`.
#
# First-time setup (put in .env.local before running):
#   NEXT_PUBLIC_SUPABASE_URL      https://<ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY <anon key>
#   SUPABASE_SERVICE_ROLE_KEY     <service_role key>
#   SUPABASE_DB_PASSWORD          <Postgres password you chose at project creation>
#   STRIPE_SECRET_KEY             sk_test_...
#
# Optional:
#   VERCEL_PROJECT_NAME   — name to use if creating a new Vercel project.
#                           Defaults to the repo directory name.
#
# Usage:
#   ./scripts/deploy.sh              # full pipeline
#   ./scripts/deploy.sh --migrate    # migrations only
#   ./scripts/deploy.sh --deploy     # Vercel deploy + webhook only
#   ./scripts/deploy.sh --smoke-only # just curl the deployed URL

set -euo pipefail

# ── ui ─────────────────────────────────────────────────────────────────
BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GREEN=$'\e[32m'
YELLOW=$'\e[33m'; BLUE=$'\e[34m'; RESET=$'\e[0m'
say()  { printf "%s▶%s %s%s%s\n" "$BLUE" "$RESET" "$BOLD" "$*" "$RESET"; }
ok()   { printf "%s✓%s %s\n" "$GREEN" "$RESET" "$*"; }
warn() { printf "%s!%s %s\n" "$YELLOW" "$RESET" "$*"; }
die()  { printf "%s✗%s %s\n" "$RED" "$RESET" "$*" >&2; exit 1; }

# ── flags ──────────────────────────────────────────────────────────────
MODE=all
case "${1:-}" in
  --migrate)    MODE=migrate ;;
  --deploy)     MODE=deploy ;;
  --smoke-only) MODE=smoke ;;
  --help|-h)    sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//;/^set -euo/d'; exit 0 ;;
  "")           ;;
  *)            die "Unknown flag: $1 (use --help)" ;;
esac

# ── prereqs ────────────────────────────────────────────────────────────
need() { command -v "$1" >/dev/null 2>&1 || die "Missing: $1"; }
need curl; need node
[ "$MODE" != deploy ] && need psql
need jq

# Move to repo root (two levels up from scripts/ if invoked from there)
cd "$(dirname "$0")/.."
[ -f package.json ] || die "Run from the Herbi repo root. Could not find package.json at $(pwd)."

# ── load .env.local ────────────────────────────────────────────────────
[ -f .env.local ] || die ".env.local not found. Copy .env.example and fill it in first."
set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

check_var() { [ -n "${!1:-}" ] || die "$1 missing from .env.local"; }

if [ "$MODE" != smoke ]; then
  check_var NEXT_PUBLIC_SUPABASE_URL
  check_var NEXT_PUBLIC_SUPABASE_ANON_KEY
  check_var SUPABASE_SERVICE_ROLE_KEY
  check_var STRIPE_SECRET_KEY
fi

# Derive Supabase DB URL from project URL + password.
if [ -z "${SUPABASE_DB_URL:-}" ] && [ -n "${SUPABASE_DB_PASSWORD:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  ref=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https?://([^.]+)\..*|\1|')
  # URL-encode @ # $ & / : ? in the password
  encoded=$(printf '%s' "$SUPABASE_DB_PASSWORD" | jq -sRr @uri)
  SUPABASE_DB_URL="postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres?sslmode=require"
fi

# ── 1. migrations ──────────────────────────────────────────────────────
run_migrations() {
  [ -n "${SUPABASE_DB_URL:-}" ] || die "SUPABASE_DB_URL or SUPABASE_DB_PASSWORD must be set in .env.local"
  say "Applying Supabase migrations"
  shopt -s nullglob
  local files=(supabase/migrations/*.sql)
  [ ${#files[@]} -gt 0 ] || { warn "No migrations found"; return; }
  for f in "${files[@]}"; do
    printf "  %s\n" "$f"
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null
  done
  local count
  count=$(psql "$SUPABASE_DB_URL" -t -A -c "SELECT count(*) FROM products WHERE is_active")
  ok "Migrations applied. $count active products in DB."
}

# ── 2/4. vercel ─────────────────────────────────────────────────────────
ensure_vercel_cli() {
  if ! command -v vercel >/dev/null 2>&1; then
    say "Installing Vercel CLI (global)"
    npm i -g vercel@latest
  fi
}

push_env() { # push_env VAR VALUE [environment]
  local name=$1 value=$2 env=${3:-production}
  # idempotent: remove if exists, then add
  vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" "$env" >/dev/null
}

deploy_to_vercel() {
  ensure_vercel_cli

  if [ ! -f .vercel/project.json ]; then
    say "Linking to a Vercel project (interactive, one-time)"
    vercel link --yes ${VERCEL_PROJECT_NAME:+--project "$VERCEL_PROJECT_NAME"}
  fi

  say "Pushing env vars to Vercel (production)"
  push_env NEXT_PUBLIC_SUPABASE_URL       "$NEXT_PUBLIC_SUPABASE_URL"
  push_env NEXT_PUBLIC_SUPABASE_ANON_KEY  "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
  push_env SUPABASE_SERVICE_ROLE_KEY      "$SUPABASE_SERVICE_ROLE_KEY"
  push_env STRIPE_SECRET_KEY              "$STRIPE_SECRET_KEY"
  [ -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}" ] && \
    push_env NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  [ -n "${STRIPE_WEBHOOK_SECRET:-}" ] && \
    push_env STRIPE_WEBHOOK_SECRET "$STRIPE_WEBHOOK_SECRET"

  say "Deploying to production"
  DEPLOY_URL=$(vercel deploy --prod --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -1)
  [ -n "$DEPLOY_URL" ] || die "Could not parse deploy URL from vercel output"
  ok "Deployed: $DEPLOY_URL"

  # Pin NEXT_PUBLIC_SITE_URL to the deploy URL so Stripe success/cancel URLs match.
  push_env NEXT_PUBLIC_SITE_URL "$DEPLOY_URL"
}

# ── 3. stripe webhook ─────────────────────────────────────────────────
ensure_stripe_webhook() {
  local hook_url="${DEPLOY_URL}/api/webhooks/stripe"
  say "Ensuring Stripe webhook for $hook_url"

  local existing
  existing=$(curl -sfS -u "$STRIPE_SECRET_KEY:" \
    "https://api.stripe.com/v1/webhook_endpoints?limit=100" \
    | jq -r --arg u "$hook_url" '.data[] | select(.url==$u) | .id' | head -1)

  if [ -n "$existing" ]; then
    warn "Webhook $existing already exists for this URL."
    if [ -z "${STRIPE_WEBHOOK_SECRET:-}" ]; then
      warn "STRIPE_WEBHOOK_SECRET is not in .env.local. Stripe only returns the signing secret at creation time."
      warn "Either:"
      warn "  (a) Open https://dashboard.stripe.com/test/webhooks/${existing} → Reveal signing secret → paste into .env.local as STRIPE_WEBHOOK_SECRET and re-run."
      warn "  (b) Delete the endpoint in the dashboard and re-run this script to get a fresh one."
      return 1
    fi
    return 0
  fi

  local resp
  resp=$(curl -sfS -u "$STRIPE_SECRET_KEY:" \
    -X POST https://api.stripe.com/v1/webhook_endpoints \
    -d url="$hook_url" \
    -d "enabled_events[]=checkout.session.completed")
  local whsec
  whsec=$(echo "$resp" | jq -r '.secret')
  [ -n "$whsec" ] && [ "$whsec" != "null" ] \
    || die "Failed to create webhook. Stripe response: $resp"
  STRIPE_WEBHOOK_SECRET=$whsec
  ok "Webhook created"

  # Persist to .env.local so re-runs don't recreate
  if grep -q '^STRIPE_WEBHOOK_SECRET=' .env.local; then
    # In-place replace, portable between GNU & BSD sed
    awk -v s="$whsec" '
      /^STRIPE_WEBHOOK_SECRET=/ { print "STRIPE_WEBHOOK_SECRET=" s; next }
      { print }
    ' .env.local > .env.local.tmp && mv .env.local.tmp .env.local
  else
    printf '\nSTRIPE_WEBHOOK_SECRET=%s\n' "$whsec" >> .env.local
  fi

  # Push to Vercel and redeploy so the webhook route can verify signatures
  push_env STRIPE_WEBHOOK_SECRET "$whsec"
  say "Redeploying so the webhook route picks up the signing secret"
  DEPLOY_URL=$(vercel deploy --prod --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -1)
  ok "Redeployed: $DEPLOY_URL"
}

# ── 5. smoke test ──────────────────────────────────────────────────────
smoke_test() {
  local url=${DEPLOY_URL:-${NEXT_PUBLIC_SITE_URL:-}}
  [ -n "$url" ] || die "No deploy URL known. Run the full pipeline first."
  say "Smoke test: $url"
  printf "  %-20s %s\n" "/"        "$(curl -s -o /dev/null -w '%{http_code}' "$url/")"
  printf "  %-20s %s\n" "/shop"    "$(curl -s -o /dev/null -w '%{http_code}' "$url/shop")"
  printf "  %-20s %s\n" "/cart"    "$(curl -s -o /dev/null -w '%{http_code}' "$url/cart")"
  # Webhook: unsigned POST should be rejected with 400 (proves signature check is wired)
  printf "  %-20s %s  (expect 400 — signature missing)\n" \
    "POST /api/webhooks/stripe" \
    "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$url/api/webhooks/stripe")"
}

# ── orchestrate ────────────────────────────────────────────────────────
case "$MODE" in
  migrate) run_migrations ;;
  deploy)  deploy_to_vercel; ensure_stripe_webhook; smoke_test ;;
  smoke)   smoke_test ;;
  all)     run_migrations; deploy_to_vercel; ensure_stripe_webhook; smoke_test ;;
esac

ok "All done."
