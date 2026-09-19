/*
# Add resumes, resume_improvements, and cover_letters tables

## Overview
Adds three new tables to support full persistence of user data:
1. `resumes` - Stores uploaded resume files/text for reuse across features
2. `resume_improvements` - Stores AI-generated resume improvement results
3. `cover_letters` - Stores AI-generated cover letters

## New Tables
- `resumes`: id, user_id, file_name, file_type, file_size, resume_text, created_at
- `resume_improvements`: id, user_id, resume_id, analysis_id, job_description, professional_summary, suggestions, bullet_improvements, keyword_suggestions, raw_result, created_at
- `cover_letters`: id, user_id, resume_id, analysis_id, job_title, company_name, job_description, cover_letter_text, created_at

## Security
- RLS enabled on all three tables
- Owner-scoped CRUD policies using auth.uid() = user_id
- user_id defaults to auth.uid() so inserts work when client omits it
*/

-- ===== RESUMES =====
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  resume_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_resumes" ON resumes;
CREATE POLICY "select_own_resumes" ON resumes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_resumes" ON resumes;
CREATE POLICY "insert_own_resumes" ON resumes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_resumes" ON resumes;
CREATE POLICY "update_own_resumes" ON resumes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_resumes" ON resumes;
CREATE POLICY "delete_own_resumes" ON resumes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== RESUME IMPROVEMENTS =====
CREATE TABLE IF NOT EXISTS resume_improvements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  analysis_id uuid REFERENCES analyses(id) ON DELETE SET NULL,
  job_description text,
  professional_summary text,
  suggestions jsonb DEFAULT '[]'::jsonb,
  bullet_improvements jsonb DEFAULT '[]'::jsonb,
  keyword_suggestions jsonb DEFAULT '[]'::jsonb,
  raw_result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE resume_improvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_improvements" ON resume_improvements;
CREATE POLICY "select_own_improvements" ON resume_improvements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_improvements" ON resume_improvements;
CREATE POLICY "insert_own_improvements" ON resume_improvements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_improvements" ON resume_improvements;
CREATE POLICY "update_own_improvements" ON resume_improvements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_improvements" ON resume_improvements;
CREATE POLICY "delete_own_improvements" ON resume_improvements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== COVER LETTERS =====
CREATE TABLE IF NOT EXISTS cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  analysis_id uuid REFERENCES analyses(id) ON DELETE SET NULL,
  job_title text,
  company_name text,
  job_description text,
  cover_letter_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cover_letters" ON cover_letters;
CREATE POLICY "select_own_cover_letters" ON cover_letters FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cover_letters" ON cover_letters;
CREATE POLICY "insert_own_cover_letters" ON cover_letters FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cover_letters" ON cover_letters;
CREATE POLICY "update_own_cover_letters" ON cover_letters FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cover_letters" ON cover_letters;
CREATE POLICY "delete_own_cover_letters" ON cover_letters FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_improvements_user ON resume_improvements(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON cover_letters(user_id);
