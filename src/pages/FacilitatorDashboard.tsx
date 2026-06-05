import {
  Users, AlertTriangle, ChevronRight,
  CheckCircle2, FileCheck, BarChart3, Bell, ExternalLink,
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
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAnnouncements, useCreateAnnouncement } from "@/hooks/useCollaboration";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const statusStyle = {
  on_track: { color: "text-success", bg: "bg-success/10", dot: "bg-success", label: "On Track" },
  at_risk:  { color: "text-warning", bg: "bg-warning/10", dot: "bg-warning", label: "At Risk" },
  behind:   { color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive", label: "Behind" },
};

function getEnrolmentStatus(progress: number) {
  if (progress >= 50) return "on_track";
  if (progress >= 25) return "at_risk";
  return "behind";
}

// ─── Post Announcement dialog ─────────────────────────────────────────────────
function AnnounceDialog({
  open, onClose, cohortId, cohortName, authorId,
}: {
  open: boolean; onClose: () => void;
  cohortId: string; cohortName: string; authorId: string;
}) {
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [posting, setPosting] = useState(false);
  const create = useCreateAnnouncement();

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }
    setPosting(true);
    try {
      await create.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        scope_type: "cohort",
        scope_id: cohortId,
        author_id: authorId,
        priority: "normal",
        is_published: true,
        published_at: new Date().toISOString(),
      });
      toast.success("Announcement posted to " + cohortName);
      setTitle(""); setBody(""); onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to post announcement");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" /> Post Announcement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Posting to: <strong className="text-foreground">{cohortName}</strong>
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subject</Label>
            <Input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Module 2 starts Monday"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Message</Label>
            <Textarea
              value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement here…"
              className="min-h-[100px] text-sm resize-y"
              maxLength={2000}
            />
            <p className="text-[9px] text-muted-foreground text-right">{body.length}/2000</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handlePost} disabled={posting}>
              {posting ? "Posting…" : <><Bell className="w-3 h-3" /> Post to Cohort</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function FacilitatorDashboard() {
  usePageTitle("Dashboard", "Facilitator Portal");
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: allCohorts, isLoading: cohortsLoading } = useCohorts();
  const { data: allEnrolments, isLoading: enrolmentsLoading } = useEnrolments();
  const { data: allSubmissions } = useSubmissions();
  const { data: calendarEvents = [] } = useCalendarEvents();

  // Real-time sync scoped to relevant tables
  useRealtimeSync(["cohorts", "enrolments", "assessment_submissions", "training_sessions", "notifications"]);

  // Active + planned cohorts only
  const cohorts = (allCohorts ?? []).filter(c => c.status === "active" || c.status === "planned");
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [announceOpen, setAnnounceOpen] = useState(false);

  const activeCohortId = selectedCohortId || cohorts[0]?.id;
  const selectedCohort = cohorts.find(c => c.id === activeCohortId);

  // Enrolments scoped to selected cohort
  const cohortEnrolments = useMemo(
    () => (allEnrolments ?? []).filter(e => e.cohort_id === activeCohortId),
    [allEnrolments, activeCohortId]
  );

  // Submissions scoped to learners in the selected cohort
  const cohortLearnerIds = useMemo(
    () => new Set(cohortEnrolments.map(e => e.learner_id)),
    [cohortEnrolments]
  );
  const pendingSubmissions = useMemo(
    () => (allSubmissions ?? []).filter(s =>
      (s.status === "pending" || s.status === "submitted") &&
      cohortLearnerIds.has(s.learner_id)
    ),
    [allSubmissions, cohortLearnerIds]
  );

  // Aggregate stats
  const totalLearners = useMemo(
    () => cohorts.reduce((acc, c) =>
      acc + (allEnrolments ?? []).filter(e => e.cohort_id === c.id).length, 0),
    [cohorts, allEnrolments]
  );
  const atRiskEnrolments = useMemo(
    () => (allEnrolments ?? []).filter(e =>
      cohorts.some(c => c.id === e.cohort_id) && (e.progress_percentage ?? 0) < 25
    ),
    [allEnrolments, cohorts]
  );

  // Batch-fetch learner profiles
  const learnerIds = useMemo(
    () => [...new Set((allEnrolments ?? []).map(e => e.learner_id))],
    [allEnrolments]
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-facilitator", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("user_id, full_name")
        .in("user_id", learnerIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles as any[]).forEach(p => { m[p.user_id] = p.full_name || "Unnamed"; });
    return m;
  }, [profiles]);

  const kpiItems = [
    {
      label: "Active Cohorts", value: cohorts.length, sub: "assigned",
      trend: true, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500",
    },
    {
      label: "Pending Grading", value: pendingSubmissions.length, sub: "in selected cohort",
      trend: pendingSubmissions.length === 0,
      icon: FileCheck,
      iconBg: pendingSubmissions.length > 0 ? "bg-orange-500/10" : "bg-green-500/10",
      iconColor: pendingSubmissions.length > 0 ? "text-orange-500" : "text-green-500",
    },
    {
      label: "At Risk", value: atRiskEnrolments.length, sub: "< 25% progress",
      trend: atRiskEnrolments.length === 0,
      icon: AlertTriangle,
      iconBg: atRiskEnrolments.length > 0 ? "bg-rose-500/10" : "bg-green-500/10",
      iconColor: atRiskEnrolments.length > 0 ? "text-rose-500" : "text-green-500",
    },
    {
      label: "Total Learners", value: totalLearners, sub: "across all cohorts",
      trend: true, icon: Users, iconBg: "bg-purple-500/10", iconColor: "text-purple-500",
    },
  ];

  const isLoading = cohortsLoading || enrolmentsLoading;

  return (
    <div className="space-y-6">
      <WelcomeBanner
        subtitle={`${cohorts.length} active cohort${cohorts.length !== 1 ? "s" : ""} · ${totalLearners} learner${totalLearners !== 1 ? "s" : ""} in your care.`}
        actions={
          <>
            <ActionButton
              icon={AlertTriangle}
              label={`At Risk (${atRiskEnrolments.length})`}
              onClick={() => navigate("/facilitator/engagement")}
            />
            <ActionButton
              icon={Bell}
              label="Announce"
              onClick={() => setAnnounceOpen(true)}
            />
            <ActionButton
              icon={FileCheck}
              label="Grade Submissions"
              onClick={() => navigate("/gradebook")}
              primary
            />
          </>
        }
      />
      <KpiGrid items={kpiItems} />

      {/* ── Cohort Selector ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No cohorts assigned yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your Programme Manager to be assigned to a cohort.</p>
        </div>
      ) : (
        <FadeIn>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">My Cohorts</h3>
            <button
              onClick={() => navigate("/cohort-management")}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              Manage cohorts <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cohorts.map(c => {
              const enrolCount = (allEnrolments ?? []).filter(e => e.cohort_id === c.id).length;
              const atRisk     = (allEnrolments ?? []).filter(e => e.cohort_id === c.id && (e.progress_percentage ?? 0) < 25).length;
              const avgProgress = enrolCount > 0
                ? Math.round((allEnrolments ?? []).filter(e => e.cohort_id === c.id).reduce((a, e) => a + (e.progress_percentage ?? 0), 0) / enrolCount)
                : 0;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCohortId(c.id)}
                  className={cn(
                    "text-left bg-card rounded-xl p-4 shadow-card border transition-all duration-200 hover:shadow-card-hover",
                    activeCohortId === c.id
                      ? "border-primary/40 shadow-card-hover ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/20"
                  )}
                  aria-label={`Select cohort ${c.name}`}
                  aria-pressed={activeCohortId === c.id}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="text-sm font-semibold text-foreground truncate">{c.name}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{(c as any).programmes?.title ?? "—"}</p>
                    </div>
                    <ProgressRing value={avgProgress} size={40} strokeWidth={3} />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolCount} learner{enrolCount !== 1 ? "s" : ""}</span>
                    {atRisk > 0 && (
                      <span className="flex items-center gap-1 text-warning">
                        <AlertTriangle className="w-3 h-3" />{atRisk} at risk
                      </span>
                    )}
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-secondary font-medium uppercase tracking-wide">
                      {c.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Learner Progress Table */}
        <div className="lg:col-span-2 space-y-6">

          {/* Learner Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Learner Progress
                {selectedCohort && <span className="text-muted-foreground font-normal"> — {selectedCohort.name}</span>}
              </h3>
              <button
                onClick={() => navigate("/facilitator/learner-progress")}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                aria-label="View full learner progress report"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              {cohortEnrolments.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No learners enrolled in this cohort yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                      <th className="px-5 py-3" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {cohortEnrolments.map(e => {
                      const progress = e.progress_percentage ?? 0;
                      const status   = getEnrolmentStatus(progress);
                      const st       = statusStyle[status];
                      const name     = profileMap[e.learner_id] || `Learner ${e.learner_id.slice(0, 6)}`;
                      return (
                        <tr
                          key={e.id}
                          className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/learner/profile/${e.learner_id}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={k => k.key === "Enter" && navigate(`/learner/profile/${e.learner_id}`)}
                          aria-label={`View profile for ${name}`}
                        >
                          <td className="px-5 py-3">
                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                              {name}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all",
                                    status === "behind" ? "bg-destructive" :
                                    status === "at_risk" ? "bg-warning" : "bg-success"
                                  )}
                                  style={{ width: `${progress}%` }}
                                  role="progressbar"
                                  aria-valuenow={progress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
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
                            {e.enrolled_at ? format(new Date(e.enrolled_at), "d MMM yyyy") : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pending Grading — filtered to selected cohort */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-orange-500" />
                Pending Grading
                {selectedCohort && <span className="text-muted-foreground font-normal text-xs">— {selectedCohort.name}</span>}
              </h3>
              <button
                onClick={() => navigate("/gradebook")}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Open Gradebook <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border/50">
              {pendingSubmissions.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
                  <p className="text-sm font-medium text-success">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No pending submissions in this cohort.</p>
                </div>
              ) : (
                <>
                  {pendingSubmissions.slice(0, 5).map(s => {
                    const learnerName = profileMap[s.learner_id] || `Learner ${s.learner_id.slice(0, 6)}`;
                    return (
                      <button
                        key={s.id}
                        className="w-full text-left px-5 py-3.5 flex items-center justify-between hover:bg-secondary/10 transition-colors group"
                        onClick={() => navigate("/gradebook")}
                        aria-label={`Review submission by ${learnerName}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {(s as any).assessments?.title ?? "Submission"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {learnerName} ·{" "}
                            {s.submitted_at
                              ? format(new Date(s.submitted_at), "d MMM yyyy")
                              : "Not yet submitted"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                            s.status === "pending" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                          )}>
                            {s.status}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                  {pendingSubmissions.length > 5 && (
                    <button
                      onClick={() => navigate("/gradebook")}
                      className="w-full px-5 py-3 text-[11px] text-primary hover:bg-secondary/10 transition-colors text-center font-medium"
                    >
                      View all {pendingSubmissions.length} pending submissions →
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <CalendarWidget events={calendarEvents} />

          {/* At Risk Learners */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                At Risk Learners
              </h3>
              <button
                onClick={() => navigate("/facilitator/engagement")}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Full report <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {atRiskEnrolments.length === 0 ? (
                <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
                  <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-2" />
                  <p className="text-xs font-medium text-success">All learners on track!</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">No learners below 25% progress.</p>
                </div>
              ) : (
                atRiskEnrolments.slice(0, 5).map(e => {
                  const cohort = cohorts.find(c => c.id === e.cohort_id);
                  const name   = profileMap[e.learner_id] || `Learner ${e.learner_id.slice(0, 6)}`;
                  return (
                    <button
                      key={e.id}
                      className="w-full text-left bg-card rounded-xl p-3.5 shadow-card border border-warning/20 transition-all hover:shadow-card-hover hover:border-warning/40 group"
                      onClick={() => navigate(`/learner/profile/${e.learner_id}`)}
                      aria-label={`View profile for at-risk learner ${name}`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {e.progress_percentage ?? 0}% progress
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{cohort?.name ?? "Unknown cohort"}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </div>
                    </button>
                  );
                })
              )}
              {atRiskEnrolments.length > 5 && (
                <button
                  onClick={() => navigate("/facilitator/engagement")}
                  className="w-full text-[11px] text-primary py-2 rounded-xl border border-dashed border-border hover:bg-secondary/30 transition-colors"
                >
                  +{atRiskEnrolments.length - 5} more at-risk learners →
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 space-y-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /> Cohort Snapshot
            </h3>
            {selectedCohort && cohortEnrolments.length > 0 ? (
              <div className="space-y-2">
                {["on_track", "at_risk", "behind"].map(status => {
                  const count = cohortEnrolments.filter(e => getEnrolmentStatus(e.progress_percentage ?? 0) === status).length;
                  const pct   = Math.round((count / cohortEnrolments.length) * 100);
                  const st    = statusStyle[status as keyof typeof statusStyle];
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={cn("font-medium", st.color)}>{st.label}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", st.dot)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  Avg progress: <strong className="text-foreground">
                    {Math.round(cohortEnrolments.reduce((a, e) => a + (e.progress_percentage ?? 0), 0) / cohortEnrolments.length)}%
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Select a cohort to see its snapshot.</p>
            )}
          </div>
        </div>
      </div>

      {/* Announcement dialog */}
      {activeCohortId && profile?.user_id && (
        <AnnounceDialog
          open={announceOpen}
          onClose={() => setAnnounceOpen(false)}
          cohortId={activeCohortId}
          cohortName={selectedCohort?.name ?? "selected cohort"}
          authorId={profile.user_id}
        />
      )}
    </div>
  );
}
