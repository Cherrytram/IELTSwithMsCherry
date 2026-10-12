# Upgrade 05 – Teacher grading and activity rewards

## Install
1. Apply prior migrations in order: `schema.sql`, `curriculum_upgrade_02.sql`, `student_learning_upgrade_04.sql`.
2. Run `supabase/grading_rewards_upgrade_05.sql` in Supabase SQL Editor.
3. Deploy this full source tree with server-side environment variables. Do not put the service-role key in NEXT_PUBLIC variables.
4. Open `/teacher/grading` as the teacher to grade Writing/Speaking; students continue at `/learn`.

## Included
- Teacher-only list of Writing/Speaking attempts from teacher-owned classes, four 0–9 half-band rubric fields, feedback, computed overall band.
- Atomic SQL RPC with serialized first-attempt reward, three improved-personal-best bonuses (+5 each) for auto-graded Reading/Listening/Vocabulary and band-tier reward (with positive regrade difference) for teacher-graded Writing/Speaking.
- Coins are credited to the existing wallet and unique transaction ledger; old Cambridge reward path is not modified.

## Known limitations / not production-ready
- No actual Speaking recording upload in the new `/learn` flow yet; recording questions still blocked there.
- Reward RPC must be installed before attempting new objective submissions.
- Draft autosave, server-timed Exam, teacher feedback display in student history, unlock sequencing, full IELTS question formats, media library, and end-to-end tests remain unfinished.
- This migration is designed for new curriculum activities; does not retroactively pay old attempts.
- Verify permissions and run database tests on a staging Supabase project before production deployment.
