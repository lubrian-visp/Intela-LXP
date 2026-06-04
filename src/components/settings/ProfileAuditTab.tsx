import { FileText, Loader2, Shield, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ProfileAuditTab() {
  const { user } = useAuth();
  const db = supabase as any;

  const { data: auditEntries, isLoading } = useQuery({
    queryKey: ["profile-audit", user?.id],
    queryFn: async () => {
      // Fetch from onboarding_audit_log and role_audit_log for this user
      const [onboardRes, roleRes] = await Promise.all([
        db.from("onboarding_audit_log")
          .select("*")
          .eq("performed_by", user!.id)
          .order("created_at", { ascending: false })
          .limit(20),
        db.from("role_audit_log")
          .select("*")
          .eq("performed_by", user!.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const onboard = (onboardRes.data ?? []).map((e: any) => ({
        id: e.id,
        action: e.action,
        entity_type: e.entity_type,
        details: e.details,
        created_at: e.created_at,
        source: "onboarding",
      }));

      const roles = (roleRes.data ?? []).map((e: any) => ({
        id: e.id,
        action: e.action,
        entity_type: e.entity_type,
        details: e.details,
        created_at: e.created_at,
        source: "role",
      }));

      return [...onboard, ...roles]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  const actionIcons: Record<string, React.ElementType> = {
    role_created: Shield,
    role_deactivated: Shield,
    user_assigned: UserPlus,
    learner_registered: UserPlus,
    staff_registered: UserPlus,
  };

  const actionColors: Record<string, string> = {
    role_created: "bg-success/10 text-success",
    user_assigned: "bg-info/10 text-info",
    role_deactivated: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Activity Log</h3>
        </div>
        <div className="p-4">
          {!auditEntries?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-secondary mb-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No recent activity</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                Your login history, role changes, and account events will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {auditEntries.map((entry: any) => {
                const Icon = actionIcons[entry.action] ?? LogIn;
                const colorClass = actionColors[entry.action] ?? "bg-secondary text-muted-foreground";
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className={`p-1.5 rounded-lg ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {entry.action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {entry.entity_type} · {entry.source}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
