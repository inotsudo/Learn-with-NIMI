-- 097: Set EUR prices for all active products
-- Eurozone pricing: ~7% below USD (in line with typical EU SaaS pricing)
-- Club monthly: €13.99 (was set in 054, unchanged by 056 — confirmed correct)
-- Masterpiece: €27.99 (was set in 054, unchanged by 056 — confirmed correct)
-- Club annual: €109.99 (new — 065 didn't set price_eur)

UPDATE products
SET price_eur = 109.99
WHERE slug = 'nimipiko-club-annual'
  AND (price_eur IS NULL OR price_eur = 0);

-- Ensure monthly and masterpiece EUR values are confirmed at intended amounts
UPDATE products SET price_eur = 13.99 WHERE slug = 'nimipiko-club';
UPDATE products SET price_eur = 27.99 WHERE slug = 'masterpiece';
