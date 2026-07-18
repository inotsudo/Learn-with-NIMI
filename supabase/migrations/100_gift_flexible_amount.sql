-- 100: Make gift subscriptions amount-based (not product-tied)
-- Givers now enter any amount they want; product_id becomes optional.
-- gift_amount + gift_currency record exactly what the giver chose to spend.

ALTER TABLE gift_subscriptions
  ADD COLUMN IF NOT EXISTS gift_amount  numeric,
  ADD COLUMN IF NOT EXISTS gift_currency text;

-- Existing rows keep their product_id; new rows may have product_id = null
ALTER TABLE gift_subscriptions
  ALTER COLUMN product_id DROP NOT NULL;
