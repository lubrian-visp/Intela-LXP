import { useState, useMemo } from "react";
import { TrendingUp, Users, Search, ChevronRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolments, useCohorts } from "@/hooks/useCoreData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/usePageTitle";

const STATUS_CONFIG = {
  on_track: { label: "On Track",   color: "text-success",     bg: "bg-success/10",     dot: "bg-success",     icon: CheckCircle2 },
  at_risk:  { label: "At Risk",    color: "text-warning",     bg: "bg-warning/10",     dot: "bg-warning",     icon: AlertTriangle },
  behind:   { label: "Behind",     color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive", icon: Clock },
};

function getStatus(progress: number): keyof typeof STATUS_CONFIG {
  if (progress >= 50) return "on_track";
  if (progress >= 25) return "at_risk";
  return "behind";
}

export default function FacilitatorLearnerProgress() {
  usePageTitle("Learner Progress", "Facilitator Portal");
  const navigate = useNavigate();
  const [search, setSearch]             = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: cohorts = [] } = useCohorts();
  const { data: enrolments = [], isLoading } = useEnrolments();

  // Batch-fetch learner profiles
  const learnerIds = useMemo(
    () => [...new Set((enrolments as any[]).map((e: any) => e.learner_id))],
    [enrolments]
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-progress", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("user_id, full_name, job_title")
        .in("user_id", learnerIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const profileMap = useMemo(() => {
    const m: Record<string, { name: string; title: string }> = {};
    (profiles as any[]).forEach(p => {
      m[p.user_id] = { name: p.full_name || "Unnamed", title: p.job_title || "" };
    });
    return m;
  }, [profiles]);

  // Build enriched learner rows
  const rows = useMemo(() => {
    return (enrolments as any[]).map((e: any) => {
      const cohort   = (cohorts as any[]).find(c => c.id === e.cohort_id);
      const progress = e.progress_percentage ?? 0;
      const status   = getStatus(progress);
      return {
        id:         e.id,
        learnerId:  e.learner_id,
        name:       profileMap[e.learner_id]?.name ?? `Learner ${e.learner_id.slice(0, 6)}`,
        jobTitle:   profileMap[e.learner_id]?.title ?? "",
        cohortId:   e.cohort_id,
        cohortName: cohort?.name ?? "—",
        programme:  cohort?.programmes?.title ?? e.cohorts?.programmes?.title ?? "—",
        progress,
        status,
        enrolledAt: e.enrolled_at,
        enrolStatus: e.status,
      };
    });
  }, [enrolments, cohorts, profileMap]);

  // Apply filters
  const filtered = useMemo(() => {
    let r = rows;
    if (cohortFilter !== "all") r = r.filter(row => row.cohortId === cohortFilter);
    if (statusFilter !== "all") r = r.filter(row => row.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(row =>
        row.name.toLowerCase().includes(q) ||
        row.cohortName.toLowerCase().includes(q) ||
        row.programme.toLowerCase().includes(q)
      );
    }
    return r;
  }, [rows, cohortFilter, statusFilter, search]);

  // Summary counts
  const counts = useMemo(() => ({
    on_track: rows.filter(r => r.status === "on_track").length,
    at_risk:  rows.filter(r => r.status === "at_risk").length,
    behind:   rows.filter(r => r.status === "behind").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Learner Progress
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor and act on individual learner progress across all your cohorts.
        </p>
      </FadeIn>

      {/* ── Summary KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            className={cn(
              "bg-card rounded-xl p-4 shadow-card border text-left transition-all",
              statusFilter === key ? "border-primary/40 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/20"
            )}
            aria-pressed={statusFilter === key}
          >
            <div className="flex items-center justify-between mb-1">
              <cfg.icon className={cn("w-4 h-4", cfg.color)} />
              <span className="text-2xl font-bold text-foreground">{counts[key]}</span>
            </div>
            <p className={cn("text-[11px] font-medium", cfg.color)}>{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search learners, cohorts, programmes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search learners"
          />
        </div>
        <select
          value={cohortFilter}
          onChange={e => setCohortFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          aria-label="Filter by cohort"
        >
          <option value="all">All Cohorts</option>
          {(cohorts as any[]).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="on_track">On Track</option>
          <option value="at_risk">At Risk</option>
          <option value="behind">Behind</option>
        </select>
      </div>

      {/* ── Learner Table ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No learners found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Showing <strong className="text-foreground">{filtered.length}</strong> learner{filtered.length !== 1 ? "s" : ""}
              {search || cohortFilter !== "all" || statusFilter !== "all" ? " (filtered)" : ""}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cohort</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                <th className="px-5 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const cfg = STATUS_CONFIG[row.status];
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/learner/profile/${row.learnerId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={k => k.key === "Enter" && navigate(`/learner/profile/${row.learnerId}`)}
                    aria-label={`Open learner profile for ${row.name}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{row.name}</p>
                      {row.jobTitle && <p className="text-[10px] text-muted-foreground">{row.jobTitle}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-foreground font-medium">{row.cohortName}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{row.programme}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Progress value={row.progress} className="h-1.5 w-20" />
                        <span className="text-xs font-semibold text-foreground w-8">{row.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full", cfg.color, cfg.bg)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {row.enrolledAt ? format(new Date(row.enrolledAt), "d MMM yyyy") : "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
