/**
 * send-password-reset
 * Generates a Supabase auth recovery link then sends a fully branded
 * Intela email via the platform's configured SMTP or Resend provider.
 * Replaces the default Supabase Auth email entirely.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "https://esm.sh/nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Branded HTML ──────────────────────────────────────────────────────────────
function buildResetHtml(resetLink: string, userName: string, fromName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1e293b;padding:28px 36px;display:flex;align-items:center;gap:14px;">
      <div style="width:40px;height:40px;background:#f97316;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:#ffffff;font-size:18px;font-weight:800;">I</span>
      </div>
      <div>
        <div style="color:#f8fafc;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Intela LXP</div>
        <div style="color:#94a3b8;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">Learning Experience Platform</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:36px;">
      <div style="width:52px;height:52px;background:#fef3c7;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <span style="font-size:26px;">🔑</span>
      </div>

      <h1 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:700;line-height:1.2;">
        Reset your password
      </h1>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
        Hi${userName ? ` ${userName}` : ""},<br/>
        We received a request to reset the password for your Intela LXP account.
        Click the button below to choose a new password.
      </p>

      <!-- CTA Button -->
      <div style="margin:28px 0;">
        <a href="${resetLink}"
           style="display:inline-block;padding:14px 32px;background:#f97316;color:#ffffff;
                  text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;
                  letter-spacing:0.2px;">
          Reset My Password
        </a>
      </div>

      <!-- Fallback link -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-top:24px;">
        <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
          Button not working?
        </p>
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
          Copy and paste this link into your browser:
        </p>
        <p style="margin:6px 0 0;word-break:break-all;">
          <a href="${resetLink}" style="color:#f97316;font-size:12px;text-decoration:none;">${resetLink}</a>
        </p>
      </div>

      <!-- Security notice -->
      <div style="margin-top:28px;padding-top:24px;border-top:1px solid #f1f5f9;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">
          🔒 This link expires in <strong>1 hour</strong> and can only be used once.<br/>
          If you didn't request a password reset, you can safely ignore this email —
          your password will not change.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Sent by <strong style="color:#64748b;">${fromName}</strong> · Intela LXP Platform<br/>
        <span style="font-size:11px;">This is an automated security email — please do not reply.</span>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Send via SMTP ─────────────────────────────────────────────────────────────
async function sendViaSMTP(to: string, subject: string, html: string, cfg: Record<string, string>) {
  const port   = parseInt(cfg.smtp_port || "587", 10);
  const secure = cfg.smtp_use_ssl === "true" || port === 465;

  const transporter = nodemailer.createTransport({
    host:   cfg.smtp_host,
    port,
    secure,
    auth: { user: cfg.smtp_username, pass: cfg.smtp_password },
    tls:  { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from:    `"${cfg.smtp_from_name || "Intela LXP"}" <${cfg.smtp_username}>`,
    replyTo: cfg.smtp_reply_to || cfg.smtp_username,
    to,
    subject,
    html,
    text: "Reset your Intela LXP password by visiting: (see HTML version)",
  });
}

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendViaResend(to: string, subject: string, html: string, cfg: Record<string, string>) {
  const fromEmail = cfg.resend_from_email || "noreply@resend.dev";
  const fromName  = cfg.resend_from_name  || "Intela LXP";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
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

  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, redirectTo } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Load platform email settings
    const { data: settings } = await adminClient
      .from("platform_settings")
      .select("setting_key, setting_value")
      .or("setting_key.like.email_%,setting_key.like.smtp_%,setting_key.like.resend_%,setting_key.eq.public_site_url");

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((s: any) => (cfg[s.setting_key] = s.setting_value));

    const provider  = cfg.email_provider || "smtp";
    const publicUrl = redirectTo || cfg.public_site_url || SUPABASE_URL;
    const fromName  = cfg.smtp_from_name || cfg.resend_from_name || "Intela LXP";

    // 2. Generate secure recovery link via Supabase Admin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${publicUrl}/reset-password` },
    });

    if (linkError) throw new Error(`Failed to generate reset link: ${linkError.message}`);
    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) throw new Error("No reset link generated");

    // 3. Build branded email
    const subject = "Reset your Intela LXP password";
    const html    = buildResetHtml(resetLink, userName || "", fromName);

    // 4. Send via configured provider
    if (provider === "resend") {
      if (!cfg.resend_api_key) throw new Error("Resend API key not configured");
      await sendViaResend(email, subject, html, cfg);
    } else {
      if (!cfg.smtp_host || !cfg.smtp_username || !cfg.smtp_password) {
        throw new Error("SMTP not fully configured. Go to Platform Settings → Email.");
      }
      await sendViaSMTP(email, subject, html, cfg);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Password reset email sent to ${email}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("send-password-reset error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send password reset email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
