# Upgrade 14 — Student Dashboard, Homework & Notifications

## Install
1. Start from this complete Upgrade 14 ZIP (includes upgrades 01–13).
2. Run the previous SQL migrations in their documented order, then `supabase/homework_upgrade_14.sql` in Supabase SQL Editor.
3. Set Supabase environment variables as in DEPLOY_VI.md; run `npm install`, `npm run typecheck`, `npm run build`.
4. Teacher: `/teacher/homework`. Student: `/dashboard`.

## Included
- Teacher creates class-wide or individual homework for published activities with fixed deadlines; deletes assignments; sees counts of submitted/late.
- Student dashboard: homework, overdue/on-time/late labels, Coins balance, notification inbox, mark read.
- Notifications inserted for new homework. Late submission remains allowed and can still receive Coins via existing grading flow.
- Server checks teacher class ownership, student enrollment and published activity ancestry; no direct client database access.

## Known limitations
- Dashboard links to `/learn` rather than deep-linking directly to an activity.
- Notifications are in-app only; scheduled teacher email is not implemented.
- Teacher homework reporting currently shows counts, not Excel/PDF exports.
- No real-time push; dashboard refreshes on page load.
- Homework deadline does not override the activity's own sequential lesson prerequisites.
- Archive/transfer historical enrollment logic needs full integration tests.
- Requires integration testing against real Supabase data; ZIP integrity alone is not sufficient.
