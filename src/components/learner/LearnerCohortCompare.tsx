/**
 * LearnerCohortCompare — shows how the learner compares to their cohort.
 * "You're in the top 30% of your cohort"
 */
import { useMemo } from "react";
import { Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnrolments } from "@/hooks/useCoreData";

function useCohortComparison(cohortId: string | undefined, myProgress: number | undefined) {
  return useQuery({
    queryKey: ["cohort_compare", cohortId],
    enabled: !!cohortId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("enrolments")
        .select("progress_percentage, learner_id")
        .eq("cohort_id", cohortId!)
        .in("status", ["active", "enrolled"]);
      if (error) throw error;
      const all = (data ?? []).map((e: any) => e.progress_percentage ?? 0) as number[];
      return all;
    },
    staleTime: 120_000,
  });
}

export default function LearnerCohortCompare() {
  const { user }               = useAuth();
  const { data: enrolments = [] } = useEnrolments({ learnerId: user?.id });

  const active = useMemo(() =>
    (enrolments as any[]).filter(e => e.status === "active" || e.status === "enrolled"),
    [enrolments]
  );
  const primary = active[0];
  const cohortId    = primary?.cohort_id;
  const myProgress  = primary?.progress_percentage ?? 0;
  const cohortName  = primary?.cohorts?.name;
  const progTitle   = primary?.cohorts?.programmes?.title;

  const { data: cohortData = [] } = useCohortComparison(cohortId, myProgress);

  const stats = useMemo(() => {
    if (!cohortData.length) return null;
    const sorted   = [...cohortData].sort((a, b) => b - a);
    const avg      = Math.round(cohortData.reduce((s, v) => s + v, 0) / cohortData.length);
    const myRank   = sorted.findIndex(v => v <= myProgress) + 1;
    const topPct   = Math.round((myRank / sorted.length) * 100);
    const highest  = sorted[0];
    const median   = sorted[Math.floor(sorted.length / 2)];
    return { avg, topPct, highest, median, total: cohortData.length };
  }, [cohortData, myProgress]);

  if (!primary || !stats) return null;

  const isAboveAvg = myProgress >= stats.avg;
  const isTop25    = stats.topPct <= 25;

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Cohort Comparison</h3>
          {cohortName && <p className="text-[10px] text-muted-foreground truncate">{cohortName}</p>}
        </div>
      </div>

      {/* Headline badge */}
      <div className={cn(
        "rounded-xl p-3 text-center border",
        isTop25 ? "bg-green-500/8 border-green-500/20" :
        isAboveAvg ? "bg-blue-500/8 border-blue-500/20" :
        "bg-orange-500/8 border-orange-500/20"
      )}>
        <p className={cn("text-lg font-bold",
          isTop25 ? "text-green-600" : isAboveAvg ? "text-blue-600" : "text-orange-600"
        )}>
          {isTop25 ? `🏆 Top ${stats.topPct}%` : `Top ${stats.topPct}%`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          of {stats.total} learner{stats.total !== 1 ? "s" : ""} in your cohort
        </p>
      </div>

      {/* Progress comparison */}
      <div className="space-y-2.5">
        {[
          { label: "You",     value: myProgress,   color: "bg-primary", bold: true },
          { label: "Average", value: stats.avg,     color: "bg-blue-400" },
          { label: "Median",  value: stats.median,  color: "bg-muted-foreground/40" },
          { label: "Highest", value: stats.highest, color: "bg-green-500" },
        ].map(item => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className={cn("text-muted-foreground", item.bold && "font-semibold text-foreground")}>{item.label}</span>
              <span className={cn("font-medium", item.bold ? "text-primary" : "text-foreground")}>{item.value}%</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {isAboveAvg ? (
        <p className="text-[10px] text-green-600 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          You're {myProgress - stats.avg}% ahead of the cohort average. Keep it up!
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          The cohort average is {stats.avg}%. You're {stats.avg - myProgress}% behind — a little extra effort will close the gap.
        </p>
      )}
    </div>
  );
}
