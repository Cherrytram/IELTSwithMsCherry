# Upgrade 16 — Teacher Homework Reports

Includes all previous upgrades from Upgrade 15.

## Added
- `/teacher/reports`: class-specific report of homework completion and deadlines.
- `/api/teacher-reports`: authenticated teacher-only, class ownership-checked API.
- Export UTF-8 BOM CSV for opening in Excel; neutralize spreadsheet formula injection.
- Browser Print / Save as PDF (not a server-generated PDF).
- On-time / late / overdue / pending status; best graded score; teacher band; attempt count.
- First submitted attempt determines on-time status, so retakes do not erase lateness.

## Setup
No new SQL migration required. Requires the previous migrations including `homework_upgrade_14.sql` and `activity_attempts` from Upgrade 04. Keep Supabase service role key server-side only.

## Known limitations
- CSV is Excel-compatible but **not** native XLSX.
- PDF is generated using the browser's Print → Save as PDF function.
- This report is limited to 500 students, 500 assignments, and 10,000 attempts per request; very large classes require pagination.
- Existing homework uses activity-level attempt matching: if the same activity is assigned multiple times, submissions cannot yet be tied to a specific assignment. An assignment_id should be stored on each attempt in a later migration for accurate repeated-homework tracking.
- Not yet tested against a live Supabase project or Vercel deployment.
