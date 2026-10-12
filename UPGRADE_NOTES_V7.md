# Upgrade 07 — Reading / Listening Practice and Exam

- `/learn` now has a question number navigator, answer state, local flag markers, and unanswered-question confirmation.
- Exam starts a server-stored draft on first open. The server computes deadline from immutable `created_at` and activity `content.examMinutes` (default 60 minutes Reading / 30 minutes other skills; max 180).
- Both Practice and Exam autosave answers while online. The Exam countdown persists after page refresh and cannot be reset by refreshing. On reaching zero the browser requests submission; if the browser is closed, submission is finalized only on the next request (not by background cron).
- Server refuses late edits and grades last saved answers after expiry. Audio uses native controls; Reading passages are displayed alongside questions on wide screens.
- **Important limitations**: No dedicated backend background auto-submit worker; no teacher-side duration editor (duration can be set in JSON `examMinutes`); no server-enforced audio controls/transcript restrictions; no rich highlight/dictionary yet. Exam audio should not be assumed secure. Full browser-based end-to-end testing remains required.
- No new SQL migration: reuses `activity_attempts` table from Upgrade 04. Run all SQL upgrades in version order on a backup/test Supabase project.
