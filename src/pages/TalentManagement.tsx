import { useState, useMemo } from "react";
import { Users, Target, TrendingUp, Star, Search, MapPin, ArrowUpRight, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLearnerPipeline, useProgrammeSummaries, useStaffOverview } from "@/hooks/useTalentManagerData";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const pipelineStages = [
  { key: "pending", label: "Screening", color: "bg-info" },
  { key: "active", label: "In Training", color: "bg-accent" },
  { key: "assessed", label: "Assessed", color: "bg-chart-5" },
  { key: "completed", label: "Completed", color: "bg-success" },
  { key: "credentialed", label: "Credentialed", color: "bg-primary" },
];

const statusStyles: Record<string, string> = {
  Screening: "bg-info/10 text-info",
  "In Training": "bg-accent/10 text-accent",
  Assessed: "bg-chart-5/10 text-chart-5",
  Completed: "bg-success/10 text-success",
  Credentialed: "bg-primary/10 text-primary",
};

function getLearnerStage(enrolment: any, submissions: any[], credentials: any[]): string {
  const hasCredential = credentials.some((c: any) => c.learner_id === enrolment.learner_id);
  if (hasCredential) return "Credentialed";
  if (enrolment.status === "completed") return "Completed";
  const hasSubmission = submissions.some((s: any) => s.learner_id === enrolment.learner_id && ["assessed", "passed", "graded"].includes(s.status));
  if (hasSubmission) return "Assessed";
  if (["active", "enrolled"].includes(enrolment.status)) return "In Training";
  return "Screening";
}

export default function TalentManagement() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const learnerQuery = useLearnerPipeline();
  const programmeQuery = useProgrammeSummaries();
  const staffQuery = useStaffOverview();
  const isLoading = learnerQuery.isLoading || programmeQuery.isLoading;

  const { talentPool, pipeline, stats, skillsData } = useMemo(() => {
    const enrolments = learnerQuery.data?.enrolments ?? [];
    const registrations = learnerQuery.data?.registrations ?? [];
    const submissions = learnerQuery.data?.submissions ?? [];
    const credentials = learnerQuery.data?.credentials ?? [];
    const programmes = programmeQuery.data ?? [];

    // Build talent pool from enrolments + registrations
    const pool = enrolments.map((e: any) => {
      const reg = registrations.find((r: any) => r.id === e.learner_id || r.email === e.learner_id);
      const stage = getLearnerStage(e, submissions, credentials);
      const cohort = e.cohorts as any;
      const programme = cohort?.programmes as any;
      return {
        id: e.id,
        name: reg?.full_name ?? e.learner_id?.substring(0, 8) ?? "Unknown",
        skill: programme?.title ?? cohort?.name ?? "Programme",
        progress: e.progress_percentage ?? 0,
        status: stage,
        location: "-",
      };
    });

    // Pipeline counts
    const pipelineCounts = pipelineStages.map((s) => ({
      ...s,
      count: pool.filter((p: any) => p.status === s.label).length,
    }));

    // Stats
    const activeCount = pool.filter((p: any) => p.status !== "Screening").length;
    const completedCount = pool.filter((p: any) => p.status === "Completed" || p.status === "Credentialed").length;
    const avgProgress = pool.length
      ? Math.round(pool.reduce((sum: number, p: any) => sum + p.progress, 0) / pool.length)
      : 0;
    const credentialedCount = pool.filter((p: any) => p.status === "Credentialed").length;

    const computedStats = [
      { label: "Active Talent Pool", value: String(activeCount), icon: Users, color: "text-primary" },
      { label: "Completed This Period", value: String(completedCount), icon: Target, color: "text-success" },
      { label: "Avg. Progress", value: `${avgProgress}%`, icon: TrendingUp, color: "text-info" },
      { label: "Credentials Issued", value: String(credentialedCount), icon: Award, color: "text-warning" },
    ];

    // Skills / programme gap data
    // Demand = active + pending enrolments (actual demand from learners)
    // Supply  = % of enrolled learners who have completed (fulfilment rate)
    const skills = programmes.map((p: any) => {
      const progEnrolments = enrolments.filter((e: any) => (e.cohorts as any)?.programme_id === p.id);
      const active    = progEnrolments.filter((e: any) => ["active","enrolled","pending"].includes(e.status)).length;
      const completed = progEnrolments.filter((e: any) => e.status === "completed").length;
      const total     = progEnrolments.length;
      // Demand: normalise active enrolments against a 30-seat benchmark (adjustable)
      const BENCHMARK = 30;
      const demandPct  = Math.min(Math.round((active / BENCHMARK) * 100), 100);
      // Supply: completion rate among enrolled
      const supplyPct  = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { skill: p.title, demand: demandPct, supply: supplyPct, active, completed, total };
    }).filter((s: any) => s.total > 0).slice(0, 5);

    return { talentPool: pool, pipeline: pipelineCounts, stats: computedStats, skillsData: skills };
  }, [learnerQuery.data, programmeQuery.data]);

  const filtered = talentPool.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.skill.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "All" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Talent Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Track talent pipeline, skills gaps, and placement outcomes — powered by live data.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl shadow-card border border-border/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-secondary">
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
            </div>
            {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold text-foreground">{s.value}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Talent Pipeline</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Current distribution across stages</p>
          </div>
          <div className="p-6">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="flex items-end gap-3 h-40">
                {pipeline.map((p) => {
                  const maxCount = Math.max(...pipeline.map((x) => x.count), 1);
                  const height = (p.count / maxCount) * 100;
                  return (
                    <div key={p.key} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{p.count}</span>
                      <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(height, 4)}%` }}>
                        <div className={cn("w-full h-full rounded-t-lg", p.color)} />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{p.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Skills Gap */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Programme Completion Gaps</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enrolment demand vs. completion rate</p>
          </div>
          <div className="p-4 space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : skillsData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No programme data yet</p>
            ) : (
              skillsData.map((s: any) => (
                <div key={s.skill} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{s.skill}</span>
                    <span className={cn("text-[10px] font-medium", s.supply < 50 ? "text-destructive" : "text-success")}>
                      {s.supply < 50 ? "Gap" : "On Track"}
                    </span>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div className="bg-info/20 rounded-full flex-1 overflow-hidden">
                      <div className="h-full bg-info rounded-full" style={{ width: `${s.demand}%` }} />
                    </div>
                    <div className="bg-success/20 rounded-full flex-1 overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${s.supply}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>Enrolled: {s.demand}%</span>
                    <span>Completed: {s.supply}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Talent Pool Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Talent Pool</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} candidates</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search talent..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option>All</option>
              {pipelineStages.map((p) => <option key={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">No talent data yet. Enrol learners into programmes to populate the pipeline.</td></tr>
                ) : (
                  filtered.map((t: any) => (
                    <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                            {t.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground truncate max-w-[200px]">{t.skill}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[t.status] ?? "bg-muted text-muted-foreground")}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", t.progress >= 75 ? "bg-success" : t.progress >= 40 ? "bg-info" : "bg-accent")} style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{t.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
