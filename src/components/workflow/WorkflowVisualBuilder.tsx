import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { CheckCircle2, Bell, Zap, GitBranch, ClipboardList, Plus, Trash2, ArrowRight, GripVertical, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  useWorkflowSteps, useCreateWorkflowStep, useUpdateWorkflowStep, useDeleteWorkflowStep,
  type StepType, type WorkflowStepConfig,
} from "@/hooks/useWorkflowEngine";

const STEP_TYPE_META: Record<string, { label: string; icon: any; bg: string; border: string; text: string }> = {
  approval:    { label: "Approval",    icon: CheckCircle2, bg: "bg-emerald-50",  border: "border-emerald-300", text: "text-emerald-700" },
  notification:{ label: "Notification",icon: Bell,         bg: "bg-blue-50",     border: "border-blue-300",    text: "text-blue-700"    },
  auto_action: { label: "Auto Action", icon: Zap,          bg: "bg-amber-50",    border: "border-amber-300",   text: "text-amber-700"   },
  condition:   { label: "Condition",   icon: GitBranch,    bg: "bg-violet-50",   border: "border-violet-300",  text: "text-violet-700"  },
  manual_task: { label: "Manual Task", icon: ClipboardList,bg: "bg-rose-50",     border: "border-rose-300",    text: "text-rose-700"    },
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const GAP_X = 60;
const GAP_Y = 40;
const START_X = 40;
const START_Y = 40;

interface VisualNode {
  id: string;
  stepId: string;
  stepName: string;
  stepType: string;
  stepOrder: number;
  config: WorkflowStepConfig;
  isRequired: boolean;
  x: number;
  y: number;
  nextApprove?: string;
  nextReject?: string;
}

interface WorkflowVisualBuilderProps {
  templateId: string;
  steps: any[];
  onStepsChange: () => void;
}

export default function WorkflowVisualBuilder({ templateId, steps, onStepsChange }: WorkflowVisualBuilderProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<{ from: string; type: "approve" | "reject" } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const createStep = useCreateWorkflowStep();
  const updateStep = useUpdateWorkflowStep();
  const deleteStep = useDeleteWorkflowStep();

  const [newStep, setNewStep] = useState({ step_name: "", step_type: "approval" as StepType, config: {} as WorkflowStepConfig, is_required: true });

  // Layout nodes in a flow
  const nodes: VisualNode[] = useMemo(() => {
    if (!steps?.length) return [];
    
    // Simple sequential layout with branch offsets
    const result: VisualNode[] = [];
    const branchMap = new Map<string, { x: number; y: number }>();
    
    steps.forEach((s: any, i: number) => {
      const branchPos = branchMap.get(s.id);
      const x = branchPos?.x ?? START_X + i * (NODE_WIDTH + GAP_X);
      const y = branchPos?.y ?? START_Y;

      result.push({
        id: `node-${s.id}`,
        stepId: s.id,
        stepName: s.step_name,
        stepType: s.step_type,
        stepOrder: s.step_order,
        config: s.config as WorkflowStepConfig,
        isRequired: s.is_required,
        x, y,
        nextApprove: s.next_step_on_approve || undefined,
        nextReject: s.next_step_on_reject || undefined,
      });

      // If this is a condition node with branches, offset the reject branch
      if (s.step_type === "condition" && s.next_step_on_reject) {
        const rejectTarget = steps.find((t: any) => t.id === s.next_step_on_reject);
        if (rejectTarget) {
          branchMap.set(s.next_step_on_reject, { x: x, y: y + NODE_HEIGHT + GAP_Y + 30 });
        }
      }
    });

    return result;
  }, [steps]);

  const selectedStep = nodes.find(n => n.id === selectedNode);

  // Draw connections as SVG paths
  const connections = useMemo(() => {
    const conns: { from: VisualNode; to: VisualNode; type: "approve" | "reject" | "sequential" }[] = [];
    
    nodes.forEach((node, i) => {
      if (node.nextApprove) {
        const target = nodes.find(n => n.stepId === node.nextApprove);
        if (target) conns.push({ from: node, to: target, type: "approve" });
      }
      if (node.nextReject) {
        const target = nodes.find(n => n.stepId === node.nextReject);
        if (target) conns.push({ from: node, to: target, type: "reject" });
      }
      // Sequential connection if no explicit branches
      if (!node.nextApprove && !node.nextReject && i < nodes.length - 1) {
        conns.push({ from: node, to: nodes[i + 1], type: "sequential" });
      }
    });

    return conns;
  }, [nodes]);

  const canvasWidth = Math.max(800, nodes.length * (NODE_WIDTH + GAP_X) + 100);
  const canvasHeight = Math.max(300, Math.max(...nodes.map(n => n.y + NODE_HEIGHT + 60), 300));

  const handleAddStep = async () => {
    try {
      await createStep.mutateAsync({
        template_id: templateId,
        step_name: newStep.step_name,
        step_type: newStep.step_type,
        step_order: (steps?.length || 0) + 1,
        config: newStep.config,
        is_required: newStep.is_required,
      });
      toast({ title: "Step added to canvas" });
      setAddOpen(false);
      setNewStep({ step_name: "", step_type: "approval", config: {}, is_required: true });
      onStepsChange();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteNode = async (stepId: string) => {
    try {
      await deleteStep.mutateAsync({ id: stepId, templateId });
      setSelectedNode(null);
      toast({ title: "Step removed" });
      onStepsChange();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleConnect = async (fromStepId: string, toStepId: string, type: "approve" | "reject") => {
    try {
      const update: any = { id: fromStepId };
      if (type === "approve") update.next_step_on_approve = toStepId;
      else update.next_step_on_reject = toStepId;
      await updateStep.mutateAsync(update);
      toast({ title: `${type === "approve" ? "Approve" : "Reject"} branch connected` });
      setConnectMode(null);
      onStepsChange();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleNodeClick = (nodeId: string, stepId: string) => {
    if (connectMode) {
      handleConnect(connectMode.from, stepId, connectMode.type);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const handleUpdateConfig = async (stepId: string, updates: Partial<WorkflowStepConfig>) => {
    const step = steps.find((s: any) => s.id === stepId);
    if (!step) return;
    try {
      const newConfig = { ...(step.config as WorkflowStepConfig), ...updates };
      await updateStep.mutateAsync({ id: stepId, config: newConfig });
      toast({ title: "Step updated" });
      onStepsChange();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Approval
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Notification
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Auto Action
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Condition
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Manual Task
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {connectMode && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              Click a node to connect ({connectMode.type}) — <button className="underline ml-1" onClick={() => setConnectMode(null)}>Cancel</button>
            </Badge>
          )}
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="w-3 h-3" /> Add Node
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border border-border rounded-xl bg-muted/20 overflow-auto" style={{ minHeight: canvasHeight }} ref={canvasRef}>
        {/* SVG Connections */}
        <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight} style={{ zIndex: 0 }}>
          <defs>
            <marker id="arrowhead-seq" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--muted-foreground))" opacity="0.5" />
            </marker>
            <marker id="arrowhead-approve" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
            </marker>
            <marker id="arrowhead-reject" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
          {connections.map((conn, i) => {
            const fromX = conn.from.x + NODE_WIDTH;
            const fromY = conn.from.y + NODE_HEIGHT / 2;
            const toX = conn.to.x;
            const toY = conn.to.y + NODE_HEIGHT / 2;
            const midX = (fromX + toX) / 2;

            const color = conn.type === "approve" ? "#10b981" : conn.type === "reject" ? "#ef4444" : "hsl(var(--muted-foreground))";
            const opacity = conn.type === "sequential" ? 0.4 : 0.7;
            const marker = `url(#arrowhead-${conn.type === "sequential" ? "seq" : conn.type})`;
            const strokeWidth = conn.type === "sequential" ? 1.5 : 2;
            const dashArray = conn.type === "reject" ? "6,4" : undefined;

            return (
              <g key={i}>
                <path
                  d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  markerEnd={marker}
                  strokeDasharray={dashArray}
                />
                {conn.type !== "sequential" && (
                  <text x={midX} y={(fromY + toY) / 2 - 6} textAnchor="middle" className="text-[9px] fill-muted-foreground">
                    {conn.type === "approve" ? "✓ Yes" : "✗ No"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Start marker */}
        {nodes.length > 0 && (
          <div
            className="absolute flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600"
            style={{ left: START_X - 8, top: nodes[0].y + NODE_HEIGHT / 2 - 8 }}
          >
            <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-300" />
          </div>
        )}

        {/* Nodes */}
        {nodes.map((node) => {
          const meta = STEP_TYPE_META[node.stepType] || STEP_TYPE_META.manual_task;
          const Icon = meta.icon;
          const isSelected = selectedNode === node.id;
          const isConnectTarget = connectMode && connectMode.from !== node.stepId;

          return (
            <div
              key={node.id}
              className={`absolute rounded-lg border-2 shadow-sm transition-all cursor-pointer select-none ${meta.bg} ${
                isSelected ? `${meta.border} shadow-md ring-2 ring-accent/30` : "border-border/60"
              } ${isConnectTarget ? "ring-2 ring-accent animate-pulse" : ""}`}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, zIndex: 1 }}
              onClick={() => handleNodeClick(node.id, node.stepId)}
            >
              <div className="p-2.5 h-full flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
                  <span className={`text-[11px] font-semibold truncate ${meta.text}`}>{node.stepName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[8px] px-1 ${meta.text} border-current/20`}>{meta.label}</Badge>
                  <div className="flex items-center gap-1">
                    {node.config.assignee_role && (
                      <span className="text-[8px] text-muted-foreground bg-background/80 px-1 rounded">{node.config.assignee_role}</span>
                    )}
                    {node.config.timeout_hours && (
                      <span className="text-[8px] text-muted-foreground">⏱{node.config.timeout_hours}h</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {!nodes.length && (
          <div className="flex items-center justify-center h-full min-h-[250px] text-muted-foreground">
            <div className="text-center">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Add nodes to build your workflow visually</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected node actions */}
      {selectedStep && (
        <Card className="p-3 border-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">{selectedStep.stepName}</p>
              <p className="text-[10px] text-muted-foreground">{STEP_TYPE_META[selectedStep.stepType]?.label} — Step #{selectedStep.stepOrder}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {(selectedStep.stepType === "condition" || selectedStep.stepType === "approval") && (
                <>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 text-emerald-600" onClick={() => setConnectMode({ from: selectedStep.stepId, type: "approve" })}>
                    <ArrowRight className="w-3 h-3" /> Approve →
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 text-destructive" onClick={() => setConnectMode({ from: selectedStep.stepId, type: "reject" })}>
                    <ArrowRight className="w-3 h-3" /> Reject →
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => setConfigOpen(true)}>
                <Settings2 className="w-3 h-3" /> Configure
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteNode(selectedStep.stepId)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Add Node Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Add Workflow Node</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Node Name</Label>
              <Input value={newStep.step_name} onChange={e => setNewStep(f => ({ ...f, step_name: e.target.value }))} placeholder="e.g. Manager Review" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(STEP_TYPE_META).map(([k, v]) => {
                  const StepIcon = v.icon;
                  return (
                    <button
                      key={k}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                        newStep.step_type === k ? `${v.border} ${v.bg} shadow-sm` : "border-border hover:border-accent/30"
                      }`}
                      onClick={() => setNewStep(f => ({ ...f, step_type: k as StepType }))}
                    >
                      <StepIcon className={`w-4 h-4 ${v.text}`} />
                      <span className="text-[9px] font-medium">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assignee Role</Label>
              <Select value={newStep.config.assignee_role || ""} onValueChange={v => setNewStep(f => ({ ...f, config: { ...f.config, assignee_role: v } }))}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations Control</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="programme_manager">Programme Manager</SelectItem>
                  <SelectItem value="facilitator">Facilitator</SelectItem>
                  <SelectItem value="assessor">Assessor</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddStep} disabled={!newStep.step_name || createStep.isPending}>Add Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Configure Node Dialog ── */}
      {selectedStep && (
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="text-base">Configure: {selectedStep.stepName}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {(selectedStep.stepType === "auto_action") && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Action</Label>
                    <Select
                      value={selectedStep.config.action || ""}
                      onValueChange={v => handleUpdateConfig(selectedStep.stepId, { action: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update_status">Update Entity Status</SelectItem>
                        <SelectItem value="send_notification">Send Notification</SelectItem>
                        <SelectItem value="assign_cohort">Assign to Cohort</SelectItem>
                        <SelectItem value="generate_credential">Generate Credential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedStep.config.action === "update_status" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Target Status</Label>
                      <Input
                        defaultValue={selectedStep.config.target_status || ""}
                        onBlur={e => handleUpdateConfig(selectedStep.stepId, { target_status: e.target.value })}
                        placeholder="e.g. approved, enrolled"
                      />
                    </div>
                  )}
                  {selectedStep.config.action === "send_notification" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Notification Message</Label>
                      <Input
                        defaultValue={selectedStep.config.notification_template || ""}
                        onBlur={e => handleUpdateConfig(selectedStep.stepId, { notification_template: e.target.value })}
                        placeholder="e.g. Your registration has been approved"
                      />
                    </div>
                  )}
                </>
              )}

              {selectedStep.stepType === "condition" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Condition Field</Label>
                    <Input
                      defaultValue={selectedStep.config.condition_field || ""}
                      onBlur={e => handleUpdateConfig(selectedStep.stepId, { condition_field: e.target.value })}
                      placeholder="e.g. status, score, education_level"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Operator</Label>
                      <Select
                        value={selectedStep.config.condition_operator || ""}
                        onValueChange={v => handleUpdateConfig(selectedStep.stepId, { condition_operator: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Value</Label>
                      <Input
                        defaultValue={selectedStep.config.condition_value || ""}
                        onBlur={e => handleUpdateConfig(selectedStep.stepId, { condition_value: e.target.value })}
                        placeholder="e.g. approved, 50"
                      />
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-violet-50 border border-violet-200">
                    <p className="text-[10px] text-violet-700">
                      <strong>Branching:</strong> Use the "Approve →" and "Reject →" buttons to connect this condition to different paths based on the evaluation result.
                    </p>
                  </div>
                </div>
              )}

              {(selectedStep.stepType === "approval" || selectedStep.stepType === "manual_task") && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Assignee Role</Label>
                    <Select
                      value={selectedStep.config.assignee_role || ""}
                      onValueChange={v => handleUpdateConfig(selectedStep.stepId, { assignee_role: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operations">Operations Control</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="programme_manager">Programme Manager</SelectItem>
                        <SelectItem value="facilitator">Facilitator</SelectItem>
                        <SelectItem value="assessor">Assessor</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedStep.stepType === "notification" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Notification Message</Label>
                  <Input
                    defaultValue={selectedStep.config.notification_template || ""}
                    onBlur={e => handleUpdateConfig(selectedStep.stepId, { notification_template: e.target.value })}
                    placeholder="Notification text..."
                  />
                </div>
              )}

              {/* Common config */}
              <div className="border-t border-border/50 pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Timeout (hours)</Label>
                    <Input
                      type="number"
                      defaultValue={selectedStep.config.timeout_hours || ""}
                      onBlur={e => handleUpdateConfig(selectedStep.stepId, { timeout_hours: Number(e.target.value) || undefined })}
                      placeholder="e.g. 48"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">On Timeout</Label>
                    <Select
                      value={selectedStep.config.on_timeout_action || ""}
                      onValueChange={v => handleUpdateConfig(selectedStep.stepId, { on_timeout_action: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Action..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="escalate">Escalate</SelectItem>
                        <SelectItem value="skip">Skip Step</SelectItem>
                        <SelectItem value="fail">Fail Workflow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedStep.config.required_reason || false}
                    onCheckedChange={v => handleUpdateConfig(selectedStep.stepId, { required_reason: v })}
                  />
                  <Label className="text-xs">Require reason for completion</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" onClick={() => setConfigOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
