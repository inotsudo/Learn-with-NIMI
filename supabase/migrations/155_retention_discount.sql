-- 155: Seed STAY20 retention discount code
-- Used in the cancel win-back flow: /pricing?code=STAY20
-- 20% off, unlimited uses, no expiry, applies to monthly Club only.

INSERT INTO discount_codes (
  code,
  description,
  discount_type,
  discount_value,
  applies_to,
  max_uses,
  uses_count,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'STAY20',
  '20% off for members who were about to cancel — retention offer',
  'percent',
  20,
  'club',
  NULL,   -- unlimited uses
  0,
  now(),
  NULL,   -- no expiry
  true
)
ON CONFLICT (code) DO NOTHING;
