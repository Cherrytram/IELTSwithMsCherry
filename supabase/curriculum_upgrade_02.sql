-- Upgrade 02: run AFTER schema.sql. Does not remove legacy Cambridge content.
create table if not exists courses (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references classes(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '',
 position integer not null default 0, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists course_units (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references courses(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '',
 position integer not null default 0, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists lessons (
 id uuid primary key default gen_random_uuid(), unit_id uuid not null references course_units(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160), description text not null default '',
 position integer not null default 0, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists lesson_activities (
 id uuid primary key default gen_random_uuid(), lesson_id uuid not null references lessons(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160),
 skill text not null check(skill in ('reading','listening','writing','speaking','vocabulary')),
 kind text not null check(kind in ('theory','practice','exam','assignment')),
 content jsonb not null default '{}'::jsonb check(jsonb_typeof(content)='object'),
 position integer not null default 0, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists courses_class_order on courses(class_id,position);
create index if not exists course_units_order on course_units(course_id,position);
create index if not exists lessons_order on lessons(unit_id,position);
create index if not exists lesson_activities_order on lesson_activities(lesson_id,position);
alter table courses enable row level security;
alter table course_units enable row level security;
alter table lessons enable row level security;
alter table lesson_activities enable row level security;
-- No direct client policies: access through authenticated, authorized server endpoints only.
-- Legacy content_units remains intact. Migration/import can be performed separately after verification.
