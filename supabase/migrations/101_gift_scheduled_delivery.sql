-- 101: Scheduled gift delivery
-- send_at: when to send the gift email (null = send immediately on payment)
-- email_sent_at: when the email was actually dispatched (null = not yet sent)

ALTER TABLE gift_subscriptions
  ADD COLUMN IF NOT EXISTS send_at      timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
