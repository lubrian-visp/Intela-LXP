/**
 * LearnerAnalyticsWidget — personal learning analytics
 * Shows pace vs deadline, engagement breakdown, and completion forecast.
 */
import { useMemo } from "react";
import { TrendingUp, Clock, Target, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, addDays, format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useEnrolments, useSubmissions } from "@/hooks/useCoreData";
import { useWeeklyStudyMinutes } from "@/hooks/useLearnerStreak";

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function LearnerAnalyticsWidget() {
  const { user }                     = useAuth();
  const { data: enrolments = [] }    = useEnrolments({ learnerId: user?.id });
  const { data: submissions = [] }   = useSubmissions({ learnerId: user?.id });
  const { data: weekly }             = useWeeklyStudyMinutes();

  const active = useMemo(() =>
    (enrolments as any[]).filter(e => e.status === "active" || e.status === "enrolled"),
    [enrolments]
  );

  // Pace vs deadline analysis
  const paceItems = useMemo(() => {
    return active
      .filter((e: any) => e.cohorts?.end_date && e.progress_percentage != null)
      .map((e: any) => {
        const endDate  = new Date(e.cohorts.end_date);
        const daysLeft = differenceInDays(endDate, new Date());
        const progress = e.progress_percentage ?? 0;
        const needed   = daysLeft > 0 ? ((100 - progress) / daysLeft).toFixed(1) : null;
        const isAtRisk = daysLeft > 0 && progress < (100 - daysLeft * 1.5);
        return {
          title:    e.cohorts?.programmes?.title ?? "Programme",
          progress,
          daysLeft,
          needed,
          isAtRisk,
          forecastDate: daysLeft > 0 && progress > 0
            ? format(addDays(new Date(), Math.ceil((100 - progress) / Math.max(progress / Math.max(differenceInDays(new Date(), new Date(e.enrolled_at ?? new Date())), 1), 0.1))), "d MMM")
            : null,
        };
      })
      .slice(0, 3);
  }, [active]);

  // Submission engagement breakdown
  const engagementStats = useMemo(() => {
    const total     = submissions.length;
    const graded    = (submissions as any[]).filter(s => ["graded","assessed","passed","approved"].includes(s.status)).length;
    const pending   = (submissions as any[]).filter(s => ["pending","submitted"].includes(s.status)).length;
    const revision  = (submissions as any[]).filter(s => s.status === "resubmit").length;
    return { total, graded, pending, revision };
  }, [submissions]);

  const studyMinutes  = weekly?.totalMinutes  ?? 0;
  const studyDays     = weekly?.daysStudied   ?? 0;

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">My Learning Analytics</h3>
      </div>

      {/* Weekly engagement */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-secondary/40 p-3 text-center">
          <p className="text-xl font-bold text-foreground">{studyMinutes}</p>
          <p className="text-[10px] text-muted-foreground">min studied this week</p>
        </div>
        <div className="rounded-xl bg-secondary/40 p-3 text-center">
          <p className="text-xl font-bold text-foreground">{studyDays}</p>
          <p className="text-[10px] text-muted-foreground">days active</p>
        </div>
      </div>

      {/* Submission breakdown */}
      {engagementStats.total > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Submission Status</p>
          {[
            { label: "Graded",   val: engagementStats.graded,   max: engagementStats.total, color: "bg-green-500" },
            { label: "Pending",  val: engagementStats.pending,  max: engagementStats.total, color: "bg-blue-400" },
            { label: "Revision", val: engagementStats.revision, max: engagementStats.total, color: "bg-orange-400" },
          ].map(s => (
            <div key={s.label} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium text-foreground">{s.val}/{engagementStats.total}</span>
              </div>
              <MiniBar value={s.val} max={engagementStats.total} color={s.color} />
            </div>
          ))}
        </div>
      )}

      {/* Pace vs deadline */}
      {paceItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pace vs Deadline</p>
          {paceItems.map((item, i) => (
            <div key={i} className={cn("rounded-xl p-3 border", item.isAtRisk ? "bg-rose-500/5 border-rose-500/20" : "bg-secondary/30 border-border/30")}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[12px] font-medium text-foreground truncate">{item.title}</p>
                {item.isAtRisk
                  ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                }
              </div>
              <MiniBar
                value={item.progress}
                max={100}
                color={item.isAtRisk ? "bg-rose-500" : "bg-green-500"}
              />
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                <span>{item.progress}% complete</span>
                <span className={cn(item.daysLeft <= 7 && item.daysLeft > 0 ? "text-orange-500 font-medium" : "")}>
                  {item.daysLeft > 0 ? `${item.daysLeft} days left` : "Deadline passed"}
                </span>
              </div>
              {item.isAtRisk && item.daysLeft > 0 && (
                <p className="text-[10px] text-rose-500 mt-1">
                  Need ~{item.needed}% progress/day to finish on time.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {paceItems.length === 0 && engagementStats.total === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-2">
          Analytics will appear as you progress through your programmes.
        </p>
      )}
    </div>
  );
}
