import { useState, useMemo } from "react";
import { Heart, Users, TrendingUp, TrendingDown, AlertTriangle, Search, BarChart3, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useEnrolments, useCohorts, useSubmissions } from "@/hooks/useCoreData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function getEngagementLevel(progress: number, submissionCount: number) {
  if (progress >= 60 && submissionCount >= 2) return { label: "High", color: "text-success", bg: "bg-success" };
  if (progress >= 30 || submissionCount >= 1) return { label: "Medium", color: "text-warning", bg: "bg-warning" };
  return { label: "Low", color: "text-destructive", bg: "bg-destructive" };
}

export default function FacilitatorEngagement() {
  usePageTitle("Learner Engagement", "Facilitator Portal");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const { data: cohorts = [] } = useCohorts();
  const { data: enrolments = [], isLoading: enrolLoading } = useEnrolments();
  const { data: submissions = [] } = useSubmissions();

  // Fetch profiles for learner names
  const learnerIds = [...new Set((enrolments as any[]).map(e => e.learner_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-batch", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      if (learnerIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", learnerIds);
      return data ?? [];
    },
  });

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles as any[]).forEach(p => { m[p.user_id] = p.full_name || "Unnamed"; });
    return m;
  }, [profiles]);

  // Compute per-learner engagement data
  const learnerData = useMemo(() => {
    let filtered = enrolments as any[];
    if (cohortFilter !== "all") filtered = filtered.filter(e => e.cohort_id === cohortFilter);

    return filtered.map(e => {
      const learnerSubmissions = (submissions as any[]).filter(s => s.learner_id === e.learner_id);
      const progress = e.progress_percentage ?? 0;
      const engagement = getEngagementLevel(progress, learnerSubmissions.length);
      const cohort = (cohorts as any[]).find(c => c.id === e.cohort_id);
      return {
        id: e.id,
        learnerId: e.learner_id,
        name: profileMap[e.learner_id] || `Learner ${e.learner_id.slice(0, 6)}`,
        programme: e.cohorts?.programmes?.title ?? "Programme",
        cohort: cohort?.name ?? "—",
        progress,
        submissionCount: learnerSubmissions.length,
        engagement,
        status: e.status,
      };
    });
  }, [enrolments, submissions, cohorts, cohortFilter, profileMap]);

  const searchFiltered = search
    ? learnerData.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.programme.toLowerCase().includes(search.toLowerCase()))
    : learnerData;

  // Stats
  const highCount = learnerData.filter(l => l.engagement.label === "High").length;
  const medCount = learnerData.filter(l => l.engagement.label === "Medium").length;
  const lowCount = learnerData.filter(l => l.engagement.label === "Low").length;
  const avgProgress = learnerData.length > 0
    ? Math.round(learnerData.reduce((a, l) => a + l.progress, 0) / learnerData.length)
    : 0;

  const isLoading = enrolLoading;

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Learner Engagement</h1>
        <p className="text-sm text-muted-foreground">Track engagement levels across your cohorts based on progress and submissions.</p>
      </FadeIn>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "High Engagement", value: highCount, icon: <TrendingUp className="w-4 h-4 text-success" /> },
          { label: "Medium Engagement", value: medCount, icon: <BarChart3 className="w-4 h-4 text-warning" /> },
          { label: "Low Engagement", value: lowCount, icon: <TrendingDown className="w-4 h-4 text-destructive" /> },
          { label: "Avg Progress", value: `${avgProgress}%`, icon: <Heart className="w-4 h-4 text-accent" /> },
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search learners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={cohortFilter}
          onChange={e => setCohortFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground"
        >
          <option value="all">All Cohorts</option>
          {(cohorts as any[]).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : searchFiltered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No learner data found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Submissions</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Engagement</th>
                <th className="px-5 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {searchFiltered.map(l => (
                <tr
                  key={l.id}
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/learner/profile/${l.learnerId}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={k => k.key === "Enter" && navigate(`/learner/profile/${l.learnerId}`)}
                  aria-label={`View profile for ${l.name}`}
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{l.name}</p>
                    <p className="text-[10px] text-muted-foreground">{l.cohort}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{l.programme}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={l.progress} className="h-1.5 w-16" />
                      <span className="text-xs font-medium text-foreground">{l.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-foreground font-medium">{l.submissionCount}</td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full", l.engagement.color, l.engagement.label === "Low" ? "bg-destructive/10" : l.engagement.label === "Medium" ? "bg-warning/10" : "bg-success/10")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", l.engagement.bg)} />
                      {l.engagement.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
