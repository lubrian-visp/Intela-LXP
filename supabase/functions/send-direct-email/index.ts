/**
 * send-direct-email
 * Sends a composed email directly to one or more recipients.
 * Reads provider config from platform_settings at runtime.
 * Uses Resend (HTTP API) — reliable in Supabase edge runtime.
 * Falls back to SMTP only if Resend is not configured.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Build branded HTML ────────────────────────────────────────────────────────
function buildHtml(subject: string, body: string, fromName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#1e293b;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#f97316;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#fff;font-size:16px;font-weight:bold;">I</span>
      </div>
      <span style="color:#f8fafc;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Intela LXP</span>
    </div>
    <!-- Content -->
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;">${subject}</h1>
      <div style="color:#374151;font-size:15px;line-height:1.7;">${body.replace(/\n/g, "<br/>")}</div>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Sent by <strong>${fromName}</strong> via Intela LXP Platform.
        You received this because you are a registered user.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Resend sender ─────────────────────────────────────────────────────────────
async function sendViaResend(
  recipients: string[],
  subject: string,
  html: string,
  cfg: Record<string, string>,
) {
  const fromEmail = cfg.resend_from_email || "onboarding@resend.dev";
  const fromName  = cfg.resend_from_name  || "Intela LXP";

  const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];

  for (const to of recipients) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${cfg.resend_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    `${fromName} <${fromEmail}>`,
          to:      [to],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        results.push({ email: to, status: "failed", error: err });
      } else {
        results.push({ email: to, status: "sent" });
      }
    } catch (e: any) {
      results.push({ email: to, status: "failed", error: e.message });
    }
  }

  return results;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipients,   // string[]
      subject,      // string
      body,         // plain text or HTML
      isHtml,       // boolean — if true, body is treated as HTML
    } = await req.json();

    if (!recipients?.length) {
      return new Response(
        JSON.stringify({ error: "recipients array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!subject?.trim() || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "subject and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load platform email config
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: settings } = await supa
      .from("platform_settings")
      .select("setting_key, setting_value")
      .or("setting_key.like.email_%,setting_key.like.smtp_%,setting_key.like.resend_%");

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((s: any) => (cfg[s.setting_key] = s.setting_value));

    const provider  = cfg.email_provider || "resend";
    const fromName  = cfg.resend_from_name || cfg.smtp_from_name || "Intela LXP";

    const html = isHtml ? body : buildHtml(subject, body, fromName);

    if (provider === "resend") {
      if (!cfg.resend_api_key) {
        return new Response(
          JSON.stringify({ error: "Resend API key not configured. Go to Platform Settings → Email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const results = await sendViaResend(recipients, subject, html, cfg);
      const sent   = results.filter(r => r.status === "sent").length;
      const failed = results.filter(r => r.status === "failed").length;
      return new Response(
        JSON.stringify({ sent, failed, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SMTP path — note: raw TCP is blocked in Supabase edge runtime.
    // If SMTP is selected, advise switching to Resend.
    return new Response(
      JSON.stringify({
        error: "SMTP is not supported in the edge runtime. Please switch to Resend in Platform Settings → Email → System Email Provider.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("send-direct-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
