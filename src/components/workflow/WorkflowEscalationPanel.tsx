import { AlertTriangle, Clock, Shield, Zap, SkipForward, XCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useOverdueSteps, useEscalateStep } from "@/hooks/useWorkflowSLA";

export default function WorkflowEscalationPanel() {
  const { data: overdueSteps, isLoading } = useOverdueSteps();
  const escalateStep = useEscalateStep();

  const handleAction = async (stepInstanceId: string, action: "escalate" | "skip" | "fail") => {
    try {
      await escalateStep.mutateAsync({ stepInstanceId, action });
      toast({ title: `Step ${action === "escalate" ? "escalated" : action === "skip" ? "skipped" : "failed"}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          SLA Breaches & Escalations
        </h3>
        <Badge variant={overdueSteps?.length ? "destructive" : "secondary"} className="text-[10px]">
          {overdueSteps?.length || 0} overdue
        </Badge>
      </div>

      {!overdueSteps?.length ? (
        <Card className="p-8 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">All workflow steps are within SLA.</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Steps with configured timeouts will appear here when breached.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {overdueSteps.map((step) => (
            <Card key={step.stepInstanceId} className="p-4 border-amber-200 bg-amber-50/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">{step.stepName}</span>
                    <Badge variant="destructive" className="text-[8px]">
                      {step.hoursElapsed}h / {step.timeoutHours}h SLA
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Workflow: {step.templateName} • Entity: {step.entityType}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {step.assignedRole && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> {step.assignedRole}
                      </span>
                    )}
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> Started: {new Date(step.startedAt).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-[8px]">
                      Default: {step.onTimeoutAction}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 gap-1"
                    onClick={() => handleAction(step.stepInstanceId, "escalate")}
                    disabled={escalateStep.isPending}
                  >
                    <ArrowUpCircle className="w-3 h-3" /> Escalate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 gap-1"
                    onClick={() => handleAction(step.stepInstanceId, "skip")}
                    disabled={escalateStep.isPending}
                  >
                    <SkipForward className="w-3 h-3" /> Skip
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[10px] h-7 gap-1 text-destructive"
                    onClick={() => handleAction(step.stepInstanceId, "fail")}
                    disabled={escalateStep.isPending}
                  >
                    <XCircle className="w-3 h-3" /> Fail
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
