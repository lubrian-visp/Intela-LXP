/**
 * send-test-email
 * Supports both SMTP (via denomailer — proper Deno TCP) and Resend (HTTP API).
 */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── SMTP via denomailer (proper Deno TCP client) ───────────────────────────
async function sendViaSMTP(to: string, subject: string, html: string, config: any) {
  const port     = parseInt(config.smtp_port || "465", 10);
  const useTls   = config.smtp_use_ssl === "true" || port === 465;
  const fromName = config.smtp_from_name || "Intela LXP";
  const replyTo  = config.smtp_reply_to  || config.smtp_username;

  const client = new SMTPClient({
    connection: {
      hostname: config.smtp_host,
      port,
      tls: useTls,
      auth: {
        username: config.smtp_username,
        password: config.smtp_password,
      },
    },
  });

  try {
    await client.send({
      from:    `${fromName} <${config.smtp_username}>`,
      to,
      replyTo: replyTo,
      subject,
      html,
      content: html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
    });
    return { success: true, message: "SMTP test email sent successfully" };
  } finally {
    await client.close();
  }
}

// ── Resend HTTP API ────────────────────────────────────────────────────────
async function sendViaResend(to: string, subject: string, html: string, config: any) {
  const fromEmail = config.resend_from_email || "onboarding@resend.dev";
  const fromName  = config.resend_from_name  || "Intela LXP";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${config.resend_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    `${fromName} <${fromEmail}>`,
      to:      [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${err}`);
  }

  const result = await response.json();
  return { success: true, message: "Resend test email sent successfully", id: result.id };
}

// ── HTML template ─────────────────────────────────────────────────────────
function buildHtml(provider: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1e293b;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;background:#f97316;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:bold;font-size:14px;">I</span>
        </div>
        <span style="color:#f8fafc;font-size:16px;font-weight:700;">Intela LXP</span>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;">
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px;">✅ Email Configuration Working</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 8px;">
          This test email was sent via <strong>${provider === "smtp" ? "SMTP" : "Resend"}</strong>.
          Your email configuration is working correctly.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">Sent from Intela Platform Settings</p>
      </div>
    </div>
  `;
}

// ── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, to, smtpConfig, resendConfig } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Recipient email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = "Intela LXP — Email Configuration Test";
    const html    = buildHtml(provider);
    let result: any;

    if (provider === "smtp") {
      if (!smtpConfig?.smtp_host || !smtpConfig?.smtp_username || !smtpConfig?.smtp_password) {
        return new Response(
          JSON.stringify({ error: "SMTP host, username and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      result = await sendViaSMTP(to, subject, html, smtpConfig);

    } else if (provider === "resend") {
      if (!resendConfig?.resend_api_key) {
        return new Response(
          JSON.stringify({ error: "Resend API key is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      result = await sendViaResend(to, subject, html, resendConfig);

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Use "smtp" or "resend".' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error("send-test-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send test email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
