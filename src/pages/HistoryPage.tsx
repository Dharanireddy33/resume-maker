import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, EmptyState, Spinner, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { AnalysisRecord, JobMatchRecord, ResumeImprovementRecord, CoverLetterRecord } from '@/lib/types';
import { History, FileText, Briefcase, Award, Target, Trash2, Eye, Sparkles, Mail } from 'lucide-react';

type TabId = 'analyses' | 'matches' | 'improvements' | 'cover_letters';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [matches, setMatches] = useState<JobMatchRecord[]>([]);
  const [improvements, setImprovements] = useState<ResumeImprovementRecord[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('analyses');
  const [viewItem, setViewItem] = useState<AnalysisRecord | JobMatchRecord | ResumeImprovementRecord | CoverLetterRecord | null>(null);
  const [viewType, setViewType] = useState<'analysis' | 'match' | 'improvement' | 'cover_letter'>('analysis');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [aRes, mRes, iRes, cRes] = await Promise.all([
        supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('job_matches').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('resume_improvements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('cover_letters').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setAnalyses(aRes.data || []);
      setMatches(mRes.data || []);
      setImprovements(iRes.data || []);
      setCoverLetters(cRes.data || []);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, type: TabId) => {
    const tableMap: Record<TabId, string> = {
      analyses: 'analyses',
      matches: 'job_matches',
      improvements: 'resume_improvements',
      cover_letters: 'cover_letters',
    };
    const { error } = await supabase.from(tableMap[type]).delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      return;
    }
    setConfirmDelete(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof FileText; count: number }[] = [
    { id: 'analyses', label: 'Resume Analyses', icon: FileText, count: analyses.length },
    { id: 'matches', label: 'Job Matches', icon: Briefcase, count: matches.length },
    { id: 'improvements', label: 'Improvements', icon: Sparkles, count: improvements.length },
    { id: 'cover_letters', label: 'Cover Letters', icon: Mail, count: coverLetters.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analysis History</h1>
        <p className="mt-1 text-sm text-slate-500">View and manage your past analyses, job matches, improvements, and cover letters.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {tab === 'analyses' && (
        <>
          {analyses.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<History className="h-12 w-12" />}
                title="No analyses yet"
                description="Upload and analyze your resume to start building history."
                action={<Button size="sm" onClick={() => navigate('/analyzer')}>Analyze Resume</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {analyses.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Award className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{a.resume_name || 'Resume Analysis'}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(a.created_at).toLocaleDateString()} · ATS: {a.ats_score ?? '--'}/100
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setViewItem(a); setViewType('analysis'); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(a.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {(a.extracted_skills?.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.extracted_skills.slice(0, 8).map((s) => (
                        <Badge key={s} variant="success">{s}</Badge>
                      ))}
                      {a.extracted_skills.length > 8 && (
                        <span className="text-xs text-slate-500">+{a.extracted_skills.length - 8} more</span>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'matches' && (
        <>
          {matches.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<Briefcase className="h-12 w-12" />}
                title="No job matches yet"
                description="Match your resume against a job description to see results here."
                action={<Button size="sm" onClick={() => navigate('/matcher')}>Match a Job</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                        <Target className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{m.job_title || 'Job Match'}</p>
                        <p className="text-xs text-slate-500">
                          {m.company_name ? `${m.company_name} · ` : ''}{new Date(m.created_at).toLocaleDateString()} · Match: {m.match_score ?? '--'}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setViewItem(m); setViewType('match'); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(m.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {(m.matched_skills?.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {m.matched_skills.slice(0, 6).map((s) => (
                        <Badge key={s} variant="success">{s}</Badge>
                      ))}
                      {m.missing_skills?.slice(0, 4).map((s) => (
                        <Badge key={s} variant="error">{s}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'improvements' && (
        <>
          {improvements.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<Sparkles className="h-12 w-12" />}
                title="No improvements yet"
                description="Use the AI Resume Improvement feature to generate suggestions."
                action={<Button size="sm" onClick={() => navigate('/improve')}>Improve Resume</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {improvements.map((imp) => (
                <Card key={imp.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Resume Improvement</p>
                        <p className="text-xs text-slate-500">
                          {new Date(imp.created_at).toLocaleDateString()}
                          {imp.job_description ? ' · Job-specific' : ' · General'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setViewItem(imp); setViewType('improvement'); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(imp.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {imp.professional_summary && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">{imp.professional_summary}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'cover_letters' && (
        <>
          {coverLetters.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<Mail className="h-12 w-12" />}
                title="No cover letters yet"
                description="Generate a cover letter to see it saved here."
                action={<Button size="sm" onClick={() => navigate('/cover-letter')}>Generate Cover Letter</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {coverLetters.map((cl) => (
                <Card key={cl.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50">
                        <Mail className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {cl.job_title || 'Cover Letter'}
                          {cl.company_name ? ` — ${cl.company_name}` : ''}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(cl.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setViewItem(cl); setViewType('cover_letter'); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(cl.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2">{cl.cover_letter_text.slice(0, 150)}...</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* View Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={
        viewType === 'analysis' ? 'Analysis Details' :
        viewType === 'match' ? 'Match Details' :
        viewType === 'improvement' ? 'Improvement Details' :
        'Cover Letter Details'
      }>
        {viewItem && viewType === 'analysis' && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-slate-500">ATS Score:</span> <span className="font-medium">{(viewItem as AnalysisRecord).ats_score ?? '--'}/100</span></div>
              <div><span className="text-slate-500">Keyword Score:</span> <span className="font-medium">{(viewItem as AnalysisRecord).keyword_score ?? '--'}/100</span></div>
              <div><span className="text-slate-500">Skills Score:</span> <span className="font-medium">{(viewItem as AnalysisRecord).skills_score ?? '--'}/100</span></div>
              <div><span className="text-slate-500">Experience:</span> <span className="font-medium">{(viewItem as AnalysisRecord).experience_score ?? '--'}/100</span></div>
            </div>
            <div>
              <p className="font-medium text-slate-900">Extracted Skills:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(viewItem as AnalysisRecord).extracted_skills?.map((s) => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-slate-900">Suggestions:</p>
              <ul className="mt-1 list-inside list-disc text-slate-600">
                {(viewItem as AnalysisRecord).suggestions?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {viewItem && viewType === 'match' && (
          <div className="space-y-3 text-sm">
            <div><span className="text-slate-500">Match Score:</span> <span className="font-medium">{(viewItem as JobMatchRecord).match_score ?? '--'}%</span></div>
            <div>
              <p className="font-medium text-green-700">Matched Skills:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(viewItem as JobMatchRecord).matched_skills?.map((s) => (
                  <Badge key={s} variant="success">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-red-700">Missing Skills:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(viewItem as JobMatchRecord).missing_skills?.map((s) => (
                  <Badge key={s} variant="error">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium text-amber-700">Partial Matches:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(viewItem as JobMatchRecord).partial_matches?.map((s, i) => (
                  <Badge key={i} variant="warning">{s}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        {viewItem && viewType === 'improvement' && (
          <div className="space-y-3 text-sm">
            {(viewItem as ResumeImprovementRecord).professional_summary && (
              <div>
                <p className="font-medium text-slate-900">Professional Summary:</p>
                <p className="mt-1 text-slate-600">{(viewItem as ResumeImprovementRecord).professional_summary}</p>
              </div>
            )}
            {(viewItem as ResumeImprovementRecord).suggestions?.length > 0 && (
              <div>
                <p className="font-medium text-slate-900">Suggestions:</p>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {(viewItem as ResumeImprovementRecord).suggestions.map((s: any, i: number) => (
                    <li key={i}>{typeof s === 'string' ? s : s.suggestion || s.text || JSON.stringify(s)}</li>
                  ))}
                </ul>
              </div>
            )}
            {(viewItem as ResumeImprovementRecord).keyword_suggestions?.length > 0 && (
              <div>
                <p className="font-medium text-slate-900">Keyword Suggestions:</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(viewItem as ResumeImprovementRecord).keyword_suggestions.map((k, i) => (
                    <Badge key={i} variant="default">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {viewItem && viewType === 'cover_letter' && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Company:</span>
              <span className="font-medium">{(viewItem as CoverLetterRecord).company_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Job Title:</span>
              <span className="font-medium">{(viewItem as CoverLetterRecord).job_title || 'N/A'}</span>
            </div>
            <div>
              <p className="font-medium text-slate-900">Cover Letter:</p>
              <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{(viewItem as CoverLetterRecord).cover_letter_text}</pre>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Record">
        <p className="text-sm text-slate-600">Are you sure you want to delete this record? This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(confirmDelete!, tab)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
