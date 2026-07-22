-- Migration 147: Recommendation Intelligence — Prediction → Outcome → Feedback Loop
--
-- Architecture:
--   recommendation_predictions — snapshot at recommendation time (BEFORE learner starts)
--   recommendation_outcomes    — measured actuals AFTER learner completes content
--   recommendation_success_stats — view aggregating success rate per rec type/reason
--
-- Data flow:
--   1. Rec engine generates recommendation + evidence + prediction
--   2. Prediction is persisted (prediction_id returned)
--   3. Learner completes story/activity
--   4. Outcome evaluator measures actuals vs predictions
--   5. Success score + prediction accuracy stored in outcomes
--   6. recommendation_success_stats view informs future rec priority adjustments
--
-- Success score (0–100):
--   Σ (weight_i × achievement_i) / Σ weight_i
--   achievement_i = 1.0 if actual ≥ threshold; else actual/threshold (partial credit)
--
-- Prediction accuracy (0–1):
--   Mean absolute error across all predicted vs actual numeric outcomes

-- ── recommendation_predictions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recommendation_predictions (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id                  uuid        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  story_id                  uuid        REFERENCES stories(id) ON DELETE SET NULL,
  content_type              text        NOT NULL,
  recommendation_id         text        NOT NULL,       -- rec.id from UniversalRecommendation
  reason_key                text        NOT NULL,

  -- Predicted outcomes (numeric + structured)
  predicted_quiz_accuracy   float,                     -- 0–1 expected accuracy after completion
  predicted_vocab_gains     text[]      NOT NULL DEFAULT '{}',  -- words expected to improve
  predicted_skill_gains     jsonb       NOT NULL DEFAULT '[]',  -- [{skill, from_level, to_level, from_confidence, to_confidence}]
  predicted_retention_gains jsonb       NOT NULL DEFAULT '[]',  -- [{word, from, to}]

  -- Success criteria used to evaluate outcome
  success_criteria          jsonb       NOT NULL DEFAULT '[]',  -- [{metric, description, threshold, weight}]

  -- Meta
  prediction_confidence     float       NOT NULL DEFAULT 0.5 CHECK (prediction_confidence BETWEEN 0 AND 1),
  evidence_snapshot         jsonb,                             -- RecommendationEvidence at time of rec

  created_at                timestamptz NOT NULL DEFAULT now(),
  -- Predictions expire after 45 days — if outcome not measured by then, stale
  expires_at                timestamptz NOT NULL DEFAULT now() + interval '45 days',

  -- At most one active prediction per child+content_type+recommendation_id
  UNIQUE (child_id, recommendation_id, content_type)
);

CREATE INDEX idx_rec_predictions_child ON recommendation_predictions (child_id, created_at DESC);
CREATE INDEX idx_rec_predictions_story ON recommendation_predictions (story_id, child_id)
  WHERE story_id IS NOT NULL;

ALTER TABLE recommendation_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Child owner reads predictions"
  ON recommendation_predictions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

CREATE POLICY "Service role manages predictions"
  ON recommendation_predictions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── recommendation_outcomes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id           uuid        NOT NULL REFERENCES recommendation_predictions(id) ON DELETE CASCADE,
  child_id                uuid        NOT NULL REFERENCES children(id) ON DELETE CASCADE,

  -- Actual measured results
  actual_quiz_accuracy    float,                       -- 0–1; null if no quiz data
  actual_vocab_mastered   text[]      NOT NULL DEFAULT '{}',
  actual_completion_minutes float,                     -- null if not measurable
  actual_retention        jsonb       NOT NULL DEFAULT '[]',  -- [{word, retention}]

  -- Computed scores
  success_score           float       NOT NULL DEFAULT 0 CHECK (success_score BETWEEN 0 AND 100),
  prediction_accuracy     float       NOT NULL DEFAULT 0 CHECK (prediction_accuracy BETWEEN 0 AND 1),
  success_breakdown       jsonb       NOT NULL DEFAULT '[]',  -- [{metric, label, predicted, actual, improvement, contribution}]

  -- Did we beat our own prediction?
  beat_prediction         boolean     NOT NULL DEFAULT false,

  completed_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rec_outcomes_child ON recommendation_outcomes (child_id, completed_at DESC);
CREATE INDEX idx_rec_outcomes_prediction ON recommendation_outcomes (prediction_id);

ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Child owner reads outcomes"
  ON recommendation_outcomes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM children c WHERE c.id = child_id AND c.parent_id = auth.uid()));

CREATE POLICY "Service role manages outcomes"
  ON recommendation_outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Aggregate success stats view ──────────────────────────────────────────────
-- Used by the recommendation engine to adjust future priority weights.
-- Grouped by content_type + reason_key so each rec strategy gets its own score.

CREATE OR REPLACE VIEW recommendation_success_stats AS
SELECT
  p.content_type,
  p.reason_key,
  p.child_id,
  COUNT(p.id)                                              AS total_shown,
  COUNT(o.id)                                              AS outcomes_measured,
  AVG(o.success_score)                                     AS avg_success_score,
  AVG(o.prediction_accuracy)                               AS avg_prediction_accuracy,
  AVG(CASE WHEN o.beat_prediction THEN 1.0 ELSE 0.0 END)  AS beat_prediction_rate,
  MAX(o.completed_at)                                      AS last_measured_at
FROM recommendation_predictions p
LEFT JOIN recommendation_outcomes o ON o.prediction_id = p.id
GROUP BY p.content_type, p.reason_key, p.child_id;

-- ── RPC: save_recommendation_prediction ───────────────────────────────────────

CREATE OR REPLACE FUNCTION save_recommendation_prediction(
  p_child_id                uuid,
  p_story_id                uuid,
  p_content_type            text,
  p_recommendation_id       text,
  p_reason_key              text,
  p_predicted_quiz_accuracy float,
  p_predicted_vocab_gains   text[],
  p_predicted_skill_gains   jsonb,
  p_predicted_retention_gains jsonb,
  p_success_criteria        jsonb,
  p_prediction_confidence   float,
  p_evidence_snapshot       jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO recommendation_predictions (
    child_id, story_id, content_type, recommendation_id, reason_key,
    predicted_quiz_accuracy, predicted_vocab_gains, predicted_skill_gains,
    predicted_retention_gains, success_criteria, prediction_confidence, evidence_snapshot
  ) VALUES (
    p_child_id, p_story_id, p_content_type, p_recommendation_id, p_reason_key,
    p_predicted_quiz_accuracy, p_predicted_vocab_gains, p_predicted_skill_gains,
    p_predicted_retention_gains, p_success_criteria, p_prediction_confidence, p_evidence_snapshot
  )
  ON CONFLICT (child_id, recommendation_id, content_type)
  DO UPDATE SET
    predicted_quiz_accuracy    = EXCLUDED.predicted_quiz_accuracy,
    predicted_vocab_gains      = EXCLUDED.predicted_vocab_gains,
    predicted_skill_gains      = EXCLUDED.predicted_skill_gains,
    predicted_retention_gains  = EXCLUDED.predicted_retention_gains,
    success_criteria           = EXCLUDED.success_criteria,
    prediction_confidence      = EXCLUDED.prediction_confidence,
    evidence_snapshot          = EXCLUDED.evidence_snapshot,
    created_at                 = now(),
    expires_at                 = now() + interval '45 days'
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── RPC: save_recommendation_outcome ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION save_recommendation_outcome(
  p_prediction_id           uuid,
  p_child_id                uuid,
  p_actual_quiz_accuracy    float,
  p_actual_vocab_mastered   text[],
  p_actual_completion_minutes float,
  p_actual_retention        jsonb,
  p_success_score           float,
  p_prediction_accuracy     float,
  p_success_breakdown       jsonb,
  p_beat_prediction         boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO recommendation_outcomes (
    prediction_id, child_id,
    actual_quiz_accuracy, actual_vocab_mastered, actual_completion_minutes,
    actual_retention, success_score, prediction_accuracy, success_breakdown, beat_prediction
  ) VALUES (
    p_prediction_id, p_child_id,
    p_actual_quiz_accuracy, p_actual_vocab_mastered, p_actual_completion_minutes,
    p_actual_retention, p_success_score, p_prediction_accuracy, p_success_breakdown, p_beat_prediction
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── RPC: get_pending_outcome_evaluations ─────────────────────────────────────
-- Returns predictions that have no outcome yet and haven't expired.
-- Called by the evaluator on story_finished to find what needs measuring.

CREATE OR REPLACE FUNCTION get_pending_outcome_evaluations(
  p_child_id uuid,
  p_story_id uuid DEFAULT null
) RETURNS TABLE (
  prediction_id             uuid,
  story_id                  uuid,
  content_type              text,
  recommendation_id         text,
  reason_key                text,
  predicted_quiz_accuracy   float,
  predicted_vocab_gains     text[],
  predicted_skill_gains     jsonb,
  predicted_retention_gains jsonb,
  success_criteria          jsonb,
  prediction_confidence     float,
  created_at                timestamptz
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id                        AS prediction_id,
    p.story_id,
    p.content_type,
    p.recommendation_id,
    p.reason_key,
    p.predicted_quiz_accuracy,
    p.predicted_vocab_gains,
    p.predicted_skill_gains,
    p.predicted_retention_gains,
    p.success_criteria,
    p.prediction_confidence,
    p.created_at
  FROM recommendation_predictions p
  WHERE p.child_id = p_child_id
    AND (p_story_id IS NULL OR p.story_id = p_story_id)
    AND p.expires_at > now()
    AND NOT EXISTS (
      SELECT 1 FROM recommendation_outcomes o WHERE o.prediction_id = p.id
    )
  ORDER BY p.created_at DESC
  LIMIT 10;
$$;

-- ── RPC: get_recommendation_success_stats_for_child ──────────────────────────
-- Returns success stats grouped by rec type for a specific child.
-- Used by the engine to adjust priority weights based on what has worked.

CREATE OR REPLACE FUNCTION get_recommendation_success_stats_for_child(
  p_child_id uuid
) RETURNS TABLE (
  content_type          text,
  reason_key            text,
  total_shown           bigint,
  outcomes_measured     bigint,
  avg_success_score     float,
  avg_prediction_accuracy float,
  beat_prediction_rate  float
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    content_type, reason_key, total_shown,
    outcomes_measured, avg_success_score,
    avg_prediction_accuracy, beat_prediction_rate
  FROM recommendation_success_stats
  WHERE child_id = p_child_id
    AND outcomes_measured >= 1
  ORDER BY avg_success_score DESC;
$$;
