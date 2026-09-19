import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, Alert, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { User, Mail, Zap, Shield, CreditCard, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, isPro, subscription, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user?.id);
      if (error) throw error;
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Profile & Account Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account information and subscription.</p>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {saved && <Alert type="success" className="mb-4">Profile updated successfully.</Alert>}

      {/* Profile Info */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <User className="h-5 w-5 text-blue-600" /> Profile Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-500"
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CreditCard className="h-5 w-5 text-blue-600" /> Subscription
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current Plan</span>
            <Badge variant={isPro ? 'pro' : 'default'}>
              {isPro ? 'PRO' : 'FREE'}
            </Badge>
          </div>
          {subscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className="text-sm font-medium text-slate-900 capitalize">{subscription.status}</span>
              </div>
              {subscription.start_date && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Calendar className="h-3.5 w-3.5" /> Start Date
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(subscription.start_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {subscription.expiry_date && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-slate-600">
                    <Calendar className="h-3.5 w-3.5" /> Expiry Date
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(subscription.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </>
          )}
          {!isPro && (
            <Button className="mt-4 w-full" onClick={() => navigate('/payment')}>
              <Zap className="h-4 w-4" /> Upgrade to Pro
            </Button>
          )}
        </div>
      </Card>

      {/* Security */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Shield className="h-5 w-5 text-blue-600" /> Security
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Password</p>
              <p className="text-xs text-slate-500">Reset your password via email</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/forgot-password')}>
              Reset Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Session</h2>
        <Button variant="danger" onClick={handleSignOut}>
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
