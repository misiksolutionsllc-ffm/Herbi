-- Herbi seed products ──────────────────────────
INSERT INTO products (slug, name, description, price_cents, stock_level, images, metadata) VALUES
('calm-tincture',
 'Calm Tincture',
 'A slow-drawn botanical extract of ashwagandha, passionflower and lemon balm. Water-based. No alcohol. Ten drops under the tongue at dusk.',
 3400, 48,
 ARRAY['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200&q=80'],
 '{"volume_ml":30,"origin":"Vermont"}'::jsonb),

('forest-balm',
 'Forest Balm',
 'Whipped shea and tamanu with cedar and fir. For dry hands, tired joints, the first minute after a long bath.',
 2800, 62,
 ARRAY['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1200&q=80'],
 '{"volume_ml":60,"origin":"Maine"}'::jsonb),

('morning-tea-no-1',
 'Morning Tea №1',
 'Loose-leaf green tea, roasted chicory, cardamom. Caffeine forward, softly bitter. Brews thirty-six cups.',
 2200, 95,
 ARRAY['https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=1200&q=80'],
 '{"weight_g":80,"origin":"Oregon"}'::jsonb),

('cedar-soap',
 'Cedar Bar',
 'Cold-pressed olive and coconut, cedar essential oil, activated charcoal. Cures ninety days on open pine shelves. Hand-cut.',
 1600, 140,
 ARRAY['https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=1200&q=80'],
 '{"weight_g":120,"origin":"Washington"}'::jsonb),

('mineral-salt',
 'Mineral Bath Salt',
 'Unrefined sea salt, magnesium flakes, dried rose. One handful per bath. Fifteen minutes, water just past warm.',
 2600, 80,
 ARRAY['https://images.unsplash.com/photo-1602528915797-7ac3baf01b69?w=1200&q=80'],
 '{"weight_g":500,"origin":"Portugal"}'::jsonb),

('linen-spray',
 'Sleep Linen Spray',
 'Distilled water, lavender hydrosol, a whisper of vetiver. Mist the pillow. Turn the lights off.',
 2400, 70,
 ARRAY['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=1200&q=80'],
 '{"volume_ml":100,"origin":"Provence"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
