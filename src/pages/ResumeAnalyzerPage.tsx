import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, Alert, Spinner, ScoreRing, ProgressBar, EmptyState } from '@/components/ui';
import { validateFile, extractTextFromFile, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/fileParser';
import { analyzeResumeLocally, type LocalAnalysisResult } from '@/lib/analysisEngine';
import { callAIEdgeFunction } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { analysesLimitForPlan } from '@/lib/plans';
import { fetchUsage, incrementUsage } from '@/lib/usage';
import { Upload, FileText, Check, X, Award, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();
  const { user, isPro, planId } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LocalAnalysisResult | null>(null);
  const [usedAI, setUsedAI] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [usageLoaded, setUsageLoaded] = useState(false);

  const limit = analysesLimitForPlan(planId);

  const loadUsage = useCallback(async () => {
    if (!user) return;
    try {
      const count = await fetchUsage(user.id, 'resume_analysis');
      setUsageCount(count);
    } catch {
      // ignore
    } finally {
      setUsageLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError('');
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setFile(selected);
    setResult(null);
    setExtracting(true);
    try {
      const text = await extractTextFromFile(selected);
      setResumeText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from the file.');
      setFile(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText) {
      setError('Please upload a resume first.');
      return;
    }
    if (!user) return;

    if (usageCount >= limit) {
      setError(`You have reached your ${isPro ? 'Pro' : 'Free'} plan limit of ${limit} analyses per month. ${!isPro ? 'Upgrade to Pro to continue.' : ''}`);
      return;
    }

    setError('');
    setAnalyzing(true);
    setResult(null);

    try {
      let analysisResult: LocalAnalysisResult;
      let aiUsed = false;

      if (isPro) {
        try {
          const aiResult = await callAIEdgeFunction({
            action: 'analyze_resume',
            resume_text: resumeText,
          });
          analysisResult = aiResult;
          aiUsed = true;
        } catch (aiErr) {
          // Fallback to local analysis
          analysisResult = analyzeResumeLocally(resumeText);
          setUsedAI(false);
          setError('AI service is temporarily unavailable. Showing basic analysis results. ' + (aiErr instanceof Error ? aiErr.message : ''));
        }
      } else {
        analysisResult = analyzeResumeLocally(resumeText);
      }

      setUsedAI(aiUsed);
      setResult(analysisResult);

      // Increment usage
      const newCount = await incrementUsage('resume_analysis');
      setUsageCount(newCount);

      // Save resume to resumes table
      const { error: resumeErr } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file?.name || 'Uploaded Resume',
          file_type: file?.type || null,
          file_size: file?.size || null,
          resume_text: resumeText.slice(0, 20000),
        });

      if (resumeErr) {
        console.error('Failed to save resume:', resumeErr.message);
      }

      // Save analysis to analyses table, linked to resume
      await supabase.from('analyses').insert({
        user_id: user.id,
        resume_name: file?.name || 'Uploaded Resume',
        resume_text: resumeText.slice(0, 10000),
        ats_score: analysisResult.ats_score,
        keyword_score: analysisResult.keyword_score,
        skills_score: analysisResult.skills_score,
        experience_score: analysisResult.experience_score,
        education_score: analysisResult.education_score,
        extracted_skills: analysisResult.technical_skills || [],
        missing_keywords: analysisResult.missing_keywords || [],
        suggestions: analysisResult.suggestions || [],
        structure_feedback: analysisResult.structure_feedback || {},
        raw_result: analysisResult as unknown as Record<string, unknown>,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResumeText('');
    setResult(null);
    setError('');
    setUsedAI(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Resume Analyzer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload your resume to get an ATS compatibility score with detailed breakdown.
        </p>
      </div>

      {/* Usage indicator */}
      {usageLoaded && (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Badge variant={usageCount >= limit ? 'error' : 'default'}>
            {usageCount} / {limit} analyses used
          </Badge>
          {usageCount >= limit && !isPro && (
            <Button size="sm" onClick={() => navigate('/pricing')}>
              Upgrade to Pro
            </Button>
          )}
        </div>
      )}

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      {!result && (
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Upload Your Resume</h2>
            <p className="mt-1 text-sm text-slate-500">Supported formats: PDF, DOCX. Max size: 5 MB.</p>
          </div>

          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center transition-colors hover:border-blue-500 hover:bg-blue-50 cursor-pointer">
            {extracting ? (
              <div className="flex flex-col items-center gap-2">
                <Spinner className="h-8 w-8" />
                <p className="text-sm text-slate-600">Extracting text...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-blue-600" />
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleReset(); }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-slate-400" />
                <p className="font-medium text-slate-700">Click to upload your resume</p>
                <p className="text-xs text-slate-500">PDF or DOCX files only</p>
              </div>
            )}
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {file && resumeText && !extracting && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" /> Text extracted successfully ({resumeText.split(/\s+/).length} words)
              </div>
              <Button onClick={handleAnalyze} disabled={analyzing || usageCount >= limit} size="lg" className="w-full">
                {analyzing ? (
                  <><Spinner className="h-4 w-4" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Analyze Resume</>
                )}
              </Button>
            </div>
          )}
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Score Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">ATS Analysis Results</h2>
              <div className="flex items-center gap-2">
                {usedAI && <Badge variant="pro"><Sparkles className="mr-1 h-3 w-3" /> AI-Powered</Badge>}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" /> New Analysis
                </Button>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-around">
              <div className="flex flex-col items-center">
                <ScoreRing score={result.ats_score} size={140} />
                <p className="mt-2 text-sm font-medium text-slate-700">Overall ATS Score</p>
              </div>
              <div className="flex-1 space-y-4 sm:max-w-md">
                <ProgressBar value={result.keyword_score} label="Keyword Score" color="bg-blue-600" />
                <ProgressBar value={result.skills_score} label="Skills Score" color="bg-cyan-500" />
                <ProgressBar value={result.experience_score} label="Experience Score" color="bg-green-500" />
                <ProgressBar value={result.education_score} label="Education Score" color="bg-amber-500" />
              </div>
            </div>
          </Card>

          {/* Extracted Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Extracted Information</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-900">{result.name || 'Not detected'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900">{result.email || 'Not detected'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-slate-900">{result.phone || 'Not detected'}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Sections Found</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.sections_found).map(([section, found]) => (
                  <Badge key={section} variant={found ? 'success' : 'default'}>
                    {found ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
                    {section}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* Skills */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Technical Skills ({result.technical_skills.length})</h3>
              {result.technical_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.technical_skills.map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No technical skills detected.</p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Soft Skills ({result.soft_skills.length})</h3>
              {result.soft_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.soft_skills.map((s) => (
                    <Badge key={s} variant="default">{s}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No soft skills detected.</p>
              )}
            </Card>
          </div>

          {/* Structure Feedback */}
          {Object.keys(result.structure_feedback).length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Structure Feedback</h3>
              <ul className="space-y-2">
                {Object.entries(result.structure_feedback).map(([key, msg]) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-slate-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    {msg}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Missing Keywords */}
          {result.missing_keywords.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Missing Keywords (Common ATS Keywords)</h3>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((k) => (
                  <Badge key={k} variant="warning">{k}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-slate-900">Improvement Suggestions</h3>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Disclaimer */}
          <Alert type="info">
            This score is an analytical estimate based on resume content and is not a guarantee of employment or interview selection.
          </Alert>

          {/* Next Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate('/matcher')} variant="outline">
              <Award className="h-4 w-4" /> Match with a Job
            </Button>
            {isPro ? (
              <Button onClick={() => navigate('/improve')}>
                <Sparkles className="h-4 w-4" /> Improve Resume
              </Button>
            ) : (
              <Button onClick={() => navigate('/pricing')} variant="outline">
                <Sparkles className="h-4 w-4" /> Unlock AI Improvement (Pro)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
