-- Targeted migration: at most 25 OFFICE memberships (including administrators),
-- not 25 Auth accounts. No existing rows/aliases/roles/content are modified.
-- Apply to hosted Supabase only after explicit operator authorization.
begin;

create or replace function public.join_office(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_invite private.invitations%rowtype; v_alias text;
  v_adjectives text[] := array['chai','midnight','pixel','cosmic','sleepy','velvet','minty','lunar','quiet','electric','tiny','mystic'];
  v_nouns text[] := array['phantom','ghost','bhoot','potato','specter','spirit','cloud','mochi','wisp','noodle','echo','bean'];
begin
  if v_user is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  -- Preserve retry safety and the original per-account lock. Existing members
  -- return before invitation/confirmation/cap checks, even at or above capacity.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 47));
  if private.is_member() then return public.my_membership(); end if;

  -- Google verified emails are confirmed by Supabase Auth's OAuth exchange.
  -- Do NOT trust raw_user_meta_data.email_verified, names, domains, or provider
  -- labels. Password accounts still require their real email confirmation.
  if not exists(select 1 from auth.users where id = v_user and email_confirmed_at is not null) then
    raise exception 'Confirm your email before joining.' using errcode = '42501';
  end if;
  if p_code is null or char_length(btrim(p_code)) not between 12 and 128 then
    raise exception 'This invitation is invalid or expired.' using errcode = '22023';
  end if;

  -- All new admissions lock in this order: account -> office -> invitation.
  -- Two-int advisory keys occupy a different namespace from the original bigint
  -- account key. No caller-controlled value changes the shared office lock.
  -- READ COMMITTED (PostgREST default) gives the count below a fresh snapshot
  -- after lock acquisition. Refuse snapshot-isolated new admissions rather than
  -- permit a stale REPEATABLE READ snapshot to over-admit. Existing retries work.
  if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
    raise exception 'Office admission requires a fresh transaction. Please try again.' using errcode = '25000';
  end if;
  perform pg_advisory_xact_lock(704318, 25);
  select * into v_invite from private.invitations
    where code_hash = encode(sha256(convert_to(btrim(p_code), 'UTF8')), 'hex') for update;
  if not found or v_invite.revoked or v_invite.expires_at <= now() or v_invite.uses >= v_invite.max_uses then
    raise exception 'This invitation is invalid or expired.' using errcode = '22023';
  end if;

  -- Across every invitation. Administrators count; unrelated Auth accounts do not.
  if (select count(*) from private.profiles) >= 25 then
    raise exception 'This office has reached its 25-member limit' using errcode = 'P0001';
  end if;
  loop
    v_alias := v_adjectives[1 + floor(random() * array_length(v_adjectives, 1))::integer]
      || '-' || v_nouns[1 + floor(random() * array_length(v_nouns, 1))::integer]
      || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    begin
      insert into private.profiles(user_id, alias) values (v_user, v_alias);
      exit;
    exception when unique_violation then
      -- Preserve the existing collision retry; account lock prevents user races.
    end;
  end loop;
  -- Same transaction as admission: a failed/cancelled join leaves both unchanged.
  update private.invitations set uses = uses + 1 where id = v_invite.id;
  return public.my_membership();
end $$;

-- Preserve the narrow API grant; do not grant direct profile writes or new reads.
revoke all on function public.join_office(text) from public, anon, authenticated;
grant execute on function public.join_office(text) to authenticated;

do $$
begin
  if (select count(*) from private.profiles) > 25 then
    raise notice 'Office already exceeds 25 members. All existing memberships are preserved; new admission is blocked.';
  end if;
end $$;
commit;
