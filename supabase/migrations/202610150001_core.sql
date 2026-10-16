-- GhostPost: one office, pseudonymous to colleagues, not anonymous to the operator.
-- No auth IDs occur in member-visible posts/comments. The private profile is the
-- sole account-to-alias mapping. Browser sessions never use a service-role key.
begin;

create schema if not exists private;
revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
-- Schema USAGE permits narrowly granted policy helpers, NOT table access.
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Match JavaScript trim at the database boundary too: direct RPC callers must
-- not bypass blank-content validation using tabs/newlines or Unicode spaces.
create function private.clean_text(value text) returns text language sql immutable strict set search_path = '' as $$
  select btrim(value, E' \t\n\r\f' || chr(11) || U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;

create table private.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique check (alias ~ '^[a-z]+-[a-z]+-[a-f0-9]{8}$'),
  is_admin boolean not null default false,
  joined_at timestamptz not null default now()
);
create table private.invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (length(code_hash) = 64),
  label text not null default 'Office invitation',
  expires_at timestamptz not null,
  max_uses integer not null check (max_uses between 1 and 10000),
  uses integer not null default 0 check (uses >= 0 and uses <= max_uses),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create function private.my_alias() returns text language sql stable security definer set search_path = '' as $$
  select p.alias from private.profiles p where p.user_id = (select auth.uid())
$$;
create function private.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.profiles p where p.user_id = (select auth.uid()))
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from private.profiles p where p.user_id = (select auth.uid())), false)
$$;
create function private.require_member() returns text language plpgsql stable security definer set search_path = '' as $$
declare v_alias text;
begin
  v_alias := private.my_alias();
  if v_alias is null then raise exception 'Join the office first.' using errcode = '42501'; end if;
  return v_alias;
end $$;
create function private.require_admin() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator access required.' using errcode = '42501'; end if;
end $$;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_alias text not null references private.profiles(alias) on delete cascade,
  content text not null check (char_length(private.clean_text(content)) between 1 and 1000 and content = private.clean_text(content)),
  category text not null check (category in ('Confession','Hot Take','Funny','Question','General')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_alias text not null references private.profiles(alias) on delete cascade,
  content text not null check (char_length(private.clean_text(content)) between 1 and 500 and content = private.clean_text(content)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references private.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('like','laugh','fire','shocked')),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (char_length(private.clean_text(label)) between 1 and 120 and label = private.clean_text(label)),
  position smallint not null check (position between 0 and 3),
  unique (poll_id, position),
  unique (poll_id, id)
);
create unique index poll_distinct_labels on public.poll_options (poll_id, lower(label));
create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references private.profiles(user_id) on delete cascade,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id),
  foreign key (poll_id, option_id) references public.poll_options(poll_id, id) on delete cascade
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references private.profiles(user_id) on delete cascade,
  reason text not null check (reason in ('Spam','Harassment','Inappropriate content','Other')),
  status text not null default 'open' check (status in ('open','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (post_id, reporter_id)
);

create index posts_latest_idx on public.posts (created_at desc, id desc);
create index posts_category_latest_idx on public.posts (category, created_at desc, id desc);
create index comments_post_idx on public.comments (post_id, created_at, id);
create index reactions_recent_idx on public.reactions (updated_at desc, post_id);
create index comments_recent_idx on public.comments (created_at desc, post_id);
create index votes_option_idx on public.poll_votes (poll_id, option_id);
create index reports_queue_idx on public.reports (status, created_at desc, id desc);

alter table private.profiles enable row level security;
alter table private.invitations enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.reports enable row level security;

-- Read policies are the only ordinary table permissions. All writes go through
-- explicit actor-checked RPCs below: no spoofed identity columns or role updates.
create policy member_posts on public.posts for select to authenticated using ((select private.is_member()));
create policy member_comments on public.comments for select to authenticated using ((select private.is_member()));
create policy member_polls on public.polls for select to authenticated using ((select private.is_member()));
create policy member_options on public.poll_options for select to authenticated using ((select private.is_member()));
create policy own_reactions on public.reactions for select to authenticated using ((select private.is_member()) and user_id = (select auth.uid()));
create policy own_votes on public.poll_votes for select to authenticated using ((select private.is_member()) and user_id = (select auth.uid()));
create policy admin_reports on public.reports for select to authenticated using ((select private.is_admin()));

-- Never rely on Supabase's default grants, including its default service access.
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on public.posts, public.comments, public.reactions, public.polls, public.poll_options, public.poll_votes, public.reports from public, anon, authenticated;
grant select on public.posts, public.comments, public.polls, public.poll_options to authenticated;
grant select on public.reactions, public.poll_votes to authenticated;
-- Even the admin table API cannot select reporter account IDs.
grant select (id, post_id, reason, status, created_at, resolved_at) on public.reports to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.my_alias(), private.is_member(), private.is_admin() to authenticated;

create function public.my_membership() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('alias', p.alias, 'is_admin', p.is_admin) from private.profiles p where p.user_id = (select auth.uid())), 'null'::jsonb)
$$;

create function public.join_office(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_invite private.invitations%rowtype; v_alias text;
  v_adjectives text[] := array['chai','midnight','pixel','cosmic','sleepy','velvet','minty','lunar','quiet','electric','tiny','mystic'];
  v_nouns text[] := array['phantom','ghost','bhoot','potato','specter','spirit','cloud','mochi','wisp','noodle','echo','bean'];
begin
  if v_user is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  -- A per-account lock makes retries and simultaneous redemptions idempotent.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 47));
  if private.is_member() then return public.my_membership(); end if;
  if not exists(select 1 from auth.users where id = v_user and email_confirmed_at is not null) then
    raise exception 'Confirm your email before joining.' using errcode = '42501';
  end if;
  if p_code is null or char_length(btrim(p_code)) not between 12 and 128 then
    raise exception 'This invitation is invalid or expired.' using errcode = '22023';
  end if;
  select * into v_invite from private.invitations
    where code_hash = encode(sha256(convert_to(btrim(p_code), 'UTF8')), 'hex') for update;
  if not found or v_invite.revoked or v_invite.expires_at <= now() or v_invite.uses >= v_invite.max_uses then
    raise exception 'This invitation is invalid or expired.' using errcode = '22023';
  end if;
  loop
    v_alias := v_adjectives[1 + floor(random() * array_length(v_adjectives, 1))::integer]
      || '-' || v_nouns[1 + floor(random() * array_length(v_nouns, 1))::integer]
      || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    begin
      insert into private.profiles(user_id, alias) values (v_user, v_alias);
      exit;
    exception when unique_violation then
      -- Random suffix collision: retry; user row is protected by the account lock.
    end;
  end loop;
  update private.invitations set uses = uses + 1 where id = v_invite.id;
  return public.my_membership();
end $$;

-- Privileged operator-only helpers; no keys or invitation plaintext stored here.
create function public.operator_create_invite(p_hash text, p_label text, p_max_uses integer, p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_hash !~ '^[a-f0-9]{64}$' or p_expires_at <= now() then raise exception 'Invalid invitation configuration.'; end if;
  insert into private.invitations(code_hash, label, max_uses, expires_at)
    values (p_hash, left(p_label, 100), p_max_uses, p_expires_at) returning id into v_id;
  return v_id;
end $$;
create function public.operator_set_admin(p_user_id uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.profiles set is_admin = p_admin where user_id = p_user_id;
  if not found then raise exception 'That account must join the office before promotion.'; end if;
end $$;
create function public.operator_revoke_invite(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update private.invitations set revoked = true where id = p_id
$$;

-- One transaction creates the post, poll, and 2-4 options. No partial polls.
create function public.create_post(p_content text, p_category text, p_options text[] default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_alias text := private.require_member(); v_id uuid; v_poll uuid; v_label text; v_position smallint := 0;
begin
  if p_options is not null then
    if cardinality(p_options) not between 2 and 4 or
       (select count(distinct lower(private.clean_text(o))) from unnest(p_options) o) <> cardinality(p_options) or
       exists(select 1 from unnest(p_options) o where o is null or char_length(private.clean_text(o)) not between 1 and 120) then
      raise exception 'Use 2 to 4 different, nonempty poll options.' using errcode = '22023';
    end if;
  end if;
  insert into public.posts(author_alias, content, category) values (v_alias, private.clean_text(p_content), p_category) returning id into v_id;
  if p_options is not null then
    insert into public.polls(post_id) values (v_id) returning id into v_poll;
    foreach v_label in array p_options loop
      insert into public.poll_options(poll_id, label, position) values (v_poll, private.clean_text(v_label), v_position);
      v_position := v_position + 1;
    end loop;
  end if;
  return v_id;
end $$;

create function public.edit_post(p_id uuid, p_content text, p_category text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_alias text := private.require_member(); v_post public.posts%rowtype; v_poll uuid;
begin
  select * into v_post from public.posts where id = p_id for update;
  if not found or v_post.author_alias <> v_alias then raise exception 'You can only edit your own posts.' using errcode = '42501'; end if;
  select id into v_poll from public.polls where post_id = p_id for update;
  if v_poll is not null and exists(select 1 from public.poll_votes where poll_id = v_poll) and private.clean_text(p_content) is distinct from v_post.content then
    raise exception 'A poll question cannot change after someone votes.' using errcode = '22023';
  end if;
  update public.posts set content = private.clean_text(p_content), category = p_category, updated_at = now() where id = p_id;
end $$;
create function public.delete_post(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_alias text := private.require_member();
begin
  delete from public.posts where id = p_id and author_alias = v_alias;
  if not found then raise exception 'You can only delete your own posts.' using errcode = '42501'; end if;
end $$;

create function public.add_comment(p_post_id uuid, p_content text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_alias text := private.require_member(); v_id uuid;
begin
  insert into public.comments(post_id, author_alias, content) values (p_post_id, v_alias, private.clean_text(p_content)) returning id into v_id;
  return v_id;
end $$;
create function public.edit_comment(p_id uuid, p_content text) returns void language plpgsql security definer set search_path = '' as $$
declare v_alias text := private.require_member();
begin
  update public.comments set content = private.clean_text(p_content), updated_at = now() where id = p_id and author_alias = v_alias;
  if not found then raise exception 'You can only edit your own comments.' using errcode = '42501'; end if;
end $$;
create function public.delete_comment(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare v_alias text := private.require_member();
begin
  delete from public.comments where id = p_id and author_alias = v_alias;
  if not found then raise exception 'You can only delete your own comments.' using errcode = '42501'; end if;
end $$;

create function public.set_reaction(p_post_id uuid, p_kind text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_member();
  if p_kind is null then
    delete from public.reactions where post_id = p_post_id and user_id = auth.uid();
  else
    insert into public.reactions(post_id, user_id, kind) values (p_post_id, auth.uid(), p_kind)
    on conflict (post_id, user_id) do update set kind = excluded.kind,
      updated_at = case when public.reactions.kind <> excluded.kind then now() else public.reactions.updated_at end;
  end if;
end $$;
create function public.vote_poll(p_poll_id uuid, p_option_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_member();
  -- Same lock order as edit/delete: parent post, then poll. A voted-on question
  -- cannot race an edit. FK + unique constraints remain the final safeguards.
  perform p.id from public.posts p join public.polls q on q.post_id = p.id where q.id = p_poll_id for update of p;
  perform id from public.polls where id = p_poll_id for update;
  if not found then raise exception 'This poll no longer exists.' using errcode = '22023'; end if;
  insert into public.poll_votes(poll_id, user_id, option_id) values (p_poll_id, auth.uid(), p_option_id);
exception when unique_violation then
  raise exception 'You have already voted in this poll.' using errcode = '23505';
end $$;
create function public.report_post(p_post_id uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_member();
  insert into public.reports(post_id, reporter_id, reason) values (p_post_id, auth.uid(), p_reason);
exception when unique_violation then
  raise exception 'You have already reported this post.' using errcode = '23505';
end $$;

create function public.moderate_report(p_report_id uuid, p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare v_post uuid;
begin
  perform private.require_admin();
  select post_id into v_post from public.reports where id = p_report_id and status = 'open';
  if not found then raise exception 'This report has already been resolved.' using errcode = '22023'; end if;
  if p_action = 'remove' then
    delete from public.posts where id = v_post;
  elsif p_action = 'dismiss' then
    update public.reports set status = 'dismissed', resolved_at = now() where id = p_report_id and status = 'open';
  else raise exception 'Invalid moderation action.' using errcode = '22023';
  end if;
end $$;

-- Explicit execute allowlist: a newly added function must not become callable by
-- accident. Private helpers are not exposed through PostgREST's public schema.
revoke all on function public.my_membership(), public.join_office(text),
 public.operator_create_invite(text,text,integer,timestamptz), public.operator_set_admin(uuid,boolean), public.operator_revoke_invite(uuid),
 public.create_post(text,text,text[]), public.edit_post(uuid,text,text), public.delete_post(uuid),
 public.add_comment(uuid,text), public.edit_comment(uuid,text), public.delete_comment(uuid),
 public.set_reaction(uuid,text), public.vote_poll(uuid,uuid), public.report_post(uuid,text), public.moderate_report(uuid,text)
 from public, anon, authenticated;
grant execute on function public.my_membership(), public.join_office(text),
 public.create_post(text,text,text[]), public.edit_post(uuid,text,text), public.delete_post(uuid),
 public.add_comment(uuid,text), public.edit_comment(uuid,text), public.delete_comment(uuid),
 public.set_reaction(uuid,text), public.vote_poll(uuid,uuid), public.report_post(uuid,text), public.moderate_report(uuid,text)
 to authenticated;
grant execute on function public.operator_create_invite(text,text,integer,timestamptz), public.operator_set_admin(uuid,boolean), public.operator_revoke_invite(uuid) to service_role;

commit;
