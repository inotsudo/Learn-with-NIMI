-- 099: Fix RWF annual plan pricing for parity with USD/EUR savings rate
-- USD annual saves 33% vs monthly ($179.88 → $119.99)
-- EUR annual saves 34% vs monthly (€167.88 → €109.99)
-- RWF annual was only saving 17% (118,800 → 99,000) — corrected to 33%
-- 9,900 × 12 = 118,800 → 79,900 RWF annual ≈ 33% savings (nice round number)

UPDATE products
SET price_rwf = 79900
WHERE slug = 'nimipiko-club-annual';
