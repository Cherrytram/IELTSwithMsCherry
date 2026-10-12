# Upgrade 09 — Vocabulary Learning

## Added
- Teacher Studio vocabulary word bank: English term, Vietnamese meaning, contextual sentence.
- Student five-stage vocabulary experience: Learn (flip card and browser text-to-speech), Recognize, Match, Spell, Apply.
- Server-side grading of four exercise stages per word. No answer key is sent in the activity payload before submission.
- Uses existing activity_attempts, submission history, and reward RPC. No new SQL migration needed for this upgrade.
- Existing lesson progression rules continue to apply; no minimum passing score.

## Setup
1. Replace project code with this complete Upgrade 09 archive.
2. Apply all SQL migrations through Upgrade 05 if not already applied.
3. In Teacher Studio, create a Vocabulary activity of type Practice, add words, save and publish.
4. Test using separate teacher and student accounts in a staging Supabase project.

## Known limitations
- Match currently uses word-to-meaning selection rather than drag-and-drop pairing.
- Speech pronunciation uses the browser's built-in speech synthesis and depends on browser voices.
- Word banks with fewer than four words show fewer recognition choices.
- No offline mode or spaced-repetition schedule yet.
- An activity's word bank should not be edited after students start it without a versioned snapshot migration.
- End-to-end Supabase/Vercel deployment not verified.
