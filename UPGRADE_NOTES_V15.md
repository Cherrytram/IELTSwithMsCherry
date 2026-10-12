# Upgrade 15 — Progress, Band Goals, Leaderboard, Achievements

Built on Upgrade 14. All earlier project files are included.

## Install
1. Back up the Supabase database and source repository.
2. Apply `supabase/progress_upgrade_15.sql` after all previous upgrade SQL files.
3. Deploy updated Next.js source with the existing Supabase environment variables.
4. Open `/progress` as a student or teacher. Teacher class selector uses existing `/api/homework` classes action.

## Features
- Student per-skill progress (distinct activities, attempts, average, estimated band).
- Student-editable IELTS band goals for Reading/Listening/Writing/Speaking.
- Weekly and monthly class leaderboards by distinct activities completed in the period.
- Achievement badges based on completion milestones.
- Teacher view of class-level progress.
- Dashboard link to My Progress.

## Limitations and important notes
- Estimates are **not** official IELTS band scores. Reading/Listening conversion is a temporary percentage-to-band mapping; replace with teacher-configurable raw-score mappings before production.
- The leaderboard currently ranks completion counts only; most-improved rankings and per-skill leaderboards remain future work.
- Achievements are derived from submitted attempts, not persisted as unlock records and do not issue Coins.
- Teacher class selection supports up to 300 students / 500 activities / 10,000 submitted attempts per request. Larger reports require pagination/aggregation.
- `enrollments.archived` must be present (added in an earlier upgrade).
- Run `npm install`, `npm run typecheck`, `npm run build`, and real Supabase integration tests before deployment. Do not assume ZIP integrity proves runtime correctness.
