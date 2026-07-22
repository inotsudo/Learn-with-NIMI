-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 148: Knowledge Router Cache + Nimipiko Knowledge Articles
--
-- knowledge_router_cache  — stores retrieved + AI-assembled knowledge blobs so
--                           repeated questions skip web search entirely.
--
-- nimipiko_knowledge_articles — curated internal articles auto-generated when
--                               a topic is searched ≥ ARTICLE_THRESHOLD times.
--                               Reviewed before being served as "internal" knowledge.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── knowledge_router_cache ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_router_cache (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_query  text        NOT NULL,
  intent            text        NOT NULL,
  language          text        NOT NULL DEFAULT 'en',
  sources           jsonb       NOT NULL DEFAULT '[]',
  ai_summary        text,
  confidence_score  numeric(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  search_count      integer     NOT NULL DEFAULT 1,
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (normalized_query, language)
);

-- Index for expiry-aware lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_cache_lookup
  ON knowledge_router_cache (normalized_query, language, expires_at);

-- Index for cache maintenance
CREATE INDEX IF NOT EXISTS idx_knowledge_cache_expires
  ON knowledge_router_cache (expires_at);

COMMENT ON TABLE knowledge_router_cache IS
  'Caches assembled knowledge for repeated queries. TTL varies by intent.';

-- ── nimipiko_knowledge_articles ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nimipiko_knowledge_articles (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic                 text        NOT NULL,
  intent                text        NOT NULL,
  language              text        NOT NULL DEFAULT 'en',
  content               text        NOT NULL,
  sources               jsonb       NOT NULL DEFAULT '[]',
  confidence_score      numeric(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  age_min               integer,
  age_max               integer,
  review_status         text        NOT NULL DEFAULT 'pending'
                        CHECK (review_status IN ('pending','approved','rejected')),
  search_trigger_count  integer     NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic, language)
);

CREATE INDEX IF NOT EXISTS idx_nimi_articles_intent
  ON nimipiko_knowledge_articles (intent, language, review_status);

COMMENT ON TABLE nimipiko_knowledge_articles IS
  'Curated internal educational articles auto-generated from frequently-searched topics.';

-- ── RPC: get_cached_knowledge ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_cached_knowledge(
  p_query    text,
  p_language text DEFAULT 'en'
)
RETURNS TABLE (
  id               uuid,
  intent           text,
  sources          jsonb,
  ai_summary       text,
  confidence_score numeric,
  search_count     integer,
  expires_at       timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE knowledge_router_cache
     SET search_count = search_count + 1
   WHERE normalized_query = lower(trim(p_query))
     AND language         = p_language
     AND expires_at       > now()
  RETURNING id, intent, sources, ai_summary, confidence_score, search_count, expires_at;
$$;

-- ── RPC: upsert_cached_knowledge ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_cached_knowledge(
  p_query           text,
  p_intent          text,
  p_language        text,
  p_sources         jsonb,
  p_ai_summary      text,
  p_confidence      numeric,
  p_expires_at      timestamptz
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO knowledge_router_cache
    (normalized_query, intent, language, sources, ai_summary, confidence_score, expires_at)
  VALUES
    (lower(trim(p_query)), p_intent, p_language, p_sources, p_ai_summary, p_confidence, p_expires_at)
  ON CONFLICT (normalized_query, language)
  DO UPDATE SET
    intent           = excluded.intent,
    sources          = excluded.sources,
    ai_summary       = excluded.ai_summary,
    confidence_score = excluded.confidence_score,
    expires_at       = excluded.expires_at,
    search_count     = knowledge_router_cache.search_count + 1;
$$;

-- ── RPC: get_nimipiko_article ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_nimipiko_article(
  p_topic    text,
  p_language text DEFAULT 'en'
)
RETURNS TABLE (
  id               uuid,
  content          text,
  sources          jsonb,
  confidence_score numeric,
  age_min          integer,
  age_max          integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, content, sources, confidence_score, age_min, age_max
    FROM nimipiko_knowledge_articles
   WHERE topic         = lower(trim(p_topic))
     AND language      = p_language
     AND review_status = 'approved'
   LIMIT 1;
$$;

-- ── RPC: upsert_nimipiko_article ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_nimipiko_article(
  p_topic          text,
  p_intent         text,
  p_language       text,
  p_content        text,
  p_sources        jsonb,
  p_confidence     numeric,
  p_age_min        integer,
  p_age_max        integer,
  p_trigger_count  integer
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO nimipiko_knowledge_articles
    (topic, intent, language, content, sources, confidence_score, age_min, age_max, search_trigger_count)
  VALUES
    (lower(trim(p_topic)), p_intent, p_language, p_content, p_sources, p_confidence, p_age_min, p_age_max, p_trigger_count)
  ON CONFLICT (topic, language) DO UPDATE SET
    content               = excluded.content,
    sources               = excluded.sources,
    confidence_score      = excluded.confidence_score,
    age_min               = excluded.age_min,
    age_max               = excluded.age_max,
    search_trigger_count  = excluded.search_trigger_count,
    updated_at            = now(),
    review_status         = CASE
      WHEN nimipiko_knowledge_articles.review_status = 'approved' THEN 'approved'
      ELSE 'pending'
    END;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE knowledge_router_cache        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nimipiko_knowledge_articles   ENABLE ROW LEVEL SECURITY;

-- Cache is internal — only service role (via security-definer RPCs)
CREATE POLICY "no_direct_access_cache"
  ON knowledge_router_cache FOR ALL USING (false);

CREATE POLICY "no_direct_access_articles"
  ON nimipiko_knowledge_articles FOR ALL USING (false);
