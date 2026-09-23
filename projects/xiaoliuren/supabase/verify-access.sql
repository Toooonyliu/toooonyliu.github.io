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
