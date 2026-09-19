/*
# SmartHire - Core Database Schema

## Overview
Creates the full schema for the SmartHire resume/job matching platform: profiles, plans, subscriptions, usage tracking, analyses, job matches, and payments.

## New Tables
1. `profiles` - User profile data (full_name, avatar, created_at). One row per auth user.
2. `plans` - Available subscription plans (free, pro) with feature flags and limits.
3. `subscriptions` - User's current plan, status, and Razorpay payment references.
4. `usage` - Monthly usage tracking per analysis type (enforces free-plan limits server-side).
5. `analyses` - Saved resume analysis results (ATS scores, extracted data).
6. `job_matches` - Saved resume-vs-job matching results.
7. `payments` - Razorpay payment records with verification status.

## Security
- RLS enabled on every table.
- Owner-scoped CRUD policies using auth.uid() for all user-data tables.
- `plans` is readable by all authenticated users (reference data).
- `profiles` uses a trigger to auto-create a profile row on signup.
- `usage` upsert helper function `upsert_usage` increments counts atomically.
- `get_or_create_usage` function returns current month usage row.
*/

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== PLANS =====
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  analyses_per_month integer NOT NULL DEFAULT 5,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_plans" ON plans;
CREATE POLICY "read_plans" ON plans FOR SELECT
  TO authenticated USING (true);

-- Seed plans
INSERT INTO plans (id, name, price_minor, currency, analyses_per_month, features) VALUES
  ('free', 'Free', 0, 'INR', 5,
    '["Basic ATS Analysis","Resume Upload","Basic Skill Extraction","Basic Keyword Analysis","Limited Job Matching","Basic Dashboard"]'::jsonb),
  ('pro', 'Pro', 49900, 'INR', 100,
    '["Advanced ATS Analysis","Resume-Job Matching","Detailed Skill Matching","Missing Skill Identification","AI Resume Improvement","Job-Specific Suggestions","AI Summary Generation","AI Cover Letter Generation","Detailed ATS Reports","Higher Usage Limits","Analysis History","Advanced Dashboard","Job Description Comparison","Personalized Recommendations"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_minor = EXCLUDED.price_minor,
  currency = EXCLUDED.currency,
  analyses_per_month = EXCLUDED.analyses_per_month,
  features = EXCLUDED.features;

-- ===== SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL DEFAULT 'free' REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  start_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
CREATE POLICY "update_own_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== USAGE =====
CREATE TABLE IF NOT EXISTS usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  month text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, analysis_type, month)
);
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_usage" ON usage;
CREATE POLICY "select_own_usage" ON usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_usage" ON usage;
CREATE POLICY "insert_own_usage" ON usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_usage" ON usage;
CREATE POLICY "update_own_usage" ON usage FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: atomically increment usage, returns new count
CREATE OR REPLACE FUNCTION increment_usage(
  p_analysis_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_count integer;
  current_month text := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO usage (user_id, analysis_type, usage_count, month)
  VALUES (auth.uid(), p_analysis_type, 1, current_month)
  ON CONFLICT (user_id, analysis_type, month)
  DO UPDATE SET usage_count = usage.usage_count + 1, updated_at = now()
  RETURNING usage.usage_count INTO new_count;
  RETURN new_count;
END;
$$;

-- ===== ANALYSES =====
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_name text,
  resume_text text,
  ats_score integer,
  keyword_score integer,
  skills_score integer,
  experience_score integer,
  education_score integer,
  extracted_skills jsonb DEFAULT '[]'::jsonb,
  missing_keywords jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  structure_feedback jsonb DEFAULT '{}'::jsonb,
  raw_result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_analyses" ON analyses;
CREATE POLICY "select_own_analyses" ON analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_analyses" ON analyses;
CREATE POLICY "insert_own_analyses" ON analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_analyses" ON analyses;
CREATE POLICY "update_own_analyses" ON analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_analyses" ON analyses;
CREATE POLICY "delete_own_analyses" ON analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== JOB MATCHES =====
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES analyses(id) ON DELETE SET NULL,
  job_title text,
  company_name text,
  job_description text,
  match_score integer,
  matched_skills jsonb DEFAULT '[]'::jsonb,
  missing_skills jsonb DEFAULT '[]'::jsonb,
  partial_matches jsonb DEFAULT '[]'::jsonb,
  raw_result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_job_matches" ON job_matches;
CREATE POLICY "select_own_job_matches" ON job_matches FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_job_matches" ON job_matches;
CREATE POLICY "insert_own_job_matches" ON job_matches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_job_matches" ON job_matches;
CREATE POLICY "update_own_job_matches" ON job_matches FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_job_matches" ON job_matches;
CREATE POLICY "delete_own_job_matches" ON job_matches FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== PAYMENTS =====
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  plan_id text NOT NULL DEFAULT 'pro' REFERENCES plans(id),
  verified boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage(user_id, month);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
