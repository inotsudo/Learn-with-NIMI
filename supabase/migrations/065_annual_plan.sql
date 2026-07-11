-- 065: Add NIMIPIKO Club Annual product
-- Annual plan gives 2 months free vs monthly ($14.99 × 12 = $179.88/yr; annual = $119.99)
-- In RWF: 9,900 × 10 = 99,000 (round number, good UX)

INSERT INTO products (
  slug, name, description, tier, product_type,
  price_usd, price_rwf,
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
  99000,
  'year',
  (SELECT features FROM products WHERE slug = 'nimipiko-club'),
  true,
  5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'nimipiko-club-annual');
