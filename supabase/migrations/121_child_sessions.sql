-- 121_child_sessions.sql
--
-- Screen-time tracking for healthy learning habits.
-- Stores one row per app session; RPCs handle start/end/summary.

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS child_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id         uuid        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  duration_seconds integer,     -- populated by end_child_session; NULL while active
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_sessions_child_date
  ON child_sessions(child_id, started_at DESC);

ALTER TABLE child_sessions ENABLE ROW LEVEL SECURITY;

-- Parents read their own children's sessions; children cannot read directly
CREATE POLICY "parent_read_child_sessions"
  ON child_sessions FOR SELECT
  USING (is_my_child(child_id));

-- ── start_child_session ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION start_child_session(p_child_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_my_child(p_child_id) THEN
    RAISE EXCEPTION 'not_your_child';
  END IF;
  INSERT INTO child_sessions(child_id)
  VALUES (p_child_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── end_child_session ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION end_child_session(p_session_id uuid, p_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_my_child(p_child_id) THEN
    RAISE EXCEPTION 'not_your_child';
  END IF;
  UPDATE child_sessions
  SET
    ended_at         = now(),
    duration_seconds = GREATEST(1, EXTRACT(EPOCH FROM (now() - started_at))::integer)
  WHERE id = p_session_id
    AND child_id  = p_child_id
    AND ended_at IS NULL;
END;
$$;

-- ── get_screen_time_summary ───────────────────────────────────────────────────
-- Returns today/week totals + a 7-day daily breakdown array.
-- Active sessions (ended_at IS NULL) are included using now() as end time.

CREATE OR REPLACE FUNCTION get_screen_time_summary(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_seconds  integer;
  v_week_seconds   integer;
  v_today_count    integer;
  v_daily_breakdown jsonb;
  v_today_date     date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF NOT is_my_child(p_child_id) THEN
    RAISE EXCEPTION 'not_your_child';
  END IF;

  -- Today and week totals
  SELECT
    COALESCE(SUM(
      CASE WHEN (started_at AT TIME ZONE 'UTC')::date = v_today_date THEN
        COALESCE(
          duration_seconds,
          GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::integer)
        )
      END
    ), 0)::integer,
    COUNT(CASE WHEN (started_at AT TIME ZONE 'UTC')::date = v_today_date THEN 1 END)::integer,
    COALESCE(SUM(
      COALESCE(
        duration_seconds,
        GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::integer)
      )
    ), 0)::integer
  INTO v_today_seconds, v_today_count, v_week_seconds
  FROM child_sessions
  WHERE child_id   = p_child_id
    AND started_at >= date_trunc('week', now() AT TIME ZONE 'UTC');

  -- 7-day daily breakdown (includes today)
  SELECT jsonb_agg(
    jsonb_build_object(
      'date',    d.day::text,
      'seconds', COALESCE(agg.seconds, 0)
    )
    ORDER BY d.day
  )
  INTO v_daily_breakdown
  FROM generate_series(
    v_today_date - 6,
    v_today_date,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN (
    SELECT
      (started_at AT TIME ZONE 'UTC')::date AS session_date,
      SUM(
        COALESCE(
          duration_seconds,
          GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::integer)
        )
      )::integer AS seconds
    FROM child_sessions
    WHERE child_id   = p_child_id
      AND started_at >= v_today_date - 6
    GROUP BY 1
  ) agg ON agg.session_date = d.day;

  RETURN jsonb_build_object(
    'today_seconds',   v_today_seconds,
    'today_count',     v_today_count,
    'week_seconds',    v_week_seconds,
    'daily_breakdown', COALESCE(v_daily_breakdown, '[]'::jsonb)
  );
END;
$$;
