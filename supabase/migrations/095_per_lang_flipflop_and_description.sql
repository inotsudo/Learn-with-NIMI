-- 095: Per-language FlipFlop page images + per-language story description
--
-- Previously:
--   story_pages.image_url  — one shared image for all languages
--   story_versions         — no description field
--
-- Now:
--   story_page_versions.image_url  — per-language image (falls back to story_pages.image_url for old data)
--   story_versions.description     — per-language subtitle / short description

-- ── 1. Per-language image for each FlipFlop page ──────────────
alter table story_page_versions add column if not exists image_url text;

-- ── 2. Per-language story description ─────────────────────────
alter table story_versions add column if not exists description text;

-- ── 3. Recreate get_story_details — add description to return shape ───
-- Must drop first: Postgres forbids changing a function's return type in-place.
drop function if exists get_story_details(uuid, text);
create or replace function get_story_details(
  p_story_id uuid,
  p_language text default 'en'
) returns table (
  sid                 uuid,
  slug                text,
  title               text,
  description         text,
  cover_url           text,
  sort_order          integer,
  theme_emoji         text,
  age_min             integer,
  age_max             integer,
  intro_video_url     text,
  theme_song_url      text,
  meet_characters_url text,
  story_intro_url     text
)
language plpgsql security definer stable as $$
begin
  return query
  select
    s.id,
    s.slug,
    coalesce(sv_lang.title, sv_en.title, s.title),
    coalesce(sv_lang.description, sv_en.description),
    coalesce(sv_lang.cover_url, sv_en.cover_url, s.cover_url),
    s.sort_order,
    s.theme_emoji,
    s.age_min,
    s.age_max,
    coalesce(sv_lang.intro_video_url, sv_en.intro_video_url),
    coalesce(sv_lang.theme_song_url, sv_en.theme_song_url),
    coalesce(sv_lang.meet_characters_url, sv_en.meet_characters_url),
    coalesce(sv_lang.story_intro_url, sv_en.story_intro_url)
  from stories s
  left join story_versions sv_lang
    on sv_lang.story_id = s.id and sv_lang.language = p_language and sv_lang.published = true
  left join story_versions sv_en
    on sv_en.story_id = s.id and sv_en.language = 'en' and sv_en.published = true
  where s.id = p_story_id and s.status = 'published';
end;
$$;
