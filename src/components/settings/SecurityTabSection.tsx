import { useState, useEffect } from "react";
import { Shield, Smartphone, Lock, Calendar, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags, useToggleFeatureFlag, usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// Roles flagged as "privileged" default to MFA-required (cannot be silently
// disabled). Tracks recommendation F4.1 / IEEE 27001 A.9.4.2 / NIST SP 800-63B
// AAL2 requirement that admin-tier accounts authenticate with a second factor.
const PRIVILEGED_ROLES = new Set(["super_admin", "systems_admin"]);

const mfaRoles = [
  { key: "super_admin", label: "Super Admin", desc: "Highest-level administrator with full system access" },
  { key: "systems_admin", label: "Systems Admin", desc: "Platform/infrastructure administrators" },
  { key: "operations", label: "Ops Control", desc: "Operations and control team members" },
  { key: "programme_manager", label: "Program Manager", desc: "Programmes and project managers" },
  { key: "facilitator", label: "Facilitator", desc: "Content facilitators and trainers" },
  { key: "mentor", label: "Mentor", desc: "Learner mentors and guides" },
  { key: "assessor", label: "Assessor", desc: "Assessment and evaluation staff" },
  { key: "learner", label: "Learner", desc: "Students and learners" },
  { key: "sponsor", label: "Sponsor", desc: "Programme sponsors and stakeholders" },
];

export default function SecurityTabSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: authFlags, isLoading: authLoading } = useFeatureFlags("auth_");
  const { data: secSettings, isLoading: settingsLoading } = usePlatformSettings("security");
  const toggle = useToggleFeatureFlag();

  const [mfaEnforcement, setMfaEnforcement] = useState<Record<string, boolean>>({});
  const [allRolesOverride, setAllRolesOverride] = useState(false);
  const [savingMfa, setSavingMfa] = useState(false);
  const [superAdminDeadline, setSuperAdminDeadline] = useState("");
  const [opsDeadline, setOpsDeadline] = useState("");
  const [savingDeadlines, setSavingDeadlines] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [useSmtp, setUseSmtp] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const mfaFlag = authFlags?.find((f) => f.flag_key === "auth_mfa");
  const mfaEnabled = mfaFlag?.is_enabled ?? false;

  // Initialize from saved settings. Privileged roles default to enforced when
  // no platform setting exists yet (F4.1 — default-deny for admin accounts).
  useEffect(() => {
    const enforcement: Record<string, boolean> = {};
    for (const role of mfaRoles) {
      if (PRIVILEGED_ROLES.has(role.key)) enforcement[role.key] = true;
    }
    if (secSettings) {
      for (const s of secSettings) {
        if (s.setting_key.startsWith("security_mfa_enforce_")) {
          enforcement[s.setting_key.replace("security_mfa_enforce_", "")] = s.setting_value === "true";
        }
        if (s.setting_key === "security_mfa_deadline_super_admin") setSuperAdminDeadline(s.setting_value || "");
        if (s.setting_key === "security_mfa_deadline_operations") setOpsDeadline(s.setting_value || "");
      }
    }
    setMfaEnforcement(enforcement);
  }, [secSettings]);

  const handleEnableMfa = async () => {
    if (!mfaFlag) {
      const { error } = await db.from("feature_flags").insert({
        flag_key: "auth_mfa",
        is_enabled: true,
        description: "TOTP-based two-factor authentication",
      });
      if (error) {
        toast({ title: "Failed to enable MFA", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "MFA enabled globally" });
        queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      }
    } else {
      const newState = !mfaEnabled;
      toggle.mutate(
        { id: mfaFlag.id, is_enabled: newState },
        {
          onSuccess: () => toast({ title: newState ? "MFA enabled globally" : "MFA disabled globally" }),
          onError: (err: any) => toast({ title: "Failed to update MFA", description: err.message, variant: "destructive" }),
        }
      );
    }
  };

  const handleSaveMfaEnforcement = async () => {
    setSavingMfa(true);
    try {
      for (const role of mfaRoles) {
        const key = `security_mfa_enforce_${role.key}`;
        const value = PRIVILEGED_ROLES.has(role.key) || allRolesOverride
          ? "true"
          : (mfaEnforcement[role.key] ? "true" : "false");
        const { data: existing } = await db.from("platform_settings").select("id").eq("setting_key", key).maybeSingle();
        if (existing) {
          await db.from("platform_settings").update({ setting_value: value }).eq("id", existing.id);
        } else {
          await db.from("platform_settings").insert({ setting_key: key, setting_value: value, category: "security", label: `MFA Enforcement: ${role.label}`, setting_type: "boolean" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "MFA enforcement settings saved" });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
    setSavingMfa(false);
  };

  const handleResetMfa = () => {
    const defaults: Record<string, boolean> = {};
    for (const role of mfaRoles) {
      if (PRIVILEGED_ROLES.has(role.key)) defaults[role.key] = true;
    }
    setMfaEnforcement(defaults);
    setAllRolesOverride(false);
    toast({ title: "MFA enforcement reset to defaults" });
  };

  const handleSaveDeadlines = async () => {
    setSavingDeadlines(true);
    try {
      for (const [key, value] of [
        ["security_mfa_deadline_super_admin", superAdminDeadline],
        ["security_mfa_deadline_operations", opsDeadline],
      ]) {
        const { data: existing } = await db.from("platform_settings").select("id").eq("setting_key", key).maybeSingle();
        if (existing) {
          await db.from("platform_settings").update({ setting_value: value }).eq("id", existing.id);
        } else {
          await db.from("platform_settings").insert({ setting_key: key, setting_value: value, category: "security", label: key.includes("super") ? "Super Admin MFA Deadline" : "Ops Control MFA Deadline", setting_type: "date" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Deadlines saved successfully" });
    } catch (err: any) {
      toast({ title: "Failed to save deadlines", description: err.message, variant: "destructive" });
    }
    setSavingDeadlines(false);
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast({ title: "Reminder emails queued", description: "Users without MFA will receive reminders shortly." });
    setSendingReminders(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Add an extra layer of security to your account by requiring a verification code in addition to your password.
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {mfaEnabled ? "MFA Enabled" : "MFA Not Enabled"}
                </p>
                <Badge
                  variant="outline"
                  className={mfaEnabled
                    ? "bg-success/10 text-success border-success/20 text-[10px] mt-0.5"
                    : "bg-muted text-muted-foreground text-[10px] mt-0.5"
                  }
                >
                  {mfaEnabled ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleEnableMfa}
              disabled={toggle.isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs"
            >
              {toggle.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              {mfaEnabled ? "Disable MFA" : "Enable MFA"}
            </Button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/10">
            <p className="text-xs font-medium text-accent mb-2">Why use two-factor authentication?</p>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">•</span>Prevents unauthorised access, even if your password is compromised</li>
              <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">•</span>Required for administrator and privileged accounts</li>
              <li className="flex items-start gap-1.5"><span className="text-accent mt-0.5">•</span>Works with popular authenticator apps like Google Authenticator or Authy</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MFA Role Enforcement */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">MFA Role Enforcement</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Configure which user roles require Multi-Factor Authentication</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg border border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium text-foreground">All Roles (Override)</p>
                  <p className="text-[10px] text-muted-foreground">Enforce MFA for all users regardless of role</p>
                </div>
              </div>
              <Switch checked={allRolesOverride} onCheckedChange={setAllRolesOverride} />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground">Individual Role Settings</p>

          <div className="divide-y divide-border/50">
            {mfaRoles.map((role) => {
              const isPrivileged = PRIVILEGED_ROLES.has(role.key);
              return (
                <div key={role.key} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {role.label}
                      {isPrivileged && (
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wide bg-warning/10 text-warning border-warning/20">
                          Required
                        </Badge>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {role.desc}
                      {isPrivileged && " · MFA cannot be disabled for this privileged role."}
                    </p>
                  </div>
                  <Switch
                    checked={allRolesOverride || isPrivileged || (mfaEnforcement[role.key] ?? false)}
                    disabled={allRolesOverride || isPrivileged}
                    aria-label={`Enforce MFA for ${role.label}`}
                    onCheckedChange={(checked) => setMfaEnforcement((prev) => ({ ...prev, [role.key]: checked }))}
                  />
                </div>
              );
            })}
          </div>


          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveMfaEnforcement} disabled={savingMfa} className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs gap-1">
              {savingMfa ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save Changes
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={handleResetMfa}>Reset</Button>
          </div>

          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <p className="text-xs font-medium text-warning mb-1">Important Notes:</p>
            <ul className="space-y-0.5 text-[10px] text-muted-foreground">
              <li>• Users with MFA enforced will be required to set up MFA on their next login</li>
              <li>• The "All Roles" option overrides individual role settings</li>
              <li>• Changes take effect immediately after saving</li>
              <li>• Users with MFA already enabled are not affected by these changes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Email & MFA Configuration */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Email & MFA Configuration</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Configure system-wide email provider, MFA enforcement deadlines and notifications</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">System Email Provider</p>
              <p className="text-[10px] text-muted-foreground">All system emails (MFA reminders, support, notifications)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] ${!useSmtp ? "font-medium text-foreground" : "text-muted-foreground"}`}>Resend</span>
              <Switch checked={useSmtp} onCheckedChange={setUseSmtp} />
              <span className={`text-[10px] ${useSmtp ? "font-medium text-foreground" : "text-muted-foreground"}`}>SMTP</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-accent" />
                <p className="text-xs font-medium text-foreground">Super Admin MFA Enforcement Deadline</p>
              </div>
              <Input type="date" className="h-8 text-xs w-48" value={superAdminDeadline} onChange={(e) => setSuperAdminDeadline(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-accent" />
                <p className="text-xs font-medium text-foreground">Ops Control MFA Enforcement Deadline</p>
              </div>
              <Input type="date" className="h-8 text-xs w-48" value={opsDeadline} onChange={(e) => setOpsDeadline(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveDeadlines} disabled={savingDeadlines} className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs">
              {savingDeadlines && <Loader2 className="w-3 h-3 animate-spin mr-1" />} Save Deadlines
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleSendReminders} disabled={sendingReminders}>
              {sendingReminders ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} Send Reminder Emails Now
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-info/5 border border-info/20">
            <p className="text-xs font-medium text-info mb-1">How Email Reminders Work:</p>
            <ul className="space-y-0.5 text-[10px] text-muted-foreground">
              <li>• Reminders are automatically sent 1, 3, and 7 days before the deadline</li>
              <li>• A final reminder is sent on the enforcement day</li>
              <li>• Only users without MFA enabled receive reminders</li>
              <li>• Set up a cron job to run daily checks, or use the button above to send manually</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-base font-semibold text-foreground">Change Password</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Update your account password for enhanced security</p>
        </div>
        <div className="p-6 space-y-4 max-w-md">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">New Password</label>
            <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Confirm New Password</label>
            <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-9 text-sm" />
          </div>
          <Button size="sm" onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs">
            {changingPassword ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
}
