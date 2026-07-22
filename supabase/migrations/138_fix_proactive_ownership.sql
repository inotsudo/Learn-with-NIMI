-- ============================================================
-- 138: Add ownership checks to migration 135 RPCs
--
-- BUG (migration 135): Five SECURITY DEFINER RPCs had no ownership
-- guard, allowing any authenticated user to read/write another user's
-- proactive suggestions and conversation summaries.
--
-- get_pending_proactive       — add is_child_owner check
-- mark_proactive_delivered    — add cross-table ownership check
-- queue_proactive_suggestion  — add is_child_owner check
-- upsert_conversation_summary — add is_child_owner check
-- get_conversation_history    — add is_child_owner check
-- ============================================================

-- ── get_pending_proactive ─────────────────────────────────────────

create or replace function get_pending_proactive(
  p_child_id uuid,
  p_limit    int default 3
)
returns setof proactive_queue
language plpgsql security definer set search_path = public as $$
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  return query
    select *
    from proactive_queue
    where child_id    = p_child_id
      and delivered_at is null
      and expires_at   > now()
    order by priority asc, created_at desc
    limit p_limit;
end;
$$;

-- ── mark_proactive_delivered ──────────────────────────────────────
-- Takes an array of suggestion IDs; verify ALL belong to the caller
-- before updating any of them.

create or replace function mark_proactive_delivered(
  p_ids uuid[]
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Reject if any ID belongs to a child the caller does not own
  if exists (
    select 1
    from   proactive_queue pq
    join   children c on c.id = pq.child_id
    where  pq.id      = any(p_ids)
      and  c.parent_id != auth.uid()
  ) then
    raise exception 'Unauthorized';
  end if;

  update proactive_queue
  set    delivered_at = now()
  where  id = any(p_ids);
end;
$$;

-- ── queue_proactive_suggestion ────────────────────────────────────

create or replace function queue_proactive_suggestion(
  p_child_id       uuid,
  p_type           text,
  p_title          text,
  p_message        text,
  p_context_data   jsonb    default '{}',
  p_priority       int      default 5,
  p_expires_hours  int      default 24
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  -- Deduplication: skip if same type already queued for this child in last 12h
  if exists (
    select 1 from proactive_queue
    where  child_id        = p_child_id
      and  suggestion_type = p_type
      and  delivered_at    is null
      and  created_at      > now() - interval '12 hours'
  ) then
    return null;
  end if;

  insert into proactive_queue
    (child_id, suggestion_type, title, message, context_data, priority, expires_at)
  values
    (p_child_id, p_type, p_title, p_message, p_context_data, p_priority,
     now() + (p_expires_hours || ' hours')::interval)
  returning id into v_id;

  return v_id;
end;
$$;

-- ── upsert_conversation_summary ───────────────────────────────────

create or replace function upsert_conversation_summary(
  p_child_id       uuid,
  p_session_id     text,
  p_summary        text,
  p_key_topics     text[]   default '{}',
  p_mastered_vocab text[]   default '{}',
  p_mistakes       jsonb    default '[]',
  p_language       text     default 'en',
  p_story_id       text     default null,
  p_exchange_count int      default 0
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  insert into conversation_summaries
    (child_id, session_id, summary, key_topics, mastered_vocab, mistakes,
     language, story_id, exchange_count)
  values
    (p_child_id, p_session_id, p_summary, p_key_topics, p_mastered_vocab,
     p_mistakes, p_language, p_story_id, p_exchange_count)
  on conflict (child_id, session_id) do update set
    summary        = excluded.summary,
    key_topics     = excluded.key_topics,
    mastered_vocab = excluded.mastered_vocab,
    mistakes       = excluded.mistakes,
    exchange_count = excluded.exchange_count;
end;
$$;

-- ── get_conversation_history ──────────────────────────────────────

create or replace function get_conversation_history(
  p_child_id uuid,
  p_limit    int default 5
)
returns table (
  session_id     text,
  summary        text,
  key_topics     text[],
  mastered_vocab text[],
  mistakes       jsonb,
  language       text,
  story_id       text,
  exchange_count int,
  created_at     timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  return query
    select cs.session_id, cs.summary, cs.key_topics, cs.mastered_vocab,
           cs.mistakes, cs.language, cs.story_id, cs.exchange_count, cs.created_at
    from   conversation_summaries cs
    where  cs.child_id = p_child_id
    order  by cs.created_at desc
    limit  p_limit;
end;
$$;
