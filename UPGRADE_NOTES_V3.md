# IELTS Fashion Academy — Upgrade 03

## Implemented
- Teacher Studio at `/teacher/curriculum` now includes a visual question editor for lesson activities; no JSON editing required.
- Instructions, Reading passage, Listening HTTPS audio URL, and question types: MCQ A–D, short answer with alternatives, TRUE/FALSE/NOT GIVEN, essay, recording.
- Add/remove questions, reorder via drag-and-drop or arrow buttons, edit options, correct answers, explanations, and points.
- Client-side validation for prompts, answer keys and audio URL; data saved via existing authenticated `/api/curriculum` API into `lesson_activities.content`.
- Draft/publish actions and class ownership controls from Upgrade 02 retained.

## Known limitations
- This is the authoring editor, not the student-side activity player or auto-grader. Newly authored activities are not yet executable by students.
- Advanced IELTS question types (matching headings, map labeling, multi-select, etc.), media upload, rich text, drag-and-drop activity blocks, and content versioning are not yet implemented.
- Old custom JSON fields not represented by the visual schema may be discarded if the old activity is edited and saved. Back up existing content before editing migrated activities.
- Supabase SQL from Upgrade 02 (`supabase/curriculum_upgrade_02.sql`) must be applied before using curriculum features.
- No production deployment or Supabase integration test has been performed.

## How to use
1. Apply the Upgrade 02 curriculum SQL to your Supabase project (if not already applied).
2. Install dependencies with `npm install`, configure `.env.local` using your own keys, then run `npm run dev`.
3. Log in as a teacher, open `/teacher/curriculum`, choose a class and create Course → Unit → Lesson → Activity.
4. Select an activity, choose skill and kind, enter instructions and add questions with the visual editor, then Save Changes and Publish when ready.
