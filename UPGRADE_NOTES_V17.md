# Upgrade 17 — Integration audit and targeted fixes

Base: Upgrade 16. This is a targeted source-level audit, **not** a production-readiness certification.

## Changes

1. `app/api/learning/route.ts`: archived student enrollments are excluded from the learning catalog and denied access to individual activities.
2. `app/api/speaking-upload/route.ts`: archived students cannot upload new Speaking recordings.
3. `app/api/teacher-reports/route.ts`: homework reporting only counts attempts submitted on or after the assignment's `created_at`. Earlier practice attempts no longer make a newly assigned task appear submitted.
4. `app/api/homework/route.ts`: student dashboard filters attempts by each homework assignment's creation time, avoiding false completion from older attempts.

## Test status

- ZIP archive integrity and Python static assertions: verified.
- `npm install`: **blocked** because the environment cannot resolve `registry.npmjs.org` (EAI_AGAIN). Therefore TypeScript, Next.js build and end-to-end tests **have not passed**.
- Supabase SQL migrations and Vercel deployment: **not run**. No production secrets or service credentials were available.

## Important unresolved issues

- Exam expiration relies on a client request to finalize an attempt; there is no server-side scheduled automatic submission after the student closes the browser.
- Repeated homework assignments need an explicit assignment/attempt association for unambiguous tracking. Filtering by `created_at` is an improvement but not a full data-model solution.
- Auth and archived-account enforcement must be audited across *all* legacy API endpoints, not just the two patched above.
- Atomic/idempotent Coins awards, concurrency, content-version snapshots, asset access, rate limits, and Supabase RLS need database-backed integration/security tests.
- IELTS-specific workflows and visuals still have feature gaps noted in previous upgrade documents.

## Deployment checklist

1. In a network-enabled environment: `npm ci` (if a lockfile is available), otherwise `npm install`.
2. Run `npm run typecheck` and `npm run build`; fix all errors before deploying.
3. Apply SQL migrations in order on a **staging** Supabase project, after a backup.
4. Test teacher and student flows, archived student access, retakes, deadlines, rewards and Speaking uploads on staging.
5. Deploy to Vercel preview, then promote only after tests pass.
