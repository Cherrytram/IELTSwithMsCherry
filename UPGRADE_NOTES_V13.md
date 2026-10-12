# Upgrade 13 — Student accounts

## Added
- `/teacher/students` teacher roster, bulk CSV-text import (up to 100), initial credentials CSV download, password reset, archive/reactivate, class transfer.
- `/api/students` server-side teacher authorization, generated initial passwords, idempotent duplicate detection, account cleanup on failed enrollment creation.
- Student password change API (`change_password`) through Supabase Auth, without forced first-login change.
- `supabase/student_accounts_upgrade_13.sql` adds `enrollments.archived`.

## Installation
1. Back up Supabase and source. Apply migrations from prior versions, then run `student_accounts_upgrade_13.sql` in SQL Editor.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` as in existing deployment docs.
3. Install dependencies, run `npm run typecheck` and `npm run build`, test with a teacher and student account.
4. Visit `/teacher/students`, select a class, paste `ST001,Student Name` per line, create, and **download initial credentials immediately**.

## Limitations and safety
- Bulk import currently supports pasted comma-separated rows, not direct XLSX upload. Excel can export CSV.
- The class transfer changes the enrollment without rewriting historical submission class identifiers; reporting across class transfers should be audited before production use.
- Archive is an enrollment flag, not a global Auth sign-in block. Old learning routes may still allow archived enrollments; full lock enforcement is pending.
- No true Excel XLSX export yet; CSV is compatible with Excel.
- Teacher password resets are immediately effective; distribute credentials securely.
- No database-integrated tests have been performed.
