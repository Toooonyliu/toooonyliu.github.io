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
