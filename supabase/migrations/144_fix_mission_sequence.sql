-- ============================================================
-- 144: Re-fix get_recommendation_candidates — day_number → sequence
--
-- Migration 143 replaced sort_order with day_number, but day_number
-- was dropped in migration 012. The correct ordering column added in
-- migration 012 is `sequence`. Applied now to correct the live instance.
-- ============================================================

create or replace function get_recommendation_candidates(
  p_child_id uuid,
  p_limit    int default 5
)
returns jsonb
language plpgsql security definer as $$
declare v_rows jsonb;
begin
  if not is_child_owner(p_child_id) then
    raise exception 'Unauthorized';
  end if;

  select coalesce(jsonb_agg(r), '[]') into v_rows
  from (
    select jsonb_build_object(
      'story_id',        s.id,
      'story_title',     s.title,
      'story_emoji',     coalesce(s.theme_emoji, '📖'),
      'total_missions',  count(m.id),
      'missions_done',   count(cp.id),
      'reason',          case
        when count(cp.id) > 0 and count(cp.id) < count(m.id) then 'in_progress'
        when count(cp.id) = 0                                  then 'not_started'
        else                                                        'reinforcement'
      end,
      'score',           case
        when count(cp.id) > 0 and count(cp.id) < count(m.id) then
          100.0 + (count(cp.id) * 50.0 / greatest(count(m.id), 1))
        when count(cp.id) = 0 then 50.0
        else 8.0
      end,
      'next_mission_id', (
        select m2.id
        from missions m2
        where m2.story_id = s.id
          and not exists (
            select 1 from child_progress cp2
            where cp2.child_id = p_child_id and cp2.mission_id = m2.id
          )
        order by m2.sequence
        limit 1
      ),
      'mission_types',   (
        select coalesce(jsonb_agg(distinct m3.type), '[]')
        from missions m3 where m3.story_id = s.id
      )
    ) as r
    from stories s
    join missions m on m.story_id = s.id
    left join child_progress cp
      on cp.mission_id = m.id and cp.child_id = p_child_id
    where s.is_active = true
    group by s.id, s.title, s.theme_emoji, s.sort_order
    order by
      case
        when count(cp.id) > 0 and count(cp.id) < count(m.id) then 0
        when count(cp.id) = 0                                  then 1
        else                                                        2
      end,
      s.sort_order
    limit p_limit
  ) sub;

  return coalesce(v_rows, '[]');
end;
$$;
