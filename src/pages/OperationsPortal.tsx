import { useState, useMemo } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileText, Search,
  TrendingUp, Users, BarChart3, ArrowUpRight, ArrowDownRight,
  Shield, AlertCircle, ChevronRight, Timer, Target, Zap,
  Flag, ArrowUp, ArrowDown, Minus, Filter, Download, Eye, Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useApprovalTasks, useUpdateApprovalTask, useEnrolments, useProgrammes, useSubmissions, useCohorts, useRealtimeSync } from "@/hooks/useCoreData";
import { useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ExportButton from "@/components/ExportButton";
import { useCohortAssignmentMode } from "@/hooks/useCohortAssignment";
import { useToggleFeatureFlag } from "@/hooks/usePlatformSettings";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

// ─── SLA Data ──────────────────────────────────────────────
const slaMetrics = [
  { name: "Enrolment Processing", target: "48h", actual: "32h", compliance: 94, status: "met" as const },
  { name: "Assessment Turnaround", target: "5 days", actual: "4.2 days", compliance: 88, status: "met" as const },
  { name: "Credential Issuance", target: "72h", actual: "68h", compliance: 91, status: "met" as const },
  { name: "Support Response", target: "4h", actual: "6.1h", compliance: 72, status: "breached" as const },
  { name: "Escalation Resolution", target: "24h", actual: "18h", compliance: 96, status: "met" as const },
  { name: "Report Generation", target: "1h", actual: "45m", compliance: 99, status: "met" as const },
];

// ─── Escalations ───────────────────────────────────────────
const escalations = [
  { id: "ESC-001", title: "Cohort capacity exceeded: Data Science Q1", programme: "Data Science Certificate", priority: "critical" as const, raised: "2h ago", assignee: "Ops Team Lead", status: "open" as const },
  { id: "ESC-002", title: "Assessment moderation backlog (47 pending)", programme: "Leadership Programme", priority: "high" as const, raised: "6h ago", assignee: "QA Manager", status: "in_progress" as const },
  { id: "ESC-003", title: "Facilitator no-show for scheduled session", programme: "Software Eng. Apprenticeship", priority: "high" as const, raised: "1d ago", assignee: "PM, Johannesburg", status: "in_progress" as const },
  { id: "ESC-004", title: "SLA breach: Support response time", programme: "Cross-programme", priority: "medium" as const, raised: "3h ago", assignee: "Support Lead", status: "open" as const },
  { id: "ESC-005", title: "Budget variance >15% on training materials", programme: "Finance for Non-Finance", priority: "low" as const, raised: "2d ago", assignee: "Finance Ops", status: "resolved" as const },
];

// ─── Cross-programme Performance (computed from live data below) ───

// ─── Helpers ───────────────────────────────────────────────
const priorityConfig = {
  critical: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  high: { color: "bg-warning/10 text-warning border-warning/20", icon: ArrowUp },
  medium: { color: "bg-info/10 text-info border-info/20", icon: Minus },
  low: { color: "bg-muted text-muted-foreground border-border", icon: ArrowDown },
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  in_progress: "bg-info/10 text-info border-info/20",
  open: "bg-destructive/10 text-destructive border-destructive/20",
  resolved: "bg-success/10 text-success border-success/20",
};

export default function OperationsPortal() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "sla" | "escalations" | "approvals" | "performance">("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [escPriorityFilter, setEscPriorityFilter] = useState("all");

  // Real-time cross-portal sync
  useRealtimeSync(["approval_tasks", "enrolments", "assessment_submissions", "learner_registrations", "notifications"]);
  const { data: calendarEvents = [] } = useCalendarEvents();

  // Cohort assignment governance
  const { isAutomatic: isAutoAssign, isLoading: cohortModeLoading, flagId: cohortFlagId } = useCohortAssignmentMode();
  const toggleFlag = useToggleFeatureFlag();

  const { data: tasks, isLoading: loadingTasks } = useApprovalTasks();
  const { data: enrolments } = useEnrolments();
  const { data: programmes } = useProgrammes();
  const { data: programmeTypes = [] } = useProgrammeTypes();
  const updateTask = useUpdateApprovalTask();
  const { data: submissions } = useSubmissions();
  const { data: registrations } = useQuery({
    queryKey: ["learner_registrations_compliance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_registrations")
        .select("id, full_name, national_id, documents, status, programme_name")
        .in("status", ["pending_approval", "approved"]);
      if (error) throw error;
      return data;
    },
  });

  const missingComplianceLearners = useMemo(() => {
    return (registrations ?? []).filter(r => !r.national_id || !r.documents || Object.keys(r.documents as Record<string, unknown>).length === 0);
  }, [registrations]);

  const overdueAssessments = useMemo(() => {
    return (submissions ?? []).filter(s => {
      if (s.status !== "pending") return false;
      const created = new Date(s.created_at);
      const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7;
    });
  }, [submissions]);

  // Compute cross-programme performance from live data
  const { data: cohorts } = useCohorts();
  const programmePerformance = useMemo(() => {
    if (!programmes?.length) return [];
    return programmes.map(p => {
      const pCohortIds = (cohorts ?? []).filter(c => c.programme_id === p.id).map(c => c.id);
      const pEnrolments = (enrolments ?? []).filter(e => pCohortIds.includes(e.cohort_id));
      const total = pEnrolments.length;
      const completed = pEnrolments.filter(e => e.status === "completed").length;
      const avgProg = total > 0 ? Math.round(pEnrolments.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / total) : 0;
      const typeData = (p as any).programme_types as { name: string; color: string } | null;
      return {
        name: p.title,
        typeName:  typeData?.name  ?? null,
        typeColor: typeData?.color ?? null,
        enrolments: total,
        completion: total > 0 ? Math.round((completed / total) * 100) : 0,
        slaScore: avgProg,
        trend: (avgProg >= 50 ? "up" : "down") as "up" | "down",
      };
    }).filter(p => p.enrolments > 0).sort((a, b) => b.enrolments - a.enrolments);
  }, [programmes, cohorts, enrolments]);

  const filteredTasks = useMemo(() => {
    return (tasks ?? []).filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || (t.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const filteredEscalations = useMemo(() => {
    return escalations.filter(e => {
      const matchesPriority = escPriorityFilter === "all" || e.priority === escPriorityFilter;
      return matchesPriority;
    });
  }, [escPriorityFilter]);

  const stats = useMemo(() => {
    const all = tasks ?? [];
    const pending = all.filter(t => t.status === "pending").length;
    const activeEnrolments = (enrolments ?? []).filter(e => e.status === "active" || e.status === "enrolled").length;
    const totalProgrammes = programmes?.length ?? 0;
    const openEscalations = escalations.filter(e => e.status === "open" || e.status === "in_progress").length;
    const avgSla = Math.round(slaMetrics.reduce((a, b) => a + b.compliance, 0) / slaMetrics.length);
    return [
      { label: "Active Enrolments", value: String(activeEnrolments), change: `${totalProgrammes} programmes`, trend: "up", icon: Users },
      { label: "Pending Approvals", value: String(pending), change: `${all.length} total`, trend: pending > 5 ? "down" : "up", icon: Clock },
      { label: "SLA Compliance", value: `${avgSla}%`, change: avgSla >= 90 ? "On target" : "Below target", trend: avgSla >= 90 ? "up" : "down", icon: Target },
      { label: "Open Escalations", value: String(openEscalations), change: `${escalations.length} total`, trend: openEscalations > 3 ? "down" : "up", icon: AlertCircle },
    ];
  }, [tasks, enrolments, programmes]);

  if (loadingTasks) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operations Management Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Operational oversight, SLA tracking, escalations, and cross-program performance analytics.</p>
          </div>
          <ExportButton
            data={(tasks ?? []).map(t => ({
              title: t.title,
              type: t.task_type,
              status: t.status,
              created: t.created_at,
              description: t.description,
            }))}
            filename="operations-report"
            columns={[
              { key: "title", label: "Title" },
              { key: "type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "created", label: "Created" },
              { key: "description", label: "Description" },
            ]}
          />
        </div>
      </FadeIn>

      {/* KPI Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((m) => (
          <StaggerItem key={m.label}>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <m.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {m.trend === "up" ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                  <span className={m.trend === "up" ? "text-success" : "text-destructive"}>{m.change}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit overflow-x-auto">
        {([
          { key: "dashboard", label: "Dashboard" },
          { key: "sla", label: "SLA Tracking" },
          { key: "escalations", label: "Escalations" },
          { key: "approvals", label: "Approvals" },
          { key: "performance", label: "Cross-Programme" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              activeTab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Dashboard Tab ─── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
        <CalendarWidget events={calendarEvents} maxItems={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SLA Summary */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Timer className="w-4 h-4 text-accent" /> SLA Overview</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Service level compliance snapshot</p>
              </div>
              <button onClick={() => setActiveTab("sla")} className="text-[10px] text-accent font-medium hover:underline">View all →</button>
            </div>
            <div className="divide-y divide-border/50">
              {slaMetrics.slice(0, 4).map(s => (
                <div key={s.name} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.status === "met" ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                    <div>
                      <p className="text-xs font-medium text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">Target: {s.target} · Actual: {s.actual}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", s.compliance >= 90 ? "bg-success" : s.compliance >= 75 ? "bg-warning" : "bg-destructive")} style={{ width: `${s.compliance}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-foreground w-8 text-right">{s.compliance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Escalations */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-warning" /> Active Escalations</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{escalations.filter(e => e.status !== "resolved").length} unresolved</p>
              </div>
              <button onClick={() => setActiveTab("escalations")} className="text-[10px] text-accent font-medium hover:underline">View all →</button>
            </div>
            <div className="divide-y divide-border/50">
              {escalations.filter(e => e.status !== "resolved").slice(0, 4).map(e => {
                const pc = priorityConfig[e.priority];
                return (
                  <div key={e.id} className="px-6 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <pc.icon className={cn("w-4 h-4 shrink-0", e.priority === "critical" ? "text-destructive" : e.priority === "high" ? "text-warning" : "text-info")} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{e.programme} · {e.raised}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Actions Cards */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Learners Missing Compliance</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{missingComplianceLearners.length} learner{missingComplianceLearners.length !== 1 ? "s" : ""} missing ID or documents</p>
            </div>
            <div className="divide-y divide-border/50 max-h-[220px] overflow-y-auto">
              {missingComplianceLearners.length === 0 ? (
                <div className="px-6 py-6 text-center">
                  <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">All learners have required documentation</p>
                </div>
              ) : (
                missingComplianceLearners.slice(0, 5).map(l => (
                  <div key={l.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{l.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.programme_name ?? "No programme"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!l.national_id && <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">No ID</Badge>}
                      {(!l.documents || Object.keys(l.documents as Record<string, unknown>).length === 0) && <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">No Docs</Badge>}
                    </div>
                  </div>
                ))
              )}
              {missingComplianceLearners.length > 5 && (
                <div className="px-6 py-2 text-center">
                  <span className="text-[10px] text-accent font-medium">+{missingComplianceLearners.length - 5} more</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-destructive" /> Overdue Assessments</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{overdueAssessments.length} submission{overdueAssessments.length !== 1 ? "s" : ""} pending &gt;7 days</p>
            </div>
            <div className="divide-y divide-border/50 max-h-[220px] overflow-y-auto">
              {overdueAssessments.length === 0 ? (
                <div className="px-6 py-6 text-center">
                  <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No overdue assessments</p>
                </div>
              ) : (
                overdueAssessments.slice(0, 5).map(s => {
                  const daysSince = Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={s.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{(s as any).assessments?.title ?? "Assessment"}</p>
                        <p className="text-[10px] text-muted-foreground">Submitted {new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px]", daysSince > 14 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20")}>
                        {daysSince}d overdue
                      </Badge>
                    </div>
                  );
                })
              )}
              {overdueAssessments.length > 5 && (
                <div className="px-6 py-2 text-center">
                  <span className="text-[10px] text-accent font-medium">+{overdueAssessments.length - 5} more</span>
                </div>
              )}
            </div>
          </div>

          {/* Cohort Assignment Governance */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Settings className="w-4 h-4 text-accent" /> Cohort Assignment Governance</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Controls how learners are assigned to cohorts post-enrolment</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="max-w-xs">
                  <p className="text-sm font-semibold text-foreground">Assignment Mode</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isAutoAssign
                      ? "Learners are automatically placed in the next available cohort by capacity and start date."
                      : "Staff must manually select a cohort during the enrolment process."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", isAutoAssign ? "bg-success/10 text-success border-success/20" : "bg-secondary text-muted-foreground border-border")}>
                    {isAutoAssign ? "Automatic" : "Manual"}
                  </Badge>
                  <Switch
                    checked={isAutoAssign}
                    disabled={cohortModeLoading || toggleFlag.isPending || !cohortFlagId}
                    onCheckedChange={(checked) => {
                      if (cohortFlagId) {
                        toggleFlag.mutate({ id: cohortFlagId, is_enabled: checked });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                <p className="text-xs font-medium text-accent mb-1">How it works:</p>
                <ul className="space-y-0.5 text-[10px] text-muted-foreground">
                  <li>• <strong>Manual (default):</strong> Staff select a cohort from a dropdown during enrolment</li>
                  <li>• <strong>Automatic:</strong> System assigns the next available cohort (earliest start date with remaining capacity)</li>
                  <li>• <strong>Fallback:</strong> If no cohorts have capacity, enrolment is blocked until capacity is added</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Programme Performance Summary */}
          <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Cross-Programme Snapshot</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Key metrics across all active programmes</p>
              </div>
              <button onClick={() => setActiveTab("performance")} className="text-[10px] text-accent font-medium hover:underline">Full view →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-6 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolments</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completion</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">SLA Score</th>
                    <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {programmePerformance.map(p => (
                    <tr key={p.name} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-2.5 text-xs font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-2.5">
                        {p.typeName ? (
                          <span className="flex items-center gap-1 text-[10px]">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.typeColor ?? "#888" }} />
                            <span className="text-muted-foreground">{p.typeName}</span>
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-foreground">{p.enrolments}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", p.completion >= 80 ? "bg-success" : p.completion >= 70 ? "bg-info" : "bg-warning")} style={{ width: `${p.completion}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-foreground w-8">{p.completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", p.slaScore >= 90 ? "bg-success/10 text-success" : p.slaScore >= 80 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                          {p.slaScore}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.trend === "up" ? <ArrowUpRight className="w-4 h-4 text-success mx-auto" /> : <ArrowDownRight className="w-4 h-4 text-destructive mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ─── SLA Tracking Tab ─── */}
      {activeTab === "sla" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Timer className="w-4 h-4 text-accent" /> SLA Tracking Panel</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Monitor service level agreements across all operational workflows</p>
          </div>
          <div className="divide-y divide-border/50">
            {slaMetrics.map(s => (
              <div key={s.name} className="px-6 py-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  {s.status === "met" ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[11px] text-muted-foreground">Target: <span className="font-semibold text-foreground">{s.target}</span></span>
                      <span className="text-[11px] text-muted-foreground">Actual: <span className="font-semibold text-foreground">{s.actual}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", s.compliance >= 90 ? "bg-success" : s.compliance >= 75 ? "bg-warning" : "bg-destructive")} style={{ width: `${s.compliance}%` }} />
                  </div>
                  <span className={cn("text-sm font-bold w-12 text-right", s.compliance >= 90 ? "text-success" : s.compliance >= 75 ? "text-warning" : "text-destructive")}>{s.compliance}%</span>
                  <Badge variant="outline" className={cn("text-[10px]", s.status === "met" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                    {s.status === "met" ? "Met" : "Breached"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Escalations Tab ─── */}
      {activeTab === "escalations" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-warning" /> Escalation Management</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Track and resolve operational escalations across programmes</p>
            </div>
            <Select value={escPriorityFilter} onValueChange={setEscPriorityFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="divide-y divide-border/50">
            {filteredEscalations.map(e => {
              const pc = priorityConfig[e.priority];
              return (
                <div key={e.id} className="px-6 py-4 hover:bg-secondary/10 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <pc.icon className={cn("w-4 h-4 shrink-0 mt-0.5", e.priority === "critical" ? "text-destructive" : e.priority === "high" ? "text-warning" : e.priority === "medium" ? "text-info" : "text-muted-foreground")} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{e.title}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-mono">{e.id}</span>
                          <span className="text-[10px] text-muted-foreground">{e.programme}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{e.raised}</span>
                          <span className="text-[10px] text-muted-foreground">→ {e.assignee}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-[10px]", pc.color)}>{e.priority}</Badge>
                      <Badge variant="outline" className={cn("text-[10px]", statusColors[e.status])}>{e.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Approvals Tab ─── */}
      {activeTab === "approvals" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50">
          <div className="p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Approval Queue</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No tasks found.</TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm font-medium text-foreground max-w-[240px] truncate">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{t.task_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[t.status] ?? "bg-secondary text-foreground"}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {t.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-success hover:text-success"
                            onClick={() => updateTask.mutate({ id: t.id, status: "approved" }, { onSuccess: () => toast.success("Approved") })}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => updateTask.mutate({ id: t.id, status: "rejected" }, { onSuccess: () => toast.success("Rejected") })}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Cross-Programme Performance Tab ─── */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Cross-Programme Performance Analytics</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Consolidated view of all programme performance and operational metrics</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-6 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Enrolments</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completion Rate</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">SLA Score</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trend</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {programmePerformance.map(p => (
                    <tr key={p.name} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {p.typeName ? (
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.typeColor ?? "#888" }} />
                            <span className="text-muted-foreground font-medium">{p.typeName}</span>
                          </span>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm font-semibold text-foreground">{p.enrolments}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", p.completion >= 80 ? "bg-success" : p.completion >= 70 ? "bg-info" : "bg-warning")} style={{ width: `${p.completion}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground w-10">{p.completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", p.slaScore >= 90 ? "bg-success/10 text-success" : p.slaScore >= 80 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                          {p.slaScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {p.trend === "up" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                          <span className={cn("text-[10px] font-medium", p.trend === "up" ? "text-success" : "text-destructive")}>{p.trend === "up" ? "Improving" : "Declining"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <Eye className="w-3 h-3" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
