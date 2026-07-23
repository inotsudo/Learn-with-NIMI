-- Allow 'admin_grant' as a valid payment_provider and make product_id nullable
-- (migration 063 defined these changes but was never applied to the live DB)

ALTER TABLE nimipiko_subscriptions
  DROP CONSTRAINT IF EXISTS nimipiko_subscriptions_payment_provider_check;

ALTER TABLE nimipiko_subscriptions
  ADD CONSTRAINT nimipiko_subscriptions_payment_provider_check
  CHECK (payment_provider IN ('cybersource', 'mtn_momo', 'admin_grant'));

ALTER TABLE nimipiko_subscriptions
  ALTER COLUMN product_id DROP NOT NULL;
