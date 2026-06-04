import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const gatewayKey = url.searchParams.get("gateway") || "";
    const body = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the gateway
    const { data: gateway } = await adminClient
      .from("payment_gateways")
      .select("*")
      .eq("gateway_key", gatewayKey)
      .single();

    if (!gateway) {
      return new Response(JSON.stringify({ error: "Unknown gateway" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let eventType = "unknown";
    let txRef = "";
    let status = "received";
    let responseCode: number | null = null;

    // ── FLUTTERWAVE WEBHOOK ──
    if (gatewayKey === "flutterwave") {
      // Verify webhook hash
      const flwSecretHash = req.headers.get("verif-hash");
      const config = gateway.config || {};
      if (config.webhook_hash && flwSecretHash !== config.webhook_hash) {
        return new Response(JSON.stringify({ error: "Invalid hash" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      eventType = body.event || "charge.completed";
      txRef = body.data?.tx_ref || "";
      const flwStatus = body.data?.status;

      if (flwStatus === "successful") {
        status = "success";
        // Update transaction
        await adminClient
          .from("payment_transactions")
          .update({ status: "successful", payment_method: body.data?.payment_type })
          .eq("external_ref", txRef);
      } else {
        status = "failed";
        await adminClient
          .from("payment_transactions")
          .update({ status: "failed" })
          .eq("external_ref", txRef);
      }
    }
    // ── PAYSTACK WEBHOOK ──
    else if (gatewayKey === "paystack") {
      eventType = body.event || "";
      txRef = body.data?.reference || "";

      if (eventType === "charge.success") {
        status = "success";
        await adminClient
          .from("payment_transactions")
          .update({ status: "successful", payment_method: body.data?.channel })
          .eq("external_ref", txRef);
      } else if (eventType === "charge.failed") {
        status = "failed";
        await adminClient
          .from("payment_transactions")
          .update({ status: "failed" })
          .eq("external_ref", txRef);
      }
    }
    // ── PAYFAST ITN ──
    else if (gatewayKey === "payfast") {
      eventType = "itn";
      txRef = body.m_payment_id || "";
      const pfStatus = body.payment_status;

      if (pfStatus === "COMPLETE") {
        status = "success";
        await adminClient
          .from("payment_transactions")
          .update({ status: "successful", payment_method: body.payment_method || "eft" })
          .eq("external_ref", txRef);
      } else if (pfStatus === "CANCELLED" || pfStatus === "FAILED") {
        status = "failed";
        await adminClient
          .from("payment_transactions")
          .update({ status: pfStatus.toLowerCase() })
          .eq("external_ref", txRef);
      }
    }

    // Log webhook
    await adminClient.from("payment_webhook_logs").insert({
      gateway_id: gateway.id,
      event_type: eventType,
      status,
      reference: txRef,
      payload: body,
      response_code: responseCode,
      processed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
