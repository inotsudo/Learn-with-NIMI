-- 125_teacher_materials.sql
--
-- Persists AI-generated lessons, quizzes, and homework for teachers so they
-- can retrieve previously generated materials across sessions.
--
-- RPCs:
--   save_teacher_material   — insert a new material row; returns the new id
--   list_teacher_materials  — metadata list for the sidebar (no content blob)
--   get_teacher_material    — full row including content, for re-opening
--   delete_teacher_material — hard-delete; teacher must own the row

-- ── Table ─────────────────────────────────────────────────────────────────────

create table if not exists teacher_materials (
  id          uuid        primary key default gen_random_uuid(),
  teacher_id  uuid        not null,
  type        text        not null check (type in ('lesson','quiz','homework')),
  title       text        not null,
  story_title text,
  language    text        not null default 'en',
  content     jsonb       not null,
  created_at  timestamptz not null default now()
);

create index if not exists teacher_materials_teacher_idx
  on teacher_materials (teacher_id, created_at desc);

-- No RLS on this table — all access goes through security-definer RPCs that
-- verify auth.uid() = teacher_id before touching any rows.
alter table teacher_materials disable row level security;

-- ── save_teacher_material ─────────────────────────────────────────────────────

drop function if exists save_teacher_material(uuid, text, text, text, text, jsonb);

create or replace function save_teacher_material(
  p_teacher_id  uuid,
  p_type        text,
  p_title       text,
  p_story_title text,
  p_language    text,
  p_content     jsonb
) returns uuid
language plpgsql security definer as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or auth.uid() != p_teacher_id then
    raise exception 'not authorized';
  end if;
  if p_type not in ('lesson','quiz','homework') then
    raise exception 'invalid material type';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'title is required';
  end if;

  insert into teacher_materials (teacher_id, type, title, story_title, language, content)
  values (p_teacher_id, p_type, left(trim(p_title), 200), p_story_title, coalesce(p_language,'en'), p_content)
  returning id into v_id;

  return v_id;
end;
$$;

-- ── list_teacher_materials ────────────────────────────────────────────────────
-- Returns metadata only (no content blob) for the sidebar list.
-- Optional p_type filter; null returns all types.

drop function if exists list_teacher_materials(uuid, text);

create or replace function list_teacher_materials(
  p_teacher_id uuid,
  p_type       text default null
) returns jsonb
language plpgsql security definer stable as $$
begin
  if auth.uid() is null or auth.uid() != p_teacher_id then
    raise exception 'not authorized';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',          tm.id,
          'type',        tm.type,
          'title',       tm.title,
          'story_title', tm.story_title,
          'language',    tm.language,
          'created_at',  tm.created_at
        )
        order by tm.created_at desc
      )
      from teacher_materials tm
      where tm.teacher_id = p_teacher_id
        and (p_type is null or tm.type = p_type)
      limit 100
    ),
    '[]'::jsonb
  );
end;
$$;

-- ── get_teacher_material ──────────────────────────────────────────────────────
-- Full row including the content blob. Used when re-opening a saved item.

drop function if exists get_teacher_material(uuid, uuid);

create or replace function get_teacher_material(
  p_id         uuid,
  p_teacher_id uuid
) returns jsonb
language plpgsql security definer stable as $$
declare
  v_row teacher_materials%rowtype;
begin
  if auth.uid() is null or auth.uid() != p_teacher_id then
    raise exception 'not authorized';
  end if;

  select * into v_row
  from teacher_materials
  where id = p_id and teacher_id = p_teacher_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id',          v_row.id,
    'type',        v_row.type,
    'title',       v_row.title,
    'story_title', v_row.story_title,
    'language',    v_row.language,
    'content',     v_row.content,
    'created_at',  v_row.created_at
  );
end;
$$;

-- ── delete_teacher_material ───────────────────────────────────────────────────

drop function if exists delete_teacher_material(uuid, uuid);

create or replace function delete_teacher_material(
  p_id         uuid,
  p_teacher_id uuid
) returns void
language plpgsql security definer as $$
begin
  if auth.uid() is null or auth.uid() != p_teacher_id then
    raise exception 'not authorized';
  end if;

  delete from teacher_materials
  where id = p_id and teacher_id = p_teacher_id;
end;
$$;
