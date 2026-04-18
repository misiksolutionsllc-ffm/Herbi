-- ───────────────────────────────────────────────
-- Atomic batch stock decrement
-- ───────────────────────────────────────────────
-- Called from the Stripe webhook. Wraps every cart line in a single
-- transaction: either every line succeeds or the whole call raises, so
-- inventory can't be left partially decremented if one item is out of
-- stock between checkout and webhook delivery.
--
-- p_items shape: [{"slug":"cedar-soap","qty":2}, ...]

CREATE OR REPLACE FUNCTION decrement_stock_batch(p_items jsonb)
RETURNS SETOF products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  updated products;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE products
       SET stock_level = stock_level - (item->>'qty')::int
     WHERE slug = item->>'slug'
       AND stock_level >= (item->>'qty')::int
    RETURNING * INTO updated;

    IF updated.id IS NULL THEN
      RAISE EXCEPTION 'insufficient_stock:%', item->>'slug';
    END IF;

    RETURN NEXT updated;
  END LOOP;
  RETURN;
 END;
$$;

REVOKE ALL ON FUNCTION decrement_stock_batch(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_stock_batch(jsonb) TO service_role;
