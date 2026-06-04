import { Plug, CheckCircle2, XCircle, ToggleLeft } from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useFeatureFlags, usePlatformStats } from "@/hooks/useSystemsAdminData";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Static integration definitions (these represent external services)
const platformIntegrations = [
  { name: "Payment Gateway (Flutterwave)", flagKey: "payment_flutterwave", description: "Process payments across Africa" },
  { name: "Payment Gateway (Payfast)", flagKey: "payment_payfast", description: "South African payment processing" },
  { name: "Payment Gateway (Paystack)", flagKey: "payment_paystack", description: "Payment processing for Africa" },
  { name: "Email Service", flagKey: "email_notifications", description: "Transactional and notification emails" },
  { name: "Video Conferencing (Jitsi)", flagKey: "video_conferencing", description: "Live training sessions" },
  { name: "Document Storage", flagKey: null, description: "Secure file and document management", alwaysConnected: true },
  { name: "AI Content Generation", flagKey: "ai_content_generation", description: "AI-powered curriculum and content tools" },
];

export default function Integrations() {
  const { data: flags = [], isLoading } = useFeatureFlags();

  const getStatus = (integration: typeof platformIntegrations[0]) => {
    if (integration.alwaysConnected) return true;
    if (!integration.flagKey) return false;
    const flag = flags.find((f: any) => f.flag_key === integration.flagKey);
    return flag?.is_enabled ?? false;
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">Platform service connections and their feature flag status.</p>
      </FadeIn>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platformIntegrations.map(i => {
            const connected = getStatus(i);
            return (
              <StaggerItem key={i.name}>
                <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary"><Plug className="w-4 h-4 text-foreground" /></div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{i.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{i.description}</p>
                      </div>
                    </div>
                    {connected ? (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-success"><CheckCircle2 className="w-3 h-3" /> Connected</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><XCircle className="w-3 h-3" /> Disconnected</span>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Feature Flags Summary */}
      <FadeIn>
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">All Feature Flags</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{flags.length} flags configured</p>
          </div>
          <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
            {flags.map((flag: any) => (
              <div key={flag.id} className="px-6 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{flag.flag_key}</p>
                    {flag.description && <p className="text-[10px] text-muted-foreground">{flag.description}</p>}
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", flag.is_enabled ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border")}>
                  {flag.is_enabled ? "ON" : "OFF"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
