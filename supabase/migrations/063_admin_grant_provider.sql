-- Allow admin-granted subscriptions (for support cases and school pilots)
ALTER TABLE nimipiko_subscriptions
  DROP CONSTRAINT IF EXISTS nimipiko_subscriptions_payment_provider_check;

ALTER TABLE nimipiko_subscriptions
  ADD CONSTRAINT nimipiko_subscriptions_payment_provider_check
  CHECK (payment_provider IN ('cybersource', 'mtn_momo', 'admin_grant'));

-- Also allow null product_id for admin grants (no product lookup needed)
ALTER TABLE nimipiko_subscriptions
  ALTER COLUMN product_id DROP NOT NULL;
