import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PaymentRequest {
  gateway_key: string;
  amount: number;
  currency: string;
  customer_email: string;
  customer_name?: string;
  description?: string;
  redirect_url?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body: PaymentRequest = await req.json();

    // Validate input
    if (!body.gateway_key || !body.amount || !body.currency || !body.customer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields: gateway_key, amount, currency, customer_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.amount <= 0) {
      return new Response(JSON.stringify({ error: "Amount must be greater than 0" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get gateway config using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: gateway, error: gwError } = await adminClient
      .from("payment_gateways")
      .select("*")
      .eq("gateway_key", body.gateway_key)
      .eq("status", "active")
      .single();

    if (gwError || !gateway) {
      return new Response(JSON.stringify({ error: "Gateway not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = gateway.config || {};
    const txRef = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    let paymentResult: any;

    // ── FLUTTERWAVE ──
    if (gateway.gateway_key === "flutterwave") {
      const secretKey = config.secret_key;
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Flutterwave secret key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const flwBase = gateway.test_mode
        ? "https://api.flutterwave.com/v3"
        : "https://api.flutterwave.com/v3";

      const flwResponse = await fetch(`${flwBase}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: body.amount,
          currency: body.currency,
          redirect_url: body.redirect_url || `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-callback`,
          customer: {
            email: body.customer_email,
            name: body.customer_name || body.customer_email,
          },
          customizations: {
            title: body.description || "Payment",
          },
          meta: body.metadata || {},
        }),
      });

      const flwData = await flwResponse.json();
      
      if (flwData.status === "success") {
        paymentResult = {
          success: true,
          payment_link: flwData.data?.link,
          tx_ref: txRef,
          provider: "flutterwave",
        };
      } else {
        paymentResult = {
          success: false,
          error: flwData.message || "Flutterwave payment initiation failed",
          provider: "flutterwave",
        };
      }
    }
    // ── PAYSTACK ──
    else if (gateway.gateway_key === "paystack") {
      const secretKey = config.secret_key;
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Paystack secret key not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const psResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: body.customer_email,
          amount: Math.round(body.amount * 100), // Paystack uses kobo/cents
          currency: body.currency,
          reference: txRef,
          callback_url: body.redirect_url,
          metadata: body.metadata || {},
        }),
      });

      const psData = await psResponse.json();

      if (psData.status) {
        paymentResult = {
          success: true,
          payment_link: psData.data?.authorization_url,
          tx_ref: txRef,
          access_code: psData.data?.access_code,
          provider: "paystack",
        };
      } else {
        paymentResult = {
          success: false,
          error: psData.message || "Paystack payment initiation failed",
          provider: "paystack",
        };
      }
    }
    // ── PAYFAST (redirect-based) ──
    else if (gateway.gateway_key === "payfast") {
      const merchantId = config.merchant_id;
      const merchantKey = config.merchant_key;
      if (!merchantId || !merchantKey) {
        return new Response(JSON.stringify({ error: "Payfast credentials not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pfBase = gateway.test_mode ? "https://sandbox.payfast.co.za" : "https://www.payfast.co.za";

      paymentResult = {
        success: true,
        payment_link: `${pfBase}/eng/process`,
        form_data: {
          merchant_id: merchantId,
          merchant_key: merchantKey,
          amount: body.amount.toFixed(2),
          item_name: body.description || "Payment",
          email_address: body.customer_email,
          m_payment_id: txRef,
        },
        tx_ref: txRef,
        provider: "payfast",
        method: "form_post", // Payfast uses form POST redirect
      };
    } else {
      return new Response(JSON.stringify({ error: `Unsupported gateway: ${gateway.gateway_key}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record transaction
    await adminClient.from("payment_transactions").insert({
      gateway_id: gateway.id,
      external_ref: txRef,
      amount: body.amount,
      currency: body.currency,
      status: paymentResult.success ? "pending" : "failed",
      payment_method: null,
      customer_email: body.customer_email,
      customer_name: body.customer_name || null,
    });

    return new Response(JSON.stringify(paymentResult), {
      status: paymentResult.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Payment processing error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
