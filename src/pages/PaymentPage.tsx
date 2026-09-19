import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge, Alert, Spinner } from '@/components/ui';
import { PRO_PRICE_DISPLAY, PRO_PRICE_PERIOD, PRO_PRICE_MINOR, CURRENCY } from '@/lib/plans';
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayScript } from '@/lib/razorpay';
import { Zap, Lock, Check, AlertCircle, CreditCard } from 'lucide-react';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user, isPro, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    loadRazorpayScript()
      .then(() => setScriptLoaded(true))
      .catch((err) => setError(err.message));
  }, []);

  if (isPro) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">You're already a Pro member</h1>
          <p className="mt-2 text-slate-600">You have access to all Pro features.</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handlePayment = async () => {
    setError('');
    if (!scriptLoaded) {
      setError('Razorpay checkout is still loading. Please wait a moment and try again.');
      return;
    }
    if (!user) return;

    setLoading(true);
    let paymentDbId = '';
    let orderId = '';

    try {
      // 1. Create Razorpay order via edge function
      const orderData = await createRazorpayOrder('pro');
      orderId = orderData.orderId;
      paymentDbId = orderData.paymentDbId;

      // 2. Open Razorpay checkout
      const razorpay = new window.Razorpay({
        key_id: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SmartHire',
        description: 'Pro Subscription - Monthly',
        order_id: orderId,
        prefill: {
          email: user.email,
          name: user.user_metadata?.full_name || '',
        },
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          // 3. Verify payment on the backend
          try {
            const result = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentDbId,
            });

            if (result.success) {
              await refreshSubscription();
              navigate('/payment/success', { replace: true });
            } else {
              navigate('/payment/failed', { replace: true, state: { message: result.message } });
            }
          } catch (err) {
            navigate('/payment/failed', {
              replace: true,
              state: { message: err instanceof Error ? err.message : 'Payment verification failed.' },
            });
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment was cancelled. No charge was made.');
          },
        },
      });

      razorpay.on('payment.failed', (response: any) => {
        setLoading(false);
        setError(response.error?.description || 'Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to initiate payment. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <Badge variant="pro" className="mb-3">
          <Zap className="mr-1 h-3 w-3" /> Upgrade to Pro
        </Badge>
        <h1 className="text-2xl font-bold text-slate-900">Complete Your Upgrade</h1>
        <p className="mt-1 text-sm text-slate-500">Unlock all SmartHire Pro features</p>
      </div>

      {error && <Alert type="error" className="mb-4">{error}</Alert>}

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white">
          <h2 className="text-xl font-bold">SmartHire Pro</h2>
          <p className="mt-1 text-blue-50">Monthly subscription</p>
          <p className="mt-4 text-4xl font-bold">
            {PRO_PRICE_DISPLAY}<span className="text-lg font-normal text-blue-100">{PRO_PRICE_PERIOD}</span>
          </p>
        </div>

        <div className="p-6">
          <h3 className="mb-4 font-semibold text-slate-900">What you get:</h3>
          <ul className="space-y-2">
            {[
              'Advanced ATS Analysis with detailed breakdowns',
              'Resume-Job matching with skill gap analysis',
              'AI-powered resume improvement suggestions',
              'AI-generated professional cover letters',
              'Detailed ATS reports and analysis history',
              '100 analyses per month (vs 5 on Free)',
              'Personalized recommendations',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" /> {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Plan</span>
              <span className="font-medium text-slate-900">Pro (Monthly)</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Amount</span>
              <span className="font-medium text-slate-900">{PRO_PRICE_DISPLAY}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Currency</span>
              <span className="font-medium text-slate-900">{CURRENCY}</span>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading || !scriptLoaded}
            size="lg"
            className="mt-6 w-full"
          >
            {loading ? (
              <><Spinner className="h-4 w-4" /> Processing...</>
            ) : (
              <><CreditCard className="h-5 w-5" /> Pay {PRO_PRICE_DISPLAY} & Upgrade</>
            )}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            Secured by Razorpay. Test mode — no real charges.
          </div>
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-500">
        By upgrading, you agree to our terms. Subscription auto-renews monthly. Cancel anytime.
      </p>
    </div>
  );
}
