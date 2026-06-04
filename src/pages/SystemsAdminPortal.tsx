import { useState } from "react";
import { Server, Database, Shield, RefreshCw, Activity, Settings, AlertTriangle, CheckCircle2, Terminal, ArrowUpRight, Users, BookOpen, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations/MotionWrappers";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { usePlatformStats, useRecentAuditLogs, useServiceHealthCheck, useFeatureFlags } from "@/hooks/useSystemsAdminData";
import { format } from "date-fns";
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import { useNavigate } from "react-router-dom";

export default function SystemsAdminPortal() {
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "logs" | "integrations">("overview");
  const navigate = useNavigate();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: auditLogs = [], isLoading: logsLoading } = useRecentAuditLogs();
  const { data: services = [], isLoading: servicesLoading } = useServiceHealthCheck();
  const { data: featureFlags = [] } = useFeatureFlags();

  const kpiItems = [
    { label: "Registered Users", value: stats?.totalUsers ?? 0, sub: `${stats?.totalRoles ?? 0} role assignments`, trend: true, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    { label: "Active Programmes", value: stats?.totalProgrammes ?? 0, sub: `${stats?.totalEnrolments ?? 0} enrolments`, trend: true, icon: BookOpen, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
    { label: "Feature Flags", value: `${stats?.enabledFlags ?? 0}/${stats?.totalFlags ?? 0}`, sub: "enabled", trend: true, icon: ToggleLeft, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    { label: "Security Alerts", value: "0", sub: "all clear", trend: true, icon: Shield, iconBg: "bg-green-500/10", iconColor: "text-green-500" },
  ];

  const systemCards = [
    { title: "Platform Integrations", description: "API connections, webhooks, and third-party services", icon: RefreshCw, status: `${stats?.totalSettings ?? 0} settings`, healthy: true },
    { title: "System Configuration", description: "Platform settings, feature flags, and environment variables", icon: Settings, status: `${stats?.totalFlags ?? 0} flags`, healthy: true },
    { title: "Database Health", description: "Connection pools, query performance, and storage metrics", icon: Database, status: services.find(s => s.name.includes("Database"))?.status ?? "Checking…", healthy: services.find(s => s.name.includes("Database"))?.healthy ?? true },
    { title: "User Management", description: "User directory, role assignments, and access control", icon: Users, status: `${stats?.totalUsers ?? 0} users`, healthy: true },
    { title: "Security Monitoring", description: "Threat detection, access logs, and vulnerability scanning", icon: Shield, status: "No alerts", healthy: true },
    { title: "System Logs", description: "Application logs, error tracking, and performance monitoring", icon: Activity, status: `${auditLogs.length} recent`, healthy: true },
  ];

  const getLevelColor = (action: string) => {
    if (action.includes("reject") || action.includes("failed") || action.includes("error")) return "text-destructive";
    if (action.includes("flag") || action.includes("warn")) return "text-warning";
    return "text-accent";
  };

  const getLevelLabel = (action: string) => {
    if (action.includes("reject") || action.includes("failed") || action.includes("error")) return "ERROR";
    if (action.includes("flag") || action.includes("warn")) return "WARN";
    return "INFO";
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <WelcomeBanner
        subtitle="Infrastructure management, platform configuration, and system monitoring."
        actions={
          <>
            <ActionButton icon={Terminal} label="Audit Logs" onClick={() => { setActiveTab("logs"); }} />
            <ActionButton icon={Activity} label="Service Health" onClick={() => { setActiveTab("services"); }} primary />
          </>
        }
      />
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : (
        <KpiGrid items={kpiItems} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(["overview", "services", "logs", "integrations"] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-medium capitalize transition-colors",
              activeTab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <CalendarWidget events={calendarEvents} maxItems={3} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {systemCards.map((card) => (
              <div key={card.title} className="bg-card rounded-xl shadow-card border border-border/50 p-5 hover:shadow-md hover:border-accent/20 transition-all cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-accent/10">
                    <card.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", card.healthy ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{card.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{card.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "services" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Service Health Monitor</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time status of platform services (live latency checks)</p>
          </div>
          {servicesLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {services.map(s => (
                <div key={s.name} className="px-6 py-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    {s.healthy ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <AlertTriangle className="w-4 h-4 text-warning shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">Latency: {s.latency}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", s.healthy ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20")}>
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Terminal className="w-4 h-4" /> System Audit Logs</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recent platform activity from the audit trail</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-success font-medium">Live</span>
            </div>
          </div>
          {logsLoading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 rounded" />)}
            </div>
          ) : (
            <div className="bg-foreground/5 font-mono text-xs divide-y divide-border/30">
              {auditLogs.length === 0 && (
                <div className="px-6 py-8 text-center text-muted-foreground">No audit logs yet.</div>
              )}
              {auditLogs.map((log: any) => (
                <div key={log.id} className="px-6 py-2.5 flex items-start gap-4 hover:bg-foreground/5 transition-colors">
                  <span className="text-muted-foreground shrink-0 w-28">{format(new Date(log.created_at), "HH:mm:ss")}</span>
                  <span className={cn("shrink-0 w-12 font-semibold", getLevelColor(log.action))}>{getLevelLabel(log.action)}</span>
                  <span className="text-muted-foreground shrink-0 w-24">[{log.entity_type}]</span>
                  <span className="text-foreground capitalize">{log.action.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Feature Flags & Platform Configuration</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Active feature toggles and platform capabilities</p>
          </div>
          <div className="divide-y divide-border/50">
            {featureFlags.length === 0 && (
              <div className="px-6 py-8 text-center text-muted-foreground">No feature flags configured.</div>
            )}
            {featureFlags.map((flag: any) => (
              <div key={flag.id} className="px-6 py-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                    <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{flag.flag_key.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-muted-foreground">{flag.description || "No description"}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", flag.is_enabled ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border")}>
                  {flag.is_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
