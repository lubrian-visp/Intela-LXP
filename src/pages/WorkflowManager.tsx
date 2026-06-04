import { useState } from "react";
import { Loader2, Plus, Workflow, Play, Trash2, Edit2, ChevronRight, CheckCircle2, XCircle, Clock, Zap, Shield, Bell, GitBranch, ClipboardList, List, LayoutGrid, BarChart3, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  useWorkflowTemplates, useCreateWorkflowTemplate, useUpdateWorkflowTemplate,
  useDeleteWorkflowTemplate, useWorkflowSteps, useCreateWorkflowStep,
  useUpdateWorkflowStep, useDeleteWorkflowStep, useWorkflowInstances,
  type EntityType, type StepType, type WorkflowStepConfig,
} from "@/hooks/useWorkflowEngine";
import WorkflowVisualBuilder from "@/components/workflow/WorkflowVisualBuilder";
import WorkflowAnalyticsDashboard from "@/components/workflow/WorkflowAnalyticsDashboard";
import WorkflowEscalationPanel from "@/components/workflow/WorkflowEscalationPanel";
import WorkflowInstanceDetail from "@/components/workflow/WorkflowInstanceDetail";

const ENTITY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  learner_registration: { label: "Learner Registration", icon: ClipboardList, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  programme: { label: "Programme", icon: GitBranch, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  assessment_submission: { label: "Assessment", icon: CheckCircle2, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  staff_registration: { label: "Staff Onboarding", icon: Shield, color: "bg-violet-500/10 text-violet-600 border-violet-200" },
};

const STEP_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  approval: { label: "Approval", icon: CheckCircle2, color: "text-emerald-600" },
  notification: { label: "Notification", icon: Bell, color: "text-blue-500" },
  auto_action: { label: "Auto Action", icon: Zap, color: "text-amber-500" },
  condition: { label: "Condition", icon: GitBranch, color: "text-violet-500" },
  manual_task: { label: "Manual Task", icon: ClipboardList, color: "text-rose-500" },
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  completed: "bg-blue-500/10 text-blue-600 border-blue-200",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  paused: "bg-amber-500/10 text-amber-600 border-amber-200",
};

export default function WorkflowManager() {
  const [tab, setTab] = useState("templates");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [viewingInstance, setViewingInstance] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "", entity_type: "learner_registration", trigger_event: "on_create", scope_type: "global" });

  const { data: templates, isLoading } = useWorkflowTemplates();
  const { data: instances, isLoading: instLoading } = useWorkflowInstances();
  const createTemplate = useCreateWorkflowTemplate();
  const updateTemplate = useUpdateWorkflowTemplate();
  const deleteTemplate = useDeleteWorkflowTemplate();

  const handleCreate = async () => {
    try {
      await createTemplate.mutateAsync(form);
      toast({ title: "Workflow created", description: `"${form.name}" template created successfully.` });
      setCreateOpen(false);
      setForm({ name: "", description: "", entity_type: "learner_registration", trigger_event: "on_create", scope_type: "global" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"? This will also remove all steps.`)) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: "Deleted", description: `"${name}" removed.` });
      if (editingTemplate === id) setEditingTemplate(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Workflow className="w-5 h-5 text-accent" />
            Workflow Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Design, manage, and monitor platform-wide approval and automation workflows.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New Workflow
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="templates" className="text-xs">Templates ({templates?.length || 0})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
          <TabsTrigger value="escalations" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />SLA</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />Analytics</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
        </TabsList>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          {editingTemplate ? (
            <StepEditor
              templateId={editingTemplate}
              template={templates?.find(t => t.id === editingTemplate)}
              onBack={() => setEditingTemplate(null)}
              onUpdate={updateTemplate}
            />
          ) : (
            <>
              {!templates?.length && (
                <Card className="p-8 text-center">
                  <Workflow className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No workflow templates yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first workflow to automate approvals, notifications, and lifecycle transitions.</p>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates?.map((t) => {
                  const entity = ENTITY_LABELS[t.entity_type] || { label: t.entity_type, icon: Workflow, color: "bg-muted text-muted-foreground" };
                  const Icon = entity.icon;
                  return (
                    <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-foreground truncate">{t.name}</h3>
                            {t.is_default && <Badge variant="secondary" className="text-[9px] px-1.5">Default</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{t.description || "No description"}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-[9px] ${entity.color}`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {entity.label}
                            </Badge>
                            <Badge variant="outline" className="text-[9px]">
                              {t.trigger_event === "on_create" ? "On Create" : t.trigger_event === "on_status_change" ? "On Status Change" : "Manual"}
                            </Badge>
                            <Badge variant="outline" className="text-[9px]">
                              {t.scope_type}
                            </Badge>
                            {!t.is_active && <Badge variant="destructive" className="text-[9px]">Inactive</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTemplate(t.id)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id, t.name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Active Instances Tab ── */}
        <TabsContent value="active" className="space-y-3 mt-4">
          {viewingInstance ? (
            <WorkflowInstanceDetail
              instanceId={viewingInstance.id}
              instance={viewingInstance}
              onClose={() => setViewingInstance(null)}
            />
          ) : (
            <>
              {instLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
              ) : (
                <>
                  {!instances?.filter(i => i.status === "active").length && (
                    <Card className="p-8 text-center">
                      <Play className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No active workflow instances.</p>
                    </Card>
                  )}
                  {instances?.filter(i => i.status === "active").map((inst) => (
                    <Card key={inst.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingInstance(inst)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{(inst as any).workflow_templates?.name || "Workflow"}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Entity: {inst.entity_type} • Started: {new Date(inst.started_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1">
                            <Eye className="w-3 h-3" /> View
                          </Button>
                          <Badge variant="outline" className={STATUS_BADGE[inst.status] || ""}>
                            {inst.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* ── SLA & Escalations Tab ── */}
        <TabsContent value="escalations" className="mt-4">
          <WorkflowEscalationPanel />
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" className="mt-4">
          <WorkflowAnalyticsDashboard />
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-3 mt-4">
          {instLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
          ) : (
            <>
              {!instances?.filter(i => i.status !== "active").length && (
                <Card className="p-8 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No completed workflows yet.</p>
                </Card>
              )}
              {instances?.filter(i => i.status !== "active").map((inst) => (
                <Card key={inst.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setViewingInstance(inst); setTab("active"); }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{(inst as any).workflow_templates?.name || "Workflow"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Entity: {inst.entity_type} • Completed: {inst.completed_at ? new Date(inst.completed_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1">
                        <Eye className="w-3 h-3" /> View
                      </Button>
                      <Badge variant="outline" className={STATUS_BADGE[inst.status] || ""}>
                        {inst.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create Template Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Create Workflow Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Workflow Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Learner Approval Pipeline" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the workflow purpose and steps..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Entity Type</Label>
                <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Trigger Event</Label>
                <Select value={form.trigger_event} onValueChange={v => setForm(f => ({ ...f, trigger_event: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_create">On Create</SelectItem>
                    <SelectItem value="on_status_change">On Status Change</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Scope</Label>
              <Select value={form.scope_type} onValueChange={v => setForm(f => ({ ...f, scope_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all entities)</SelectItem>
                  <SelectItem value="programme">Programme-specific</SelectItem>
                  <SelectItem value="cohort">Cohort-specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.name || createTemplate.isPending}>
              {createTemplate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Step Editor Component
// ═══════════════════════════════════════════════════════════════

function StepEditor({ templateId, template, onBack, onUpdate }: {
  templateId: string;
  template: any;
  onBack: () => void;
  onUpdate: any;
}) {
  const { data: steps, isLoading, refetch } = useWorkflowSteps(templateId);
  const createStep = useCreateWorkflowStep();
  const updateStep = useUpdateWorkflowStep();
  const deleteStep = useDeleteWorkflowStep();
  const [addOpen, setAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "visual">("visual");
  const [stepForm, setStepForm] = useState({
    step_name: "",
    step_type: "approval" as StepType,
    config: {} as WorkflowStepConfig,
    is_required: true,
  });

  const handleAddStep = async () => {
    try {
      await createStep.mutateAsync({
        template_id: templateId,
        step_name: stepForm.step_name,
        step_type: stepForm.step_type,
        step_order: (steps?.length || 0) + 1,
        config: stepForm.config,
        is_required: stepForm.is_required,
      });
      toast({ title: "Step added" });
      setAddOpen(false);
      setStepForm({ step_name: "", step_type: "approval", config: {}, is_required: true });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteStep = async (id: string) => {
    try {
      await deleteStep.mutateAsync({ id, templateId });
      toast({ title: "Step removed" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async () => {
    try {
      await onUpdate.mutateAsync({ id: templateId, is_active: !template.is_active });
      toast({ title: template.is_active ? "Workflow deactivated" : "Workflow activated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleDefault = async () => {
    try {
      await onUpdate.mutateAsync({ id: templateId, is_default: !template.is_default });
      toast({ title: template.is_default ? "Removed as default" : "Set as default" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs gap-1">
          ← Back to Templates
        </Button>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{template?.name}</span>
      </div>

      {/* Template Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{template?.name}</h3>
            <p className="text-[11px] text-muted-foreground">{template?.description || "No description"}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Active</span>
              <Switch checked={template?.is_active} onCheckedChange={handleToggleActive} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Default</span>
              <Switch checked={template?.is_default} onCheckedChange={handleToggleDefault} />
            </div>
          </div>
        </div>
      </Card>

      {/* Steps Header with View Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">Workflow Steps ({steps?.length || 0})</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${viewMode === "visual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setViewMode("visual")}
            >
              <LayoutGrid className="w-3 h-3 inline mr-1" />Visual
            </button>
            <button
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-3 h-3 inline mr-1" />List
            </button>
          </div>
          {viewMode === "list" && (
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="w-3 h-3" /> Add Step
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : viewMode === "visual" ? (
        /* ── Visual Builder ── */
        <WorkflowVisualBuilder templateId={templateId} steps={steps || []} onStepsChange={() => refetch()} />
      ) : (
        /* ── List View ── */
        <div className="space-y-2">
          {!steps?.length && (
            <Card className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No steps defined yet. Add your first step to build the workflow pipeline.</p>
            </Card>
          )}
          {steps?.map((step, idx) => {
            const meta = STEP_TYPE_META[step.step_type] || STEP_TYPE_META.manual_task;
            const StepIcon = meta.icon;
            const config = step.config as WorkflowStepConfig;
            return (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${meta.color} border-current`}>
                    {idx + 1}
                  </div>
                  {idx < (steps?.length || 0) - 1 && <div className="w-0.5 h-6 bg-border" />}
                </div>
                <Card className="flex-1 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StepIcon className={`w-4 h-4 ${meta.color}`} />
                      <span className="text-sm font-semibold">{step.step_name}</span>
                      <Badge variant="outline" className="text-[9px]">{meta.label}</Badge>
                      {!step.is_required && <Badge variant="secondary" className="text-[9px]">Optional</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteStep(step.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {config.assignee_role && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Role: {config.assignee_role}</span>}
                    {config.action && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Action: {config.action}</span>}
                    {config.timeout_hours && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Timeout: {config.timeout_hours}h</span>}
                    {config.required_reason && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Reason required</span>}
                    {config.condition_field && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">If: {config.condition_field} {config.condition_operator} {config.condition_value}</span>}
                    {config.target_status && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">→ {config.target_status}</span>}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Info panel */}
      <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
        <p className="text-xs font-medium text-accent mb-1">How workflow steps work:</p>
        <ul className="space-y-0.5 text-[10px] text-muted-foreground">
          <li>• <strong>Approval:</strong> Requires a designated user/role to approve or reject before advancing</li>
          <li>• <strong>Notification:</strong> Automatically sends a notification then advances to the next step</li>
          <li>• <strong>Auto Action:</strong> Performs an action (status update, cohort assignment) without human intervention</li>
          <li>• <strong>Condition:</strong> Evaluates a field condition and branches the workflow accordingly</li>
          <li>• <strong>Manual Task:</strong> Assigns a task to a user/role that must be marked complete manually</li>
        </ul>
      </div>

      {/* ── Add Step Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Add Workflow Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Step Name</Label>
              <Input value={stepForm.step_name} onChange={e => setStepForm(f => ({ ...f, step_name: e.target.value }))} placeholder="e.g. Manager Approval" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Step Type</Label>
                <Select value={stepForm.step_type} onValueChange={v => setStepForm(f => ({ ...f, step_type: v as StepType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STEP_TYPE_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assignee Role</Label>
                <Select
                  value={stepForm.config.assignee_role || ""}
                  onValueChange={v => setStepForm(f => ({ ...f, config: { ...f.config, assignee_role: v } }))}
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
            </div>

            {(stepForm.step_type === "auto_action") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Action</Label>
                <Select
                  value={stepForm.config.action || ""}
                  onValueChange={v => setStepForm(f => ({ ...f, config: { ...f.config, action: v } }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update_status">Update Status</SelectItem>
                    <SelectItem value="send_notification">Send Notification</SelectItem>
                    <SelectItem value="assign_cohort">Assign to Cohort</SelectItem>
                    <SelectItem value="generate_credential">Generate Credential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(stepForm.step_type === "auto_action" && stepForm.config.action === "update_status") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Status</Label>
                <Input
                  value={stepForm.config.target_status || ""}
                  onChange={e => setStepForm(f => ({ ...f, config: { ...f.config, target_status: e.target.value } }))}
                  placeholder="e.g. approved, enrolled"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Timeout (hours)</Label>
                <Input
                  type="number"
                  value={stepForm.config.timeout_hours || ""}
                  onChange={e => setStepForm(f => ({ ...f, config: { ...f.config, timeout_hours: Number(e.target.value) || undefined } }))}
                  placeholder="e.g. 48"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={stepForm.config.required_reason || false}
                    onCheckedChange={v => setStepForm(f => ({ ...f, config: { ...f.config, required_reason: v } }))}
                  />
                  <Label className="text-xs">Reason required</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={stepForm.is_required} onCheckedChange={v => setStepForm(f => ({ ...f, is_required: v }))} />
              <Label className="text-xs">Step is required (cannot be skipped)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddStep} disabled={!stepForm.step_name || createStep.isPending}>
              {createStep.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Add Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
