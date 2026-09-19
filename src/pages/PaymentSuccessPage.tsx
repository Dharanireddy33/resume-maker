import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Spinner } from '@/components/ui';
import { CheckCircle, Zap } from 'lucide-react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPro, refreshSubscription } = useAuth();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Give the subscription a moment to refresh
    const check = async () => {
      await refreshSubscription();
      setTimeout(() => setVerifying(false), 1500);
    };
    check();
  }, [refreshSubscription]);

  if (verifying) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-slate-600">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="p-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
        <p className="mt-2 text-slate-600">
          Welcome to SmartHire Pro! Your subscription is now active. You have access to all Pro features.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => navigate('/dashboard')}>
            <Zap className="h-4 w-4" /> Go to Dashboard
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/analyzer')}>
            Analyze My Resume
          </Button>
        </div>
      </Card>
    </div>
  );
}
