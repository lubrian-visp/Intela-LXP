import { BookOpen, Clock, PlayCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProgressRing from "@/components/dashboard/ProgressRing";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  enrolments: any[];
}

export default function LearnerEnrolmentsList({ enrolments }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">My Programmes</h3>
        {enrolments.length > 0 && (
          <button
            onClick={() => navigate("/learner/programmes")}
            className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {enrolments.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No active enrolments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrolments.map((e: any) => {
            const progress      = e.progress_percentage ?? 0;
            const programmeTitle = e.cohorts?.programmes?.title ?? "Programme";
            const cohortName    = e.cohorts?.name ?? "";
            const typeColor     = e.cohorts?.programmes?.programme_types?.color;
            const isInProgress  = progress > 0 && progress < 100;
            const isNotStarted  = progress === 0;

            return (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${programmeTitle} — ${progress}% complete. Click to resume.`}
                onClick={() => navigate(`/learner/programmes/${e.id}`)}
                onKeyDown={ev => ev.key === "Enter" && navigate(`/learner/programmes/${e.id}`)}
                className="bg-card rounded-xl shadow-card border border-border/50 p-5 hover:shadow-card-hover transition-all cursor-pointer group"
              >
                {/* Colour accent top bar */}
                {typeColor && (
                  <div className="h-1 rounded-full mb-3 -mx-5 -mt-5 px-0"
                    style={{ backgroundColor: typeColor, margin: "-20px -20px 12px -20px", borderRadius: "12px 12px 0 0" }} />
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                      {programmeTitle}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{cohortName}</p>
                  </div>
                  <ProgressRing value={progress} size={48} strokeWidth={3} />
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                  <div
                    className={cn("h-full rounded-full transition-all",
                      progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-primary" : "bg-orange-400"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {e.enrolled_at ? format(new Date(e.enrolled_at), "MMM dd, yyyy") : "—"}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-medium uppercase">
                      {e.status}
                    </span>
                  </div>

                  {/* Resume / Start CTA */}
                  <button
                    onClick={ev => { ev.stopPropagation(); navigate(`/learner/programmes/${e.id}`); }}
                    aria-label={isNotStarted ? `Start ${programmeTitle}` : `Resume ${programmeTitle}`}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors",
                      isNotStarted
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    )}
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {isNotStarted ? "Start" : "Resume"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
