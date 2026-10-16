-- Bounded, privacy-preserving read models. Definers are necessary only for
-- aggregate counts over other members' hidden reactions/votes and admin reports.
-- The wrappers check the caller; the payload helper itself has no public grant.
begin;

create function private.post_payload(p_id uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'author_alias', p.author_alias, 'content', p.content,
    'category', p.category, 'created_at', p.created_at, 'updated_at', p.updated_at,
    'is_owner', p.author_alias = private.my_alias(),
    'comment_count', (select count(*) from public.comments c where c.post_id = p.id),
    'my_reaction', (select r.kind from public.reactions r where r.post_id = p.id and r.user_id = auth.uid()),
    'has_reported', exists(select 1 from public.reports r where r.post_id = p.id and r.reporter_id = auth.uid()),
    'reactions', (select jsonb_build_object(
      'like', count(*) filter (where r.kind = 'like'),
      'laugh', count(*) filter (where r.kind = 'laugh'),
      'fire', count(*) filter (where r.kind = 'fire'),
      'shocked', count(*) filter (where r.kind = 'shocked')) from public.reactions r where r.post_id = p.id),
    'poll', (select jsonb_build_object(
      'id', q.id,
      'my_option_id', (select v.option_id from public.poll_votes v where v.poll_id = q.id and v.user_id = auth.uid()),
      'has_votes', exists(select 1 from public.poll_votes v where v.poll_id = q.id),
      'total_votes', case when exists(select 1 from public.poll_votes v where v.poll_id = q.id and v.user_id = auth.uid())
        then (select count(*) from public.poll_votes v where v.poll_id = q.id) else null end,
      'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'position', o.position,
        'votes', case when exists(select 1 from public.poll_votes v where v.poll_id = q.id and v.user_id = auth.uid())
          then (select count(*) from public.poll_votes v where v.option_id = o.id and v.poll_id = q.id) else null end)
        order by o.position) from public.poll_options o where o.poll_id = q.id)
    ) from public.polls q where q.post_id = p.id)
  ) from public.posts p where p.id = p_id
$$;
revoke all on function private.post_payload(uuid) from public, anon, authenticated;

create function public.get_post(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_member();
  return private.post_payload(p_id);
end $$;

create function public.get_feed(p_sort text default 'latest', p_category text default null, p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform private.require_member();
  if p_sort is null or p_sort not in ('latest','trending') or p_page is null or p_page not between 0 and 10000 or
     (p_category is not null and p_category not in ('Confession','Hot Take','Funny','Question','General')) then
    raise exception 'Invalid feed filter or page.' using errcode = '22023';
  end if;
  -- Seven-day *current* reactions / extant comments, decayed by post age.
  -- Only the selected 20 posts are hydrated. No actor IDs leave the database.
  with ranked as (
    select p.id, p.created_at,
      case when p_sort = 'trending' then
        (1.0 + (select count(*) from public.reactions r where r.post_id = p.id and r.updated_at >= now() - interval '7 days')
        + 2.0 * (select count(*) from public.comments c where c.post_id = p.id and c.created_at >= now() - interval '7 days'))
        / power(greatest(0, extract(epoch from (now() - p.created_at)) / 3600.0) + 2, 1.2)
      else 0 end as score
    from public.posts p where p_category is null or p.category = p_category
  ), page as (
    select * from ranked order by score desc, created_at desc, id desc limit 21 offset p_page * 20
  ), visible as (
    select * from page order by score desc, created_at desc, id desc limit 20
  ) select jsonb_build_object(
    'items', coalesce((select jsonb_agg(private.post_payload(v.id) order by v.score desc, v.created_at desc, v.id desc) from visible v), '[]'::jsonb),
    'has_more', (select count(*) > 20 from page)
  ) into v_result;
  return v_result;
end $$;

create function public.get_comments(p_post_id uuid, p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform private.require_member();
  if p_page is null or p_page not between 0 and 10000 then raise exception 'Invalid page.' using errcode = '22023'; end if;
  with page as (
    select c.* from public.comments c where c.post_id = p_post_id order by c.created_at, c.id limit 21 offset p_page * 20
  ), visible as (
    select * from page order by created_at, id limit 20
  ) select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', v.id, 'post_id', v.post_id, 'author_alias', v.author_alias, 'content', v.content,
      'created_at', v.created_at, 'updated_at', v.updated_at, 'is_owner', v.author_alias = private.my_alias()
    ) order by v.created_at, v.id) from visible v), '[]'::jsonb),
    'has_more', (select count(*) > 20 from page)
  ) into v_result;
  return v_result;
end $$;

create function public.get_reports(p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform private.require_admin();
  if p_page is null or p_page not between 0 and 10000 then raise exception 'Invalid page.' using errcode = '22023'; end if;
  with page as (
    select r.id, r.post_id, r.reason, r.created_at from public.reports r
    where r.status = 'open' order by r.created_at desc, r.id desc limit 21 offset p_page * 20
  ), visible as (
    select * from page order by created_at desc, id desc limit 20
  ) select jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', v.id, 'post_id', v.post_id, 'reason', v.reason, 'created_at', v.created_at,
      'post', private.post_payload(v.post_id)
    ) order by v.created_at desc, v.id desc) from visible v), '[]'::jsonb),
    'has_more', (select count(*) > 20 from page)
  ) into v_result;
  return v_result;
end $$;

revoke all on function public.get_post(uuid), public.get_feed(text,text,integer), public.get_comments(uuid,integer), public.get_reports(integer) from public, anon, authenticated;
grant execute on function public.get_post(uuid), public.get_feed(text,text,integer), public.get_comments(uuid,integer), public.get_reports(integer) to authenticated;
commit;
