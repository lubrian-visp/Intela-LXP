import { Mail, Webhook, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/usePlatformSettings";
import { Switch } from "@/components/ui/switch";
import NotificationPreferencesSection from "./NotificationPreferencesSection";

const labelMap: Record<string, string> = {
  notif_enrolment_confirm: "Learner Enrolment Confirmation",
  notif_assessment_submit: "Assessment Submission Alert",
  notif_module_complete: "Module Completion",
  notif_cohort_reminder: "Cohort Start Reminder",
  notif_cert_issued: "Certificate Issued",
  notif_facilitator_assign: "Facilitator Assignment",
};

const channelMap: Record<string, string> = {
  notif_enrolment_confirm: "Email",
  notif_assessment_submit: "Email + In-App",
  notif_module_complete: "In-App",
  notif_cohort_reminder: "Email",
  notif_cert_issued: "Email + SMS",
  notif_facilitator_assign: "Email",
};

export default function NotificationsSection() {
  const { data: flags, isLoading } = useFeatureFlags("notif_");
  const toggle = useToggleFeatureFlag();

  return (
    <div className="space-y-6">
      <NotificationPreferencesSection />

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Email & In-App Notifications</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Configure which events trigger notifications and their delivery channels.</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {flags?.map((f) => (
              <div key={f.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {labelMap[f.flag_key] ?? f.flag_key.replace(/^notif_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Channel: {channelMap[f.flag_key] ?? "Email"} · {f.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={f.is_enabled}
                  onCheckedChange={(checked) => toggle.mutate({ id: f.id, is_enabled: checked })}
                  disabled={toggle.isPending}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
