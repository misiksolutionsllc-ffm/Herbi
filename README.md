# Herbi — Deployment Guide

Zero to live storefront in roughly 30 minutes. Stripe in test mode first; flip to live once you've confirmed end-to-end.

---

## 0. Prerequisites (you have these)

- Vercel account
- Supabase account
- Stripe account
- A GitHub account to push this repo to (Vercel deploys from git)
- Node 20+ and `pnpm` locally (`npm i -g pnpm@9`)

Optional but recommended for local dev:
- [Stripe CLI](https://stripe.com/docs/stripe-cli) for webhook forwarding

---

## 1. Local setup (2 min)

```bash
cd herbi
pnpm install
cp .env.example .env.local
```

Leave `.env.local` empty for now — we'll fill it in as we provision services.

---

## 2. Supabase (5 min)

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard/projects). Pick a strong DB password and the region closest to your customers.
2. Wait for it to spin up (~2 min).
3. Go to **SQL Editor → New query**. Run each migration file in order:
   - `supabase/migrations/0001_init.sql` — products, orders, stock function, RLS
   - `supabase/migrations/0002_seed.sql` — 6 seed products
   - `supabase/migrations/0003_decrement_stock_batch.sql` — atomic batch stock decrement
   - `supabase/migrations/0004_intermediary_platform.sql` — suppliers, supplier\_orders, platform\_metrics\_daily view
   - `supabase/migrations/0005_seed_suppliers.sql` — 2 seed wholesale suppliers + product links
4. Go to **Project Settings → API**. Copy these into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
```

> ⚠️ The service role key bypasses RLS. Never put it in client code, logs, or git.

---

## 3. Stripe (5 min)

1. In the Stripe dashboard, make sure you're in **Test mode** (toggle top-right).
2. Go to **Developers → API keys**. Copy both:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

3. For the webhook secret, two options:

   **Local dev (recommended first):**
   ```bash
   stripe login
   pnpm stripe:listen
   ```
   The CLI prints a `whsec_...` value. Put it in `.env.local` as `STRIPE_WEBHOOK_SECRET`.

   **Production (after Vercel deploy — see section 5):**
   Dashboard → Developers → Webhooks → Add endpoint → `https://<your-domain>/api/webhooks/stripe`, select event `checkout.session.completed`. Reveal the signing secret and paste it in Vercel env vars.

---

## 4. Run it locally (1 min)

```bash
pnpm dev
```

Open `http://localhost:3000`. Click a product, add to cart, hit checkout. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.

Check:
- Redirect back to `/checkout/success` ✅
- `orders` table in Supabase has a new row with `status = 'paid'` ✅
- `products.stock_level` for the item you bought decreased by the quantity ✅
- `supplier_orders` table has a new row routing the order to a wholesale supplier ✅
- Cart is empty ✅

If any of those fail, check the terminal running `pnpm stripe:listen` — it prints every webhook delivery and response code.

Admin dashboard: `http://localhost:3000/admin`

---

## 5. Push to GitHub → Deploy to Vercel (5 min)

Three ways to deploy — pick one.

### Option A — one command on your laptop

With `.env.local` filled from §2–§3 (add `SUPABASE_DB_PASSWORD` too):

```bash
chmod +x scripts/deploy.sh   # first time only
./scripts/deploy.sh
```

Applies all 5 migrations via `psql`, pushes env vars to Vercel, deploys production,
creates the Stripe webhook, redeploys with the webhook secret, and smoke-tests
the URL. Idempotent. Phase flags: `--migrate`, `--deploy`, `--smoke-only`.

### Option B — automated on every push to `main`

`.github/workflows/deploy.yml` runs migrations + deploys on every push.
Configure these **GitHub repo secrets** (Settings → Secrets and variables → Actions):
- `SUPABASE_DB_URL` — `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`
- `VERCEL_TOKEN` — from https://vercel.com/account/tokens
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — from `.vercel/project.json` after
  `npx vercel link` locally.

App runtime env (Supabase + Stripe keys) goes in the **Vercel project**
Environment Variables; `vercel pull` fetches them during the build.

### Option C — manual click-through

```bash
git init
git add .
git commit -m "Initial Herbi commit"
gh repo create herbi --private --source=. --push
```

Then on Vercel:

1. **Add New → Project** → pick the `herbi` repo.
2. Framework preset: Next.js (auto-detected).
3. Under **Environment Variables**, add every key from `.env.example`.
4. **Deploy**.

---

## 6. Connect the production Stripe webhook (2 min)

Once Vercel gives you a URL (e.g. `herbi-abc123.vercel.app`):

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://<your-vercel-url>/api/webhooks/stripe`
3. Events to send: `checkout.session.completed`
4. Add endpoint → click it → **Reveal signing secret** → copy
5. Back in Vercel → Project Settings → Environment Variables → update `STRIPE_WEBHOOK_SECRET`
6. Redeploy

---

## 7. Custom domain (optional)

1. Vercel → Project Settings → Domains → Add your domain
2. Follow DNS instructions
3. Update `NEXT_PUBLIC_SITE_URL` and the Stripe webhook URL
4. Redeploy

---

## 8. Going live (flipping out of Stripe test mode)

1. Stripe: toggle to **Live mode**. Grab new `sk_live_` / `pk_live_` keys.
2. Create a new webhook endpoint in Live mode.
3. In Vercel, update `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
4. Redeploy.

---

## AI-Powered Intermediary Platform

This storefront operates as a **smart middleman** between customers and wholesale suppliers:

```
Customer → Herbi (your brand) → Wholesale Supplier → Customer
```

You never hold inventory. The platform handles pricing, order routing, and margin tracking automatically.

### How it works

1. **Product Aggregator** — Products in Supabase link to a `supplier_id` and carry `wholesale_cost_cents` alongside `price_cents` (your retail price).
2. **Margin Engine** (`lib/margin-engine.ts`) — Calculates gross margin on every product. `suggestOptimalPrice(wholesaleCost, targetPct)` prices to hit a target margin. Supplier candidates ranked 60% cost / 40% reliability.
3. **Order Router** (`lib/order-router.ts`) — After every successful Stripe checkout, the webhook automatically routes the order to the correct wholesale supplier by inserting a `supplier_orders` row and (optionally) calling the supplier's API.
4. **Real-time Sync** (`POST /api/suppliers/sync`) — Suppliers call this endpoint to push live stock levels and updated wholesale costs. Bearer token auth, Zod-validated.
5. **Analytics Dashboard** (`/admin`) — Tracks revenue, wholesale cost, gross profit, and margin % day-by-day. No inventory or warehouse needed — profit comes from the price difference.

### Admin dashboard routes

| Route | What it shows |
|---|---|
| `/admin` | Daily revenue, profit, margin %, supplier count, order count |
| `/admin/suppliers` | All wholesale partners, per-supplier margin avg and reliability |
| `/admin/orders` | Customer orders with routing status (unrouted / pending / shipped) |

### API reference (server-only)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/metrics` | Last 30 days of platform metrics |
| `GET / POST` | `/api/admin/suppliers` | List or create wholesale suppliers |
| `POST` | `/api/suppliers/sync` | Supplier stock + cost sync (auth: Bearer) |

> 🔒 Protect `/api/admin/*` and `/admin` behind auth middleware before going to production. See the [Next.js middleware docs](https://nextjs.org/docs/app/building-your-application/routing/middleware) for a simple session-based approach.

### Money flow example

```
Customer pays    $34.00  (retail price)
Platform pays    $23.80  (wholesale cost — 70% of retail)
─────────────────────────
Your profit      $10.20  (30% margin)
```

The `platform_metrics_daily` Supabase view aggregates these numbers automatically across all paid orders.

---

## Architecture notes

- **Server-first rendering.** Homepage, shop, and PDPs read from Supabase on the server. Cached 60s (`revalidate = 60`).
- **Cart is local-first.** Zustand + localStorage. Never sent to the server until checkout.
- **Checkout is server-authoritative.** Server Action re-fetches prices from Supabase before creating the Stripe session. Client-sent prices are never trusted.
- **Webhook is idempotent.** Unique constraint on `stripe_session_id` + `ON CONFLICT` handling means Stripe retries can't create duplicate orders.
- **Stock decrement is atomic.** SECURITY DEFINER PL/pgSQL function with `stock_level >= p_qty` guard prevents race conditions.
- **Order routing is non-blocking.** Supplier routing happens after the order insert; a routing failure logs a warning but never fails the webhook response.
- **Service role is isolated.** Only `lib/supabase/admin.ts` imports the service role key, used only from the webhook and admin API routes.

## Operational checklist

- [ ] All 5 Supabase migrations applied
- [ ] Supabase daily backups enabled (Settings → Database → Backups)
- [ ] Vercel analytics enabled
- [ ] Stripe email receipts configured
- [ ] Custom domain DNS verified with SSL active
- [ ] `NEXT_PUBLIC_SITE_URL` matches production domain exactly
- [ ] First live-mode order placed, routed to supplier, confirmed in `/admin/orders`
- [ ] `/api/admin/*` and `/admin` protected behind auth middleware

## Next steps

- **Admin auth**: add NextAuth or Supabase Auth session check in a middleware protecting `/admin`
- **Supplier notifications**: wire real supplier API endpoints in the `api_endpoint` column
- **Product sync**: have suppliers call `POST /api/suppliers/sync` on a schedule
- **Email**: Resend + React Email for branded order confirmations
- **Analytics**: PostHog or Plausible for conversion tracking
