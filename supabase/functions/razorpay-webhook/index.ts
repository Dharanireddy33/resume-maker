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
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.text();

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const webhookSignature = req.headers.get("X-Razorpay-Signature");
      if (!webhookSignature) {
        return new Response(JSON.stringify({ error: "Missing webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encoder = new TextEncoder();
      const keyData = encoder.encode(WEBHOOK_SECRET);
      const bodyData = encoder.encode(body);

      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const expectedSig = await crypto.subtle.sign("HMAC", key, bodyData);
      const expectedHex = Array.from(new Uint8Array(expectedSig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (expectedHex !== webhookSignature) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      if (!paymentEntity) {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      // Find the payment record by order_id
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", orderId)
        .maybeSingle();

      if (!payment) {
        console.error("Webhook: payment record not found for order:", orderId);
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for duplicate webhook
      if (payment.verified) {
        return new Response(JSON.stringify({ status: "ok", message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: "captured",
          verified: true,
          razorpay_payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      // Activate subscription
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      await supabase
        .from("subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", payment.user_id)
        .eq("status", "active");

      await supabase.from("subscriptions").insert({
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        status: "active",
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        start_date: new Date().toISOString(),
        expiry_date: expiryDate.toISOString(),
      });
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      if (paymentEntity?.order_id) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            error_message: paymentEntity.error_description || "Payment failed",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", paymentEntity.order_id);
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
