# IELTS Fashion Academy — Upgrade 1 (source-based)

This is an **incremental patch**, not the complete agreed product. Based on the user-provided GitHub ZIP.

## Changes
- Removed the 80% Mini Test pass threshold. Any submitted Mini Test unlocks the Cambridge stage, preserving existing database columns for compatibility.
- Writing/Speaking submissions are restricted to teacher review at the API layer.
- Disabled the AI grading endpoint (HTTP 410).
- Removed AI grading selection, student AI grading button and AI feedback presentation from the UI.
- Retained the existing database and routes for backward compatibility. Historical AI tables remain but are no longer used for new grading.

## Not yet implemented
- General Course → Unit → Lesson → Activity architecture; five-step Vocabulary; server-side Exam timer; detailed rubric grading; robust Coins ledger; layered PNG/WebP avatar, Outfit Gallery; bulk Excel import; full responsive UI.
- Existing teacher feedback is text-only; full Writing/Speaking rubric scoring and reward credit remain future work.

## Deployment caution
Do not treat this as production-ready. Test in a separate environment with non-sensitive accounts before migrating production. Never commit `.env` secrets.
