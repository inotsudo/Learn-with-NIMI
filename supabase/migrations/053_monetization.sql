-- ═══════════════════════════════════════════════════════════
-- Nimipiko Monetization Schema
-- Tiers: Discovery (free), Story Pack, Family Bundle,
--        Personalized Hero, Champion Pack, Nimipiko Club
-- Providers: CyberSource (Visa/MC/Amex), MTN MoMo (RWF)
-- ═══════════════════════════════════════════════════════════

-- ── Product catalog ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  tier text NOT NULL CHECK (tier IN ('discovery','story_pack','family_bundle','personalized','champion_pack','club')),
  product_type text NOT NULL DEFAULT 'one_time' CHECK (product_type IN ('one_time','subscription')),
  -- Prices in 3 currencies
  price_usd numeric(10,2),
  price_eur numeric(10,2),
  price_rwf numeric(10,0),
  -- Subscription billing
  billing_interval text CHECK (billing_interval IN ('month','year')),
  -- What's included (JSON array of feature keys)
  features jsonb DEFAULT '[]'::jsonb,
  -- Links to story if it's a story pack
  story_id uuid REFERENCES stories(id),
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── Orders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id),
  child_id uuid REFERENCES children(id),
  product_id uuid NOT NULL REFERENCES products(id),
  -- Pricing at time of purchase
  currency text NOT NULL CHECK (currency IN ('USD','EUR','RWF')),
  amount numeric(10,2) NOT NULL,
  -- Payment
  payment_provider text NOT NULL CHECK (payment_provider IN ('cybersource','mtn_momo','free')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','processing','completed','failed','refunded')),
  payment_ref text,
  provider_transaction_id text,
  -- Metadata
  personalization_data jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ── Subscriptions (Nimipiko Club) ──────────────────────────
CREATE TABLE IF NOT EXISTS nimipiko_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id),
  product_id uuid NOT NULL REFERENCES products(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due')),
  currency text NOT NULL CHECK (currency IN ('USD','EUR','RWF')),
  amount numeric(10,2) NOT NULL,
  billing_interval text NOT NULL DEFAULT 'month',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  payment_provider text NOT NULL CHECK (payment_provider IN ('cybersource','mtn_momo')),
  provider_subscription_id text,
  created_at timestamptz DEFAULT now()
);

-- ── Content access (what has been unlocked) ────────────────
CREATE TABLE IF NOT EXISTS content_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parents(id),
  -- What's unlocked
  access_type text NOT NULL CHECK (access_type IN ('story','bundle','challenge_pack','club','personalized')),
  story_id uuid REFERENCES stories(id),
  -- Source
  order_id uuid REFERENCES orders(id),
  subscription_id uuid REFERENCES nimipiko_subscriptions(id),
  -- Validity
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_parent ON orders(parent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_subs_parent ON nimipiko_subscriptions(parent_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON nimipiko_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_access_parent ON content_access(parent_id);
CREATE INDEX IF NOT EXISTS idx_access_story ON content_access(story_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE nimipiko_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are readable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Orders visible to own parent" ON orders FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents can create orders" ON orders FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "Subscriptions visible to own parent" ON nimipiko_subscriptions FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Access visible to own parent" ON content_access FOR SELECT USING (parent_id = auth.uid());

-- ── Seed default products ──────────────────────────────────
INSERT INTO products (slug, name, description, tier, product_type, price_usd, price_eur, price_rwf, features, sort_order) VALUES
(
  'discovery-free',
  'Discovery',
  'Experience the magic of Nimipiko for free',
  'discovery',
  'one_time',
  0, 0, 0,
  '["animated_song","story_preview","character_intro","first_challenge"]'::jsonb,
  1
),
(
  'story-pack',
  'Story Pack',
  'One complete story adventure with all activities',
  'story_pack',
  'one_time',
  9.99, 8.99, 3000,
  '["full_story","audio_narration","three_languages","song","coloring_book","vocabulary","champion_challenges"]'::jsonb,
  2
),
(
  'family-bundle',
  'Family Bundle',
  'Multiple stories and challenges for the whole family',
  'family_bundle',
  'one_time',
  19.99, 17.99, 5000,
  '["multiple_stories","multiple_challenges","community_access","extra_content"]'::jsonb,
  3
),
(
  'personalized-hero',
  'Personalized Hero Story',
  'Your child becomes the hero of the story',
  'personalized',
  'one_time',
  29.99, 26.99, 10000,
  '["everything_in_bundle","child_photo_in_story","personalized_pdf","champion_certificate","treasure_gallery"]'::jsonb,
  4
),
(
  'champion-pack',
  'Champion Challenge Pack',
  'Extra challenges, badges, stickers and certificates',
  'champion_pack',
  'one_time',
  4.99, 4.49, 1500,
  '["champion_challenges","badges","stickers","certificates","treasure_gallery"]'::jsonb,
  5
),
(
  'nimipiko-club-monthly',
  'Nimipiko Club',
  'New stories, songs, challenges and rewards every month',
  'club',
  'subscription',
  9.99, 8.99, 3000,
  '["new_stories","new_songs","new_challenges","new_coloring","new_rewards","community_features","future_nimi_ai"]'::jsonb,
  6
)
ON CONFLICT (slug) DO NOTHING;
