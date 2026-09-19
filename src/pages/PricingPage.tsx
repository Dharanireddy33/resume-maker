import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Card, Button, Badge } from '@/components/ui';
import { PLAN_FEATURES, PRO_PRICE_DISPLAY, PRO_PRICE_PERIOD } from '@/lib/plans';
import { Zap, Check, Check as CheckIcon } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, isPro } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Pricing</h1>
        <p className="mt-2 text-slate-600">Choose the plan that fits your career goals</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6 max-w-3xl mx-auto">
        {/* Free */}
        <Card className="p-8">
          <h3 className="text-xl font-bold text-slate-900">Free</h3>
          <p className="mt-1 text-sm text-slate-500">For getting started</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">
            ₹0<span className="text-base font-normal text-slate-500">/month</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">5 analyses per month</p>
          <ul className="mt-6 space-y-3">
            {PLAN_FEATURES.free.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" /> {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <Button variant="outline" className="mt-8 w-full" disabled>
              Current Plan: Pro
            </Button>
          ) : (
            <Button variant="outline" className="mt-8 w-full" disabled>
              Current Plan
            </Button>
          )}
        </Card>

        {/* Pro */}
        <Card className="relative border-2 border-blue-600 p-8 shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge variant="pro">Most Popular</Badge>
          </div>
          <h3 className="text-xl font-bold text-slate-900">Pro</h3>
          <p className="mt-1 text-sm text-slate-500">For serious job seekers</p>
          <p className="mt-4 text-4xl font-bold text-slate-900">
            {PRO_PRICE_DISPLAY}<span className="text-base font-normal text-slate-500">{PRO_PRICE_PERIOD}</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">100 analyses per month</p>
          <ul className="mt-6 space-y-3">
            {PLAN_FEATURES.pro.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" /> {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <Button className="mt-8 w-full" disabled>
              <CheckIcon className="h-4 w-4" /> You're on Pro
            </Button>
          ) : (
            <Button className="mt-8 w-full" onClick={() => navigate(user ? '/payment' : '/signup')}>
              <Zap className="h-4 w-4" /> Upgrade to Pro
            </Button>
          )}
        </Card>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        All scores are analytical estimates and not guarantees of employment. Cancel anytime from your account settings.
      </p>
    </div>
  );
}
