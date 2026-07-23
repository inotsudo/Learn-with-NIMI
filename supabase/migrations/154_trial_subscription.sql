-- 154: 7-day free trial for new parent accounts
-- Fires automatically on parents INSERT (first signup only — upsert on
-- existing rows fires UPDATE, not INSERT, so no double-trial risk).

-- ── 1. Allow 'trial' as a payment provider ───────────────────────────────────
ALTER TABLE nimipiko_subscriptions
  DROP CONSTRAINT IF EXISTS nimipiko_subscriptions_payment_provider_check;

ALTER TABLE nimipiko_subscriptions
  ADD CONSTRAINT nimipiko_subscriptions_payment_provider_check
  CHECK (payment_provider IN ('cybersource', 'mtn_momo', 'admin_grant', 'trial'));

-- ── 2. Function: create a 7-day trial subscription ───────────────────────────
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sub_id     uuid;
  v_period_end timestamptz := now() + interval '7 days';
BEGIN
  -- Guard: skip if this parent already has any subscription (re-insert edge case)
  IF EXISTS (
    SELECT 1 FROM nimipiko_subscriptions WHERE parent_id = NEW.id LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO nimipiko_subscriptions (
    parent_id, product_id, status, currency, amount,
    billing_interval, current_period_start, current_period_end,
    payment_provider, cancel_at_period_end
  ) VALUES (
    NEW.id, NULL, 'active', 'USD', 0,
    'trial', now(), v_period_end,
    'trial', TRUE
  )
  RETURNING id INTO v_sub_id;

  INSERT INTO content_access (parent_id, access_type, story_id, subscription_id)
  VALUES (NEW.id, 'club', NULL, v_sub_id);

  RETURN NEW;
END;
$$;

-- ── 3. Trigger on new parent row ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_parent_created_trial ON parents;

CREATE TRIGGER on_parent_created_trial
  AFTER INSERT ON parents
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

-- ── 4. Expire stale trial subscriptions ──────────────────────────────────────
-- Called by the daily cron; safe to call any time.
CREATE OR REPLACE FUNCTION expire_trial_subscriptions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE nimipiko_subscriptions
  SET status = 'expired'
  WHERE payment_provider = 'trial'
    AND status = 'active'
    AND current_period_end < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
