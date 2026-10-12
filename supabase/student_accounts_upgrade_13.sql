-- Run once in Supabase SQL Editor after the previous upgrade migrations.
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_enrollments_class_archived ON public.enrollments(class_id,archived);
-- Existing records stay active. No password or credentials are stored in public tables.
