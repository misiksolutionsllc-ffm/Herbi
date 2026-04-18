-- ───────────────────────────────────────────────
-- Herbi — Initial schema
-- ───────────────────────────────────────────────

-- Products ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  images text[] DEFAULT '{}',
  stock_level integer NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_slug_idx ON products (slug);
CREATE INDEX IF NOT EXISTS products_active_idx ON products (is_active) WHERE is_active = true;

-- updated_at trigger ────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Orders ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email text,
  stripe_session_id text UNIQUE NOT NULL,
  stripe_payment_intent_id text,
  status text NOT NULL CHECK (status IN ('pending','paid','shipped','refunded','failed')) DEFAULT 'pending',
  amount_total integer NOT NULL CHECK (amount_total >= 0),
  currency text NOT NULL DEFAULT 'usd',
  items jsonb NOT NULL,
  shipping_address jsonb
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_stripe_session_idx ON orders (stripe_session_id);

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS ───────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Anyone can read active products
DROP POLICY IF EXISTS "public_read_active_products" ON products;
CREATE POLICY "public_read_active_products" ON products
  FOR SELECT USING (is_active = true);

-- Users see only their own orders (guests read via service role in webhook)
DROP POLICY IF EXISTS "user_read_own_orders" ON orders;
CREATE POLICY "user_read_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- NOTE: no INSERT/UPDATE policies for clients. All writes go through the
-- Stripe webhook using the service role key, which bypasses RLS.

-- Atomic stock decrement ────────────────────────
-- Called from the webhook. SECURITY DEFINER + strict CHECK guarantee
-- two concurrent orders for the last unit can't both succeed.
CREATE OR REPLACE FUNCTION decrement_stock(p_slug text, p_qty integer)
RETURNS products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result products;
BEGIN
  UPDATE products
     SET stock_level = stock_level - p_qty
   WHERE slug = p_slug
     AND stock_level >= p_qty
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'insufficient_stock:%', p_slug;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION decrement_stock(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_stock(text, integer) TO service_role;
