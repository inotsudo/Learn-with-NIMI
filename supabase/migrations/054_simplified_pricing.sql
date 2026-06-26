-- ═══════════════════════════════════════════════════════════
-- Simplified Two-Pillar Pricing
-- Pillar 1: Nimipiko Club ($14.99/mo) — full access
-- Pillar 2: Masterpiece ($29.99) — personalized hero story
-- ═══════════════════════════════════════════════════════════

-- Deactivate old products
UPDATE products SET is_active = false WHERE slug NOT IN ('nimipiko-club', 'masterpiece');

-- Upsert the two pillars
INSERT INTO products (slug, name, description, tier, product_type, price_usd, price_eur, price_rwf, billing_interval, features, sort_order, is_active)
VALUES
(
  'nimipiko-club',
  'Nimipiko Club',
  'Full access to the Nimipiko Learning Universe',
  'club',
  'subscription',
  14.99, 13.99, 19000,
  'month',
  '["all_stories","all_languages","nimi_ai","challenges","community","unlimited_updates","coloring_books","songs","certificates"]'::jsonb,
  1,
  true
),
(
  'masterpiece',
  'Masterpiece',
  'Your child becomes the hero of their own story',
  'personalized',
  'one_time',
  29.99, 27.99, 38000,
  null,
  '["personalized_story","child_photo_in_book","personalized_pdf","champion_certificate","keepsake_memory"]'::jsonb,
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  product_type = EXCLUDED.product_type,
  price_usd = EXCLUDED.price_usd,
  price_eur = EXCLUDED.price_eur,
  price_rwf = EXCLUDED.price_rwf,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Future-proof: add org_type column for B2B school licensing
ALTER TABLE products ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'family' CHECK (org_type IN ('family','school','enterprise'));
