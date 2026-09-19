import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button, Card, Alert, Spinner } from '@/components/ui';
import { Zap, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SmartHire</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Forgot Password</h1>
          <p className="mt-1 text-sm text-slate-500">We'll send you a reset link</p>
        </div>

        <Card className="p-6">
          {sent ? (
            <div className="text-center">
              <Alert type="success" className="mb-4">
                Reset link sent! Check your email for instructions to reset your password.
              </Alert>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {error && <Alert type="error" className="mb-4">{error}</Alert>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Spinner className="h-4 w-4" /> : 'Send Reset Link'}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-slate-500">
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
