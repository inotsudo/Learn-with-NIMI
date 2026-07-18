-- 103: Restore nimipiko-club-annual product (was missing from remote DB)
-- USD $119.99/yr (vs $14.99/mo × 12 = $179.88 — saves ~33%)
-- EUR €109.99/yr (vs €13.99/mo × 12 = €167.88)
-- RWF 79,900/yr  (vs 9,900/mo × 12 = 118,800  — saves ~33%)

INSERT INTO products (
  slug, name, description, tier, product_type,
  price_usd, price_eur, price_rwf,
  billing_interval,
  features, is_active, sort_order
)
SELECT
  'nimipiko-club-annual',
  'Nimipiko Club (Annual)',
  'All-access membership billed yearly — save 33% vs monthly',
  'club',
  'subscription',
  119.99,
  109.99,
  79900,
  'year',
  (SELECT features FROM products WHERE slug = 'nimipiko-club'),
  true,
  5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'nimipiko-club-annual');
