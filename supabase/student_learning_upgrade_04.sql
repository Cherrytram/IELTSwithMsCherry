-- Run after curriculum_upgrade_02.sql.
create table if not exists activity_attempts (
 id uuid primary key default gen_random_uuid(),
 activity_id uuid not null references lesson_activities(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'draft' check(status in ('draft','submitted','pending_teacher')),
 answers jsonb not null default '{}'::jsonb check(jsonb_typeof(answers)='object'),
 result jsonb,
 score numeric,
 max_score numeric,
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists activity_attempts_student_idx on activity_attempts(student_id,activity_id,created_at desc);
create unique index if not exists activity_attempts_one_draft on activity_attempts(student_id,activity_id) where status='draft';
alter table activity_attempts enable row level security;
-- All access goes through the server API with verified auth and enrollment.
