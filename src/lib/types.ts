export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price_minor: number;
  currency: string;
  analyses_per_month: number;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_subscription_id: string | null;
  start_date: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageRow {
  id: string;
  user_id: string;
  analysis_type: string;
  usage_count: number;
  month: string;
}

export interface AnalysisRecord {
  id: string;
  user_id: string;
  resume_name: string | null;
  resume_text: string | null;
  ats_score: number | null;
  keyword_score: number | null;
  skills_score: number | null;
  experience_score: number | null;
  education_score: number | null;
  extracted_skills: string[];
  missing_keywords: string[];
  suggestions: string[];
  structure_feedback: Record<string, unknown>;
  raw_result: Record<string, unknown>;
  created_at: string;
}

export interface JobMatchRecord {
  id: string;
  user_id: string;
  analysis_id: string | null;
  job_title: string | null;
  company_name: string | null;
  job_description: string | null;
  match_score: number | null;
  matched_skills: string[];
  missing_skills: string[];
  partial_matches: string[];
  raw_result: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: string;
  plan_id: string;
  verified: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  resume_text: string;
  created_at: string;
}

export interface ResumeImprovementRecord {
  id: string;
  user_id: string;
  resume_id: string | null;
  analysis_id: string | null;
  job_description: string | null;
  professional_summary: string | null;
  suggestions: any[];
  bullet_improvements: any[];
  keyword_suggestions: string[];
  raw_result: Record<string, unknown>;
  created_at: string;
}

export interface CoverLetterRecord {
  id: string;
  user_id: string;
  resume_id: string | null;
  analysis_id: string | null;
  job_title: string | null;
  company_name: string | null;
  job_description: string | null;
  cover_letter_text: string;
  created_at: string;
}

export type PlanId = 'free' | 'pro';

export type AnalysisType = 'resume_analysis' | 'job_match' | 'resume_improve' | 'cover_letter';
