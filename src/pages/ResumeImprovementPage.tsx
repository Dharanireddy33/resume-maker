import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, Alert, Spinner, EmptyState } from '@/components/ui';
import { callAIEdgeFunction } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { analysesLimitForPlan } from '@/lib/plans';
import { fetchUsage, incrementUsage } from '@/lib/usage';
import type { AnalysisRecord } from '@/lib/types';
import { Sparkles, Check, FileText, Zap, RotateCcw, Lightbulb, Lock } from 'lucide-react';

export default function ResumeImprovementPage() {
  const navigate = useNavigate();
  const { user, isPro, planId } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [usageCount, setUsageCount] = useState(0);

  const limit = analysesLimitForPlan(planId);

  const loadAnalyses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setAnalyses(data || []);
    const count = await fetchUsage(user.id, 'resume_improve');
    setUsageCount(count);
  }, [user]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  if (!isPro) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AI Resume Improvement is a Pro Feature</h1>
          <p className="mt-2 text-slate-600">
            Upgrade to Pro to get AI-powered suggestions for improving your resume summary, bullet points, keywords, and formatting.
          </p>
          <Button className="mt-6" size="lg" onClick={() => navigate('/pricing')}>
            <Zap className="h-4 w-4" /> Upgrade to Pro
          </Button>
        </Card>
      </div>
    );
  }

  const handleImprove = async () => {
    setError('');
    if (!selectedAnalysisId) {
      setError('Please select a resume to improve.');
      return;
    }
    if (!user) return;

    if (usageCount >= limit) {
      setError(`You have reached your Pro plan limit of ${limit} analyses per month.`);
      return;
    }

    const analysis = analyses.find((a) => a.id === selectedAnalysisId);
    if (!analysis || !analysis.resume_text) {
      setError('Could not load the resume text. Please re-analyze your resume.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const aiResult = await callAIEdgeFunction({
        action: 'improve_resume',
        resume_text: analysis.resume_text,
        job_description: jobDescription || undefined,
      });
      setResult(aiResult);

      const newCount = await incrementUsage('resume_improve');
      setUsageCount(newCount);

      // Save improvement results to database
      await supabase.from('resume_improvements').insert({
        user_id: user.id,
        analysis_id: selectedAnalysisId,
        job_description: jobDescription ? jobDescription.slice(0, 5000) : null,
        professional_summary: aiResult.professional_summary || null,
        suggestions: aiResult.suggestions || [],
        bullet_improvements: aiResult.bullet_improvements || [],
        keyword_suggestions: aiResult.keyword_suggestions || [],
        raw_result: aiResult as Record<string, unknown>,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI improvement failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Resume Improvement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Get AI-powered suggestions to improve your resume based on its actual content.
        </p>
        <Badge variant="pro" className="mt-2"><Sparkles className="mr-1 h-3 w-3" /> Pro Feature</Badge>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <Badge variant={usageCount >= limit ? 'error' : 'default'}>
          {usageCount} / {limit} improvements used
        </Badge>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Select Resume</h2>
            {analyses.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No resumes found"
                description="Analyze a resume first, then improve it."
                action={<Button size="sm" onClick={() => navigate('/analyzer')}>Analyze Resume</Button>}
              />
            ) : (
              <div className="space-y-2">
                {analyses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedAnalysisId === a.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resume"
                      checked={selectedAnalysisId === a.id}
                      onChange={() => setSelectedAnalysisId(a.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{a.resume_name || 'Resume'}</p>
                      <p className="text-xs text-slate-500">
                        ATS: {a.ats_score ?? '--'}/100 · {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Target Job (Optional)</h2>
            <p className="mb-3 text-sm text-slate-500">
              Paste a job description to get job-specific improvement suggestions.
            </p>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Paste the job description here for targeted suggestions..."
            />
            <Button
              onClick={handleImprove}
              disabled={loading || !selectedAnalysisId || usageCount >= limit}
              className="mt-4 w-full"
            >
              {loading ? <><Spinner className="h-4 w-4" /> Generating Suggestions...</> : <><Sparkles className="h-4 w-4" /> Get AI Suggestions</>}
            </Button>
          </Card>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">AI Improvement Suggestions</h2>
            <Button variant="outline" size="sm" onClick={() => setResult(null)}>
              <RotateCcw className="h-3.5 w-3.5" /> Start Over
            </Button>
          </div>

          {result.professional_summary && (
            <Card className="p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <Lightbulb className="h-5 w-5 text-blue-600" /> Professional Summary
              </h3>
              <p className="text-sm text-slate-700">{result.professional_summary}</p>
            </Card>
          )}

          {result.suggestions && Array.isArray(result.suggestions) && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                <Sparkles className="h-5 w-5 text-blue-600" /> Improvement Suggestions
              </h3>
              <ul className="space-y-3">
                {result.suggestions.map((s: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    <div>
                      {typeof s === 'string' ? s : (
                        <>
                          <p className="font-medium text-slate-900">{s.area || s.category || `Suggestion ${i + 1}`}</p>
                          <p className="mt-1">{s.suggestion || s.text || s}</p>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.bullet_improvements && Array.isArray(result.bullet_improvements) && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                <Sparkles className="h-5 w-5 text-blue-600" /> Bullet Point Improvements
              </h3>
              <div className="space-y-4">
                {result.bullet_improvements.map((b: any, i: number) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-500">Original</p>
                    <p className="mt-1 text-sm text-slate-700">{b.original}</p>
                    <p className="mt-3 text-xs font-medium text-green-600">Improved</p>
                    <p className="mt-1 text-sm text-slate-900">{b.improved}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.keyword_suggestions && Array.isArray(result.keyword_suggestions) && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                <Sparkles className="h-5 w-5 text-blue-600" /> Keyword Suggestions
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.keyword_suggestions.map((k: string, i: number) => (
                  <Badge key={i} variant="default">{k}</Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Only add keywords that are genuinely supported by your experience and skills.
              </p>
            </Card>
          )}

          <Alert type="info">
            These suggestions are based on information actually present in your resume. Never add fabricated experience, certifications, or skills.
          </Alert>

          <div className="flex gap-3">
            <Button onClick={() => navigate('/cover-letter')}>
              Generate Cover Letter <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/history')}>
              View History
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
