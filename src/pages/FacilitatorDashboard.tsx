import {
  Users, BookOpen, AlertTriangle, MessageSquare, Clock, ChevronRight,
  CheckCircle2, TrendingUp, TrendingDown, Eye, FileCheck, BarChart3
} from "lucide-react";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import ProgressRing from "@/components/dashboard/ProgressRing";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCohorts, useEnrolments, useSubmissions, useRealtimeSync } from "@/hooks/useCoreData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const statusStyle = {
  on_track: { color: "text-success", bg: "bg-success/10", dot: "bg-success", label: "On Track" },
  at_risk: { color: "text-warning", bg: "bg-warning/10", dot: "bg-warning", label: "At Risk" },
  behind: { color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive", label: "Behind" },
};

function getEnrolmentStatus(progress: number) {
  if (progress >= 50) return "on_track";
  if (progress >= 25) return "at_risk";
  return "behind";
}

export default function FacilitatorDashboard() {
  const { profile } = useAuth();
  const { data: allCohorts, isLoading: cohortsLoading } = useCohorts();
  const { data: allEnrolments, isLoading: enrolmentsLoading } = useEnrolments();
  const { data: allSubmissions } = useSubmissions();
  const { data: calendarEvents = [] } = useCalendarEvents();

  // Real-time cross-portal sync
  useRealtimeSync(["cohorts", "enrolments", "assessment_submissions", "training_sessions", "notifications"]);

  // Filter cohorts assigned to this facilitator (or show all if super_admin)
  const cohorts = (allCohorts ?? []).filter(c => c.status === "active" || c.status === "planned");
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  const activeCohortId = selectedCohortId || cohorts[0]?.id;
  const selectedCohort = cohorts.find(c => c.id === activeCohortId);

  // Enrolments for selected cohort
  const cohortEnrolments = (allEnrolments ?? []).filter(e => e.cohort_id === activeCohortId);

  // Pending submissions
  const pendingSubmissions = (allSubmissions ?? []).filter(s => s.status === "pending" || s.status === "submitted");

  // Stats
  const totalLearners = cohorts.reduce((acc, c) => {
    return acc + (allEnrolments ?? []).filter(e => e.cohort_id === c.id).length;
  }, 0);
  const totalAtRisk = (allEnrolments ?? []).filter(e => {
    const inCohort = cohorts.some(c => c.id === e.cohort_id);
    return inCohort && (e.progress_percentage ?? 0) < 25;
  }).length;

  // Fetch profiles for learner names
  const learnerIds = useMemo(() => [...new Set((allEnrolments ?? []).map(e => e.learner_id))], [allEnrolments]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-facilitator", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", learnerIds);
      return data ?? [];
    },
  });
  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles as any[]).forEach(p => { m[p.user_id] = p.full_name || "Unnamed"; });
    return m;
  }, [profiles]);

  const isLoading = cohortsLoading || enrolmentsLoading;
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <FadeIn>
        <div className="bg-gradient-primary rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Facilitator Dashboard</h1>
              <p className="text-sm opacity-80 mt-1">
                {profile?.full_name || "Facilitator"} · {cohorts.length} active cohort{cohorts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs opacity-60">Learners</p>
                <p className="text-2xl font-bold">{totalLearners}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60">At Risk</p>
                <p className={cn("text-2xl font-bold", totalAtRisk > 0 && "text-[hsl(38,92%,50%)]")}>{totalAtRisk}</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Cohorts", value: cohorts.length, icon: <Users className="w-4 h-4 text-accent" /> },
          { label: "Pending Grading", value: pendingSubmissions.length, icon: <FileCheck className="w-4 h-4 text-info" /> },
          { label: "At Risk Learners", value: totalAtRisk, icon: <AlertTriangle className="w-4 h-4 text-warning" /> },
          { label: "Total Learners", value: totalLearners, icon: <Users className="w-4 h-4 text-success" /> },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cohort Selector Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <p className="text-muted-foreground text-sm">No cohorts assigned yet.</p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">My Cohorts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cohorts.map(c => {
              const enrolCount = (allEnrolments ?? []).filter(e => e.cohort_id === c.id).length;
              const atRisk = (allEnrolments ?? []).filter(e => e.cohort_id === c.id && (e.progress_percentage ?? 0) < 25).length;
              const avgProgress = enrolCount > 0
                ? Math.round((allEnrolments ?? []).filter(e => e.cohort_id === c.id).reduce((a, e) => a + (e.progress_percentage ?? 0), 0) / enrolCount)
                : 0;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCohortId(c.id)}
                  className={cn(
                    "text-left bg-card rounded-xl p-4 shadow-card border transition-all duration-200",
                    activeCohortId === c.id
                      ? "border-accent/40 shadow-card-hover ring-1 ring-accent/20"
                      : "border-border/50 hover:border-accent/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
                      <p className="text-[10px] text-muted-foreground">{(c as any).programmes?.title ?? "—"}</p>
                    </div>
                    <ProgressRing value={avgProgress} size={40} strokeWidth={3} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolCount}</span>
                    {atRisk > 0 && (
                      <span className="flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" />{atRisk} at risk</span>
                    )}
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-secondary font-medium uppercase">{c.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Learner Progress Table */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Learner Progress {selectedCohort ? `— ${selectedCohort.name}` : ""}
              </h3>
              <span className="text-[10px] text-muted-foreground">{cohortEnrolments.length} learner{cohortEnrolments.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              {cohortEnrolments.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No learners enrolled in this cohort yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohortEnrolments.map(e => {
                      const progress = e.progress_percentage ?? 0;
                      const status = getEnrolmentStatus(progress);
                      const st = statusStyle[status];
                      return (
                        <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                          <td className="px-5 py-3">
                            <span className="text-sm font-medium text-foreground">
                              {profileMap[e.learner_id] || `Learner ${e.learner_id.slice(0, 6)}`}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", status === "behind" ? "bg-destructive" : status === "at_risk" ? "bg-warning" : "bg-success")}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-foreground w-8">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", st.color)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                              {st.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {e.enrolled_at ? format(new Date(e.enrolled_at), "MMM dd, yyyy") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pending Grading */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-info" /> Pending Grading
            </h3>
            <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border/50">
              {pendingSubmissions.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">No submissions pending review.</p>
                </div>
              ) : (
                pendingSubmissions.slice(0, 5).map(s => (
                  <div key={s.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-secondary/10 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {(s as any).assessments?.title ?? "Submission"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.submitted_at ? format(new Date(s.submitted_at), "MMM dd, yyyy") : "Not submitted"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                        s.status === "pending" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                      )}>
                        {s.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Calendar + At Risk */}
        <div className="space-y-6">
          <CalendarWidget events={calendarEvents} />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> At Risk Learners
            </h3>
            <div className="space-y-2">
              {(allEnrolments ?? [])
                .filter(e => cohorts.some(c => c.id === e.cohort_id) && (e.progress_percentage ?? 0) < 25)
                .slice(0, 5)
                .map(e => {
                  const cohort = cohorts.find(c => c.id === e.cohort_id);
                  return (
                    <div key={e.id} className="bg-card rounded-xl p-4 shadow-card border border-warning/20 transition-all hover:shadow-card-hover cursor-pointer">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{profileMap[e.learner_id] || `Learner ${e.learner_id.slice(0, 6)}`}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Progress at {e.progress_percentage ?? 0}%
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-1">{cohort?.name ?? "Unknown cohort"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {totalAtRisk === 0 && (
                <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center">
                  <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">All learners on track!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
