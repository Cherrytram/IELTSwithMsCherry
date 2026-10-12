-- Run after upgrades 02 and 04. No direct client access: authorized server API only.
create table if not exists student_band_goals (
 student_id uuid not null references profiles(id) on delete cascade,
 skill text not null check(skill in ('reading','listening','writing','speaking')),
 target_band numeric(3,1) not null check(target_band between 0 and 9 and target_band*2=trunc(target_band*2)),
 updated_at timestamptz not null default now(),
 primary key(student_id,skill)
);
alter table student_band_goals enable row level security;
