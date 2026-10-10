-- Run AFTER schema.sql. Restrict access to service_role.
create table if not exists ai_grades (
 id uuid primary key default gen_random_uuid(), work_id uuid not null unique references skill_work(id) on delete cascade,
 student_id uuid not null references profiles(id) on delete cascade,
 class_id uuid not null references classes(id) on delete cascade,
 skill text not null check(skill in ('writing','speaking')),
 status text not null default 'processing' check(status in ('processing','completed','failed')),
 feedback jsonb, transcript text, error_message text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists ai_grades_student_idx on ai_grades(student_id,created_at desc);
create index if not exists ai_grades_class_idx on ai_grades(class_id,created_at desc);
alter table ai_grades enable row level security;
-- Atomic claim ensures concurrent clicks cannot bypass quotas. Failed attempts can be retried.
create or replace function public.claim_ai_grade(p_work uuid,p_student uuid,p_class uuid,p_skill text,p_week_limit integer,p_month_limit integer)
returns text language plpgsql security definer set search_path=public as $$
declare used_week integer; used_month integer; current_status text;
begin
 if p_skill not in ('writing','speaking') or p_week_limit<0 or p_week_limit>20 or p_month_limit<0 or p_month_limit>500 then raise exception 'Invalid limits';end if;
 perform pg_advisory_xact_lock(hashtext(p_student::text));
 select status into current_status from ai_grades where work_id=p_work;
 if current_status='completed' then return 'completed';end if;
 if current_status='processing' then return 'processing';end if;
 select count(*) into used_week from ai_grades where student_id=p_student and skill=p_skill and status in ('processing','completed') and created_at>=date_trunc('week',now());
 select count(*) into used_month from ai_grades where class_id=p_class and status in ('processing','completed') and created_at>=date_trunc('month',now());
 if used_week>=p_week_limit then return 'weekly_limit';end if;
 if used_month>=p_month_limit then return 'monthly_limit';end if;
 insert into ai_grades(work_id,student_id,class_id,skill,status,created_at,updated_at)
 values(p_work,p_student,p_class,p_skill,'processing',now(),now())
 on conflict(work_id) do update set status='processing',error_message=null,created_at=now(),updated_at=now();
 return 'claimed';
end $$;
revoke all on function public.claim_ai_grade(uuid,uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.claim_ai_grade(uuid,uuid,uuid,text,integer,integer) to service_role;
