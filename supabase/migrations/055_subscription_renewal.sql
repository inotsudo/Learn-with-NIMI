-- ═══════════════════════════════════════════════════════════
-- Subscription renewal support
-- - Saved payment methods for auto-charge
-- - Renewal history tracking
-- ═══════════════════════════════════════════════════════════

-- Saved payment methods (CyberSource token or MoMo phone)
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id),
  provider text NOT NULL CHECK (provider IN ('cybersource','mtn_momo')),
  -- CyberSource: instrument identifier from TMS
  token text,
  -- MoMo: phone number
  phone_number text,
  -- Card display info (last 4, brand)
  card_last4 text,
  card_brand text,
  -- Status
  is_default boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Renewal history
CREATE TABLE IF NOT EXISTS subscription_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES nimipiko_subscriptions(id),
  payment_method_id uuid REFERENCES payment_methods(id),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','skipped')),
  provider_transaction_id text,
  attempt_number int DEFAULT 1,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Add payment method ref to subscriptions
ALTER TABLE nimipiko_subscriptions ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id);
ALTER TABLE nimipiko_subscriptions ADD COLUMN IF NOT EXISTS grace_ends_at timestamptz;
ALTER TABLE nimipiko_subscriptions ADD COLUMN IF NOT EXISTS renewal_attempts int DEFAULT 0;

-- RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents see own payment methods" ON payment_methods FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents can add payment methods" ON payment_methods FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Renewals visible to own parent" ON subscription_renewals FOR SELECT
  USING (subscription_id IN (SELECT id FROM nimipiko_subscriptions WHERE parent_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pm_parent ON payment_methods(parent_id);
CREATE INDEX IF NOT EXISTS idx_subs_period_end ON nimipiko_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_renewals_sub ON subscription_renewals(subscription_id);
