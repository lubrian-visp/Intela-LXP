import { BookOpen, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProgressRing from "@/components/dashboard/ProgressRing";
import { format } from "date-fns";

interface Props {
  enrolments: any[];
}

export default function LearnerEnrolmentsList({ enrolments }: Props) {
  const navigate = useNavigate();

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">My Programmes</h3>
      {enrolments.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No active enrolments yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrolments.map((e: any) => {
            const progress = e.progress_percentage ?? 0;
            const programmeTitle = e.cohorts?.programmes?.title ?? "Programme";
            const cohortName = e.cohorts?.name ?? "";
            return (
              <div
                key={e.id}
                onClick={() => navigate(`/learner/programmes/${e.id}`)}
                className="bg-card rounded-xl shadow-card border border-border/50 p-5 hover:shadow-card-hover transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{programmeTitle}</h4>
                    <p className="text-[10px] text-muted-foreground">{cohortName}</p>
                  </div>
                  <ProgressRing value={progress} size={48} strokeWidth={3} />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Enrolled: {e.enrolled_at ? format(new Date(e.enrolled_at), "MMM dd, yyyy") : "—"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-medium uppercase">{e.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
