import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(RAZORPAY_KEY_SECRET!);
  const messageData = encoder.encode(`${orderId}|${paymentId}`);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const expectedSig = await crypto.subtle.sign("HMAC", key, messageData);
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedHex === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Razorpay is not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentDbId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentDbId) {
      return new Response(JSON.stringify({ error: "Missing payment verification details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the payment record from DB
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentDbId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment record not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate verification
    if (payment.verified) {
      return new Response(JSON.stringify({ success: true, message: "Payment already verified." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.razorpay_order_id !== razorpay_order_id) {
      return new Response(JSON.stringify({ error: "Order ID mismatch." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the signature
    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          error_message: "Invalid signature",
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentDbId);

      return new Response(JSON.stringify({ success: false, message: "Payment verification failed: invalid signature." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment status with Razorpay API
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const paymentCheckRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!paymentCheckRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to verify payment with Razorpay." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentData = await paymentCheckRes.json();
    if (paymentData.status !== "captured" && paymentData.status !== "authorized") {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          error_message: `Payment status: ${paymentData.status}`,
          razorpay_payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentDbId);

      return new Response(JSON.stringify({ success: false, message: `Payment not completed. Status: ${paymentData.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment record as verified
    await supabase
      .from("payments")
      .update({
        status: "captured",
        verified: true,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentDbId);

    // Activate Pro subscription
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // Deactivate any existing active subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("user_id", userData.user.id)
      .eq("status", "active");

    // Create new active subscription
    await supabase.from("subscriptions").insert({
      user_id: userData.user.id,
      plan_id: "pro",
      status: "active",
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
      start_date: new Date().toISOString(),
      expiry_date: expiryDate.toISOString(),
    });

    return new Response(JSON.stringify({ success: true, message: "Payment verified and Pro activated." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment verification failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
