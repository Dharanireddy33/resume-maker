import { supabase, EDGE_FUNCTION_URL } from './supabase';

export interface AIAnalysisRequest {
  action: 'analyze_resume' | 'match_job' | 'improve_resume' | 'generate_cover_letter';
  resume_text: string;
  job_description?: string;
  company_name?: string;
  job_role?: string;
}

export async function callAIEdgeFunction<T = any>(request: AIAnalysisRequest): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('You must be signed in to use AI features.');

  const res = await fetch(`${EDGE_FUNCTION_URL}/ai-analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 503) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }
    throw new Error(err.error || 'AI analysis failed. Please try again.');
  }

  return res.json();
}

export function isAIError(err: unknown): boolean {
  return err instanceof Error && (err.message.includes('AI') || err.message.includes('unavailable'));
}
