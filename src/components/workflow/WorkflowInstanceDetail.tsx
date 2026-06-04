import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight, AlertTriangle, User, Shield, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useWorkflowStepInstances, useWorkflowAuditLog, useCompleteWorkflowStep, useCanActOnStep } from "@/hooks/useWorkflowEngine";
import { useAuth } from "@/hooks/useAuth";

const STATUS_ICON: Record<string, any> = {
  completed: CheckCircle2,
  in_progress: Clock,
  pending: ArrowRight,
  failed: XCircle,
  skipped: ArrowRight,
};

const STATUS_CLASS: Record<string, string> = {
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  in_progress: "text-blue-600 bg-blue-50 border-blue-200 animate-pulse",
  pending: "text-muted-foreground bg-muted/50 border-border",
  failed: "text-destructive bg-destructive/10 border-destructive/20",
  skipped: "text-amber-600 bg-amber-50 border-amber-200",
};

interface Props {
  instanceId: string;
  instance: any;
  onClose: () => void;
}

export default function WorkflowInstanceDetail({ instanceId, instance, onClose }: Props) {
  const { data: stepInstances, isLoading } = useWorkflowStepInstances(instanceId);
  const { data: auditLog } = useWorkflowAuditLog(instanceId);
  const completeStep = useCompleteWorkflowStep();
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleAction = async (stepInstanceId: string, outcome: "approved" | "rejected") => {
    try {
      await completeStep.mutateAsync({ stepInstanceId, outcome, reason: reason || undefined });
      toast({ title: outcome === "approved" ? "Step approved" : "Step rejected" });
      setActionOpen(null);
      setReason("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {(instance as any)?.workflow_templates?.name || "Workflow Instance"}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Entity: {instance.entity_type} • ID: {instance.entity_id?.slice(0, 8)}… •
            Started: {new Date(instance.started_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={STATUS_CLASS[instance.status] || ""}>
            {instance.status}
          </Badge>
          <Button size="sm" variant="ghost" className="text-xs" onClick={onClose}>← Back</Button>
        </div>
      </div>

      {/* Step Timeline */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold mb-3">Step Timeline</h4>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <div className="space-y-0">
            {stepInstances?.map((si: any, i: number) => {
              const ws = si.workflow_steps as any;
              const Icon = STATUS_ICON[si.status] || Clock;
              const cls = STATUS_CLASS[si.status] || "";
              const isActive = si.status === "in_progress";
              const isHumanStep = ws?.step_type === "approval" || ws?.step_type === "manual_task";

              return (
                <div key={si.id} className="flex gap-3">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${cls}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {i < (stepInstances?.length || 0) - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[24px] ${si.status === "completed" ? "bg-emerald-300" : "bg-border"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{ws?.step_name || "Step"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[8px]">{ws?.step_type}</Badge>
                          {si.assigned_role && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> {si.assigned_role}
                            </span>
                          )}
                          {si.outcome && (
                            <Badge variant={si.outcome === "approved" ? "default" : si.outcome === "rejected" ? "destructive" : "secondary"} className="text-[8px]">
                              {si.outcome}
                            </Badge>
                          )}
                          {si.completed_by && si.outcome && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <User className="w-2.5 h-2.5" /> {si.completed_by?.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {si.started_at && (
                          <p className="text-[9px] text-muted-foreground">Started: {new Date(si.started_at).toLocaleString()}</p>
                        )}
                        {si.completed_at && (
                          <p className="text-[9px] text-muted-foreground">Done: {new Date(si.completed_at).toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for active human steps */}
                    {isActive && isHumanStep && (
                      <div className="mt-2">
                        <div className="flex gap-2 items-center">
                          <Button size="sm" className="text-[10px] h-7 gap-1" onClick={() => setActionOpen(si.id)}>
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="text-[10px] h-7 gap-1" onClick={() => setActionOpen(si.id)}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          Authorization checked via role, direct assignment, or delegated authority.
                        </p>
                      </div>
                    )}

                    {si.reason && (
                      <p className="text-[10px] text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded">
                        <FileText className="w-2.5 h-2.5 inline mr-1" />
                        {si.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Audit Log */}
      <Card className="p-4">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-accent" /> Audit Trail
        </h4>
        {auditLog?.length ? (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {auditLog.map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-foreground">{entry.action.replace(/_/g, " ")}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">No audit entries yet.</p>
        )}
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionOpen} onOpenChange={() => { setActionOpen(null); setReason(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Complete Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason / Notes (optional)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Add notes for the audit trail..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => actionOpen && handleAction(actionOpen, "approved")} disabled={completeStep.isPending}>
              {completeStep.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => actionOpen && handleAction(actionOpen, "rejected")} disabled={completeStep.isPending}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
