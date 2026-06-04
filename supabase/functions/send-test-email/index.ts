/**
 * send-test-email
 * Supports SMTP (via nodemailer) and Resend (HTTP API).
 */
import nodemailer from "https://esm.sh/nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── SMTP via nodemailer ───────────────────────────────────────────────────────
async function sendViaSMTP(to: string, subject: string, html: string, config: any) {
  const port   = parseInt(config.smtp_port || "587", 10);
  const secure = config.smtp_use_ssl === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host:   config.smtp_host,
    port,
    secure,
    auth: {
      user: config.smtp_username,
      pass: config.smtp_password,
    },
    tls: { rejectUnauthorized: false }, // allow self-signed certs on custom domains
  });

  const info = await transporter.sendMail({
    from:    `"${config.smtp_from_name || "Intela LXP"}" <${config.smtp_username}>`,
    replyTo: config.smtp_reply_to || config.smtp_username,
    to,
    subject,
    html,
    text: html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
  });

  return { success: true, message: "SMTP test email sent successfully", messageId: info.messageId };
}

// ── Resend HTTP API ───────────────────────────────────────────────────────────
async function sendViaResend(to: string, subject: string, html: string, config: any) {
  const fromEmail = config.resend_from_email || "onboarding@resend.dev";
  const fromName  = config.resend_from_name  || "Intela LXP";

  const res = await fetch("https://api.resend.com/emails", {
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

  if (!res.ok) throw new Error(`Resend API error: ${await res.text()}`);
  const result = await res.json();
  return { success: true, message: "Resend test email sent successfully", id: result.id };
}

// ── HTML template ─────────────────────────────────────────────────────────────
function buildHtml(provider: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1e293b;padding:20px 24px;border-radius:12px 12px 0 0;">
        <span style="color:#f8fafc;font-size:18px;font-weight:700;">✅ Intela LXP — Email Test</span>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px;">Email Configuration Working</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 8px;">
          This test email was sent via <strong>${provider === "smtp" ? "SMTP" : "Resend"}</strong>.
          Your email configuration is working correctly.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">Sent from Intela Platform Settings</p>
      </div>
    </div>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, to, smtpConfig, resendConfig } = await req.json();

    if (!to) return new Response(
      JSON.stringify({ error: "Recipient email is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

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
