# Upgrade 04 – Student learning (initial integration)

## Added
- `/learn` student catalog and lesson/activity renderer for published content.
- `/api/learning` server endpoint: class enrollment check, ancestor publication check, answer-key redaction, save practice drafts, submit attempts, automatic scoring for multiple choice / short answer / true-false, and attempt history.
- `supabase/student_learning_upgrade_04.sql` for student attempts.

## Setup
1. Preserve current environment settings; never commit `.env` or service-role secrets.
2. Run `schema.sql`, then `curriculum_upgrade_02.sql`, then `student_learning_upgrade_04.sql` in the appropriate Supabase database (only apply scripts not already run).
3. Deploy this code; student route: `/learn`. Teacher route: `/teacher/curriculum`.

## Known limitations — not production-ready
- Exam timer / server-side time limits are NOT implemented. Do not treat this as a secure timed IELTS exam.
- Recording-type questions are disabled in this learning page. Existing Speaking submission remains separate.
- Teacher rubric grading of new `activity_attempts`, coins credit, sequential unlocking, theory completion, automatic background autosave, and offline sync are NOT yet integrated.
- Writing text can be submitted and is marked `pending_teacher`, but teacher grading for these new attempts requires a later integration.
- Results show answer keys only after submission. Do not expose grading via direct client database access.
- SQL and TypeScript build require testing in a real configured environment.
