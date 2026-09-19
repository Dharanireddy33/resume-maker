import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Badge } from './ui';
import { FileText, Briefcase, Sparkles, Mail, History, LayoutDashboard, User, LogOut, Menu, X, Zap } from 'lucide-react';

export function Navbar() {
  const { user, profile, isPro, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analyzer', label: 'Analyze Resume', icon: FileText },
    { to: '/matcher', label: 'Job Matcher', icon: Briefcase },
    { to: '/improve', label: 'Improve Resume', icon: Sparkles },
    { to: '/cover-letter', label: 'Cover Letter', icon: Mail },
    { to: '/history', label: 'History', icon: History },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">SmartHire</span>
            </Link>
            {user && (
              <div className="hidden items-center gap-1 lg:flex">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(link.to)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <Badge variant={isPro ? 'pro' : 'default'}>
                  {isPro ? 'PRO' : 'FREE'}
                </Badge>
                <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                  <User className="h-4 w-4" />
                  {profile?.full_name || user.email?.split('@')[0] || 'Account'}
                </Link>
                {!isPro && (
                  <Button size="sm" onClick={() => navigate('/pricing')}>
                    Upgrade
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button size="sm" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 py-3 lg:hidden">
            {user ? (
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive(link.to) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  <User className="h-4 w-4" /> Profile
                </Link>
                {!isPro && (
                  <Link to="/pricing" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
                    <Zap className="h-4 w-4" /> Upgrade to Pro
                  </Link>
                )}
                <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => { navigate('/login'); setMobileOpen(false); }}>Login</Button>
                <Button onClick={() => { navigate('/signup'); setMobileOpen(false); }}>Get Started</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">SmartHire</span>
          </div>
          <p className="text-sm text-slate-500">
            AI-Powered Resume & Job Matching Platform. Scores are analytical estimates, not guarantees of employment.
          </p>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} SmartHire. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
