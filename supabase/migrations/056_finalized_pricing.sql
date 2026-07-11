-- Finalized pricing: geo-based
-- International: $14.99/mo, Masterpiece $29.99
-- Rwanda local: 9,900 RWF/mo, Masterpiece 40,000 RWF
UPDATE products SET price_usd = 14.99, price_rwf = 9900 WHERE slug = 'nimipiko-club';
UPDATE products SET price_usd = 29.99, price_rwf = 40000 WHERE slug = 'masterpiece';
