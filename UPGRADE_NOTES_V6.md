# IELTS Fashion Academy — Upgrade 06

Based on Upgrade 05; includes all prior source files and SQL migrations.

## Changes
- Student `/learn`: Speaking recording using browser MediaRecorder and MP3/M4A/WAV/WebM upload, playback before submission, and replacement before submit.
- Authenticated `/api/speaking-upload` validates published activity, question, enrollment, MIME type and 15MB file limit, stores private media under student/activity/question path.
- Authenticated `/api/teacher-recording` checks teacher's class ownership before generating a 10-minute signed playback URL.
- Student `/learn`: debounced Practice autosave (1.8 seconds), explicit theory completion, teacher feedback and band in attempt history.
- `/api/learning`: enforce sequential activities within each lesson without any minimum score, validate student-owned recording path, complete theory with idempotent submission.

## Installation
1. Back up your current database and source code.
2. Deploy all Upgrade 06 source files as a single version (do not merge ZIPs one by one).
3. If not already applied, run SQL migrations in order: `supabase/schema.sql`, `supabase/curriculum_upgrade_02.sql`, `supabase/student_learning_upgrade_04.sql`, `supabase/grading_rewards_upgrade_05.sql`. **Never rerun initial schema blindly against production**; review existing tables first.
4. Configure Supabase environment variables and ensure private bucket `ielts-media` exists with supported audio MIME types.
5. Test with a teacher and an enrolled student before production deployment.

## Known limitations and tests still required
- Browser microphone access needs HTTPS/localhost and user permission; MediaRecorder MIME support varies by browser.
- Upload is capped at 15MB; recording auto-stop for Speaking Part 2 is not implemented yet.
- Temporary recordings are not yet automatically deleted after 30 days. Supabase storage cleanup must be implemented before production use.
- Offline autosave/retry, exam server-side timer, and full question types are not yet implemented.
- Server enforces sequential order **within each lesson**; cross-lesson/course progression is not yet implemented.
- Autosave may not finish before closing a tab immediately; manual Save is still available.
- TypeScript/build and Supabase integration were **not verified** in this environment; npm install did not finish within the execution limit.
- Security and end-to-end tests are required before publishing on the official website.
