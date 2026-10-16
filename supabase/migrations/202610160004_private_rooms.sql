-- General-purpose private rooms. Local implementation; hosted apply needs approval.
-- Preserve original profiles/content in one legacy room. Profiles remain PRIVATE
-- internal accounts for interaction FKs; aliases/roles now belong to memberships.
-- No membership is inferred from a client role, email, provider or global admin flag.
begin;

create table private.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(private.clean_text(name)) between 1 and 60 and name = private.clean_text(name)),
  created_at timestamptz not null default now()
);
create table private.room_memberships (
  room_id uuid not null references private.rooms(id) on delete cascade,
  user_id uuid not null references private.profiles(user_id) on delete cascade,
  alias text not null unique check (alias ~ '^[a-z]+-[a-z]+-[a-f0-9]{8}$'),
  is_moderator boolean not null default false,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, alias)
);
create index memberships_user_active on private.room_memberships(user_id) where active;
alter table private.rooms enable row level security;
alter table private.room_memberships enable row level security;
revoke all on private.rooms, private.room_memberships from public, anon, authenticated;

insert into private.rooms(id,name) values ('00000000-0000-4000-8000-000000000001','Original group');
insert into private.room_memberships(room_id,user_id,alias,is_moderator,joined_at)
select '00000000-0000-4000-8000-000000000001',user_id,alias,is_admin,joined_at from private.profiles;
alter table public.posts add column room_id uuid references private.rooms(id) on delete cascade;
update public.posts set room_id='00000000-0000-4000-8000-000000000001';
alter table public.posts alter column room_id set not null;
alter table public.posts drop constraint posts_author_alias_fkey;
alter table public.posts add constraint posts_room_author_fkey foreign key(room_id,author_alias) references private.room_memberships(room_id,alias) on delete cascade;
alter table public.comments drop constraint comments_author_alias_fkey;
alter table public.comments add constraint comments_author_alias_fkey foreign key(author_alias) references private.room_memberships(alias) on delete cascade;
alter table private.invitations add column room_id uuid references private.rooms(id) on delete cascade;
update private.invitations set room_id='00000000-0000-4000-8000-000000000001';
alter table private.invitations alter column room_id set not null;
create index invitations_room on private.invitations(room_id);
create index posts_room_latest on public.posts(room_id,created_at desc,id desc);
create index posts_room_category on public.posts(room_id,category,created_at desc,id desc);

-- Retired global RPCs must not remain a cross-room back door. Keep their source
-- for migration history only; both old clients and operator scripts fail closed.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
    'my_membership','join_office','operator_create_invite','operator_set_admin','operator_revoke_invite',
    'create_post','edit_post','delete_post','add_comment','edit_comment','delete_comment',
    'set_reaction','vote_poll','report_post','moderate_report','get_post','get_feed','get_comments','get_reports')
  loop execute format('revoke all on function %s from public, anon, authenticated, service_role',f.signature); end loop;
end $$;

create function private.room_alias(p_room_id uuid) returns text language sql stable security definer set search_path='' as $$
  select alias from private.room_memberships where room_id=p_room_id and user_id=auth.uid() and active
$$;
create function private.room_moderator(p_room_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.room_memberships where room_id=p_room_id and user_id=auth.uid() and active and is_moderator)
$$;
create function private.can_read_post(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.posts where id=p_id and private.room_alias(room_id) is not null)
$$;
create function private.can_read_poll(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.polls where id=p_id and private.can_read_post(post_id))
$$;
create function private.can_moderate_post(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.posts where id=p_id and private.room_moderator(room_id))
$$;
-- Mutations lock the membership until commit so leaving cannot race a write.
create function private.require_room(p_room_id uuid,p_moderator boolean default false) returns text language plpgsql security definer set search_path='' as $$
declare m private.room_memberships%rowtype; begin
  select * into m from private.room_memberships where room_id=p_room_id and user_id=auth.uid() and active for share;
  if not found then raise exception 'Join this room first.' using errcode='42501'; end if;
  if p_moderator and not m.is_moderator then raise exception 'Room moderator access required.' using errcode='42501'; end if;
  return m.alias;
end $$;
create function private.require_room_post(p_room_id uuid,p_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare a text; begin
  a:=private.require_room(p_room_id);
  if not exists(select 1 from public.posts where id=p_id and room_id=p_room_id) then raise exception 'Post unavailable in this room.' using errcode='42501'; end if;
  return a;
end $$;

-- No direct writes, no membership enumeration, no reporter account identifiers.
drop policy member_posts on public.posts;
drop policy member_comments on public.comments;
drop policy member_polls on public.polls;
drop policy member_options on public.poll_options;
drop policy own_reactions on public.reactions;
drop policy own_votes on public.poll_votes;
drop policy admin_reports on public.reports;
create policy room_posts on public.posts for select to authenticated using (private.room_alias(room_id) is not null);
create policy room_comments on public.comments for select to authenticated using (private.can_read_post(post_id));
create policy room_polls on public.polls for select to authenticated using (private.can_read_post(post_id));
create policy room_options on public.poll_options for select to authenticated using (private.can_read_poll(poll_id));
create policy room_own_reactions on public.reactions for select to authenticated using (user_id=auth.uid() and private.can_read_post(post_id));
create policy room_own_votes on public.poll_votes for select to authenticated using (user_id=auth.uid() and private.can_read_poll(poll_id));
create policy room_reports on public.reports for select to authenticated using (private.can_moderate_post(post_id));

create function private.new_alias() returns text language sql volatile set search_path='' as $$
  select (array['chai','midnight','pixel','cosmic','sleepy','velvet','minty','lunar','quiet','electric','tiny','mystic'])[1+floor(random()*12)::int]
  ||'-'||(array['phantom','ghost','bhoot','potato','specter','spirit','cloud','mochi','wisp','noodle','echo','bean'])[1+floor(random()*12)::int]
  ||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8)
$$;
create function private.ensure_account() returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501'; end if;
  if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirm your email before joining.' using errcode='42501'; end if;
  if not exists(select 1 from private.profiles where user_id=auth.uid()) then
    loop begin
      insert into private.profiles(user_id,alias) values(auth.uid(),private.new_alias()); exit;
    exception when unique_violation then end; end loop;
  end if;
end $$;
create function private.fresh_admission() returns void language plpgsql set search_path='' as $$
begin
  if current_setting('transaction_isolation') not in ('read committed','read uncommitted') then raise exception 'Room admission requires a fresh transaction. Please try again.' using errcode='25000'; end if;
end $$;
create function private.admit_room(p_room_id uuid,p_moderator boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
  -- Caller already holds account -> room lock. Inactive identities are retained
  -- for past content and reused on rejoin, but do not consume either capacity.
  if (select count(*) from private.room_memberships where user_id=auth.uid() and active)>=6 then raise exception 'You can belong to at most 6 rooms. Leave a room first.'; end if;
  if (select count(*) from private.room_memberships where room_id=p_room_id and active)>=25 then raise exception 'This room has reached its 25-member limit'; end if;
  update private.room_memberships set active=true where room_id=p_room_id and user_id=auth.uid();
  if not found then
    loop begin
      insert into private.room_memberships(room_id,user_id,alias,is_moderator) values(p_room_id,auth.uid(),private.new_alias(),p_moderator); exit;
    exception when unique_violation then end; end loop;
  end if;
end $$;

create function public.my_rooms() returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('room_id',r.id,'name',r.name,'alias',m.alias,'is_admin',m.is_moderator,
    'member_count',(select count(*) from private.room_memberships x where x.room_id=r.id and x.active)) order by r.created_at,r.id),'[]'::jsonb)
  from private.rooms r join private.room_memberships m on m.room_id=r.id where m.user_id=auth.uid() and m.active
$$;
create function public.room_create(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid; begin
  perform private.fresh_admission();
  if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,47));
  perform private.ensure_account();
  insert into private.rooms(name) values(private.clean_text(p_name)) returning id into r;
  perform private.admit_room(r,true);
  return r;
end $$;
create function public.room_join(p_code text) returns uuid language plpgsql security definer set search_path='' as $$
declare r uuid; inv private.invitations%rowtype; h text; begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode='42501'; end if;
  perform private.fresh_admission();
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,47));
  if p_code is null or char_length(btrim(p_code)) not between 12 and 128 then raise exception 'This room key is invalid or expired.' using errcode='22023'; end if;
  h:=encode(sha256(convert_to(btrim(p_code),'UTF8')),'hex');
  select room_id into r from private.invitations where code_hash=h;
  if r is null then raise exception 'This room key is invalid or expired.' using errcode='22023'; end if;
  -- Key lifecycle and all admissions serialize on the room, then re-read the key.
  perform id from private.rooms where id=r for update;
  select * into inv from private.invitations where code_hash=h for update;
  if not found or inv.revoked or inv.expires_at<=now() then raise exception 'This room key is invalid or expired.' using errcode='22023'; end if;
  if exists(select 1 from private.room_memberships where room_id=r and user_id=auth.uid() and active) then return r; end if;
  if inv.uses>=inv.max_uses then raise exception 'This room key is invalid or expired.' using errcode='22023'; end if;
  perform private.ensure_account();
  perform private.admit_room(r);
  update private.invitations set uses=uses+1 where id=inv.id;
  return r;
end $$;
create function public.room_leave(p_room_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,47));
  perform id from private.rooms where id=p_room_id for update;
  perform private.require_room(p_room_id);
  if private.room_moderator(p_room_id) then raise exception 'The room moderator cannot leave the room.' using errcode='22023'; end if;
  update private.room_memberships set active=false where room_id=p_room_id and user_id=auth.uid();
end $$;

-- One current key for newly managed rooms. Generation/rotation revokes ALL old
-- keys (including legacy invitations). Raw cryptographic codes are returned once,
-- never stored. Edit changes label/expiry; renewal extends the current key;
-- revoke disables joining without evicting members. No arbitrary weak passwords.
create function public.room_key(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform private.require_room(p_room_id,true);
  return (select jsonb_build_object('label',label,'expires_at',expires_at,'uses',uses,'revoked',revoked)
    from private.invitations where room_id=p_room_id order by created_at desc,id desc limit 1);
end $$;
create function public.room_key_manage(p_room_id uuid,p_action text,p_label text default 'Room invitation',p_days integer default 30)
returns jsonb language plpgsql security definer set search_path='' as $$
declare k text; inv uuid; begin
  perform id from private.rooms where id=p_room_id for update;
  perform private.require_room(p_room_id,true);
  if p_action is null or p_action not in ('generate','rotate','update','renew','revoke') or p_days is null or p_days not between 1 and 90
    or p_label is null or char_length(private.clean_text(p_label)) not between 1 and 100 then raise exception 'Check the room key settings.' using errcode='22023'; end if;
  if p_action in ('generate','rotate') then
    update private.invitations set revoked=true where room_id=p_room_id;
    k:=replace(gen_random_uuid()::text,'-','');
    insert into private.invitations(room_id,code_hash,label,expires_at,max_uses)
      values(p_room_id,encode(sha256(convert_to(k,'UTF8')),'hex'),private.clean_text(p_label),now()+make_interval(days=>p_days),10000);
    return jsonb_build_object('code',k);
  end if;
  if p_action='revoke' then
    update private.invitations set revoked=true where room_id=p_room_id;
  else
    select id into inv from private.invitations where room_id=p_room_id and not revoked order by created_at desc,id desc limit 1;
    if inv is null then raise exception 'Generate a new key first.' using errcode='22023'; end if;
    update private.invitations set label=private.clean_text(p_label),expires_at=now()+make_interval(days=>p_days) where id=inv;
  end if;
  return jsonb_build_object('code',null);
end $$;

create function public.room_create_post(p_room_id uuid,p_content text,p_category text,p_options text[] default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare a text:=private.require_room(p_room_id); v_id uuid; q uuid; label text; pos smallint:=0; begin
  if p_options is not null and (cardinality(p_options) not between 2 and 4 or
    (select count(distinct lower(private.clean_text(o))) from unnest(p_options) o)<>cardinality(p_options) or
    exists(select 1 from unnest(p_options) o where o is null or char_length(private.clean_text(o)) not between 1 and 120)) then
    raise exception 'Use 2 to 4 different, nonempty poll options.' using errcode='22023'; end if;
  insert into public.posts(room_id,author_alias,content,category) values(p_room_id,a,private.clean_text(p_content),p_category) returning id into v_id;
  if p_options is not null then
    insert into public.polls(post_id) values(v_id) returning id into q;
    foreach label in array p_options loop
      insert into public.poll_options(poll_id,label,position) values(q,private.clean_text(label),pos); pos:=pos+1;
    end loop;
  end if;
  return v_id;
end $$;
create function public.room_edit_post(p_room_id uuid,p_id uuid,p_content text,p_category text) returns void language plpgsql security definer set search_path='' as $$
declare a text:=private.require_room_post(p_room_id,p_id); p public.posts%rowtype; q uuid; begin
  select * into p from public.posts where id=p_id for update;
  if not found or p.author_alias<>a then raise exception 'You can only edit your own posts.' using errcode='42501'; end if;
  select id into q from public.polls where post_id=p_id for update;
  if q is not null and exists(select 1 from public.poll_votes where poll_id=q) and private.clean_text(p_content) is distinct from p.content then
    raise exception 'A poll question cannot change after someone votes.' using errcode='22023'; end if;
  update public.posts set content=private.clean_text(p_content),category=p_category,updated_at=now() where id=p_id;
end $$;
create function public.room_delete_post(p_room_id uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a text:=private.require_room_post(p_room_id,p_id); begin
  delete from public.posts where id=p_id and author_alias=a;
  if not found then raise exception 'You can only delete your own posts.' using errcode='42501'; end if;
end $$;
create function public.room_add_comment(p_room_id uuid,p_post_id uuid,p_content text) returns uuid language plpgsql security definer set search_path='' as $$
declare a text:=private.require_room_post(p_room_id,p_post_id); c uuid; begin
  insert into public.comments(post_id,author_alias,content) values(p_post_id,a,private.clean_text(p_content)) returning id into c; return c;
end $$;
create function public.room_edit_comment(p_room_id uuid,p_id uuid,p_content text) returns void language plpgsql security definer set search_path='' as $$
declare a text:=private.require_room(p_room_id); begin
  update public.comments c set content=private.clean_text(p_content),updated_at=now() where c.id=p_id and c.author_alias=a and exists(select 1 from public.posts p where p.id=c.post_id and p.room_id=p_room_id);
  if not found then raise exception 'You can only edit your own comments.' using errcode='42501'; end if;
end $$;
create function public.room_delete_comment(p_room_id uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a text:=private.require_room(p_room_id); begin
  delete from public.comments c where c.id=p_id and c.author_alias=a and exists(select 1 from public.posts p where p.id=c.post_id and p.room_id=p_room_id);
  if not found then raise exception 'You can only delete your own comments.' using errcode='42501'; end if;
end $$;
create function public.room_set_reaction(p_room_id uuid,p_post_id uuid,p_kind text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_room_post(p_room_id,p_post_id);
  if p_kind is null then delete from public.reactions where post_id=p_post_id and user_id=auth.uid(); else
    insert into public.reactions(post_id,user_id,kind) values(p_post_id,auth.uid(),p_kind)
    on conflict(post_id,user_id) do update set kind=excluded.kind,updated_at=case when public.reactions.kind<>excluded.kind then now() else public.reactions.updated_at end;
  end if;
end $$;
create function public.room_vote_poll(p_room_id uuid,p_poll_id uuid,p_option_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
  select post_id into p from public.polls where id=p_poll_id;
  perform private.require_room_post(p_room_id,p);
  perform id from public.posts where id=p for update;
  perform id from public.polls where id=p_poll_id for update;
  if not found then raise exception 'This poll no longer exists.' using errcode='22023'; end if;
  insert into public.poll_votes(poll_id,user_id,option_id) values(p_poll_id,auth.uid(),p_option_id);
exception when unique_violation then raise exception 'You have already voted in this poll.' using errcode='23505';
end $$;
create function public.room_report_post(p_room_id uuid,p_post_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_room_post(p_room_id,p_post_id);
  insert into public.reports(post_id,reporter_id,reason) values(p_post_id,auth.uid(),p_reason);
exception when unique_violation then raise exception 'You have already reported this post.' using errcode='23505';
end $$;
create function public.room_moderate_report(p_room_id uuid,p_report_id uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare p uuid; begin
  perform private.require_room(p_room_id,true);
  select r.post_id into p from public.reports r join public.posts x on x.id=r.post_id where r.id=p_report_id and r.status='open' and x.room_id=p_room_id;
  if not found then raise exception 'Report unavailable in this room.' using errcode='42501'; end if;
  if p_action='remove' then delete from public.posts where id=p;
  elsif p_action='dismiss' then update public.reports set status='dismissed',resolved_at=now() where id=p_report_id;
  else raise exception 'Invalid moderation action.' using errcode='22023'; end if;
end $$;

-- Reuse the existing aggregate payload, but bind ownership to this room's alias.
-- This private helper has no API grant; every public reader checks room access.
create function private.room_payload(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select private.post_payload(p.id)||jsonb_build_object('room_id',p.room_id,'is_owner',p.author_alias=private.room_alias(p.room_id)) from public.posts p where p.id=p_id
$$;
create function public.room_post(p_room_id uuid,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if private.room_alias(p_room_id) is null then raise exception 'Join this room first.' using errcode='42501'; end if;
  return (select private.room_payload(id) from public.posts where id=p_id and room_id=p_room_id);
end $$;
create function public.room_feed(p_room_id uuid,p_sort text default 'latest',p_category text default null,p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
  if private.room_alias(p_room_id) is null then raise exception 'Join this room first.' using errcode='42501'; end if;
  if p_sort is null or p_sort not in ('latest','trending') or p_page is null or p_page not between 0 and 10000 or (p_category is not null and p_category not in ('Confession','Hot Take','Funny','Question','General')) then raise exception 'Invalid feed filter or page.' using errcode='22023'; end if;
  with ranked as (
    select p.id,p.created_at,case when p_sort='trending' then
      (1.0+(select count(*) from public.reactions r where r.post_id=p.id and r.updated_at>=now()-interval '7 days')
      +2.0*(select count(*) from public.comments c where c.post_id=p.id and c.created_at>=now()-interval '7 days'))
      /power(greatest(0,extract(epoch from(now()-p.created_at))/3600.0)+2,1.2) else 0 end as score
    from public.posts p where p.room_id=p_room_id and (p_category is null or p.category=p_category)
  ), page as (select * from ranked order by score desc,created_at desc,id desc limit 21 offset p_page*20),
  visible as (select * from page order by score desc,created_at desc,id desc limit 20)
  select jsonb_build_object('items',coalesce((select jsonb_agg(private.room_payload(v.id) order by v.score desc,v.created_at desc,v.id desc) from visible v),'[]'::jsonb),'has_more',(select count(*)>20 from page)) into result;
  return result;
end $$;
create function public.room_comments(p_room_id uuid,p_post_id uuid,p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; a text:=private.room_alias(p_room_id); begin
  if a is null or not exists(select 1 from public.posts where id=p_post_id and room_id=p_room_id) then raise exception 'Post unavailable in this room.' using errcode='42501'; end if;
  if p_page is null or p_page not between 0 and 10000 then raise exception 'Invalid page.' using errcode='22023'; end if;
  with page as (select * from public.comments where post_id=p_post_id order by created_at,id limit 21 offset p_page*20),
  visible as (select * from page order by created_at,id limit 20)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'post_id',v.post_id,'author_alias',v.author_alias,'content',v.content,'created_at',v.created_at,'updated_at',v.updated_at,'is_owner',v.author_alias=a) order by v.created_at,v.id) from visible v),'[]'::jsonb),'has_more',(select count(*)>20 from page)) into result;
  return result;
end $$;
create function public.room_reports(p_room_id uuid,p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
  if not private.room_moderator(p_room_id) then raise exception 'Room moderator access required.' using errcode='42501'; end if;
  if p_page is null or p_page not between 0 and 10000 then raise exception 'Invalid page.' using errcode='22023'; end if;
  with page as (select r.* from public.reports r join public.posts p on p.id=r.post_id where p.room_id=p_room_id and r.status='open' order by r.created_at desc,r.id desc limit 21 offset p_page*20),
  visible as (select * from page order by created_at desc,id desc limit 20)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'post_id',v.post_id,'reason',v.reason,'created_at',v.created_at,'post',private.room_payload(v.post_id)) order by v.created_at desc,v.id desc) from visible v),'[]'::jsonb),'has_more',(select count(*)>20 from page)) into result;
  return result;
end $$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.room_alias(uuid),private.can_read_post(uuid),private.can_read_poll(uuid),private.can_moderate_post(uuid) to authenticated;
-- Explicit grant list, rather than a wildcard granting future room functions.
revoke all on function public.my_rooms(),public.room_create(text),public.room_join(text),public.room_leave(uuid),public.room_key(uuid),public.room_key_manage(uuid,text,text,integer),
 public.room_create_post(uuid,text,text,text[]),public.room_edit_post(uuid,uuid,text,text),public.room_delete_post(uuid,uuid),public.room_add_comment(uuid,uuid,text),public.room_edit_comment(uuid,uuid,text),public.room_delete_comment(uuid,uuid),
 public.room_set_reaction(uuid,uuid,text),public.room_vote_poll(uuid,uuid,uuid),public.room_report_post(uuid,uuid,text),public.room_moderate_report(uuid,uuid,text),public.room_post(uuid,uuid),public.room_feed(uuid,text,text,integer),public.room_comments(uuid,uuid,integer),public.room_reports(uuid,integer) from public,anon,authenticated;
grant execute on function public.my_rooms(),public.room_create(text),public.room_join(text),public.room_leave(uuid),public.room_key(uuid),public.room_key_manage(uuid,text,text,integer),
 public.room_create_post(uuid,text,text,text[]),public.room_edit_post(uuid,uuid,text,text),public.room_delete_post(uuid,uuid),public.room_add_comment(uuid,uuid,text),public.room_edit_comment(uuid,uuid,text),public.room_delete_comment(uuid,uuid),
 public.room_set_reaction(uuid,uuid,text),public.room_vote_poll(uuid,uuid,uuid),public.room_report_post(uuid,uuid,text),public.room_moderate_report(uuid,uuid,text),public.room_post(uuid,uuid),public.room_feed(uuid,text,text,integer),public.room_comments(uuid,uuid,integer),public.room_reports(uuid,integer) to authenticated;
commit;
