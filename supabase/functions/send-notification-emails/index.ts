import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/* ── SMTP raw-socket sender (mirrors send-test-email logic) ── */
async function sendViaSMTP(
  to: string,
  subject: string,
  html: string,
  config: Record<string, string>,
) {
  const port = parseInt(config.smtp_port || "465", 10);
  const useTls = config.smtp_use_ssl === "true";
  const username = config.smtp_username;
  const password = config.smtp_password;
  const host = config.smtp_host;
  const fromName = config.smtp_from_name || "Intela";
  const replyTo = config.smtp_reply_to || username;

  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, "")}`;
  const plainText = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const message = [
    `From: ${fromName} <${username}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    plainText,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const conn = useTls
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(1024);
    const n = await conn.read(buf);
    if (n === null) throw new Error("Connection closed unexpectedly");
    return decoder.decode(buf.subarray(0, n));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse(); // greeting
    await sendCommand(`EHLO ${host}`);

    if (!useTls && port === 587) {
      await sendCommand("STARTTLS");
    }

    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(username));
    const authResp = await sendCommand(btoa(password));

    if (!authResp.includes("235") && !authResp.includes("Authentication successful")) {
      throw new Error("SMTP authentication failed: " + authResp.trim());
    }

    await sendCommand(`MAIL FROM:<${username}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const dataResp = await sendCommand(message + "\r\n.");
    if (!dataResp.startsWith("250")) {
      throw new Error("Failed to send message: " + dataResp.trim());
    }

    await sendCommand("QUIT");
    conn.close();
  } catch (error) {
    try { conn.close(); } catch (_) { /* ignore */ }
    throw error;
  }
}

/* ── Resend HTTP API sender ── */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  config: Record<string, string>,
) {
  const fromEmail = config.resend_from_email || "onboarding@resend.dev";
  const fromName = config.resend_from_name || "Intela";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resend_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${errorText}`);
  }
  await response.json(); // consume body
}

/* ── Build styled HTML for a notification ── */
function buildNotificationHtml(
  title: string,
  body: string | null,
  actionUrl: string | null,
  category: string,
): string {
  const categoryIcon: Record<string, string> = {
    approval: "🔔",
    submission: "📝",
    general: "📢",
  };
  const icon = categoryIcon[category] ?? "📣";

  const actionBlock = actionUrl
    ? `<p style="margin:20px 0;"><a href="${actionUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">View Details</a></p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#333;font-size:18px;">${icon} ${title}</h2>
      ${body ? `<p style="color:#555;font-size:14px;line-height:1.6;">${body}</p>` : ""}
      ${actionBlock}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#999;font-size:11px;">This email was sent by Intela Platform because you have email notifications enabled for this category.</p>
    </div>
  `;
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load email provider config from platform_settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("setting_key, setting_value")
      .or("setting_key.like.email_%,setting_key.like.smtp_%,setting_key.like.resend_%");

    const cfg: Record<string, string> = {};
    (settings ?? []).forEach((s: any) => (cfg[s.setting_key] = s.setting_value));

    const provider = cfg.email_provider || "smtp";

    // Validate that minimum config exists
    if (provider === "smtp" && (!cfg.smtp_host || !cfg.smtp_username || !cfg.smtp_password)) {
      return new Response(
        JSON.stringify({ error: "SMTP not configured. Go to Settings → Email to configure." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (provider === "resend" && !cfg.resend_api_key) {
      return new Response(
        JSON.stringify({ error: "Resend not configured. Go to Settings → Email to configure." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch unsent notifications
    const { data: pendingNotifications, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, category, created_at, reference_table, reference_id, action_url")
      .eq("email_sent", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!pendingNotifications?.length) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Get unique user IDs
    const userIds = [...new Set(pendingNotifications.map((n: any) => n.user_id))];

    // 4. Check preferences: opt-out model — send unless user explicitly disabled email
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id, category, email_enabled")
      .in("user_id", userIds);

    // Build a set of explicitly disabled combos
    const disabledSet = new Set(
      (preferences ?? [])
        .filter((p: any) => p.email_enabled === false)
        .map((p: any) => `${p.user_id}:${p.category}`)
    );

    // 5. Get user emails from auth (service role)
    const emailMap: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      if (userData?.user?.email) {
        emailMap[uid] = userData.user.email;
      }
    }

    let sent = 0;
    let failed = 0;
    const markedIds: string[] = [];
    const emailLog: Array<{ to: string; subject: string; category: string; status: string }> = [];

    // 6. Send emails
    for (const notif of pendingNotifications) {
      const isDisabled = disabledSet.has(`${notif.user_id}:${notif.category}`);
      const email = emailMap[notif.user_id];

      if (isDisabled || !email) {
        markedIds.push(notif.id);
        continue;
      }

      const subjectPrefix: Record<string, string> = {
        approval: "🔔 Action Required",
        submission: "📝 Assessment Update",
        general: "📢 Notification",
      };
      const subject = `${subjectPrefix[notif.category] ?? "📣 Update"}: ${notif.title}`;
      const html = buildNotificationHtml(notif.title, notif.body, notif.action_url, notif.category);

      try {
        if (provider === "smtp") {
          await sendViaSMTP(email, subject, html, cfg);
        } else {
          await sendViaResend(email, subject, html, cfg);
        }
        emailLog.push({ to: email, subject, category: notif.category, status: "sent" });
        sent++;
      } catch (sendErr: any) {
        console.error(`[Email] Failed to send to ${email}:`, sendErr.message);
        emailLog.push({ to: email, subject, category: notif.category, status: `failed: ${sendErr.message}` });
        failed++;
      }

      markedIds.push(notif.id);
    }

    // 7. Mark all processed notifications
    if (markedIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .in("id", markedIds);
    }

    return new Response(
      JSON.stringify({
        processed: markedIds.length,
        emails_sent: sent,
        emails_failed: failed,
        skipped: markedIds.length - sent - failed,
        provider,
        log: emailLog,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Email notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
