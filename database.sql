-- Run once in your own Supabase project's SQL Editor.
-- Screenshots are included as base64 in each user's private JSON journal.
create table public.trade_journals (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint journal_shape check (jsonb_typeof(payload->'entries') = 'array' and jsonb_typeof(payload->'settings') = 'object'),
  constraint journal_size check (octet_length(payload::text) <= 67108864)
);
alter table public.trade_journals enable row level security;
revoke all on public.trade_journals from anon, authenticated;
grant select on public.trade_journals to authenticated;
create policy "Read own journal" on public.trade_journals for select to authenticated
  using ((select auth.uid()) = owner_id);

-- Writes go through an atomic revision check. No browser can choose another owner.
create function public.save_trade_journal(expected_revision bigint, journal jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); next_revision bigint;
begin
  if uid is null then raise exception 'Sign-in required'; end if;
  if expected_revision = 0 then
    insert into public.trade_journals(owner_id, payload) values (uid, journal)
      on conflict (owner_id) do nothing returning revision into next_revision;
  else
    update public.trade_journals set payload = journal, revision = revision + 1, updated_at = now()
      where owner_id = uid and revision = expected_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'SYNC_CONFLICT: Journal changed on another device. Reload the journal before retrying.'; end if;
  return next_revision;
end $$;
revoke all on function public.save_trade_journal(bigint, jsonb) from public, anon;
grant execute on function public.save_trade_journal(bigint, jsonb) to authenticated;
