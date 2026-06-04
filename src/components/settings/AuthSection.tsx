import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/usePlatformSettings";
import { Switch } from "@/components/ui/switch";

const labelMap: Record<string, string> = {
  auth_email_password: "Email & Password",
  auth_magic_link: "Magic Link",
  auth_google_sso: "Google SSO",
  auth_saml: "SAML 2.0",
  auth_mfa: "Multi-Factor Auth",
};

export default function AuthSection() {
  const { data: flags, isLoading } = useFeatureFlags("auth_");
  const toggle = useToggleFeatureFlag();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Authentication Methods</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Configure how users sign in to the platform.</p>
      </div>
      <div className="divide-y divide-border/50">
        {flags?.map((f) => (
          <div key={f.id} className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {labelMap[f.flag_key] ?? f.flag_key.replace(/^auth_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
              <p className="text-[11px] text-muted-foreground">{f.description}</p>
            </div>
            <Switch
              checked={f.is_enabled}
              onCheckedChange={(checked) => toggle.mutate({ id: f.id, is_enabled: checked })}
              disabled={toggle.isPending}
            />
          </div>
        ))}
        {!flags?.length && (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">No authentication flags configured.</div>
        )}
      </div>
    </div>
  );
}
