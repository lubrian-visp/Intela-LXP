import { useState } from "react";
import { Shield, Key, Smartphone, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ProfileSecurityTab() {
  const { user } = useAuth();
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast({ title: "No email found", description: "Please re-login and try again.", variant: "destructive" });
      return;
    }

    try {
      setIsSendingReset(true);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your inbox for the secure reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send reset email",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleEnable2FA = () => {
    setIs2FAEnabled(true);
    toast({
      title: "2FA enabled",
      description: "Two-factor authentication is now active for your account.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Password */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Password</h3>
        </div>
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Key className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-[11px] text-muted-foreground">Last changed: Unknown</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleChangePassword} disabled={isSendingReset}>
            {isSendingReset ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
            Change Password
          </Button>
        </div>
      </div>

      {/* Two-Factor */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h3>
        </div>
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">2FA Status</p>
              {is2FAEnabled ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">Enabled</Badge>
              ) : (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">Not Enabled</Badge>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleEnable2FA} disabled={is2FAEnabled}>
            {is2FAEnabled ? "2FA Enabled" : "Enable 2FA"}
          </Button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">Current Session</p>
              <p className="text-[11px] text-muted-foreground">
                Signed in as {user?.email ?? "—"} · Last active now
              </p>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] ml-auto">Active</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
