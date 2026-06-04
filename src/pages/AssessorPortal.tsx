import { useState, useMemo } from "react";
import {
  FileCheck, Clock, CheckCircle2, AlertTriangle, BarChart3,
  Search, ClipboardCheck, Eye, ThumbsUp, ThumbsDown, BookOpen, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useSubmissions, useUpdateSubmission, useRealtimeSync, useModerationItems } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ModerationFeedbackBanner } from "@/components/moderation/ModerationFeedbackBanner";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import { useNavigate } from "react-router-dom";

type SubmissionStatus = "pending" | "in_review" | "graded" | "moderation" | "resubmit";

const statusLabel: Record<string, string> = {
  pending: "Pending",
  in_review: "In Review",
  graded: "Graded",
  moderation: "Moderation",
  resubmit: "Resubmit",
};

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  in_review: "bg-info/10 text-info",
  graded: "bg-success/10 text-success",
  moderation: "bg-accent/10 text-accent",
  resubmit: "bg-destructive/10 text-destructive",
};

export default function AssessorPortal() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const navigate = useNavigate();

  const { data: submissions, isLoading } = useSubmissions();
  const { data: moderationItems = [] } = useModerationItems();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const updateSubmission = useUpdateSubmission();
  const { user } = useAuth();

  useRealtimeSync(["assessment_submissions", "moderation_items", "notifications"]);

  // Build a map of moderation feedback by submission_id
  const moderationFeedbackMap = useMemo(() => {
    const map = new Map<string, any>();
    (moderationItems as any[]).forEach(item => {
      if (item.submission_id && (item.status === "rejected" || item.status === "approved") && item.moderation_feedback) {
        map.set(item.submission_id, item);
      }
    });
    return map;
  }, [moderationItems]);

  const filtered = useMemo(() => {
    return (submissions ?? []).filter(s => {
      const matchesSearch = (s as any).assessments?.title?.toLowerCase().includes(search.toLowerCase()) || search === "";
      const matchesFilter = filterStatus === "All" || s.status === filterStatus.toLowerCase().replace(" ", "_");
      return matchesSearch && matchesFilter;
    });
  }, [submissions, search, filterStatus]);

  const kpiItems = useMemo(() => {
    const all = submissions ?? [];
    const pending = all.filter(s => s.status === "pending").length;
    const graded = all.filter(s => s.status === "graded").length;
    const passCount = all.filter(s => s.status === "graded" && s.score != null && (s as any).assessments?.pass_mark != null && s.score >= (s as any).assessments.pass_mark).length;
    const gradedCount = graded;
    const passRate = gradedCount > 0 ? Math.round((passCount / gradedCount) * 100) : 0;
    const rejectedMods = (moderationItems as any[]).filter(i => i.status === "rejected").length;
    return [
      { label: "Pending Reviews", value: pending, sub: `${all.length} total`, trend: false, icon: Clock, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { label: "Graded", value: graded, sub: "this period", trend: true, icon: CheckCircle2, iconBg: "bg-green-500/10", iconColor: "text-green-500" },
      { label: "Mod. Rejections", value: rejectedMods, sub: "needs attention", trend: rejectedMods === 0, icon: AlertTriangle, iconBg: rejectedMods > 0 ? "bg-rose-500/10" : "bg-green-500/10", iconColor: rejectedMods > 0 ? "text-rose-500" : "text-green-500" },
      { label: "Pass Rate", value: `${passRate}%`, sub: `${gradedCount} graded`, trend: passRate > 50, icon: TrendingUp, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    ];
  }, [submissions, moderationItems]);

  const moderationQueueItems = useMemo(() => {
    return (submissions ?? []).filter(s => s.status === "moderation");
  }, [submissions]);

  const gradingDistribution = useMemo(() => {
    const graded = (submissions ?? []).filter(s => s.status === "graded" && s.score != null);
    const ranges = [
      { range: "80-100% (Distinction)", min: 80, max: 100 },
      { range: "70-79% (Merit)", min: 70, max: 79 },
      { range: "60-69% (Pass)", min: 60, max: 69 },
      { range: "50-59% (Pass)", min: 50, max: 59 },
      { range: "0-49% (Fail)", min: 0, max: 49 },
    ];
    return ranges.map(r => {
      const count = graded.filter(s => {
        const pct = (s as any).assessments?.max_score ? Math.round((s.score! / (s as any).assessments.max_score) * 100) : s.score!;
        return pct >= r.min && pct <= r.max;
      }).length;
      return { ...r, count, percentage: graded.length > 0 ? Math.round((count / graded.length) * 100) : 0 };
    });
  }, [submissions]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Find submissions with moderation rejections (assessor needs to re-grade)
  const rejectedSubmissions = filtered.filter(s => moderationFeedbackMap.has(s.id) && moderationFeedbackMap.get(s.id).status === "rejected");

  return (
    <div className="space-y-6">
      <WelcomeBanner
        subtitle="Review submissions, manage grading, and handle moderation requests."
        actions={
          <>
            <ActionButton icon={BookOpen} label="Assessments" onClick={() => navigate("/assessments")} />
            <ActionButton icon={ClipboardCheck} label="Grade Pending" onClick={() => navigate("/assessments")} primary />
          </>
        }
      />
      <KpiGrid items={kpiItems} />

      {/* Moderation Rejection Alerts */}
      {rejectedSubmissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Moderation Rejections — Action Required
          </h3>
          {rejectedSubmissions.map(s => {
            const modItem = moderationFeedbackMap.get(s.id);
            return (
              <div key={s.id} className="bg-card rounded-xl shadow-card border border-border/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{(s as any).assessments?.title ?? "Assessment"}</p>
                    <p className="text-[10px] text-muted-foreground">Score given: {s.score ?? "—"}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Re-grade Required</span>
                </div>
                <ModerationFeedbackBanner
                  status={modItem.status}
                  feedback={modItem.moderation_feedback}
                  rejectionCategory={modItem.rejection_category}
                  reviewedAt={modItem.reviewed_at}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - Upcoming assessment & session dates */}
        <div className="lg:col-span-3">
          <CalendarWidget events={calendarEvents} maxItems={4} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grading Distribution */}
        <div className="lg:col-span-1 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Grading Distribution</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Results breakdown</p>
          </div>
          <div className="p-5 space-y-3">
            {gradingDistribution.map(g => (
              <div key={g.range} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">{g.range}</span>
                  <span className="text-[11px] text-muted-foreground">{g.count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      g.range.includes("Distinction") ? "bg-success" : g.range.includes("Merit") ? "bg-primary" : g.range.includes("Fail") ? "bg-destructive" : "bg-info"
                    )}
                    style={{ width: `${g.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Moderation Queue */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Moderation Queue</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{moderationQueueItems.length} items requiring moderation</p>
            </div>
            {moderationQueueItems.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning/10 text-warning">{moderationQueueItems.length} pending</span>
            )}
          </div>
          <div className="divide-y divide-border/50">
            {moderationQueueItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">No items in moderation queue.</div>
            ) : (
              moderationQueueItems.map((m) => (
                <div key={m.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{(m as any).assessments?.title ?? "Assessment"}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Score: {m.score ?? "—"} · {m.feedback ?? "No feedback"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateSubmission.mutate({ id: m.id, status: "graded" }, { onSuccess: () => toast.success("Approved") })}
                      className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateSubmission.mutate({ id: m.id, status: "resubmit" }, { onSuccess: () => toast.success("Sent for resubmission") })}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Assessment Submissions</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} submissions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assessments..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option>All</option>
              <option>Pending</option>
              <option>In Review</option>
              <option>Graded</option>
              <option>Moderation</option>
              <option>Resubmit</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assessment</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Moderation</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">No submissions found.</td></tr>
              ) : (
                filtered.map(s => {
                  const modItem = moderationFeedbackMap.get(s.id);
                  return (
                    <tr key={s.id} className={cn("hover:bg-secondary/20 transition-colors", modItem?.status === "rejected" && "bg-destructive/5")}>
                      <td className="px-6 py-3">
                        <p className="font-medium text-foreground">{(s as any).assessments?.title ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">Max: {(s as any).assessments?.max_score ?? "—"} · Pass: {(s as any).assessments?.pass_mark ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "Not submitted"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[s.status] ?? "bg-secondary text-foreground")}>
                          {statusLabel[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {modItem ? (
                          <span className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full",
                            modItem.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                          )}>
                            {modItem.status === "rejected" ? "Rejected" : "Approved"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.score != null ? (
                          <span className={cn("font-semibold", s.score >= ((s as any).assessments?.pass_mark ?? 50) ? "text-success" : "text-destructive")}>{s.score}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
