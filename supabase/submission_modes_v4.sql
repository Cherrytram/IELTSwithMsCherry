-- Run after schema.sql and ai_v2.sql. Existing V3 works default to teacher-only.
alter table public.skill_work add column if not exists submission_mode text not null default 'teacher';
alter table public.skill_work add column if not exists submission_status text not null default 'submitted_to_teacher';
alter table public.skill_work drop constraint if exists skill_work_submission_mode_check;
alter table public.skill_work add constraint skill_work_submission_mode_check check (submission_mode in ('teacher','ai'));
alter table public.skill_work drop constraint if exists skill_work_submission_status_check;
alter table public.skill_work add constraint skill_work_submission_status_check check (submission_status in ('submitted_to_teacher','awaiting_ai'));
create index if not exists skill_work_class_mode_idx on public.skill_work(class_id,submission_mode,created_at desc);
