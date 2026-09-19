import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, ProgressBar, EmptyState, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { analysesLimitForPlan, PRO_PRICE_DISPLAY, PRO_PRICE_PERIOD } from '@/lib/plans';
import { fetchUsage } from '@/lib/usage';
import type { AnalysisRecord, JobMatchRecord } from '@/lib/types';
import {
  FileText, Briefcase, Sparkles, Mail, Zap, TrendingUp, Clock,
  ArrowRight, Award, Target,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, isPro, planId, loading } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [matches, setMatches] = useState<JobMatchRecord[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setDataLoading(true);
      try {
        const [analysesRes, matchesRes, usage] = await Promise.all([
          supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('job_matches').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          fetchUsage(user.id, 'resume_analysis'),
        ]);
        setAnalyses(analysesRes.data || []);
        setMatches(matchesRes.data || []);
        setUsageCount(usage);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const limit = analysesLimitForPlan(planId);
  const remaining = Math.max(0, limit - usageCount);
  const usagePct = Math.min(100, (usageCount / limit) * 100);

  const quickActions = [
    { icon: FileText, title: 'Analyze Resume', desc: 'Upload and score your resume', path: '/analyzer', pro: false },
    { icon: Briefcase, title: 'Match Job', desc: 'Compare resume to a job posting', path: '/matcher', pro: false },
    { icon: Sparkles, title: 'Improve Resume', desc: 'AI-powered suggestions', path: '/improve', pro: true },
    { icon: Mail, title: 'Cover Letter', desc: 'Generate a cover letter', path: '/cover-letter', pro: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {profile?.full_name || user?.email?.split('@')[0] || 'User'}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <Badge variant={isPro ? 'pro' : 'default'}>
            {isPro ? 'PRO Plan' : 'FREE Plan'}
          </Badge>
          {!isPro && (
            <Button size="sm" onClick={() => navigate('/pricing')}>
              <Zap className="h-3.5 w-3.5" /> Upgrade to Pro
            </Button>
          )}
        </div>
      </div>

      {/* Usage Card */}
      <Card className="mb-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Monthly Usage</h2>
            <p className="mt-1 text-sm text-slate-500">
              {usageCount} / {limit} analyses used this month
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-900">{remaining}</span>
            <span className="text-sm text-slate-500"> remaining</span>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={usageCount} max={limit} label="Analyses used" color={usagePct > 80 ? 'bg-amber-500' : 'bg-blue-600'} />
        </div>
        {remaining === 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            You have reached your {isPro ? 'Pro' : 'Free'} plan limit.{' '}
            {!isPro && <button onClick={() => navigate('/pricing')} className="font-medium underline">Upgrade to Pro</button>}
            {' '}to continue using advanced features.
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const locked = action.pro && !isPro;
          return (
            <Card
              key={action.path}
              className={`p-5 transition-shadow hover:shadow-md ${locked ? 'opacity-75' : 'cursor-pointer'}`}
            >
              <button onClick={() => navigate(action.path)} className="w-full text-left">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900">{action.title}</h3>
                  {action.pro && <Badge variant={isPro ? 'success' : 'pro'}>{isPro ? 'PRO' : 'PRO'}</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-500">{action.desc}</p>
                {locked && (
                  <p className="mt-2 text-xs text-blue-600">Requires Pro plan</p>
                )}
              </button>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Analyses */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Analyses</h2>
            <button onClick={() => navigate('/history')} className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </button>
          </div>
          {analyses.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="No analyses yet"
                description="Upload your resume to get an ATS score and detailed breakdown."
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
                        <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{a.ats_score ?? '--'}</span>
                      <span className="text-sm text-slate-500">/100</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Job Matches */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Job Matches</h2>
            <button onClick={() => navigate('/history')} className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </button>
          </div>
          {matches.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<Briefcase className="h-12 w-12" />}
                title="No job matches yet"
                description="Paste a job description to see how well your resume matches."
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
                        <p className="text-xs text-slate-500">{m.company_name || new Date(m.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{m.match_score ?? '--'}%</span>
                      <span className="text-sm text-slate-500"> match</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upgrade CTA for Free users */}
      {!isPro && (
        <Card className="mt-8 overflow-hidden border-0 bg-gradient-to-br from-blue-600 to-cyan-500 p-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <h2 className="text-xl font-bold text-white">Upgrade to Pro</h2>
              <p className="mt-1 text-blue-50">Unlock AI resume improvement, cover letter generation, detailed reports, and 100 analyses per month.</p>
            </div>
            <Button size="lg" variant="secondary" onClick={() => navigate('/pricing')}>
              <Zap className="h-4 w-4" /> Upgrade for {PRO_PRICE_DISPLAY}{PRO_PRICE_PERIOD}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
