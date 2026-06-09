import { Activity, CheckCircle2, AlertTriangle, Database, Server, RefreshCw } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useServiceHealthCheck } from "@/hooks/useSystemsAdminData";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import SyncLatencyWidget from "@/components/system/SyncLatencyWidget";

const serviceIcons: Record<string, any> = {
  "Database (Primary)": Database,
  "Auth Service": Server,
  "File Storage": Server,
  "Edge Functions": Activity,
  "Realtime Engine": Activity,
};

export default function SystemHealth() {
  usePageTitle("System Health", "Platform Management");
  const { data: services = [], isLoading, dataUpdatedAt } = useServiceHealthCheck();
  const queryClient = useQueryClient();

  const allHealthy = services.every(s => s.healthy);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">System Health</h1>
            <p className="text-sm text-muted-foreground">Live platform service status with real latency checks.</p>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <Badge variant="outline" className={cn("text-xs", allHealthy ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20")}>
                {allHealthy ? "All Systems Operational" : "Degraded"}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["systems-admin", "service-health"] })}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>
      </FadeIn>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => {
            const Icon = serviceIcons[s.name] || Server;
            return (
              <StaggerItem key={s.name}>
                <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary"><Icon className="w-4 h-4 text-foreground" /></div>
                      <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
                    </div>
                    {s.healthy ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={cn("font-medium", s.healthy ? "text-success" : "text-warning")}>{s.status}</span>
                    <span className="text-muted-foreground">{s.latency}</span>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Sync Propagation Latency Monitor */}
      <SyncLatencyWidget />

      {dataUpdatedAt && (
        <p className="text-[10px] text-muted-foreground text-right">
          Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
