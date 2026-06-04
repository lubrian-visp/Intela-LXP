import { Activity, RefreshCw } from "lucide-react";
import { useSyncLatencyMonitor } from "@/hooks/useSyncLatencyMonitor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Compact widget displaying real-time sync propagation metrics.
 * Designed to be embedded in System Health or admin dashboards.
 */
export default function SyncLatencyWidget() {
  const { stats, reset } = useSyncLatencyMonitor(true);

  const meetsTarget = stats.withinTarget >= 95;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sync Propagation</h3>
            <p className="text-[10px] text-muted-foreground">Real-time update latency</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              stats.samples === 0
                ? "text-muted-foreground"
                : meetsTarget
                ? "bg-success/10 text-success border-success/30"
                : "bg-destructive/10 text-destructive border-destructive/30"
            )}
          >
            {stats.samples === 0 ? "Awaiting data" : meetsTarget ? "Target met" : "Below target"}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCell label="Samples" value={String(stats.samples)} />
        <MetricCell label="Avg Latency" value={stats.samples > 0 ? `${stats.avgMs}ms` : "—"} />
        <MetricCell label="P95 Latency" value={stats.samples > 0 ? `${stats.p95Ms}ms` : "—"} />
        <MetricCell
          label="Within 1s"
          value={stats.samples > 0 ? `${stats.withinTarget}%` : "—"}
          highlight={stats.samples > 0 && !meetsTarget}
        />
      </div>

      <p className="text-[10px] text-muted-foreground mt-3">
        Target: 95% of updates visible across portals within 1 second. Measured via notification propagation.
      </p>
    </div>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={cn("text-lg font-bold", highlight ? "text-destructive" : "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
