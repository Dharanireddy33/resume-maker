import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Alert } from '@/components/ui';
import { XCircle, RotateCcw, Mail } from 'lucide-react';

export default function PaymentFailedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string })?.message;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Card className="p-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <XCircle className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Failed</h1>
        <p className="mt-2 text-slate-600">
          {message || 'Your payment could not be completed. No charge was made to your account.'}
        </p>
        {message && (
          <div className="mt-4 mx-auto max-w-md">
            <Alert type="error">{message}</Alert>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => navigate('/payment')}>
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
            Back to Pricing
          </Button>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          If the problem persists, please contact support. Your account remains on the Free plan.
        </p>
      </Card>
    </div>
  );
}
