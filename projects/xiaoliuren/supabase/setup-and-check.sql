-- Ask: create private history storage, then verify account isolation.
-- Paste the entire file into Supabase SQL Editor and click Run.
-- Expected final output: RLS checks passed.

-- Run once in your Supabase project's SQL Editor. No service-role key is used by the website.
begin;
create table if not exists public.ask_readings (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 120),
 payload jsonb not null check (
   jsonb_typeof(payload) = 'object' and
   payload ?& array['id','question','date','clock','timeZone','hour','timePalace','lunar','hourIndex','stages','category'] and
   jsonb_typeof(payload->'id') = 'string' and payload->>'id' = id and
   jsonb_typeof(payload->'question') = 'string' and
   length(payload->>'question') between 1 and 300 and
   octet_length(payload::text) <= 20000
 ),
 review jsonb not null default '{"outcome":"pending","note":"","actualDate":""}'::jsonb check (
   jsonb_typeof(review) = 'object' and review ?& array['outcome','note','actualDate'] and
   jsonb_typeof(review->'outcome') = 'string' and review->>'outcome' in ('pending','matched','partial','missed','unclear') and
   jsonb_typeof(review->'note') = 'string' and length(review->>'note') <= 2000 and
   jsonb_typeof(review->'actualDate') = 'string' and
   (review->>'actualDate' = '' or review->>'actualDate' ~ '^\d{4}-\d{2}-\d{2}$') and
   octet_length(review::text) <= 16000
 ),
 created_at timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.ask_readings enable row level security;
alter table public.ask_readings force row level security;
revoke all on public.ask_readings from public, anon, authenticated;
grant select,insert,delete on public.ask_readings to authenticated;
grant update(review) on public.ask_readings to authenticated;
create policy "Read own readings" on public.ask_readings for select to authenticated using ((select auth.uid())=user_id);
create policy "Create own readings" on public.ask_readings for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Review own readings" on public.ask_readings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Delete own readings" on public.ask_readings for delete to authenticated using ((select auth.uid())=user_id);
create index if not exists ask_readings_owner_date on public.ask_readings(user_id,created_at desc,id);
commit;

-- Run after schema.sql. Everything below is rolled back; no email is sent.
begin;
insert into auth.users(id) values
 ('c707b56e-a4e3-4501-88d9-46be809ae001'),
 ('c707b56e-a4e3-4501-88d9-46be809ae002');
set local role authenticated;
select set_config('request.jwt.claim.sub','c707b56e-a4e3-4501-88d9-46be809ae001',true);
insert into public.ask_readings(user_id,id,payload) values (
 'c707b56e-a4e3-4501-88d9-46be809ae001','rls-check',
 '{"id":"rls-check","question":"Permission test","date":"2026-09-22","clock":"12:00","timeZone":"UTC","hour":12,"timePalace":0,"lunar":{"month":1,"day":1,"text":"正月初一"},"hourIndex":7,"stages":[{"start":0,"count":1,"end":0},{"start":0,"count":1,"end":0},{"start":0,"count":7,"end":0}],"category":"daily"}'
);
do $$ begin
 if (select count(*) from public.ask_readings where id='rls-check') <> 1 then raise exception 'Owner cannot read own record'; end if;
 update public.ask_readings set review='{"outcome":"matched","note":"owner review","actualDate":""}' where id='rls-check';
 if not found then raise exception 'Owner cannot update own review'; end if;
 begin
  update public.ask_readings set user_id='c707b56e-a4e3-4501-88d9-46be809ae002' where id='rls-check';
  raise exception 'Owner field unexpectedly writable';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','c707b56e-a4e3-4501-88d9-46be809ae002',true);
do $$ begin
 if exists(select 1 from public.ask_readings where id='rls-check') then raise exception 'Cross-account read allowed'; end if;
 update public.ask_readings set review='{"outcome":"missed","note":"intrusion","actualDate":""}' where id='rls-check';
 if found then raise exception 'Cross-account update allowed'; end if;
 delete from public.ask_readings where id='rls-check';
 if found then raise exception 'Cross-account delete allowed'; end if;
 begin
  insert into public.ask_readings(user_id,id,payload) values (
   'c707b56e-a4e3-4501-88d9-46be809ae001','forged-owner',
   '{"id":"forged-owner","question":"test","date":"2026-09-22","clock":"12:00","timeZone":"UTC","hour":12,"timePalace":0,"lunar":{},"hourIndex":7,"stages":[],"category":"daily"}'
  );
  raise exception 'Cross-account insert allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.ask_readings;
  raise exception 'Anonymous read allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'RLS checks passed' as result;
