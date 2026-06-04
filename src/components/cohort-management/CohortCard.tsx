import { Calendar, Users, UserCheck, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CohortCardProps {
  cohort: any;
  learnersCount: number;
  onOpenDashboard: () => void;
  onAssignLearners: () => void;
  onAssignStaff: () => void;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success border-success/40",
  planned: "bg-info/15 text-info border-info/40",
  completed: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/15 text-destructive border-destructive/40",
};

export default function CohortCard({ cohort, learnersCount, onOpenDashboard, onAssignLearners, onAssignStaff }: CohortCardProps) {
  const programmeName = cohort.programmes?.title ?? "Unlinked Programme";
  const duration = cohort.start_date && cohort.end_date
    ? `${format(new Date(cohort.start_date), "MMM yyyy")} - ${format(new Date(cohort.end_date), "MMM yyyy")}`
    : "Dates not set";

  return (
    <div
      onClick={onOpenDashboard}
      className="bg-card rounded-xl border border-border/50 shadow-card hover:shadow-card-hover hover:border-accent/40 transition-all duration-200 cursor-pointer"
    >
      <div className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground">{cohort.code ?? cohort.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              📘 {programmeName}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
        </div>

        {/* Status badge */}
        <div>
          <Badge className={cn("text-[11px] capitalize border font-medium px-2.5 py-0.5", statusStyles[cohort.status] ?? statusStyles.planned)}>
            {cohort.status}
          </Badge>
        </div>

        {/* Info rows */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Learners</span>
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              {learnersCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Facilitator</span>
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
              {cohort.facilitator_id ? "Assigned" : "Not Assigned"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Duration</span>
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {duration}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
