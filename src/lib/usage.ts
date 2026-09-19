import { supabase } from './supabase';
import type { AnalysisType } from './types';

export async function fetchUsage(userId: string, analysisType: AnalysisType): Promise<number> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('usage')
    .select('usage_count')
    .eq('user_id', userId)
    .eq('analysis_type', analysisType)
    .eq('month', currentMonth)
    .maybeSingle();
  if (error) throw error;
  return data?.usage_count ?? 0;
}

export async function incrementUsage(analysisType: AnalysisType): Promise<number> {
  const { data, error } = await supabase.rpc('increment_usage', {
    p_analysis_type: analysisType,
  });
  if (error) throw error;
  return data as number;
}

export function currentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}
