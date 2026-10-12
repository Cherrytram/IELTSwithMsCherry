-- Apply after student_learning_upgrade_04.sql. Keep existing legacy wallet data.
create table if not exists activity_reward_progress (
 student_id uuid not null references profiles(id) on delete cascade,
 activity_id uuid not null references lesson_activities(id) on delete cascade,
 first_reward integer not null default 0,
 best_percent numeric not null default -1,
 bonus_count integer not null default 0 check (bonus_count between 0 and 3),
 primary key(student_id,activity_id)
);
alter table activity_reward_progress enable row level security;
alter table activity_attempts add column if not exists teacher_feedback text;
alter table activity_attempts add column if not exists teacher_rubric jsonb;
alter table activity_attempts add column if not exists teacher_band numeric;
alter table activity_attempts add column if not exists graded_at timestamptz;
alter table activity_attempts drop constraint if exists activity_attempts_status_check;
alter table activity_attempts add constraint activity_attempts_status_check check(status in ('draft','submitted','pending_teacher','graded'));
-- Serialize all payouts for a student/activity; ledger ref is unique and wallet update is atomic.
create or replace function public.award_activity_coins(p_attempt uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare a record; p record; pct numeric; tier integer; delta integer := 0; ref_key text;
begin
 select at.id,at.student_id,at.activity_id,at.status,at.score,at.max_score,at.teacher_band,la.skill
 into a from activity_attempts at join lesson_activities la on la.id=at.activity_id
 where at.id=p_attempt;
 if not found then raise exception 'Attempt not found'; end if;
 if a.status not in ('submitted','graded') then return 0; end if;
 if a.skill in ('writing','speaking') then
  if a.status <> 'graded' or a.teacher_band is null then return 0; end if;
  tier:=case when a.teacher_band<4 then 10 when a.teacher_band<5 then 20 when a.teacher_band<6 then 30 when a.teacher_band<7 then 40 else 50 end;
 else
  if a.max_score is null or a.max_score<=0 then return 0; end if;
  pct:=100*a.score/a.max_score;
  tier:=case when pct<50 then 10 when pct<70 then 20 when pct<85 then 30 else 50 end;
 end if;
 insert into activity_reward_progress(student_id,activity_id) values(a.student_id,a.activity_id) on conflict do nothing;
 select * into p from activity_reward_progress where student_id=a.student_id and activity_id=a.activity_id for update;
 if a.skill in ('writing','speaking') then
  -- Regrades can pay the difference only, never exceed 50 total.
  delta:=greatest(0,tier-p.first_reward);
  if delta>0 then update activity_reward_progress set first_reward=tier where student_id=a.student_id and activity_id=a.activity_id; end if;
 else
  pct:=100*a.score/a.max_score;
  if p.first_reward=0 then
   delta:=tier;
   update activity_reward_progress set first_reward=tier,best_percent=pct where student_id=a.student_id and activity_id=a.activity_id;
  elsif pct>p.best_percent then
   if p.bonus_count<3 then delta:=5; end if;
   update activity_reward_progress set best_percent=pct,bonus_count=least(3,p.bonus_count+1) where student_id=a.student_id and activity_id=a.activity_id;
  end if;
 end if;
 if delta>0 then
  ref_key:='activity:'||a.id::text||':'||case when a.skill in ('writing','speaking') then 'band:'||tier::text else 'attempt' end;
  insert into coin_transactions(student_id,amount,reason,ref) values(a.student_id,delta,'Activity reward',ref_key)
  on conflict(ref) do nothing;
  if found then
   insert into wallets(student_id,balance) values(a.student_id,delta)
   on conflict(student_id) do update set balance=wallets.balance+excluded.balance;
  else delta:=0;
  end if;
 end if;
 return delta;
end $$;
revoke all on function public.award_activity_coins(uuid) from public,anon,authenticated;
grant execute on function public.award_activity_coins(uuid) to service_role;
