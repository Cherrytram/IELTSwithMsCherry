-- Upgrade 14: run after upgrades 02, 04, 13. Server-only service-role access.
create table if not exists homework_assignments (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references classes(id) on delete cascade,
 activity_id uuid not null references lesson_activities(id) on delete cascade,
 student_id uuid references profiles(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 160),
 instructions text not null default '',
 due_at timestamptz not null,
 created_by uuid not null references profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists homework_by_class on homework_assignments(class_id,due_at);
create index if not exists homework_by_student on homework_assignments(student_id,due_at);
create table if not exists student_notifications (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references profiles(id) on delete cascade,
 title text not null,
 message text not null default '',
 link text not null default '/dashboard',
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists student_notifications_recent on student_notifications(student_id,created_at desc);
alter table homework_assignments enable row level security;
alter table student_notifications enable row level security;
-- No client policies: authorized API routes use service role.
