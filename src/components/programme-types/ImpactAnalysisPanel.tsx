import { cn } from "@/lib/utils";
import { AlertTriangle, Users, BookOpen, Layers, Loader2 } from "lucide-react";
import type { ProgrammeType } from "@/hooks/useProgrammeTypes";
import { useImpactCounts } from "@/hooks/useProgrammeTypes";

interface ImpactAnalysisPanelProps {
  type: ProgrammeType;
  hasChanges: boolean;
}

export default function ImpactAnalysisPanel({ type, hasChanges }: ImpactAnalysisPanelProps) {
  const { data: counts, isLoading } = useImpactCounts(
    hasChanges && type.programme_count > 0 ? type.id : undefined
  );

  if (!hasChanges || type.programme_count === 0) return null;

  return (
    <div className="bg-warning/5 rounded-xl border border-warning/20 p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h3 className="text-xs font-semibold text-foreground">Save Impact</h3>
        {isLoading && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Saving will cascade to all dependent entities:
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-lg p-3 border border-border/30 text-center">
          <BookOpen className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{type.programme_count}</p>
          <p className="text-[9px] text-muted-foreground">Programme{type.programme_count !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/30 text-center">
          <Layers className="w-4 h-4 text-info mx-auto mb-1" />
          {isLoading
            ? <div className="h-6 w-8 mx-auto bg-secondary rounded animate-pulse" />
            : <p className="text-lg font-bold text-foreground">{counts?.cohorts ?? "—"}</p>
          }
          <p className="text-[9px] text-muted-foreground">Cohorts</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/30 text-center">
          <Users className="w-4 h-4 text-success mx-auto mb-1" />
          {isLoading
            ? <div className="h-6 w-8 mx-auto bg-secondary rounded animate-pulse" />
            : <p className="text-lg font-bold text-foreground">{counts?.learners ?? "—"}</p>
          }
          <p className="text-[9px] text-muted-foreground">Active Learners</p>
        </div>
      </div>
      <p className="text-[9px] text-warning mt-3 font-medium">
        ⚠ Changes to locked fields will override programme-level customisations.
      </p>
    </div>
  );
}
