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
3. Go to **SQL Editor → New query**. Paste the contents of `supabase/migrations/0001_init.sql`. Run. Then do the same with `0002_seed.sql`. You should see 6 products in **Table Editor → products**.
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
- Cart is empty ✅

If any of those fail, check the terminal running `pnpm stripe:listen` — it prints every webhook delivery and response code.

---

## 5. Push to GitHub → Deploy to Vercel (5 min)

Three ways to deploy — pick one.

### Option A — one command on your laptop

With `.env.local` filled from §2–§3 (add `SUPABASE_DB_PASSWORD` too):

```bash
chmod +x scripts/deploy.sh   # first time only
./scripts/deploy.sh
```

Applies migrations via `psql`, pushes env vars to Vercel, deploys production,
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

### Option C — manual click-through (original flow below)


```bash
git init
git add .
git commit -m "Initial Herbi commit"
gh repo create herbi --private --source=. --push   # or push via GitHub UI
```

Then on Vercel:

1. **Add New → Project** → pick the `herbi` repo.
2. Framework preset: Next.js (auto-detected).
3. Under **Environment Variables**, add every key from `.env.example` (filled in with your real values). Mark these as **Production** + **Preview** + **Development**:
   - `NEXT_PUBLIC_SITE_URL` — set to `https://<your-vercel-url>` (update later if you attach a custom domain)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` *(fill in after step 6)*
4. **Deploy**.

---

## 6. Connect the production Stripe webhook (2 min)

Once Vercel gives you a URL (e.g. `herbi-abc123.vercel.app`):

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://<your-vercel-url>/api/webhooks/stripe`
3. Events to send: `checkout.session.completed`
4. Add endpoint → click it → **Reveal signing secret** → copy
5. Back in Vercel → Project Settings → Environment Variables → update `STRIPE_WEBHOOK_SECRET` with the new value
6. Redeploy (Vercel → Deployments → latest → Redeploy, or push any commit)

Then do one real test checkout on the live URL. Confirm an order appears in Supabase.

---

## 7. Custom domain (optional, 5 min)

1. Vercel → Project Settings → Domains → Add `herbi.shop` (or whatever)
2. Follow DNS instructions (A/CNAME records at your registrar)
3. Once active, update `NEXT_PUBLIC_SITE_URL` env var to the new domain, and update the Stripe webhook URL to match
4. Redeploy

---

## 8. Going live (flipping out of Stripe test mode)

When you're ready:

1. Stripe: toggle to **Live mode**. Grab new `sk_live_` / `pk_live_` keys.
2. Create a new webhook endpoint in Live mode (same URL, new signing secret).
3. In Vercel, update `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` to the live values.
4. Redeploy.

Test with a real card and a small amount. Refund it yourself from the Stripe dashboard.

---

## Architecture notes

- **Server-first rendering.** The homepage, shop, and PDPs all read from Supabase on the server. Cached 60s (`revalidate = 60`).
- **Cart is local-first.** Zustand + localStorage. Persists across sessions, survives refresh. Never sent to the server until checkout.
- **Checkout is server-authoritative.** The Server Action re-fetches product prices from Supabase before creating the Stripe session. Client-sent prices are never trusted.
- **Webhook is idempotent.** Unique constraint on `stripe_session_id` + `ON CONFLICT` handling means Stripe retries can't create duplicate orders.
- **Stock decrement is atomic.** A SECURITY DEFINER PL/pgSQL function with a `stock_level >= p_qty` guard prevents race conditions on the last unit.
- **Service role is isolated.** Only the webhook route imports `lib/supabase/admin`. Everything else uses the anon-keyed, RLS-respecting server client.

## Operational checklist

- [ ] Supabase daily backups enabled (Settings → Database → Backups)
- [ ] Vercel analytics enabled for traffic + web vitals
- [ ] Stripe email receipts configured (Settings → Emails)
- [ ] Custom domain DNS verified with SSL active
- [ ] `NEXT_PUBLIC_SITE_URL` matches your production domain exactly
- [ ] First live-mode order placed, received confirmation, refunded cleanly

## Next steps to consider

- Auth: add `/app/(auth)` routes using `@supabase/ssr` — the clients are already set up
- Inventory admin: a protected `/admin` route with a simple products editor
- Transactional email: swap Stripe's default receipts for something branded (Resend + React Email)
- Search: Supabase full-text search on the `products` table
- Analytics: PostHog or Plausible for conversion tracking
