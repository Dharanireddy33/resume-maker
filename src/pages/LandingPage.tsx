import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PLAN_FEATURES, PRO_PRICE_DISPLAY, PRO_PRICE_PERIOD } from '@/lib/plans';
import {
  Zap, FileText, Briefcase, Sparkles, Mail, Check, ArrowRight,
  Target, TrendingUp, Shield, Brain, FileSearch, Award, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    { q: 'How does SmartHire analyze my resume?', a: 'SmartHire extracts text from your PDF or DOCX resume, identifies skills, keywords, and structure, then calculates an ATS compatibility score based on keyword density, skills coverage, experience sections, and education sections.' },
    { q: 'Is my resume data secure?', a: 'Yes. Your data is stored securely with row-level security policies — only you can access your own resumes and analyses. We never share your data with third parties.' },
    { q: 'What is the difference between Free and Pro?', a: 'Free includes basic ATS analysis, skill extraction, and limited monthly analyses. Pro adds advanced job matching, AI resume improvement, AI cover letter generation, detailed reports, and higher usage limits.' },
    { q: 'Are the scores a guarantee of getting a job?', a: 'No. All scores are analytical estimates based on resume content and job description comparison. They are not guarantees of employment or interview selection.' },
    { q: 'What file formats are supported?', a: 'SmartHire supports PDF and DOCX file formats for resume uploads. Files are validated for type and size before processing.' },
    { q: 'Can I cancel my Pro subscription?', a: 'Yes. You can manage your subscription from your account settings at any time. Your Pro access continues until the end of your billing period.' },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="pro" className="mb-4">
              <Zap className="mr-1 h-3 w-3" /> AI-Powered Career Platform
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              SmartHire
            </h1>
            <p className="mt-3 text-xl font-medium text-slate-700 sm:text-2xl">
              AI-Powered Resume & Job Matching
            </p>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Analyze your resume, match it with job opportunities, identify skill gaps, and improve your applications with AI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate(user ? '/analyzer' : '/signup')}>
                <FileText className="h-5 w-5" /> Analyze My Resume
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                Explore Pro <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { icon: FileSearch, title: 'ATS Analysis', desc: 'Get an instant ATS compatibility score with detailed breakdowns.' },
              { icon: Briefcase, title: 'Job Matching', desc: 'Compare your resume against any job description and find skill gaps.' },
              { icon: Sparkles, title: 'AI Improvement', desc: 'Get AI-powered suggestions to strengthen your resume and cover letters.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="p-6 transition-shadow hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How SmartHire Works */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">How SmartHire Works</h2>
            <p className="mt-2 text-slate-600">Three simple steps to a stronger application</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: '1', icon: FileText, title: 'Upload Resume', desc: 'Upload your resume in PDF or DOCX format. We extract and analyze the text instantly.' },
              { step: '2', icon: Brain, title: 'AI Analysis', desc: 'Our AI engine analyzes your resume for ATS compatibility, skills, keywords, and structure.' },
              { step: '3', icon: Target, title: 'Match & Improve', desc: 'Match against job descriptions, identify gaps, and get AI-powered improvement suggestions.' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {s.step}
                  </div>
                  <h3 className="font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Features</h2>
            <p className="mt-2 text-slate-600">Everything you need to land your next role</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileSearch, title: 'ATS Resume Analysis', desc: 'Get keyword, skills, experience, and education scores with an overall ATS compatibility rating.' },
              { icon: Briefcase, title: 'Job Matching', desc: 'Paste any job description and see matched skills, missing skills, and partial matches instantly.' },
              { icon: Sparkles, title: 'Resume Improvement', desc: 'AI-generated suggestions based on your actual resume content — no fabricated experience.' },
              { icon: Mail, title: 'Cover Letter Generator', desc: 'Generate professional, job-specific cover letters from your resume and job details.' },
              { icon: TrendingUp, title: 'Detailed Reports', desc: 'Save and track your analysis history to monitor improvement over time.' },
              { icon: Shield, title: 'Secure & Private', desc: 'Row-level security ensures only you can access your data. Your resume never leaves your account.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="p-6 transition-shadow hover:shadow-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Free vs Pro */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Free vs Pro</h2>
            <p className="mt-2 text-slate-600">Choose the plan that fits your career goals</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
            {/* Free */}
            <Card className="p-8">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">Free</h3>
                <p className="mt-1 text-sm text-slate-500">For getting started</p>
                <p className="mt-4 text-4xl font-bold text-slate-900">₹0<span className="text-base font-normal text-slate-500">/month</span></p>
              </div>
              <ul className="mt-6 space-y-3">
                {PLAN_FEATURES.free.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-8 w-full" onClick={() => navigate(user ? '/dashboard' : '/signup')}>
                Get Started Free
              </Button>
            </Card>

            {/* Pro */}
            <Card className="relative border-2 border-blue-600 p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="pro">Most Popular</Badge>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">Pro</h3>
                <p className="mt-1 text-sm text-slate-500">For serious job seekers</p>
                <p className="mt-4 text-4xl font-bold text-slate-900">{PRO_PRICE_DISPLAY}<span className="text-base font-normal text-slate-500">{PRO_PRICE_PERIOD}</span></p>
              </div>
              <ul className="mt-6 space-y-3">
                {PLAN_FEATURES.pro.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full" onClick={() => navigate(user ? '/pricing' : '/signup')}>
                <Zap className="h-4 w-4" /> Upgrade to Pro
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
          {[
            { icon: FileSearch, title: 'AI Resume Analysis', desc: 'Upload your resume and get an instant ATS score with detailed breakdowns across keywords, skills, experience, and education. We identify missing keywords and provide actionable suggestions — all based on what is actually in your resume.', features: ['Overall ATS score', 'Keyword density analysis', 'Skills extraction', 'Structure feedback'] },
            { icon: Briefcase, title: 'Job Matching', desc: 'Paste any job description and SmartHire compares it against your resume. You see exactly which skills match, which are missing, and which are partial matches — with a clear match score.', features: ['Matched skills list', 'Missing skills identification', 'Partial match detection', 'Match score percentage'] },
            { icon: Sparkles, title: 'Resume Improvement', desc: 'Get AI-powered suggestions to improve your resume based only on information that is actually present. We never fabricate experience, certifications, or skills.', features: ['Summary improvement', 'Bullet point enhancement', 'Keyword suggestions', 'Formatting tips'] },
            { icon: Mail, title: 'Cover Letter Generator', desc: 'Pro users can generate professional, job-specific cover letters from their resume and job details. Copy, download, or regenerate with a single click.', features: ['Job-specific generation', 'One-click regenerate', 'Copy to clipboard', 'Download as text'] },
          ].map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{section.title}</h3>
                  <p className="mt-3 text-slate-600">{section.desc}</p>
                  <ul className="mt-6 space-y-2">
                    {section.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check className="h-4 w-4 text-blue-600" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Card className="bg-gradient-to-br from-slate-50 to-blue-50 p-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Award className="h-4 w-4 text-blue-600" /> ATS Score: 82%
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Target className="h-4 w-4 text-green-600" /> Match Score: 75%
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-full w-[75%] rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                    </div>
                    <div className="mt-4 space-y-1.5">
                      {['Python', 'SQL', 'React', 'AWS'].map((s) => (
                        <div key={s} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-700 mr-1">
                          <Check className="h-3 w-3" /> {s}
                        </div>
                      ))}
                      {['Docker', 'Kubernetes'].map((s) => (
                        <div key={s} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700 mr-1">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Pricing</h2>
            <p className="mt-2 text-slate-600">Simple, transparent pricing</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6 max-w-3xl mx-auto">
            <Card className="p-8">
              <h3 className="text-xl font-bold text-slate-900">Free</h3>
              <p className="mt-4 text-4xl font-bold text-slate-900">₹0<span className="text-base font-normal text-slate-500">/month</span></p>
              <p className="mt-2 text-sm text-slate-500">5 analyses per month</p>
              <ul className="mt-6 space-y-3">
                {PLAN_FEATURES.free.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-8 w-full" onClick={() => navigate(user ? '/dashboard' : '/signup')}>
                Get Started
              </Button>
            </Card>
            <Card className="relative border-2 border-blue-600 p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="pro">Best Value</Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Pro</h3>
              <p className="mt-4 text-4xl font-bold text-slate-900">{PRO_PRICE_DISPLAY}<span className="text-base font-normal text-slate-500">{PRO_PRICE_PERIOD}</span></p>
              <p className="mt-2 text-sm text-slate-500">100 analyses per month</p>
              <ul className="mt-6 space-y-3">
                {PLAN_FEATURES.pro.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full" onClick={() => navigate(user ? '/pricing' : '/signup')}>
                <Zap className="h-4 w-4" /> Upgrade to Pro
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">FAQ</h2>
            <p className="mt-2 text-slate-600">Frequently asked questions</p>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <Card key={i} className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-slate-900">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="border-t border-slate-100 p-4 text-sm text-slate-600">
                    {faq.a}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-cyan-500 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to improve your resume?</h2>
          <p className="mt-3 text-lg text-blue-50">Join SmartHire today and take the guesswork out of job applications.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" onClick={() => navigate(user ? '/analyzer' : '/signup')}>
              <FileText className="h-5 w-5" /> Start Analyzing Free
            </Button>
            <Button size="lg" variant="outline" className="bg-white" onClick={() => navigate('/pricing')}>
              View Pricing <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
