import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, Alert, Spinner, ProgressBar, EmptyState } from '@/components/ui';
import { matchResumeLocally, type LocalMatchResult } from '@/lib/analysisEngine';
import { callAIEdgeFunction } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { analysesLimitForPlan } from '@/lib/plans';
import { fetchUsage, incrementUsage } from '@/lib/usage';
import type { AnalysisRecord } from '@/lib/types';
import { Briefcase, Check, X, AlertCircle, Sparkles, RotateCcw, Target, ArrowRight, FileText } from 'lucide-react';

export default function JobMatcherPage() {
  const navigate = useNavigate();
  const { user, isPro, planId } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LocalMatchResult | null>(null);
  const [usedAI, setUsedAI] = useState(false);
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
    const count = await fetchUsage(user.id, 'job_match');
    setUsageCount(count);
  }, [user]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const handleMatch = async () => {
    setError('');
    if (!selectedAnalysisId) {
      setError('Please select a resume to match against.');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      setError('Please paste a complete job description (at least 50 characters).');
      return;
    }
    if (!user) return;

    if (usageCount >= limit) {
      setError(`You have reached your ${isPro ? 'Pro' : 'Free'} plan limit. ${!isPro ? 'Upgrade to Pro to continue.' : ''}`);
      return;
    }

    const analysis = analyses.find((a) => a.id === selectedAnalysisId);
    if (!analysis || !analysis.resume_text) {
      setError('Could not load the resume text. Please re-analyze your resume.');
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      let matchResult: LocalMatchResult;
      let aiUsed = false;

      if (isPro) {
        try {
          const aiResult = await callAIEdgeFunction({
            action: 'match_job',
            resume_text: analysis.resume_text,
            job_description: jobDescription,
          });
          matchResult = aiResult;
          aiUsed = true;
        } catch (aiErr) {
          matchResult = matchResumeLocally(analysis.resume_text, jobDescription);
          setError('AI service is temporarily unavailable. Showing basic matching results. ' + (aiErr instanceof Error ? aiErr.message : ''));
        }
      } else {
        matchResult = matchResumeLocally(analysis.resume_text, jobDescription);
      }

      setUsedAI(aiUsed);
      setResult(matchResult);

      const newCount = await incrementUsage('job_match');
      setUsageCount(newCount);

      await supabase.from('job_matches').insert({
        user_id: user.id,
        analysis_id: selectedAnalysisId,
        job_title: jobTitle || matchResult.job_title || 'Untitled Position',
        company_name: companyName,
        job_description: jobDescription.slice(0, 5000),
        match_score: matchResult.match_score,
        matched_skills: matchResult.matched_skills || [],
        missing_skills: matchResult.missing_skills || [],
        partial_matches: matchResult.partial_matches || [],
        raw_result: matchResult as unknown as Record<string, unknown>,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setJobDescription('');
    setCompanyName('');
    setJobTitle('');
    setError('');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Job Matcher</h1>
        <p className="mt-1 text-sm text-slate-500">
          Compare your resume against a job description to find matched and missing skills.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <Badge variant={usageCount >= limit ? 'error' : 'default'}>
          {usageCount} / {limit} matches used
        </Badge>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!result && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Resume Selection */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Select Resume</h2>
            {analyses.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No resumes found"
                description="Analyze a resume first, then come back to match it."
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

          {/* Job Description */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Job Details</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Title (optional)</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Senior Python Developer"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Company Name (optional)</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Google"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Paste the full job description here..."
                />
                <p className="mt-1 text-xs text-slate-500">{jobDescription.length} characters</p>
              </div>
              <Button
                onClick={handleMatch}
                disabled={analyzing || !selectedAnalysisId || !jobDescription || usageCount >= limit}
                className="w-full"
              >
                {analyzing ? <><Spinner className="h-4 w-4" /> Matching...</> : <><Target className="h-4 w-4" /> Match Resume to Job</>}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Match Results</h2>
              <div className="flex items-center gap-2">
                {usedAI && <Badge variant="pro"><Sparkles className="mr-1 h-3 w-3" /> AI-Powered</Badge>}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" /> New Match
                </Button>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
              <div className="flex flex-col items-center">
                <div className="relative inline-flex items-center justify-center" style={{ width: 140, height: 140 }}>
                  <svg width="140" height="140" className="-rotate-90">
                    <circle cx="70" cy="70" r="60" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    <circle
                      cx="70" cy="70" r="60" fill="none"
                      stroke={result.match_score >= 75 ? '#16a34a' : result.match_score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 - (result.match_score / 100) * 2 * Math.PI * 60}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold" style={{ color: result.match_score >= 75 ? '#16a34a' : result.match_score >= 50 ? '#f59e0b' : '#ef4444' }}>
                      {result.match_score}%
                    </span>
                    <span className="text-xs text-slate-500">Match</span>
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-700">Overall Match Score</p>
              </div>
              <div className="flex-1 space-y-3 sm:max-w-md">
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-700">{result.matched_skills.length} Matched Skills</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-700">{result.missing_skills.length} Missing Skills</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-700">{result.partial_matches.length} Partial Matches</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Matched Skills */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <Check className="h-5 w-5 text-green-600" /> Matched Skills ({result.matched_skills.length})
            </h3>
            {result.matched_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.matched_skills.map((s) => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No skills matched. Consider updating your resume with relevant skills from the job description.</p>
            )}
          </Card>

          {/* Missing Skills */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <X className="h-5 w-5 text-red-600" /> Missing Skills ({result.missing_skills.length})
            </h3>
            {result.missing_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((s) => (
                  <Badge key={s} variant="error">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No missing skills — your resume covers all required skills from the job description.</p>
            )}
          </Card>

          {/* Partial Matches */}
          {result.partial_matches.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                <AlertCircle className="h-5 w-5 text-amber-500" /> Partial Matches ({result.partial_matches.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.partial_matches.map((s, i) => (
                  <Badge key={i} variant="warning">{s}</Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                These are skills you may have related experience with but didn't list explicitly.
              </p>
            </Card>
          )}

          <Alert type="info">
            This match score is an analytical comparison between your resume and the job description. It is not a guarantee of employment or interview selection.
          </Alert>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/improve')} variant={isPro ? 'primary' : 'outline'}>
              <Sparkles className="h-4 w-4" /> {isPro ? 'Improve Resume for this Job' : 'Unlock AI Improvement (Pro)'}
            </Button>
            <Button onClick={() => navigate('/cover-letter')} variant={isPro ? 'primary' : 'outline'}>
              <ArrowRight className="h-4 w-4" /> {isPro ? 'Generate Cover Letter' : 'Unlock Cover Letters (Pro)'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
