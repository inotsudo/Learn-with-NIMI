-- Atomically provisions a subscription: payment_method + nimipiko_subscriptions + content_access
-- in a single transaction. Prevents orphaned subscriptions (charged but no access) or orphaned
-- access rows (access granted but subscription not recorded) when individual inserts fail mid-flight.

CREATE OR REPLACE FUNCTION provision_subscription(
  p_parent_id        uuid,
  p_product_id       uuid,
  p_order_id         uuid,
  p_provider         text,
  p_token            text,       -- CyberSource customer token (null for MoMo)
  p_phone            text,       -- MoMo phone number (null for CyberSource)
  p_amount           numeric,
  p_currency         text,
  p_billing_interval text,       -- 'month' | 'year'
  p_period_start     timestamptz,
  p_period_end       timestamptz,
  p_access_type      text,
  p_story_id         uuid        -- null for non-story access types
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pm_id  uuid;
  v_sub_id uuid;
BEGIN
  INSERT INTO payment_methods (parent_id, provider, token, phone_number, is_default, is_active)
  VALUES (p_parent_id, p_provider, p_token, p_phone, true, true)
  RETURNING id INTO v_pm_id;

  INSERT INTO nimipiko_subscriptions (
    parent_id, product_id, status, currency, amount, billing_interval,
    current_period_start, current_period_end, payment_provider, payment_method_id
  ) VALUES (
    p_parent_id, p_product_id, 'active', p_currency, p_amount, p_billing_interval,
    p_period_start, p_period_end, p_provider, v_pm_id
  ) RETURNING id INTO v_sub_id;

  INSERT INTO content_access (parent_id, access_type, story_id, order_id, subscription_id)
  VALUES (p_parent_id, p_access_type, p_story_id, p_order_id, v_sub_id);

  RETURN jsonb_build_object(
    'payment_method_id', v_pm_id,
    'subscription_id',   v_sub_id
  );
END;
$$;
