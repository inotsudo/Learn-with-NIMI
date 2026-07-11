-- 067: Discount / promo code system
-- Admins create codes; parents apply them at checkout for a % or fixed discount.

CREATE TABLE IF NOT EXISTS discount_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  description     text,
  -- Discount type: 'percent' (0–100) or 'fixed' (amount in USD)
  discount_type   text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  numeric(10,2) NOT NULL,
  -- Applicability
  applies_to      text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'club', 'annual')),
  max_uses        int,          -- NULL = unlimited
  uses_count      int NOT NULL DEFAULT 0,
  -- Validity window
  valid_from      timestamptz NOT NULL DEFAULT now(),
  valid_until     timestamptz,  -- NULL = never expires
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Track who used what code
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id     uuid NOT NULL REFERENCES discount_codes(id),
  parent_id   uuid NOT NULL REFERENCES parents(id),
  order_id    uuid REFERENCES orders(id),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, parent_id) -- one use per parent per code
);

ALTER TABLE discount_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_redemptions  ENABLE ROW LEVEL SECURITY;

-- Public can read active codes (needed for validation at checkout)
CREATE POLICY "public_read_active_codes" ON discount_codes
  FOR SELECT USING (is_active = true AND now() BETWEEN valid_from AND COALESCE(valid_until, now() + interval '100 years'));

-- Service role handles all writes

-- Atomic increment so concurrent redemptions don't race
CREATE OR REPLACE FUNCTION increment_discount_uses(code_id_param uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE discount_codes SET uses_count = uses_count + 1 WHERE id = code_id_param;
$$;
