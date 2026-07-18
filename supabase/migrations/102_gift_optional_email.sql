-- 102: Make recipient_email optional on gift_subscriptions
-- Givers may not know the recipient's email and prefer to share the code
-- themselves via WhatsApp or in person.

ALTER TABLE gift_subscriptions
  ALTER COLUMN recipient_email DROP NOT NULL;
