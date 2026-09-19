import type { Plan } from './types';

export const PLAN_FEATURES = {
  free: [
    'Basic ATS Analysis',
    'Resume Upload (PDF & DOCX)',
    'Basic Skill Extraction',
    'Basic Keyword Analysis',
    'Limited Job Matching',
    'Basic Dashboard',
  ],
  pro: [
    'Advanced ATS Analysis',
    'Resume-Job Matching',
    'Detailed Skill Matching',
    'Missing Skill Identification',
    'AI Resume Improvement',
    'Job-Specific Suggestions',
    'AI Summary Generation',
    'AI Cover Letter Generation',
    'Detailed ATS Reports',
    'Higher Usage Limits',
    'Analysis History',
    'Advanced Dashboard',
    'Job Description Comparison',
    'Personalized Recommendations',
  ],
} as const;

export const FREE_ANALYSES_PER_MONTH = 5;
export const PRO_ANALYSES_PER_MONTH = 100;

export const PRO_PRICE_MINOR = 49900;
export const PRO_PRICE_DISPLAY = '₹499';
export const PRO_PRICE_PERIOD = '/month';
export const CURRENCY = 'INR';

export function isProPlan(planId: string): boolean {
  return planId === 'pro';
}

export function analysesLimitForPlan(planId: string): number {
  return planId === 'pro' ? PRO_ANALYSES_PER_MONTH : FREE_ANALYSES_PER_MONTH;
}

export function normalizePlanFromDb(plan: Plan | null): { id: string; name: string; features: string[] } {
  if (!plan) return { id: 'free', name: 'Free', features: [...PLAN_FEATURES.free] };
  return { id: plan.id, name: plan.name, features: plan.features ?? [] };
}
