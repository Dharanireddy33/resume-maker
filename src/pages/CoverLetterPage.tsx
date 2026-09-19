import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, Alert, Spinner, EmptyState } from '@/components/ui';
import { callAIEdgeFunction } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { analysesLimitForPlan } from '@/lib/plans';
import { fetchUsage, incrementUsage } from '@/lib/usage';
import type { AnalysisRecord } from '@/lib/types';
import { Mail, FileText, Zap, Lock, Copy, Download, RotateCcw, Check } from 'lucide-react';

export default function CoverLetterPage() {
  const navigate = useNavigate();
  const { user, isPro, planId } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [copied, setCopied] = useState(false);
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
    const count = await fetchUsage(user.id, 'cover_letter');
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
          <h1 className="text-2xl font-bold text-slate-900">Cover Letter Generator is a Pro Feature</h1>
          <p className="mt-2 text-slate-600">
            Upgrade to Pro to generate professional, job-specific cover letters from your resume.
          </p>
          <Button className="mt-6" size="lg" onClick={() => navigate('/pricing')}>
            <Zap className="h-4 w-4" /> Upgrade to Pro
          </Button>
        </Card>
      </div>
    );
  }

  const handleGenerate = async () => {
    setError('');
    if (!selectedAnalysisId) {
      setError('Please select a resume.');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      setError('Please paste a complete job description.');
      return;
    }
    if (!companyName.trim() || !jobRole.trim()) {
      setError('Please enter the company name and job role.');
      return;
    }
    if (!user) return;

    if (usageCount >= limit) {
      setError(`You have reached your Pro plan limit of ${limit} generations per month.`);
      return;
    }

    const analysis = analyses.find((a) => a.id === selectedAnalysisId);
    if (!analysis || !analysis.resume_text) {
      setError('Could not load the resume text. Please re-analyze your resume.');
      return;
    }

    setLoading(true);
    setCoverLetter('');

    try {
      const result = await callAIEdgeFunction({
        action: 'generate_cover_letter',
        resume_text: analysis.resume_text,
        job_description: jobDescription,
        company_name: companyName,
        job_role: jobRole,
      });
      setCoverLetter(result.cover_letter || result.text || '');

      const newCount = await incrementUsage('cover_letter');
      setUsageCount(newCount);

      // Save cover letter to database
      await supabase.from('cover_letters').insert({
        user_id: user.id,
        analysis_id: selectedAnalysisId,
        job_title: jobRole,
        company_name: companyName,
        job_description: jobDescription.slice(0, 5000),
        cover_letter_text: result.cover_letter || result.text || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover letter generation failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover_letter_${companyName || 'application'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cover Letter Generator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate a professional, job-specific cover letter from your resume.
        </p>
        <Badge variant="pro" className="mt-2"><Mail className="mr-1 h-3 w-3" /> Pro Feature</Badge>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <Badge variant={usageCount >= limit ? 'error' : 'default'}>
          {usageCount} / {limit} letters used
        </Badge>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Select Resume</h2>
            {analyses.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No resumes found"
                description="Analyze a resume first."
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
                      <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Job Details</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Google"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Role</label>
                <input
                  type="text"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Senior Python Developer"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Paste the job description..."
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading || !selectedAnalysisId || usageCount >= limit}
                className="w-full"
              >
                {loading ? <><Spinner className="h-4 w-4" /> Generating...</> : <><Mail className="h-4 w-4" /> Generate Cover Letter</>}
              </Button>
            </div>
          </Card>
        </div>

        {/* Output */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Cover Letter</h2>
            {coverLetter && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading}>
                  <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                </Button>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : coverLetter ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{coverLetter}</pre>
            </div>
          ) : (
            <EmptyState
              icon={<Mail className="h-12 w-12" />}
              title="No cover letter yet"
              description="Fill in the job details and click Generate to create a professional cover letter."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
