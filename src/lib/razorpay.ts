import { supabase, EDGE_FUNCTION_URL } from './supabase';

export async function createRazorpayOrder(planId: string): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  paymentDbId: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('You must be signed in to make a payment.');

  const res = await fetch(`${EDGE_FUNCTION_URL}/razorpay-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_id: planId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create payment order. Please try again.');
  }

  const data = await res.json();
  return {
    orderId: data.order_id,
    amount: data.amount,
    currency: data.currency,
    paymentDbId: data.payment_id,
  };
}

export async function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentDbId: string;
}): Promise<{ success: boolean; message: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('You must be signed in to verify a payment.');

  const res = await fetch(`${EDGE_FUNCTION_URL}/razorpay-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Payment verification failed.');
  }

  return res.json();
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export async function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout. Check your network connection.'));
    document.body.appendChild(script);
  });
}
