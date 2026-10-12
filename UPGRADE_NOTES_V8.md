# Upgrade 08 — Reading/Listening practice tools and attempt review

Based on Upgrade 07. No new database migration required: `transcript` is an optional field in existing `lesson_activities.content` JSON.

## Implemented
- Teacher can enter a Listening transcript in the visual activity editor.
- Transcript is not sent with Exam activity content before submission. Practice activity content can show/hide it; completed attempts and Exam submission results can display it.
- Reading Practice text selection can be highlighted yellow and cleared during the current page session. Highlighting and dictionary controls are hidden in Exam.
- Small built-in English→Vietnamese glossary for selected Reading terms; this is **not** a full online dictionary.
- Expandable detailed review for saved attempts: student answers, correctness, correct answers and teacher explanations when present.

## Important limits
- Highlights are temporary and not persisted between visits.
- Glossary contains only a small set of words; no third-party translation service is connected.
- Transcript is teacher-provided; no transcription is performed automatically.
- Existing `history` API already returns the saved attempt result; do not expose answers in the activity `open` response.
- This upgrade does not fix outstanding Exam auto-submission when the browser is closed, full IELTS question types, or online/offline synchronization.
- Build and real Supabase integration still need verification before production deployment.
