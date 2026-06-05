import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAssessments } from "@/hooks/useCoreData";
import { useEnrolments } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";

export default function LearnerDeadlineWidget() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { data: enrolments = [] } = useEnrolments({ learnerId: user?.id });

  const programmeId = useMemo(() => {
    const ids = [...new Set(
      (enrolments as any[]).map(e => e.cohorts?.programmes?.id).filter(Boolean)
    )];
    return ids[0];
  }, [enrolments]);

  const { data: assessments = [] } = useAssessments(programmeId);

  const upcoming = useMemo(() => {
    const now = new Date();
    return (assessments as any[])
      .filter(a => a.due_date && new Date(a.due_date) >= now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);
  }, [assessments]);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Clock className="w-3.5 h-3.5 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">Upcoming Deadlines</h3>
      </div>
      <div className="divide-y divide-border/30">
        {upcoming.map((a: any) => {
          const days = differenceInDays(new Date(a.due_date), new Date());
          const isUrgent = days <= 2;
          const isSoon   = days <= 7;
          return (
            <button
              key={a.id}
              onClick={() => navigate("/learner/assessments")}
              aria-label={`${a.title} due in ${days} day${days !== 1 ? "s" : ""}`}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                isUrgent ? "bg-rose-500/10" : isSoon ? "bg-orange-500/10" : "bg-secondary"
              )}>
                {isUrgent
                  ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  : <Clock className={cn("w-3.5 h-3.5", isSoon ? "text-orange-500" : "text-muted-foreground")} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{a.title}</p>
                <p className={cn("text-[10px]",
                  isUrgent ? "text-rose-500 font-semibold" :
                  isSoon   ? "text-orange-500" :
                             "text-muted-foreground"
                )}>
                  {days === 0 ? "Due today!" :
                   days === 1 ? "Due tomorrow!" :
                   `Due in ${days} days · ${format(new Date(a.due_date), "d MMM")}`}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
