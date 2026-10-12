# IELTS Fashion Academy – Upgrade 02

## Implemented
- Additive Supabase schema: `courses`, `course_units`, `lessons`, `lesson_activities` with ordering, publish/draft, indexes, RLS enabled.
- Authenticated `/api/curriculum` CRUD endpoint, teacher-only writes, verifies class ownership through every ancestor, student reads limited to enrolled class and published hierarchy.
- Student activity payload removes answer keys, grading and explanations (defense in depth; teacher grading must be implemented server-side).
- Teacher Studio at `/teacher/curriculum`: create and edit all four hierarchy levels, draft/publish, reorder, delete with confirmation, basic activity JSON editor.
- Preserves legacy Cambridge `content_units` data and legacy routes. No destructive migration.

## Setup
1. Deploy the files into your existing Next.js repository.
2. In Supabase SQL Editor, run `supabase/curriculum_upgrade_02.sql` AFTER `supabase/schema.sql`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
4. Log in as a teacher, create a class if none exists, and visit `/teacher/curriculum`.
5. Publish a Course, its Unit, its Lesson and its Activity to make it visible in curriculum API student reads.

## Still pending / NOT production complete
- Student lesson player is not yet wired to new curriculum tables; existing Cambridge lesson player still uses legacy tables.
- Visual drag-and-drop editor, question types, import Word/PDF, immutable published attempt snapshots, and activity-level progress not implemented yet.
- A course hierarchy can be created and published, but activities are not yet runnable in the student UI.
- Security audit, automated integration tests, schema migrations on real data, fashion PNG layers, coin rules and Vercel deployment remain pending.
- No secrets are included in this package.
