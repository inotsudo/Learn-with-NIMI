-- ═══════════════════════════════════════════════════════════
-- Masterpiece Personalization System
-- ═══════════════════════════════════════════════════════════

-- Which stories support personalization + photo placement config
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_personalizable boolean DEFAULT false;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS personalization_config jsonb DEFAULT '{}'::jsonb;

-- Personalization orders — tracks each masterpiece purchase
CREATE TABLE IF NOT EXISTS masterpiece_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  parent_id uuid NOT NULL REFERENCES parents(id),
  child_id uuid NOT NULL REFERENCES children(id),
  story_id uuid NOT NULL REFERENCES stories(id),
  child_name text NOT NULL,
  child_photo_url text,
  language text NOT NULL DEFAULT 'en',
  -- Generated PDF
  pdf_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE masterpiece_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents see own masterpieces" ON masterpiece_orders FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents can create masterpieces" ON masterpiece_orders FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_masterpiece_parent ON masterpiece_orders(parent_id);
CREATE INDEX IF NOT EXISTS idx_masterpiece_status ON masterpiece_orders(status);
