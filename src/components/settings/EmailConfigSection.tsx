import { useState, useEffect } from "react";
import { Settings, Link2, Mail, Webhook, Loader2, CheckCircle2, Copy, Send } from "lucide-react";
import { usePlatformSettings, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function EmailConfigSection() {
  const { data: emailSettings, isLoading } = usePlatformSettings("email");
  const update = useUpdatePlatformSetting();

  const [smtpForm, setSmtpForm] = useState({
    smtp_host: "",
    smtp_port: "465",
    smtp_username: "",
    smtp_password: "",
    smtp_from_name: "",
    smtp_reply_to: "",
    smtp_use_ssl: "true",
  });

  const [resendForm, setResendForm] = useState({
    resend_api_key: "",
    resend_from_email: "",
    resend_from_name: "",
  });

  const [publicUrl, setPublicUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [resendTestEmail, setResendTestEmail] = useState("");
  const [sendingSmtp, setSendingSmtp] = useState(false);
  const [sendingResend, setSendingResend] = useState(false);

  const sendTestEmail = async (provider: "smtp" | "resend") => {
    const recipientEmail = provider === "smtp" ? testEmail : resendTestEmail;
    if (!recipientEmail) {
      toast({ title: "Enter a recipient email first", variant: "destructive" });
      return;
    }

    const setter = provider === "smtp" ? setSendingSmtp : setSendingResend;
    setter(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: {
          provider,
          to: recipientEmail,
          smtpConfig: provider === "smtp" ? smtpForm : undefined,
          resendConfig: provider === "resend" ? resendForm : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Test email sent!", description: data?.message || `Check ${recipientEmail}` });
    } catch (err: any) {
      toast({ title: "Failed to send test email", description: err.message, variant: "destructive" });
    } finally {
      setter(false);
    }
  };

  useEffect(() => {
    if (emailSettings) {
      const map: Record<string, string> = {};
      emailSettings.forEach((s) => (map[s.setting_key] = s.setting_value));
      setSmtpForm({
        smtp_host: map.smtp_host ?? "",
        smtp_port: map.smtp_port ?? "465",
        smtp_username: map.smtp_username ?? "",
        smtp_password: map.smtp_password ?? "",
        smtp_from_name: map.smtp_from_name ?? "",
        smtp_reply_to: map.smtp_reply_to ?? "",
        smtp_use_ssl: map.smtp_use_ssl ?? "true",
      });
      setResendForm({
        resend_api_key: map.resend_api_key ?? "",
        resend_from_email: map.resend_from_email ?? "",
        resend_from_name: map.resend_from_name ?? "",
      });
      setPublicUrl(map.public_site_url ?? "");
    }
  }, [emailSettings]);

  const findSetting = (key: string) => emailSettings?.find((s) => s.setting_key === key);

  const saveSMTP = () => {
    const keys = Object.keys(smtpForm) as (keyof typeof smtpForm)[];
    keys.forEach((key) => {
      const setting = findSetting(key);
      if (setting && setting.setting_value !== smtpForm[key]) {
        update.mutate({ id: setting.id, setting_value: smtpForm[key] });
      }
    });
  };

  const saveResend = () => {
    const keys = Object.keys(resendForm) as (keyof typeof resendForm)[];
    keys.forEach((key) => {
      const setting = findSetting(key);
      if (setting && setting.setting_value !== resendForm[key]) {
        update.mutate({ id: setting.id, setting_value: resendForm[key] });
      }
    });
  };

  const savePublicUrl = () => {
    const setting = findSetting("public_site_url");
    if (setting) update.mutate({ id: setting.id, setting_value: publicUrl });
  };

  const providerSetting = findSetting("email_provider");
  const isSmtp = providerSetting?.setting_value === "smtp";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Application Settings */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Application Settings</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Configure your application's public URL for email links and redirects</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Public Site URL</label>
            <Input
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://yourdomain.com/register/token_claim"
              className="h-9 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              This URL will be used in registration emails and other external links. Include the protocol (https://) but no trailing slash.
            </p>
          </div>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs" onClick={savePublicUrl}>
            Save Settings
          </Button>

          <div className="border-t border-border/30 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-accent" />
                <div>
                  <p className="text-xs font-medium text-foreground">Registration Link Format</p>
                  <p className="text-[10px] text-muted-foreground">
                    {findSetting("registration_link_format")?.setting_value || "Page-level Protected Access"}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Tokens are automatically generated when you send registration invitations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Email Configuration */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">System Email Configuration</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Configure email provider for all platform notifications (MFA reminders, support emails, etc.)</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">System Email Provider</p>
              <p className="text-[10px] text-muted-foreground">All system emails (MFA reminders, support, notifications) use SMTP</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Resend</span>
              <Switch
                checked={isSmtp}
                onCheckedChange={(checked) => {
                  if (providerSetting) {
                    update.mutate({ id: providerSetting.id, setting_value: checked ? "smtp" : "resend" });
                  }
                }}
              />
              <span className="text-[10px] font-medium text-foreground">SMTP</span>
            </div>
          </div>
        </div>
      </div>

      {/* SMTP Configuration */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">SMTP Configuration</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Configure your SMTP server for sending transactional emails. All credentials are encrypted and stored securely.</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Quick reference for common providers */}
          <div className="rounded-xl bg-secondary/40 border border-border/50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/30">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Common SMTP Providers</p>
            </div>
            <div className="divide-y divide-border/30">
              {[
                { name: "Gmail",          host: "smtp.gmail.com",          port: "587", note: "Enable App Password in Google Account → Security" },
                { name: "Outlook / M365", host: "smtp.office365.com",      port: "587", note: "Use your Microsoft 365 email + password" },
                { name: "Yahoo",          host: "smtp.mail.yahoo.com",      port: "587", note: "Enable App Password in Yahoo account settings" },
                { name: "Resend SMTP",    host: "smtp.resend.com",          port: "465", note: "Username: 'resend' · Password: your Resend API key" },
                { name: "SendGrid",       host: "smtp.sendgrid.net",        port: "587", note: "Username: 'apikey' · Password: your SendGrid API key" },
                { name: "Mailgun",        host: "smtp.mailgun.org",         port: "587", note: "Use Mailgun SMTP credentials from your domain" },
                { name: "Amazon SES",     host: "email-smtp.us-east-1.amazonaws.com", port: "587", note: "Use SES SMTP credentials (IAM user)" },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 cursor-pointer transition-colors"
                  onClick={() => setSmtpForm(f => ({ ...f, smtp_host: p.host, smtp_port: p.port, smtp_use_ssl: p.port === "465" ? "true" : "false" }))}>
                  <span className="text-[12px] font-semibold text-foreground w-28 shrink-0">{p.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground w-44 shrink-0">{p.host}:{p.port}</span>
                  <span className="text-[10px] text-muted-foreground/70">{p.note}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 bg-blue-500/5 border-t border-blue-500/10">
              <p className="text-[10px] text-blue-600">💡 Click any row to auto-fill the host and port fields below.</p>
            </div>
          </div>

          {smtpForm.smtp_host && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <p className="text-[11px] text-success">SMTP host configured — click "Send Test Email" to verify the connection</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">SMTP Host *</label>
              <Input
                value={smtpForm.smtp_host}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                placeholder="mail.example.com"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Port *</label>
              <Input
                value={smtpForm.smtp_port}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                placeholder="465"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Username *</label>
            <Input
              value={smtpForm.smtp_username}
              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_username: e.target.value })}
              placeholder="noreply@example.com"
              className="h-9 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Password (Leave blank to keep current)</label>
            <Input
              type="password"
              value={smtpForm.smtp_password}
              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
              placeholder="••••••••"
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">From Name *</label>
              <Input
                value={smtpForm.smtp_from_name}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_from_name: e.target.value })}
                placeholder="Intela Support"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Reply-To Email</label>
              <Input
                value={smtpForm.smtp_reply_to}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_reply_to: e.target.value })}
                placeholder="info@example.com"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={smtpForm.smtp_use_ssl === "true"}
              onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, smtp_use_ssl: String(checked) })}
            />
            <span className="text-xs text-foreground">Use SSL/TLS (Port 465)</span>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Test Email</label>
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs" onClick={saveSMTP}>
              Save Configuration
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" disabled={!testEmail || sendingSmtp} onClick={() => sendTestEmail("smtp")}>
              {sendingSmtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send Test Email
            </Button>
          </div>
        </div>
      </div>

      {/* Resend Configuration */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Resend Configuration</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Configure Resend for sending transactional emails.{" "}
            <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Get your API key from resend.com/api-keys
            </a>
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Resend API Key (Leave blank to keep current)</label>
            <Input
              type="password"
              value={resendForm.resend_api_key}
              onChange={(e) => setResendForm({ ...resendForm, resend_api_key: e.target.value })}
              placeholder="re_••••••••"
              className="h-9 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">From Email *</label>
              <Input
                value={resendForm.resend_from_email}
                onChange={(e) => setResendForm({ ...resendForm, resend_from_email: e.target.value })}
                placeholder="info@example.com"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">From Name *</label>
              <Input
                value={resendForm.resend_from_name}
                onChange={(e) => setResendForm({ ...resendForm, resend_from_name: e.target.value })}
                placeholder="Intela Support"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Test Email</label>
            <Input
              value={resendTestEmail}
              onChange={(e) => setResendTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs" onClick={saveResend}>
              Save Configuration
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" disabled={!resendTestEmail || sendingResend} onClick={() => sendTestEmail("resend")}>
              {sendingResend ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send Test Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
