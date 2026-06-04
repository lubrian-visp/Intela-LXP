import { Badge } from "@/components/ui/badge";
import ProgressRing from "./ProgressRing";
import { cn } from "@/lib/utils";
import WorkflowStatusBadge from "@/components/workflow/WorkflowStatusBadge";

export interface ProgrammeCardData {
  id: string;
  title: string;
  type: string;
  pathways: number;
  modules: number;
  cohorts: number;
  progress: number;
  status: "active" | "draft" | "archived";
  learners: number;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  draft: "bg-warning/10 text-warning border-warning/20",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function ProgrammeCard({ programme }: { programme: ProgrammeCardData }) {
  return (
    <div className="group bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover border border-border/50 hover:border-accent/30 transition-all duration-300 cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", statusStyles[programme.status])}>
              {programme.status}
            </span>
            <WorkflowStatusBadge entityType="programme" entityId={programme.id} compact />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{programme.type}</span>
          </div>
          <h3 className="text-[13px] font-semibold text-foreground truncate group-hover:text-accent transition-colors">{programme.title}</h3>
        </div>
        <ProgressRing value={programme.progress} size={40} strokeWidth={3} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-1.5 rounded-lg bg-info/5 border border-info/10">
          <p className="text-base font-bold text-foreground">{programme.pathways}</p>
          <p className="text-[10px] text-info">Pathways</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-success/5 border border-success/10">
          <p className="text-base font-bold text-foreground">{programme.modules}</p>
          <p className="text-[10px] text-success">Modules</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-accent/5 border border-accent/10">
          <p className="text-base font-bold text-foreground">{programme.learners}</p>
          <p className="text-[10px] text-accent">Learners</p>
        </div>
      </div>
    </div>
  );
}
