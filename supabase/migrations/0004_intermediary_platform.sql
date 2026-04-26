-- ───────────────────────────────────────────────
-- Herbi — AI Intermediary Platform Extension
-- Adds: suppliers, wholesale cost tracking on products,
--       supplier_orders (order routing), daily metrics view
-- ───────────────────────────────────────────────

-- Suppliers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id                uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text    NOT NULL,
  contact_email     text,
  api_endpoint      text,
  api_key_hash      text,
  reliability_score numeric(3,2) NOT NULL DEFAULT 1.00
                    CHECK (reliability_score BETWEEN 0 AND 1),
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_active_idx
  ON suppliers (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS suppliers_set_updated_at ON suppliers;
CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add wholesale cost + supplier FK to products ──
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wholesale_cost_cents integer
    CHECK (wholesale_cost_cents >= 0),
  ADD COLUMN IF NOT EXISTS supplier_id uuid
    REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_supplier_idx
  ON products (supplier_id);

-- Supplier orders ────────────────────────────────
-- One row per customer order forwarded to a supplier.
CREATE TABLE IF NOT EXISTS supplier_orders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES suppliers(id),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','shipped','delivered','failed')),
  tracking_number text,
  routed_at       timestamptz DEFAULT now(),
  confirmed_at    timestamptz,
  shipped_at      timestamptz,
  notes           text
);

CREATE INDEX IF NOT EXISTS supplier_orders_order_idx
  ON supplier_orders (order_id);
CREATE INDEX IF NOT EXISTS supplier_orders_supplier_idx
  ON supplier_orders (supplier_id);
CREATE INDEX IF NOT EXISTS supplier_orders_status_idx
  ON supplier_orders (status);

-- RLS for new tables ─────────────────────────────
-- Only service role (webhook/admin API) can access these tables.
ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;

-- Daily platform metrics view ────────────────────
-- Aggregates revenue, wholesale cost, and gross profit by calendar day.
DROP VIEW IF EXISTS platform_metrics_daily;
CREATE VIEW platform_metrics_daily AS
SELECT
  date_trunc('day', o.created_at)::date  AS day,
  COUNT(DISTINCT o.id)::int              AS order_count,
  COALESCE(SUM(o.amount_total), 0)::int  AS revenue_cents,
  COALESCE(
    SUM((
      SELECT COALESCE(SUM(
        CASE
          WHEN p.wholesale_cost_cents IS NOT NULL
          THEN p.wholesale_cost_cents * (item->>'quantity')::int
          ELSE 0
        END
      ), 0)
      FROM   jsonb_array_elements(o.items) AS item
      JOIN   products p ON p.slug = item->>'slug'
    )), 0
  )::int                                 AS wholesale_cost_cents,
  (
    COALESCE(SUM(o.amount_total), 0) -
    COALESCE(
      SUM((
        SELECT COALESCE(SUM(
          CASE
            WHEN p.wholesale_cost_cents IS NOT NULL
            THEN p.wholesale_cost_cents * (item->>'quantity')::int
            ELSE 0
          END
        ), 0)
        FROM   jsonb_array_elements(o.items) AS item
        JOIN   products p ON p.slug = item->>'slug'
      )), 0
    )
  )::int                                 AS profit_cents
FROM  orders o
WHERE o.status = 'paid'
GROUP BY 1
ORDER BY 1 DESC;
