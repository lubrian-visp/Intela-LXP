import { Workflow, CheckCircle2, Clock, XCircle, Pause, Loader2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEntityWorkflowInstance } from "@/hooks/useWorkflowIntegration";

const STATUS_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  active: { label: "Workflow Active", icon: Clock, className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  completed: { label: "Workflow Complete", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  cancelled: { label: "Workflow Cancelled", icon: XCircle, className: "bg-muted text-muted-foreground border-border" },
  failed: { label: "Workflow Failed", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  paused: { label: "Workflow Paused", icon: Pause, className: "bg-amber-500/10 text-amber-600 border-amber-200" },
};

const STEP_STATUS_DOT: Record<string, string> = {
  pending: "bg-muted-foreground/30",
  in_progress: "bg-blue-500 animate-pulse",
  completed: "bg-emerald-500",
  skipped: "bg-muted-foreground/20",
  failed: "bg-destructive",
  timed_out: "bg-amber-500",
};

interface WorkflowStatusBadgeProps {
  entityType: string;
  entityId: string;
  compact?: boolean;
}

export default function WorkflowStatusBadge({ entityType, entityId, compact = false }: WorkflowStatusBadgeProps) {
  const { data: instance, isLoading } = useEntityWorkflowInstance(entityType, entityId);

  if (isLoading) {
    return compact ? null : <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
  }

  if (!instance) return null;

  const config = STATUS_CONFIG[instance.status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  const stepInstances = ((instance as any).workflow_step_instances || []).sort(
    (a: any, b: any) => (a.workflow_steps?.step_order || 0) - (b.workflow_steps?.step_order || 0)
  );
  const currentStep = stepInstances.find((si: any) => si.status === "in_progress");
  const completedCount = stepInstances.filter((si: any) => si.status === "completed").length;
  const totalSteps = stepInstances.length;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-[9px] gap-1 cursor-default ${config.className}`}>
            <Icon className="w-3 h-3" />
            {completedCount}/{totalSteps}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-semibold mb-1">{(instance as any).workflow_templates?.name || "Workflow"}</p>
          <p className="text-[10px] text-muted-foreground">
            {config.label} — Step {completedCount + (instance.status === "active" ? 1 : 0)} of {totalSteps}
          </p>
          {currentStep && (
            <p className="text-[10px] mt-0.5">
              Current: <strong>{currentStep.workflow_steps?.step_name}</strong>
              {currentStep.assigned_role && <span className="text-muted-foreground"> ({currentStep.assigned_role})</span>}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={`text-[10px] gap-1.5 cursor-pointer hover:shadow-sm transition-shadow ${config.className}`}
        >
          <Workflow className="w-3 h-3" />
          {(instance as any).workflow_templates?.name || "Workflow"}
          <span className="text-[9px] opacity-70">{completedCount}/{totalSteps}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{(instance as any).workflow_templates?.name}</p>
            <Badge variant="outline" className={`text-[9px] ${config.className}`}>
              {config.label}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${totalSteps ? (completedCount / totalSteps) * 100 : 0}%` }}
            />
          </div>

          {/* Step list */}
          <div className="space-y-1.5">
            {stepInstances.map((si: any) => (
              <div key={si.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STEP_STATUS_DOT[si.status] || STEP_STATUS_DOT.pending}`} />
                <span className={`text-[10px] flex-1 ${si.status === "in_progress" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {si.workflow_steps?.step_name || "Step"}
                </span>
                {si.assigned_role && (
                  <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">{si.assigned_role}</span>
                )}
                {si.outcome && (
                  <span className={`text-[9px] px-1 rounded ${
                    si.outcome === "approved" ? "bg-emerald-500/10 text-emerald-600" :
                    si.outcome === "rejected" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {si.outcome}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Timestamps */}
          <div className="border-t border-border/50 pt-2 text-[10px] text-muted-foreground space-y-0.5">
            <p>Started: {new Date(instance.started_at).toLocaleString()}</p>
            {instance.completed_at && <p>Completed: {new Date(instance.completed_at).toLocaleString()}</p>}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
