-- Seed two wholesale suppliers and link existing products
-- Run after 0004_intermediary_platform.sql

INSERT INTO suppliers (id, name, contact_email, reliability_score, notes)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Vermont Botanicals Co.',
   'orders@vermontbotanicals.example',
   0.97,
   'Primary US supplier — tinctures, balms, mineral goods'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901',
   'Pacific Naturals Ltd.',
   'wholesale@pacificnaturals.example',
   0.92,
   'West coast supplier — teas, soaps, linen sprays')
ON CONFLICT (id) DO NOTHING;

-- Link products to suppliers and record wholesale cost (~70% of retail)
UPDATE products SET
  supplier_id         = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  wholesale_cost_cents = 2380
WHERE slug = 'calm-tincture';

UPDATE products SET
  supplier_id          = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  wholesale_cost_cents = 1960
WHERE slug = 'forest-balm';

UPDATE products SET
  supplier_id          = 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  wholesale_cost_cents = 1540
WHERE slug = 'morning-tea-no-1';

UPDATE products SET
  supplier_id          = 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  wholesale_cost_cents = 1120
WHERE slug = 'cedar-soap';

UPDATE products SET
  supplier_id          = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  wholesale_cost_cents = 1820
WHERE slug = 'mineral-salt';

UPDATE products SET
  supplier_id          = 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  wholesale_cost_cents = 1680
WHERE slug = 'linen-spray';
