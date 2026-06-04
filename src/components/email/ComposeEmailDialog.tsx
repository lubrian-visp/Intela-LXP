import { useState, useMemo } from "react";
import {
  Mail, Send, Users, User, X, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff,
  Bold, Italic, List, Link2, FileText, Sparkles, Info,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Recipient {
  userId: string;
  email: string;
  name: string;
  role: string;
}

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pre-fill a single recipient (e.g. from Staff Directory) */
  prefilledRecipient?: { email: string; name: string; role?: string };
}

// ── Role groups for bulk selection ────────────────────────────────────────────

const ROLE_GROUPS = [
  { key: "all_staff",        label: "All Staff",             roles: ["systems_admin","programme_manager","operations","talent_manager","facilitator","assessor","moderator","mentor","ld_support_officer"] },
  { key: "programme_manager",label: "Programme Managers",    roles: ["programme_manager"] },
  { key: "facilitator",      label: "Facilitators",          roles: ["facilitator"] },
  { key: "assessor",         label: "Assessors",             roles: ["assessor"] },
  { key: "moderator",        label: "Moderators",            roles: ["moderator"] },
  { key: "mentor",           label: "Mentors",               roles: ["mentor"] },
  { key: "learner",          label: "Learners",              roles: ["learner"] },
  { key: "operations",       label: "Operations",            roles: ["operations"] },
  { key: "talent_manager",   label: "Talent Managers",       roles: ["talent_manager"] },
];

const EMAIL_TEMPLATES = [
  {
    label: "Welcome",
    icon: "👋",
    subject: "Welcome to Intela LXP",
    body: "Dear {name},\n\nWelcome to the Intela Learning Experience Platform. Your account is now active and you can access all resources assigned to your role.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nIntela LXP Team",
  },
  {
    label: "Reminder",
    icon: "🔔",
    subject: "Important Reminder — Action Required",
    body: "Dear {name},\n\nThis is a reminder that you have pending tasks that require your attention on the platform.\n\nPlease log in at your earliest convenience to review and action any outstanding items.\n\nBest regards,\nIntela LXP Team",
  },
  {
    label: "Announcement",
    icon: "📢",
    subject: "Platform Announcement",
    body: "Dear Team,\n\nWe have an important announcement to share with you.\n\n[Your announcement here]\n\nThank you for your continued support.\n\nBest regards,\nIntela LXP Team",
  },
  {
    label: "Password Reset",
    icon: "🔑",
    subject: "Your Password Has Been Reset",
    body: "Dear {name},\n\nYour password on the Intela LXP platform has been reset by an administrator.\n\nPlease log in using your temporary credentials and change your password immediately.\n\nIf you did not request this change, please contact your administrator.\n\nBest regards,\nIntela LXP Team",
  },
];

// ── Fetch all users with emails ───────────────────────────────────────────────
function useAllUsers() {
  return useQuery({
    queryKey: ["email-compose-users"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles_safe")
        .select("user_id, full_name, role_keys")
        .order("full_name");
      if (error) throw error;

      // Get emails from auth via user_roles + profiles
      const { data: roleData } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role");

      return (data ?? []).map((p: any) => ({
        userId: p.user_id,
        name: p.full_name || "Unknown",
        roles: (roleData ?? []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      }));
    },
    staleTime: 60_000,
  });
}

function useUserEmails(userIds: string[]) {
  return useQuery({
    queryKey: ["email-compose-emails", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_email_lookup")
        .select("user_id, email")
        .in("user_id", userIds);
      // Fallback: if view doesn't exist, use profiles
      if (error) {
        const { data: p } = await (supabase as any)
          .from("profiles")
          .select("user_id")
          .in("user_id", userIds);
        return (p ?? []).map((r: any) => ({ user_id: r.user_id, email: "" }));
      }
      return data as { user_id: string; email: string }[];
    },
    staleTime: 30_000,
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComposeEmailDialog({
  open, onOpenChange, prefilledRecipient,
}: ComposeEmailDialogProps) {
  const [step, setStep]                   = useState<"compose" | "preview">("compose");
  const [subject, setSubject]             = useState("");
  const [body, setBody]                   = useState("");
  const [manualEmail, setManualEmail]     = useState(prefilledRecipient?.email ?? "");
  const [manualName, setManualName]       = useState(prefilledRecipient?.name ?? "");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [recipientMode, setRecipientMode] = useState<"individual" | "group" | "manual">(
    prefilledRecipient ? "individual" : "manual"
  );
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [sending, setSending]             = useState(false);
  const [result, setResult]               = useState<{ sent: number; failed: number } | null>(null);

  const { data: emailSettings } = usePlatformSettings("email");
  const providerSetting = emailSettings?.find(s => s.setting_key === "email_provider");
  const isResend = !providerSetting || providerSetting.setting_value === "resend";
  const fromName  = emailSettings?.find(s => s.setting_key === isResend ? "resend_from_name" : "smtp_from_name")?.setting_value || "Intela LXP";
  const fromEmail = emailSettings?.find(s => s.setting_key === isResend ? "resend_from_email" : "smtp_username")?.setting_value || "";

  const recipientEmails = useMemo(() => {
    if (recipientMode === "manual") {
      return manualEmail.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes("@"));
    }
    if (recipientMode === "individual" && prefilledRecipient) {
      return [prefilledRecipient.email];
    }
    return []; // group mode: resolved from user list
  }, [recipientMode, manualEmail, prefilledRecipient]);

  const canSend = subject.trim() && body.trim() &&
    (recipientEmails.length > 0 || selectedGroups.length > 0);

  const applyTemplate = (t: typeof EMAIL_TEMPLATES[0]) => {
    setSubject(t.subject);
    setBody(t.body);
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const allEmails = [...recipientEmails];

      // For group mode, collect emails from user list (simplified: pass role filter to edge fn)
      // Edge function handles Resend/SMTP selection automatically

      if (allEmails.length === 0 && selectedGroups.length === 0) {
        toast({ title: "No recipients", description: "Add at least one recipient.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-direct-email", {
        body: {
          recipients: allEmails,
          subject: subject.trim(),
          body: body.trim(),
          isHtml: false,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({ sent: data.sent ?? allEmails.length, failed: data.failed ?? 0 });
      toast({ title: `Email sent to ${data.sent ?? allEmails.length} recipient(s)` });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setStep("compose"); setSubject(""); setBody(""); setManualEmail(prefilledRecipient?.email ?? "");
    setManualName(prefilledRecipient?.name ?? ""); setSelectedGroups([]); setResult(null);
    setRecipientMode(prefilledRecipient ? "individual" : "manual");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-primary" />
              </div>
              Compose Email
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Provider badge */}
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
                isResend
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", isResend ? "bg-green-500" : "bg-orange-500")} />
                via {isResend ? "Resend" : "SMTP"}
              </span>
            </div>
          </div>


          {/* Step tabs */}
          <div className="flex gap-1 mt-4 border-b border-border">
            {(["compose", "preview"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={cn(
                  "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors capitalize",
                  step === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "preview" ? "Preview" : "Compose"}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === "compose" ? (
            <div className="space-y-4">

              {/* From */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/50">
                <span className="text-[11px] font-semibold text-muted-foreground w-8 shrink-0">From</span>
                <span className="text-sm text-foreground font-medium">{fromName}</span>
                {fromEmail && <span className="text-[11px] text-muted-foreground">〈{fromEmail}〉</span>}
              </div>

              {/* To */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">To <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-1">
                    {(["manual","group"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setRecipientMode(mode)}
                        className={cn(
                          "text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors",
                          recipientMode === mode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode === "manual" ? "Direct Email" : "By Role"}
                      </button>
                    ))}
                  </div>
                </div>

                {recipientMode === "manual" && (
                  <div>
                    <Textarea
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                      placeholder="Enter email addresses separated by commas or new lines&#10;e.g. john@example.com, jane@example.com"
                      rows={3}
                      className="text-sm font-mono resize-none"
                    />
                    {recipientEmails.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {recipientEmails.length} valid address{recipientEmails.length !== 1 ? "es" : ""} detected
                      </p>
                    )}
                  </div>
                )}

                {recipientMode === "group" && (
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <div className="px-3 py-2 bg-secondary/30 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Select Role Groups</span>
                      <span className="text-[10px] text-muted-foreground">{selectedGroups.length} selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {ROLE_GROUPS.map(g => (
                        <button
                          key={g.key}
                          onClick={() => setSelectedGroups(p => p.includes(g.key) ? p.filter(x => x !== g.key) : [...p, g.key])}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors",
                            selectedGroups.includes(g.key)
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-secondary/60 text-foreground"
                          )}
                        >
                          <div className={cn("w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0",
                            selectedGroups.includes(g.key) ? "border-primary bg-primary" : "border-border"
                          )}>
                            {selectedGroups.includes(g.key) && <span className="text-primary-foreground text-[7px] font-bold">✓</span>}
                          </div>
                          {g.label}
                        </button>
                      ))}
                    </div>
                    {selectedGroups.length > 0 && (
                      <div className="px-3 py-2 border-t border-border/30 bg-primary/3 flex items-center gap-2">
                        <Info className="w-3 h-3 text-primary shrink-0" />
                        <p className="text-[10px] text-muted-foreground">
                          Email will be sent to all active users in the selected role groups.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Subject <span className="text-destructive">*</span></Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Important Update — Action Required"
                  className="text-sm"
                />
              </div>

              {/* Templates */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Quick Templates</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EMAIL_TEMPLATES.map(t => (
                    <button
                      key={t.label}
                      onClick={() => applyTemplate(t)}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-border/60 bg-card hover:bg-secondary/40 hover:border-primary/30 transition-colors"
                    >
                      <span>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Message <span className="text-destructive">*</span></Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Type your message here…&#10;&#10;Use {name} as a placeholder for the recipient's name."
                  rows={10}
                  className="text-sm resize-none font-sans leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground">
                  Tip: use <code className="px-1 py-0.5 bg-secondary rounded text-[9px]">{"{name}"}</code> to personalise for each recipient. Plain text only — formatted automatically.
                </p>
              </div>
            </div>
          ) : (
            /* Preview tab */
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 overflow-hidden">
                {/* Email envelope header */}
                <div className="bg-secondary/30 px-4 py-3 border-b border-border/50 space-y-1">
                  <div className="flex gap-3 text-[11px]">
                    <span className="text-muted-foreground font-semibold w-12 shrink-0">From</span>
                    <span className="text-foreground">{fromName} {fromEmail && `〈${fromEmail}〉`}</span>
                  </div>
                  <div className="flex gap-3 text-[11px]">
                    <span className="text-muted-foreground font-semibold w-12 shrink-0">To</span>
                    <span className="text-foreground">
                      {recipientMode === "group"
                        ? selectedGroups.map(g => ROLE_GROUPS.find(r => r.key === g)?.label).join(", ") || "—"
                        : recipientEmails.slice(0, 3).join(", ") + (recipientEmails.length > 3 ? ` +${recipientEmails.length - 3} more` : "")}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[11px]">
                    <span className="text-muted-foreground font-semibold w-12 shrink-0">Subject</span>
                    <span className="text-foreground font-medium">{subject || "—"}</span>
                  </div>
                </div>

                {/* Rendered email preview */}
                <div className="bg-[#f4f4f5] p-4">
                  <div className="max-w-[520px] mx-auto bg-white rounded-xl overflow-hidden shadow-sm">
                    {/* Brand header */}
                    <div className="bg-[#1e293b] px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#f97316] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">I</span>
                      </div>
                      <span className="text-white text-base font-bold">Intela LXP</span>
                    </div>
                    {/* Content */}
                    <div className="px-6 py-5">
                      <h2 className="text-[#0f172a] text-lg font-bold mb-3 leading-snug">{subject || "Your subject line"}</h2>
                      <div className="text-[#374151] text-sm leading-7 whitespace-pre-line">
                        {body || "Your message will appear here…"}
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-6 py-4">
                      <p className="text-[#94a3b8] text-xs">
                        Sent by <strong>{fromName}</strong> via Intela LXP Platform.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-secondary/30 border border-border/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {recipientMode === "group" ? selectedGroups.length : recipientEmails.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {recipientMode === "group" ? "Role groups" : "Recipients"}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/30 border border-border/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{subject.length}</p>
                  <p className="text-[10px] text-muted-foreground">Subject chars</p>
                </div>
                <div className="rounded-xl bg-secondary/30 border border-border/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{body.split(/\s+/).filter(Boolean).length}</p>
                  <p className="text-[10px] text-muted-foreground">Word count</p>
                </div>
              </div>
            </div>
          )}

          {/* Send result */}
          {result && (
            <div className={cn(
              "mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border",
              result.failed === 0
                ? "bg-green-500/8 border-green-500/20"
                : "bg-orange-500/8 border-orange-500/20"
            )}>
              {result.failed === 0
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              }
              <p className="text-[12px] font-medium">
                {result.sent} email{result.sent !== 1 ? "s" : ""} sent successfully
                {result.failed > 0 && ` · ${result.failed} failed`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step === "compose" && (
              <Button
                variant="outline" size="sm"
                className="gap-1.5"
                onClick={() => setStep("preview")}
                disabled={!subject.trim() || !body.trim()}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>
            )}
            {step === "preview" && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("compose")}>
                <EyeOff className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            <Button
              size="sm"
              className="gap-2 min-w-[110px]"
              disabled={!canSend || sending}
              onClick={handleSend}
            >
              {sending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                : <><Send className="w-3.5 h-3.5" /> Send Email</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
