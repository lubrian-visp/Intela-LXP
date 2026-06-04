import { CheckCircle2, AlertCircle, Activity, RefreshCw } from "lucide-react";

const databaseSettings = [
  { label: "Connection Pool Size", value: "25 connections", status: "healthy" as const },
  { label: "Active Connections", value: "12 / 25", status: "healthy" as const },
  { label: "Database Size", value: "2.4 GB", status: "healthy" as const },
  { label: "Replication Lag", value: "< 1ms", status: "healthy" as const },
  { label: "Cache Hit Ratio", value: "98.7%", status: "healthy" as const },
  { label: "Slow Queries (24h)", value: "3 queries", status: "warning" as const },
];

const backupSchedule = [
  { type: "Full Backup", frequency: "Daily at 02:00 UTC", lastRun: "Feb 20, 2026 02:00", size: "2.4 GB", status: "success" as const },
  { type: "Incremental", frequency: "Every 6 hours", lastRun: "Feb 20, 2026 12:00", size: "124 MB", status: "success" as const },
  { type: "Point-in-Time Recovery", frequency: "Continuous WAL", lastRun: "Active", size: "—", status: "success" as const },
];

export default function DatabaseSection() {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" /> Database Health
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Connection pool, storage, and performance metrics.</p>
        </div>
        <div className="divide-y divide-border/50">
          {databaseSettings.map(d => (
            <div key={d.label} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {d.status === "healthy" ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                )}
                <p className="text-sm font-medium text-foreground">{d.label}</p>
              </div>
              <span className="text-sm text-muted-foreground font-mono">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-accent" /> Backup Schedule
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Automated backup configuration and history.</p>
        </div>
        <div className="divide-y divide-border/50">
          {backupSchedule.map(b => (
            <div key={b.type} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{b.type}</p>
                <p className="text-[11px] text-muted-foreground">{b.frequency} · Last: {b.lastRun} · Size: {b.size}</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                {b.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
