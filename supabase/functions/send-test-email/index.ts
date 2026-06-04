import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendViaSMTP(to: string, subject: string, html: string, config: any) {
  const port = parseInt(config.smtp_port || '587', 10);
  const useTls = config.smtp_use_ssl === 'true';

  // Encode credentials for SMTP AUTH
  const username = config.smtp_username;
  const password = config.smtp_password;
  const host = config.smtp_host;
  const fromName = config.smtp_from_name || 'Intela';
  const replyTo = config.smtp_reply_to || username;

  // Build RFC 2822 message
  const boundary = `boundary_${crypto.randomUUID().replace(/-/g, '')}`;
  const message = [
    `From: ${fromName} <${username}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'This is a test email from Intela Platform. If you can read this, your email configuration is working.',
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  // Use a relay approach: send via the SMTP server using a lightweight HTTP-to-SMTP bridge
  // Since Deno edge runtime cannot do raw TCP, we use an alternative approach
  // Try sending via the SMTP server's submission API if available, otherwise use nodemailer-compatible approach

  // For edge functions, we'll use a fetch-based SMTP relay service
  // Many SMTP providers also offer HTTP APIs. For raw SMTP, we need to use a different approach.
  
  // Attempt to use the SMTP provider's HTTP API if it's a known provider
  const lowerHost = host.toLowerCase();
  
  // Gmail SMTP → use Gmail API not possible without OAuth, so we provide clear error
  // For common providers, suggest using their HTTP API instead
  
  // Generic SMTP sending using base64-encoded SMTP transaction via Deno.connect
  const conn = useTls 
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(1024);
    const n = await conn.read(buf);
    if (n === null) throw new Error('Connection closed unexpectedly');
    return decoder.decode(buf.subarray(0, n));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + '\r\n'));
    return await readResponse();
  }

  try {
    // Read greeting
    await readResponse();
    
    // EHLO
    await sendCommand(`EHLO ${host}`);
    
    // If not TLS and port is 587, try STARTTLS
    if (!useTls && port === 587) {
      const starttlsResp = await sendCommand('STARTTLS');
      if (starttlsResp.startsWith('220')) {
        // Upgrade connection - not supported in basic Deno.connect
        // Skip for now, recommend port 465 for TLS
      }
    }
    
    // AUTH LOGIN
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(username));
    const authResp = await sendCommand(btoa(password));
    
    if (!authResp.includes('235') && !authResp.includes('Authentication successful')) {
      throw new Error('SMTP authentication failed: ' + authResp.trim());
    }
    
    // MAIL FROM
    await sendCommand(`MAIL FROM:<${username}>`);
    
    // RCPT TO
    await sendCommand(`RCPT TO:<${to}>`);
    
    // DATA
    await sendCommand('DATA');
    
    // Send message body
    const dataResp = await sendCommand(message + '\r\n.');
    
    if (!dataResp.startsWith('250')) {
      throw new Error('Failed to send message: ' + dataResp.trim());
    }
    
    // QUIT
    await sendCommand('QUIT');
    
    conn.close();
    
    return { success: true, message: 'SMTP test email sent successfully' };
  } catch (error) {
    try { conn.close(); } catch (_) {}
    throw error;
  }
}

async function sendViaResend(to: string, subject: string, html: string, config: any) {
  const fromEmail = config.resend_from_email || 'onboarding@resend.dev';
  const fromName = config.resend_from_name || 'Intela';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.resend_api_key}`,
      'Content-Type': 'application/json',
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

  const result = await response.json();
  return { success: true, message: 'Resend test email sent successfully', id: result.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, to, smtpConfig, resendConfig } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: 'Recipient email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = 'Intela Platform — Test Email';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Test Email from Intela</h2>
        <p style="color: #555; font-size: 14px;">
          This is a test email sent via <strong>${provider === 'smtp' ? 'SMTP' : 'Resend'}</strong>.
        </p>
        <p style="color: #555; font-size: 14px;">
          If you are reading this, your email configuration is working correctly.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Sent from Intela Platform Settings</p>
      </div>
    `;

    let result;

    if (provider === 'smtp') {
      if (!smtpConfig?.smtp_host || !smtpConfig?.smtp_username || !smtpConfig?.smtp_password) {
        return new Response(JSON.stringify({ error: 'SMTP host, username and password are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      result = await sendViaSMTP(to, subject, htmlBody, smtpConfig);

    } else if (provider === 'resend') {
      if (!resendConfig?.resend_api_key) {
        return new Response(JSON.stringify({ error: 'Resend API key is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      result = await sendViaResend(to, subject, htmlBody, resendConfig);

    } else {
      return new Response(JSON.stringify({ error: 'Invalid provider. Use "smtp" or "resend".' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Send test email error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to send test email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
