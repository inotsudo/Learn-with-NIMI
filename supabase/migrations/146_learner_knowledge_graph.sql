-- Migration 146: Global Learner Knowledge Graph
--
-- Architecture:
--   concepts       — global taxonomy nodes (words, emotions, themes, skills, topics)
--   concept_links  — global taxonomy edges (word teaches emotion, story links word)
--   learner_knowledge — per-child mastery state with spaced-repetition confidence
--
-- This replaces the flat child_vocabulary table for cross-story tracking.
-- child_vocabulary remains for story-scoped signals consumed by storyKnowledgeEngine.
-- learner_knowledge adds the cross-story, concept-connected intelligence layer.
--
-- Confidence model (simplified Ebbinghaus):
--   After each correct review: stability_days doubles, confidence rises toward 1.0
--   After each incorrect review: stability halves, confidence drops toward 0.0
--   predicted_retention = e^(-days_since_correct / stability_days)
--   needs_review = true when predicted_retention < 0.70

-- ── Concepts (global taxonomy — shared across all learners) ───────────────────

CREATE TABLE IF NOT EXISTS concepts (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text        NOT NULL,
  concept_type      text        NOT NULL
    CHECK (concept_type IN ('word', 'emotion', 'theme', 'skill', 'topic', 'animal', 'character')),
  language          text        NOT NULL DEFAULT 'en',
  parent_name       text,                            -- hierarchy: "Emotions" is parent of "sad"
  curriculum_skill  text,                            -- maps to CurriculumSkill key
  display_emoji     text,
  description       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, language, concept_type)
);

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read concepts"
  ON concepts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage concepts"
  ON concepts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Concept links (global graph edges) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS concept_links (
  from_id   uuid  NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_id     uuid  NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  link_type text  NOT NULL
    CHECK (link_type IN ('teaches', 'part_of', 'exemplifies', 'related_to', 'appeared_in')),
  story_id  uuid  REFERENCES stories(id) ON DELETE CASCADE,
  source    text  NOT NULL DEFAULT 'taxonomy'
    CHECK (source IN ('taxonomy', 'story_analysis', 'ai_inferred')),
  weight    float NOT NULL DEFAULT 1.0,
  PRIMARY KEY (from_id, to_id, link_type)
);

ALTER TABLE concept_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read concept links"
  ON concept_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage concept links"
  ON concept_links FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Learner knowledge (per-child concept mastery with spaced repetition) ──────

CREATE TABLE IF NOT EXISTS learner_knowledge (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id            uuid        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  concept_id          uuid        NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  -- Spaced repetition state
  confidence          float       NOT NULL DEFAULT 0.5
    CHECK (confidence BETWEEN 0 AND 1),
  stability_days      float       NOT NULL DEFAULT 1.0
    CHECK (stability_days > 0),
  times_seen          int         NOT NULL DEFAULT 1,
  times_correct       int         NOT NULL DEFAULT 0,
  -- Timestamps
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  last_correct_at     timestamptz,
  -- Derived (updated by upsert function, not computed column — now() is non-immutable)
  predicted_retention float       NOT NULL DEFAULT 0.5
    CHECK (predicted_retention BETWEEN 0 AND 1),
  needs_review        boolean     NOT NULL DEFAULT false,
  -- Source tracking
  story_ids           uuid[]      NOT NULL DEFAULT '{}',
  UNIQUE (child_id, concept_id)
);

CREATE INDEX idx_learner_knowledge_child ON learner_knowledge (child_id);
CREATE INDEX idx_learner_knowledge_needs_review ON learner_knowledge (child_id, needs_review)
  WHERE needs_review = true;

ALTER TABLE learner_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Child owner can read their knowledge"
  ON learner_knowledge FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM children c
    WHERE c.id = child_id AND c.parent_id = auth.uid()
  ));

CREATE POLICY "Service role can manage learner knowledge"
  ON learner_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── RPC: upsert_concept_knowledge ─────────────────────────────────────────────
-- Called by the knowledge graph service after every vocab encounter or quiz event.
-- Applies spaced-repetition math and recomputes predicted_retention.

CREATE OR REPLACE FUNCTION upsert_concept_knowledge(
  p_child_id   uuid,
  p_concept_id uuid,
  p_seen       boolean DEFAULT true,
  p_correct    boolean DEFAULT false,
  p_story_id   uuid    DEFAULT null
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row              learner_knowledge%ROWTYPE;
  v_days_since       float;
  v_new_retention    float;
  v_new_stability    float;
  v_new_confidence   float;
  v_new_needs_review boolean;
BEGIN
  SELECT * INTO v_row
  FROM learner_knowledge
  WHERE child_id = p_child_id AND concept_id = p_concept_id;

  IF NOT FOUND THEN
    -- First encounter
    INSERT INTO learner_knowledge (
      child_id, concept_id, confidence, stability_days,
      times_seen, times_correct, last_seen_at, last_correct_at,
      predicted_retention, needs_review, story_ids
    ) VALUES (
      p_child_id, p_concept_id,
      CASE WHEN p_correct THEN 0.65 ELSE 0.40 END,
      1.0,
      1,
      CASE WHEN p_correct THEN 1 ELSE 0 END,
      now(),
      CASE WHEN p_correct THEN now() ELSE null END,
      CASE WHEN p_correct THEN 0.85 ELSE 0.50 END,
      false,
      CASE WHEN p_story_id IS NOT NULL THEN ARRAY[p_story_id] ELSE '{}' END
    );
    RETURN;
  END IF;

  -- Compute days since last correct review
  IF v_row.last_correct_at IS NOT NULL THEN
    v_days_since := EXTRACT(EPOCH FROM (now() - v_row.last_correct_at)) / 86400.0;
  ELSE
    v_days_since := 999;
  END IF;

  -- Update stability (doubles on correct, halves on incorrect)
  IF p_correct THEN
    v_new_stability := LEAST(v_row.stability_days * 2.0, 90.0); -- cap at 90-day stability
  ELSE
    v_new_stability := GREATEST(v_row.stability_days * 0.5, 0.5);
  END IF;

  -- Update confidence
  IF p_correct THEN
    -- Rise toward 1.0: confidence + 0.15 × (1 - confidence)
    v_new_confidence := LEAST(1.0, v_row.confidence + 0.15 * (1.0 - v_row.confidence));
  ELSE
    -- Drop toward 0: confidence × 0.65
    v_new_confidence := GREATEST(0.05, v_row.confidence * 0.65);
  END IF;

  -- Recompute retention using new stability and time since last correct
  IF p_correct THEN
    -- Just reviewed correctly: set retention high
    v_new_retention := v_new_confidence;
  ELSIF v_row.last_correct_at IS NOT NULL THEN
    -- Ebbinghaus: R = e^(-t/S)
    v_new_retention := EXP(-v_days_since / GREATEST(v_new_stability, 0.5));
    v_new_retention := LEAST(v_new_retention, v_new_confidence);
  ELSE
    v_new_retention := v_new_confidence * 0.5;
  END IF;

  v_new_needs_review := v_new_retention < 0.70;

  UPDATE learner_knowledge SET
    confidence          = v_new_confidence,
    stability_days      = v_new_stability,
    times_seen          = v_row.times_seen + (CASE WHEN p_seen THEN 1 ELSE 0 END),
    times_correct       = v_row.times_correct + (CASE WHEN p_correct THEN 1 ELSE 0 END),
    last_seen_at        = now(),
    last_correct_at     = CASE WHEN p_correct THEN now() ELSE v_row.last_correct_at END,
    predicted_retention = v_new_retention,
    needs_review        = v_new_needs_review,
    story_ids           = CASE
                            WHEN p_story_id IS NOT NULL AND NOT (v_row.story_ids @> ARRAY[p_story_id])
                            THEN v_row.story_ids || p_story_id
                            ELSE v_row.story_ids
                          END
  WHERE child_id = p_child_id AND concept_id = p_concept_id;
END;
$$;

-- ── RPC: get_learner_skill_mastery ────────────────────────────────────────────
-- Aggregates learner_knowledge by curriculum_skill to show which skills
-- Annie is strong/weak in — independent of which story the concept appeared in.
-- Used by the recommendation engine to reason about skill gaps.

CREATE OR REPLACE FUNCTION get_learner_skill_mastery(
  p_child_id uuid,
  p_language  text DEFAULT 'en'
) RETURNS TABLE (
  curriculum_skill    text,
  concept_count       bigint,
  avg_confidence      float,
  avg_retention       float,
  needs_review_count  bigint,
  mastery_level       text   -- 'none' | 'emerging' | 'developing' | 'strong'
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    c.curriculum_skill,
    COUNT(*)                                   AS concept_count,
    AVG(lk.confidence)                         AS avg_confidence,
    AVG(lk.predicted_retention)                AS avg_retention,
    COUNT(*) FILTER (WHERE lk.needs_review)    AS needs_review_count,
    CASE
      WHEN AVG(lk.confidence) >= 0.85 THEN 'strong'
      WHEN AVG(lk.confidence) >= 0.65 THEN 'developing'
      WHEN AVG(lk.confidence) >= 0.40 THEN 'emerging'
      ELSE 'none'
    END                                        AS mastery_level
  FROM learner_knowledge lk
  JOIN concepts c ON c.id = lk.concept_id
  WHERE lk.child_id = p_child_id
    AND c.language   = p_language
    AND c.curriculum_skill IS NOT NULL
  GROUP BY c.curriculum_skill
  ORDER BY avg_confidence ASC;
$$;

-- ── RPC: get_concepts_needing_review ─────────────────────────────────────────
-- Returns concepts whose predicted_retention has dropped below 0.70.
-- The spaced-repetition queue — called by Nimi when deciding which words to reinforce.

CREATE OR REPLACE FUNCTION get_concepts_needing_review(
  p_child_id uuid,
  p_language  text    DEFAULT 'en',
  p_limit     integer DEFAULT 5
) RETURNS TABLE (
  concept_name         text,
  concept_type         text,
  curriculum_skill     text,
  confidence           float,
  predicted_retention  float,
  stability_days       float,
  last_correct_at      timestamptz,
  times_seen           int,
  story_ids            uuid[]
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    c.name               AS concept_name,
    c.concept_type,
    c.curriculum_skill,
    lk.confidence,
    lk.predicted_retention,
    lk.stability_days,
    lk.last_correct_at,
    lk.times_seen,
    lk.story_ids
  FROM learner_knowledge lk
  JOIN concepts c ON c.id = lk.concept_id
  WHERE lk.child_id = p_child_id
    AND c.language   = p_language
    AND (lk.needs_review = true OR lk.predicted_retention < 0.70)
  ORDER BY lk.predicted_retention ASC
  LIMIT p_limit;
$$;

-- ── RPC: get_learner_knowledge_for_story ──────────────────────────────────────
-- Fetches cross-story knowledge for concepts that appear in a given story.
-- Enables Nimi to say "You learned 'delight' in The Talking Faces — same skill!"
-- when a related concept appears in a new story.

CREATE OR REPLACE FUNCTION get_learner_knowledge_for_story(
  p_child_id uuid,
  p_story_id uuid,
  p_language  text DEFAULT 'en'
) RETURNS TABLE (
  concept_name         text,
  concept_type         text,
  curriculum_skill     text,
  confidence           float,
  predicted_retention  float,
  needs_review         boolean,
  times_seen           int,
  first_story_id       uuid
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH story_concepts AS (
    -- Concepts linked to this story
    SELECT DISTINCT c.id AS concept_id
    FROM concept_links cl
    JOIN concepts c ON c.id = cl.from_id
    WHERE cl.story_id = p_story_id
      AND cl.link_type = 'appeared_in'
      AND c.language   = p_language
    UNION
    SELECT DISTINCT c.id
    FROM concept_links cl
    JOIN concepts c ON c.id = cl.to_id
    WHERE cl.story_id = p_story_id
      AND cl.link_type = 'appeared_in'
      AND c.language   = p_language
  )
  SELECT
    c.name,
    c.concept_type,
    c.curriculum_skill,
    lk.confidence,
    lk.predicted_retention,
    lk.needs_review,
    lk.times_seen,
    lk.story_ids[1] AS first_story_id
  FROM story_concepts sc
  JOIN concepts c ON c.id = sc.concept_id
  LEFT JOIN learner_knowledge lk ON lk.concept_id = sc.concept_id AND lk.child_id = p_child_id
  ORDER BY lk.confidence DESC NULLS LAST;
$$;

-- ── RPC: warm_story_concepts ──────────────────────────────────────────────────
-- Called when a story is published (or on-demand by admin).
-- Inserts concept nodes + links from the AI-extracted story analysis.
-- Idempotent — safe to call multiple times.

CREATE OR REPLACE FUNCTION warm_story_concepts(
  p_story_id    uuid,
  p_language    text,
  p_concepts    jsonb  -- array of {name, type, curriculum_skill, parent_name, emoji}
) RETURNS integer    -- number of concepts upserted
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item      jsonb;
  v_concept   concepts%ROWTYPE;
  v_count     integer := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_concepts)
  LOOP
    -- Upsert the concept node
    INSERT INTO concepts (name, concept_type, language, parent_name, curriculum_skill, display_emoji)
    VALUES (
      v_item->>'name',
      v_item->>'type',
      p_language,
      v_item->>'parent_name',
      v_item->>'curriculum_skill',
      v_item->>'emoji'
    )
    ON CONFLICT (name, language, concept_type) DO UPDATE
      SET curriculum_skill = EXCLUDED.curriculum_skill,
          parent_name      = COALESCE(EXCLUDED.parent_name, concepts.parent_name),
          display_emoji    = COALESCE(EXCLUDED.display_emoji, concepts.display_emoji);

    SELECT * INTO v_concept FROM concepts
    WHERE name = v_item->>'name'
      AND language = p_language
      AND concept_type = v_item->>'type';

    -- If concept has a parent, link it
    IF v_item->>'parent_name' IS NOT NULL THEN
      DECLARE v_parent concepts%ROWTYPE;
      BEGIN
        SELECT * INTO v_parent FROM concepts
        WHERE name = v_item->>'parent_name'
          AND language = p_language;
        IF FOUND THEN
          INSERT INTO concept_links (from_id, to_id, link_type, story_id, source)
          VALUES (v_concept.id, v_parent.id, 'part_of', p_story_id, 'story_analysis')
          ON CONFLICT DO NOTHING;
        END IF;
      END;
    END IF;

    -- Link concept to story (appeared_in)
    DECLARE v_story_concept concepts%ROWTYPE;
    BEGIN
      SELECT * INTO v_story_concept FROM concepts
      WHERE name = (SELECT title FROM stories WHERE id = p_story_id)
        AND concept_type = 'topic'
        AND language = p_language;
      IF FOUND THEN
        INSERT INTO concept_links (from_id, to_id, link_type, story_id, source)
        VALUES (v_concept.id, v_story_concept.id, 'appeared_in', p_story_id, 'story_analysis')
        ON CONFLICT DO NOTHING;
      END IF;
    END;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
