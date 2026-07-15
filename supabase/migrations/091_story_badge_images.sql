-- migration 091: ensure every story has 3 badge_images rows (en / fr / rw)
-- and add a trigger so newly inserted stories auto-get the 3 rows.

-- 1. Backfill all stories that are already in the DB
insert into badge_images (slug, label)
select
  s.slug || '-' || lang.code,
  s.title || ' (' || upper(lang.code) || ')'
from stories s
cross join (values ('en'), ('fr'), ('rw')) as lang(code)
on conflict (slug) do nothing;

-- 2. Function called after every INSERT on stories
create or replace function _sa_create_story_badge_images()
returns trigger language plpgsql as $$
begin
  insert into badge_images (slug, label)
  values
    (NEW.slug || '-en', NEW.title || ' (EN)'),
    (NEW.slug || '-fr', NEW.title || ' (FR)'),
    (NEW.slug || '-rw', NEW.title || ' (RW)')
  on conflict (slug) do nothing;
  return NEW;
end;
$$;

-- 3. Attach trigger (drop first in case of re-run)
drop trigger if exists story_badge_images_auto on stories;

create trigger story_badge_images_auto
after insert on stories
for each row execute function _sa_create_story_badge_images();
