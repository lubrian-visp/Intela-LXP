import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, AlertTriangle, CheckCircle2, Shield, Lock, Copy, Send, ThumbsUp, Archive, Clock, Sparkles, XCircle, Ban, Pencil, Link2, Zap } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgramme, useProgrammeModules, usePathways, useAssessments, useCreateAssessment, useCreatePathway, useCreateModule, useUpdatePathway, useUpdateModule, useDeleteModule, useDeletePathway, useReorderModules } from "@/hooks/useCoreData";
import { useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import {
  useContentBlocks, useCreateContentBlock, useDeleteContentBlock, useReorderContentBlocks, useUpdateContentBlock,
} from "@/hooks/useContentBlocks";
import { useTransitionProgramme, useCloneToDraft, canTransition, LIFECYCLE_TRANSITIONS, LIFECYCLE_LABELS, LIFECYCLE_COLORS, canEdit, canEditContent, useProgrammePermission, useCanApproveProgramme } from "@/hooks/useProgrammeLifecycle";
import type { LifecycleStatus } from "@/hooks/useProgrammeLifecycle";
import { resolveConfig } from "@/types/programmeTypeConfig";
import { getAllowedBlockTypes } from "@/lib/programmeTypeTemplates";
import { useLessonsByProgramme, useCreateLesson } from "@/hooks/useLessons";
import { useAssessmentLinks, useCreateAssessmentLink, useDeleteAssessmentLink, getLinksForNode } from "@/hooks/useAssessmentLinks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { BuilderStructureTree, type TreeNode } from "@/components/builder/BuilderStructureTree";
import { EnhancedStructureTree } from "@/components/builder/EnhancedStructureTree";
import { EnhancedBuilderContentEditor } from "@/components/builder/EnhancedBuilderContentEditor";
import { AddPathwayDialog, AddModuleDialog, EditPathwayDialog, EditModuleDialog, DeleteConfirmDialog } from "@/components/builder/BuilderDialogs";
import { EditContentBlockDialog } from "@/components/builder/EditContentBlockDialog";
import { AICurriculumImportDialog } from "@/components/builder/AICurriculumImportDialog";
import { AddLessonDialog } from "@/components/builder/AddLessonDialog";
import { AssessmentLinkingPanel } from "@/components/builder/AssessmentLinkingPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { UnifiedContentWizard } from "@/components/builder/UnifiedContentWizard";
import { AssessmentLibrarySidebar } from "@/components/builder/AssessmentLibrarySidebar";
import { CoverageValidationPanel } from "@/components/builder/CoverageValidationPanel";
import { CreateAssessmentDialog } from "@/components/builder/CreateAssessmentDialog";
import { useFeatureFlag } from "@/hooks/useAICurriculumImport";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateApprovalTask, useResolveApprovalTask } from "@/hooks/useApprovalIntegration";
import { useNotifyByRole, useCreateNotification } from "@/hooks/useNotifications";
import OverrideControls from "@/components/governance/OverrideControls";
import AIWorkflowTogglePanel from "@/components/programmes/AIWorkflowTogglePanel";

export default function ProgrammeBuilder() {
  const { programmeId } = useParams<{ programmeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: programme, isLoading: progLoading } = useProgramme(programmeId);
  const { data: modules = [], isLoading: modLoading } = useProgrammeModules(programmeId);
  const { data: pathways = [], isLoading: pathLoading } = usePathways(programmeId);
  const { data: assessments = [] } = useAssessments(programmeId);
  const assessmentIds = (assessments as any[]).map((a) => a.id);
  const { data: questionCounts = {} } = useQuery({
    queryKey: ["assessment-question-counts", programmeId, assessmentIds.join(",")],
    enabled: assessmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_questions")
        .select("assessment_id")
        .in("assessment_id", assessmentIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      assessmentIds.forEach((id) => (counts[id] = 0));
      (data ?? []).forEach((row: any) => {
        counts[row.assessment_id] = (counts[row.assessment_id] ?? 0) + 1;
      });
      return counts;
    },
  });
  const { data: programmeTypes = [] } = useProgrammeTypes();

  // Lessons & Assessment Links
  const moduleIds = (modules as any[]).map((m: any) => m.id);
  const { data: allLessons = [] } = useLessonsByProgramme(programmeId, moduleIds);
  const { data: assessmentLinksData = [] } = useAssessmentLinks(programmeId);
  const createLessonMut = useCreateLesson();
  const createAssessmentMut = useCreateAssessment();
  const createAssessmentLink = useCreateAssessmentLink();
  const deleteAssessmentLink = useDeleteAssessmentLink();

  const transitionMutation = useTransitionProgramme();
  const cloneToDraft = useCloneToDraft();
  const createApprovalTask = useCreateApprovalTask();
  const resolveApprovalTask = useResolveApprovalTask();
  const notifyByRole = useNotifyByRole();
  const createNotification = useCreateNotification();

  // Governance permission checks
  const { data: canCreate } = useProgrammePermission("create");
  const { data: canApprove } = useCanApproveProgramme(programmeId);
  const { data: canPublish } = useProgrammePermission("publish");
  const { data: canSuspend } = useProgrammePermission("suspend");

  const programmeType = programmeTypes.find((t: any) => t.id === programme?.programme_type_id);
  const typeConfig = programmeType?.config as Record<string, any> | undefined;
  const resolvedCfg = typeConfig ? resolveConfig(typeConfig) : null;
  const allowedBlocks = typeConfig ? getAllowedBlockTypes(typeConfig) : undefined;

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [parentNode, setParentNode] = useState<TreeNode | null>(null);
  const [addPathwayOpen, setAddPathwayOpen] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [editPathwayOpen, setEditPathwayOpen] = useState(false);
  const [editModuleOpen, setEditModuleOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPathway, setEditingPathway] = useState<{ id: string; title: string; phase: string } | null>(null);
  const [editingModule, setEditingModule] = useState<{ id: string; title: string; module_type: string; pathway_id?: string | null } | null>(null);
  const [deletingNode, setDeletingNode] = useState<TreeNode | null>(null);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [contentWizardOpen, setContentWizardOpen] = useState(false);
  const [editBlockOpen, setEditBlockOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [linkingPanelOpen, setLinkingPanelOpen] = useState(false);
  const [coveragePanelOpen, setCoveragePanelOpen] = useState(false);
  const [createAssessmentOpen, setCreateAssessmentOpen] = useState(false);
  const [draggedAssessmentId, setDraggedAssessmentId] = useState<string | null>(null);

  const { data: aiImportEnabled = true } = useFeatureFlag("ai_curriculum_import");
  const { data: aiContentGlobalEnabled = true } = useFeatureFlag("ai_content_generation");
  const aiContentEnabled = aiContentGlobalEnabled && (programme as any)?.ai_content_enabled !== false;

  // Auto-save indicator
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isDraft) return;
    autoSaveRef.current = setInterval(() => {
      setLastSaved(new Date());
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [programme?.status]);

  const createPathway = useCreatePathway();
  const createModule = useCreateModule();
  const updatePathway = useUpdatePathway();
  const updateModule = useUpdateModule();
  const deleteModuleMut = useDeleteModule();
  const deletePathwayMut = useDeletePathway();

  const selectedModuleId = selectedNode?.type === "module" ? selectedNode.id : undefined;
  const { data: contentBlocks = [] } = useContentBlocks(selectedModuleId);
  const createBlock = useCreateContentBlock();
  const deleteBlock = useDeleteContentBlock();
  const updateBlock = useUpdateContentBlock();
  const reorderBlocks = useReorderContentBlocks();
  const reorderModules = useReorderModules();

  const isLoading = progLoading || modLoading || pathLoading;
  const currentStatus = (programme?.status ?? "draft") as LifecycleStatus;
  const isDraft = canEdit(currentStatus);
  const isContentEditable = canEditContent(currentStatus);

  // Build tree with governance indicators
  const tree: TreeNode[] = pathways.map((p: any) => {
    const pathwayModules = modules.filter((m: any) => m.pathway_id === p.id);
    const hasIncompleteModules = pathwayModules.some((m: any) => !m.description);
    const pathwayLinkCount = assessmentLinksData.filter((l) => l.pathway_id === p.id && !l.module_id && !l.lesson_id).length;
    return {
      id: p.id,
      type: "pathway" as const,
      label: p.title,
      subtitle: `Phase: ${p.phase} · ${p.version}`,
      progress: 0,
      linkCount: pathwayLinkCount,
      hasComplianceWarning: hasIncompleteModules,
      complianceMessage: hasIncompleteModules ? "Some modules missing description" : undefined,
      children: pathwayModules.map((m: any) => {
        const moduleAssessments = assessments.filter((a: any) => a.module_id === m.id);
        const moduleLessons = allLessons.filter((l) => l.module_id === m.id);
        const moduleLinkCount = assessmentLinksData.filter((l) => l.module_id === m.id).length;
        const isGovernanceLocked = resolvedCfg?.structural?.locked_fields?.includes("modules") ?? false;

        // Build lesson children
        const lessonChildren: TreeNode[] = moduleLessons.map((lesson) => {
          const lessonLinkCount = assessmentLinksData.filter((l) => l.lesson_id === lesson.id).length;
          return {
            id: lesson.id,
            type: "lesson" as const,
            label: lesson.title,
            subtitle: lesson.duration_minutes ? `${lesson.duration_minutes}m` : undefined,
            linkCount: lessonLinkCount,
          };
        });

        // Build assessment children
        const assessmentChildren: TreeNode[] = moduleAssessments.map((a: any) => ({
          id: a.id,
          type: "assessment" as const,
          label: a.title,
          subtitle: `${a.assessment_type} · ${a.max_score ?? 100} marks`,
          assessmentCategory: (a as any).assessment_category,
          questionCount: (questionCounts as Record<string, number>)[a.id] ?? 0,
          isLocked: true,
        }));

        return {
          id: m.id,
          type: "module" as const,
          label: m.title,
          subtitle: `${m.module_type ?? "theory"} · ${m.credits ?? 0} credits · ${m.duration_hours ?? 0}h`,
          moduleType: m.module_type,
          isGovernanceLocked,
          linkCount: moduleLinkCount,
          hasComplianceWarning: !m.description,
          complianceMessage: !m.description ? "Missing description" : undefined,
          children: [...lessonChildren, ...assessmentChildren],
        };
      }),
    };
  });

  const unassignedModules = modules.filter((m: any) => !m.pathway_id);
  if (unassignedModules.length > 0) {
    tree.push({
      id: "_unassigned",
      type: "pathway",
      label: "Unassigned Modules",
      subtitle: `${unassignedModules.length} modules without a track`,
      hasComplianceWarning: true,
      complianceMessage: "Modules should be assigned to a learning track",
      children: unassignedModules.map((m: any) => {
        const moduleLessons = allLessons.filter((l) => l.module_id === m.id);
        const lessonChildren: TreeNode[] = moduleLessons.map((lesson) => ({
          id: lesson.id,
          type: "lesson" as const,
          label: lesson.title,
          subtitle: lesson.duration_minutes ? `${lesson.duration_minutes}m` : undefined,
        }));
        return {
          id: m.id,
          type: "module" as const,
          label: m.title,
          subtitle: `${m.module_type ?? "theory"} · ${m.credits ?? 0} credits`,
          moduleType: m.module_type,
          children: lessonChildren,
        };
      }),
    });
  }

  const handleSelectNode = (node: TreeNode) => {
    const parent = tree.find((p) => p.children?.some((c) => c.id === node.id));
    if (parent && node.type !== "pathway") setParentNode(parent);
    else if (node.type === "pathway") setParentNode(null);
    if (node.type === "assessment") {
      for (const pathway of tree) {
        for (const mod of pathway.children ?? []) {
          if (mod.children?.some((c) => c.id === node.id)) { setParentNode(mod); break; }
        }
      }
    }
    setSelectedNode(node);
  };

  const handleSelectChild = (child: TreeNode) => { setParentNode(selectedNode); setSelectedNode(child); };

  const handleBack = () => {
    if (parentNode) {
      setSelectedNode(parentNode);
      const grandparent = tree.find((p) => p.children?.some((c) => c.id === parentNode.id));
      setParentNode(grandparent ?? null);
    }
  };

  const handleAddBlock = useCallback(
    (block: { title: string; block_type: string; is_required: boolean; duration_minutes?: number }) => {
      if (!selectedModuleId) return;
      const nextOrder = contentBlocks.length > 0 ? Math.max(...contentBlocks.map((b: any) => b.sequence_order)) + 1 : 1;
      createBlock.mutate(
        { module_id: selectedModuleId, title: block.title, block_type: block.block_type, is_required: block.is_required, duration_minutes: block.duration_minutes ?? null, sequence_order: nextOrder },
        { onSuccess: () => { toast.success("Content block added"); setLastSaved(new Date()); }, onError: (err) => toast.error("Failed to add block: " + err.message) }
      );
    },
    [selectedModuleId, contentBlocks, createBlock]
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      if (!selectedModuleId) return;
      deleteBlock.mutate({ id, moduleId: selectedModuleId }, { onSuccess: () => toast.success("Block removed"), onError: (err) => toast.error("Failed to delete: " + err.message) });
    },
    [selectedModuleId, deleteBlock]
  );

  const handleReorderBlocks = useCallback(
    (activeId: string, overId: string) => {
      if (!selectedModuleId) return;
      const oldIndex = contentBlocks.findIndex((b: any) => b.id === activeId);
      const newIndex = contentBlocks.findIndex((b: any) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(contentBlocks, oldIndex, newIndex);
      const updates = reordered.map((b: any, i: number) => ({ id: b.id, sequence_order: i + 1, module_id: selectedModuleId }));
      reorderBlocks.mutate(updates, { onError: (err) => toast.error("Failed to reorder: " + err.message) });
    },
    [selectedModuleId, contentBlocks, reorderBlocks]
  );

  const handleEditBlock = useCallback((block: any) => {
    setEditingBlock(block);
    setEditBlockOpen(true);
  }, []);

  const handleSaveBlock = useCallback(
    (data: { id: string; title: string; block_type: string; is_required: boolean; duration_minutes: number | null; content?: any; file_url?: string | null }) => {
      updateBlock.mutate(
        { id: data.id, title: data.title, block_type: data.block_type, is_required: data.is_required, duration_minutes: data.duration_minutes, content: data.content, file_url: data.file_url },
        {
          onSuccess: () => {
            toast.success("Content block updated");
            setEditBlockOpen(false);
            setEditingBlock(null);
            setLastSaved(new Date());
          },
          onError: (err) => toast.error("Failed to update: " + err.message),
        }
      );
    },
    [updateBlock]
  );

  const handleAddAIBlocks = useCallback(
    (blocks: { title: string; block_type: string; is_required: boolean; duration_minutes?: number; content?: any }[]) => {
      if (!selectedModuleId) return;
      const startOrder = contentBlocks.length > 0 ? Math.max(...contentBlocks.map((b: any) => b.sequence_order)) + 1 : 1;
      blocks.forEach((block, i) => {
        // Map video_url/image_url from content to file_url for the viewer
        const fileUrl = block.content?.video_url || block.content?.image_url || null;
        createBlock.mutate(
          {
            module_id: selectedModuleId,
            title: block.title,
            block_type: block.block_type,
            is_required: block.is_required,
            duration_minutes: block.duration_minutes ?? null,
            sequence_order: startOrder + i,
            content: block.content ?? null,
            file_url: fileUrl,
          },
          {
            onSuccess: () => { if (i === blocks.length - 1) setLastSaved(new Date()); },
            onError: (err) => toast.error("Failed to add block: " + err.message),
          }
        );
      });
    },
    [selectedModuleId, contentBlocks, createBlock]
  );

  const handleAddPathway = (data: { title: string; phase: string }) => {
    if (!programmeId) return;
    createPathway.mutate(
      { programme_id: programmeId, title: data.title, phase: data.phase },
      { onSuccess: () => toast.success("Learning track added"), onError: (err) => toast.error("Failed: " + err.message) }
    );
  };

  const handleAddModule = (data: { title: string; module_type: string; pathway_id?: string }) => {
    if (!programmeId) return;
    const nextOrder = modules.length > 0 ? Math.max(...modules.map((m: any) => m.sequence_order)) + 1 : 1;
    createModule.mutate(
      { programme_id: programmeId, title: data.title, module_type: data.module_type, pathway_id: data.pathway_id === "none" ? null : (data.pathway_id ?? null), sequence_order: nextOrder },
      { onSuccess: () => toast.success("Module added"), onError: (err) => toast.error("Failed: " + err.message) }
    );
  };

  const handleAddLesson = (data: { title: string; description?: string; learning_objective?: string; duration_minutes?: number; is_mandatory: boolean }) => {
    if (!selectedModuleId) return;
    const moduleLessons = allLessons.filter((l) => l.module_id === selectedModuleId);
    const nextOrder = moduleLessons.length > 0 ? Math.max(...moduleLessons.map((l) => l.sequence_order)) + 1 : 1;
    createLessonMut.mutate(
      { module_id: selectedModuleId, title: data.title, description: data.description, learning_objective: data.learning_objective, duration_minutes: data.duration_minutes, is_mandatory: data.is_mandatory, sequence_order: nextOrder },
      { onSuccess: () => toast.success("Lesson added"), onError: (err) => toast.error("Failed: " + err.message) }
    );
  };

  const handleEditNode = (node: TreeNode) => {
    if (node.type === "pathway") {
      const pw = pathways.find((p: any) => p.id === node.id);
      if (pw) {
        setEditingPathway({ id: pw.id, title: pw.title, phase: pw.phase });
        setEditPathwayOpen(true);
      }
    } else if (node.type === "module") {
      const mod = modules.find((m: any) => m.id === node.id);
      if (mod) {
        setEditingModule({ id: mod.id, title: mod.title, module_type: mod.module_type || "theory", pathway_id: mod.pathway_id });
        setEditModuleOpen(true);
      }
    }
  };

  const handleDeleteNode = (node: TreeNode) => {
    setDeletingNode(node);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deletingNode) return;
    if (deletingNode.type === "pathway") {
      deletePathwayMut.mutate(deletingNode.id, {
        onSuccess: () => {
          toast.success("Track deleted");
          if (selectedNode?.id === deletingNode.id) setSelectedNode(null);
          setDeleteDialogOpen(false);
          setDeletingNode(null);
        },
        onError: (err) => toast.error("Failed: " + err.message),
      });
    } else if (deletingNode.type === "module") {
      deleteModuleMut.mutate(deletingNode.id, {
        onSuccess: () => {
          toast.success("Module deleted");
          if (selectedNode?.id === deletingNode.id) setSelectedNode(null);
          setDeleteDialogOpen(false);
          setDeletingNode(null);
        },
        onError: (err) => toast.error("Failed: " + err.message),
      });
    }
  };

  const handleSavePathway = (data: { id: string; title: string; phase: string }) => {
    updatePathway.mutate({ id: data.id, title: data.title, phase: data.phase }, {
      onSuccess: () => toast.success("Track updated"),
      onError: (err) => toast.error("Failed: " + err.message),
    });
  };

  const handleSaveModule = (data: { id: string; title: string; module_type: string; pathway_id?: string | null }) => {
    updateModule.mutate({ id: data.id, title: data.title, module_type: data.module_type, pathway_id: data.pathway_id }, {
      onSuccess: () => toast.success("Module updated"),
      onError: (err) => toast.error("Failed: " + err.message),
    });
  };

  const handleTransition = (to: LifecycleStatus, reason?: string) => {
    if (!programmeId || !canTransition(currentStatus, to)) return;
    transitionMutation.mutate(
      { id: programmeId, status: to, reason, previousStatus: currentStatus, roleAtAction: "ui" },
      {
        onSuccess: () => {
          toast.success(`Programme ${LIFECYCLE_LABELS[to].toLowerCase()}`);
          
          // Auto-create approval task when submitted for approval
          if (to === "pending_approval" && user?.id && programme) {
            createApprovalTask.mutate({
              programmeId,
              programmeTitle: programme.title,
              requestedBy: user.id,
            });
            // Notify approvers (operations + super_admin)
            const notifPayload = {
              title: `Programme submitted: ${programme.title}`,
              body: `"${programme.title}" requires your approval.`,
              category: "approval",
              reference_table: "programmes",
              reference_id: programmeId,
              action_url: "/approvals",
            };
            notifyByRole.mutate({ ...notifPayload, role: "operations" });
            notifyByRole.mutate({ ...notifPayload, role: "super_admin" });
          }
          
          // Resolve approval task when approved or rejected
          if ((to === "approved" || to === "rejected") && user?.id) {
            resolveApprovalTask.mutate({
              programmeId,
              decidedBy: user.id,
              status: to as "approved" | "rejected",
              notes: reason,
            });
            // Notify the programme creator
            if (programme?.created_by) {
              createNotification.mutate({
                user_id: programme.created_by,
                title: `Programme ${to}: ${programme.title}`,
                body: to === "approved"
                  ? `Your programme "${programme.title}" has been approved.`
                  : `Your programme "${programme.title}" was rejected. ${reason ? `Reason: ${reason}` : ""}`,
                category: "approval",
                reference_table: "programmes",
                reference_id: programmeId,
                action_url: `/programmes/${programmeId}/builder`,
              });
            }
          }
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // Governance-aware: which transitions should this user see?
  const getVisibleTransitions = (): LifecycleStatus[] => {
    const all = LIFECYCLE_TRANSITIONS[currentStatus] || [];
    return all.filter((to) => {
      if (to === "pending_approval") return canCreate;
      if (to === "approved" || to === "rejected") return canApprove;
      if (to === "published") return canPublish;
      if (to === "suspended") return canSuspend;
      if (to === "draft") return true; // Return to draft from rejected
      if (to === "archived") return canPublish || canSuspend;
      return false;
    });
  };

  const handleCloneToDraft = () => {
    if (!programmeId) return;
    cloneToDraft.mutate(programmeId, {
      onSuccess: (data) => navigate(`/programmes/${data.id}/builder`),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-[600px] rounded-xl" />
          <Skeleton className="h-[600px] rounded-xl col-span-3" />
        </div>
      </div>
    );
  }

  if (!programme) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Programme not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/programmes")}>Back to Hub</Button>
      </div>
    );
  }

  // nextTransitions now computed by getVisibleTransitions()

  return (
    <div className="space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/programmes")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Hub
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{programme.title}</h1>
              <Badge className={cn("text-[10px] uppercase border", LIFECYCLE_COLORS[currentStatus])}>
                {LIFECYCLE_LABELS[currentStatus]}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground">{(programme as any).version ?? "v1.0"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: programmeType?.color ?? "hsl(var(--muted))" }} />
              {programmeType?.name ?? "No type"} template
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Content Wizard Button */}
          {isDraft && aiImportEnabled && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-accent/30 text-accent hover:bg-accent/5" onClick={() => setContentWizardOpen(true)}>
              <Sparkles className="w-3.5 h-3.5" /> Content Wizard
            </Button>
          )}
          {/* AI Import Button (legacy) */}
          {isDraft && aiImportEnabled && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => setAiImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> AI Import
            </Button>
          )}

          {/* New Assessment */}
          {isDraft && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreateAssessmentOpen(true)}>
              <Zap className="w-3.5 h-3.5" /> New Assessment
            </Button>
          )}

          {/* Coverage & Validation */}
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCoveragePanelOpen(true)}>
            <AlertTriangle className="w-3.5 h-3.5" /> Coverage
          </Button>

          {/* Auto-save indicator */}
          {isDraft && lastSaved && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Saved</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Last saved {lastSaved.toLocaleTimeString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Lifecycle status indicator */}
          {isDraft ? (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Draft, Editable</span>
            </div>
          ) : isContentEditable ? (
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <Pencil className="w-3.5 h-3.5" />
              <span>{LIFECYCLE_LABELS[currentStatus]} — Content Editable</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-info">
              <Shield className="w-3.5 h-3.5" />
              <span>{LIFECYCLE_LABELS[currentStatus]}</span>
            </div>
          )}

          {/* Clone to Draft */}
          {!isDraft && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleCloneToDraft} disabled={cloneToDraft.isPending}>
              <Copy className="w-3.5 h-3.5" /> {cloneToDraft.isPending ? "Cloning..." : "New Draft Version"}
            </Button>
          )}

          {/* Governance-aware lifecycle transitions */}
          {getVisibleTransitions().map((to) => {
            const icons: Record<string, any> = {
              submitted: Send, pending_approval: Send, approved: ThumbsUp, rejected: XCircle,
              published: Upload, archived: Archive, draft: ArrowLeft, suspended: Ban,
            };
            const Icon = icons[to] || Send;
            const variant = to === "draft" || to === "rejected" ? "outline" : to === "suspended" ? "destructive" : "default";
            const label = to === "draft" ? "Return to Draft"
              : to === "submitted" ? "Submit for Review"
              : to === "pending_approval" ? "Submit for Approval"
              : to === "rejected" ? "Reject"
              : LIFECYCLE_LABELS[to];
            return (
              <Button key={to} size="sm" variant={variant as any} className="gap-1.5 text-xs"
                onClick={() => handleTransition(to)}
                disabled={transitionMutation.isPending}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Governance Template Banner */}
      {programmeType && resolvedCfg && (
        <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-secondary/50 border border-border/50 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: programmeType.color }} />
            {programmeType.name} Governance
          </span>
          <span className="h-3 w-px bg-border" />
          <span>Workplace: {resolvedCfg.workplace === "required" ? "Required" : resolvedCfg.workplace === "optional" ? "Optional" : "N/A"}</span>
          <span className="h-3 w-px bg-border" />
          <span>Mentor: {resolvedCfg.hr.mentor_required ? "Required" : "Optional"}</span>
          <span className="h-3 w-px bg-border" />
          <span>Assessor: {resolvedCfg.hr.assessor_required ? "Required" : "Optional"}</span>
          <span className="h-3 w-px bg-border" />
          <span>K:{resolvedCfg.evaluation.knowledge_weight}% P:{resolvedCfg.evaluation.practical_weight}% W:{resolvedCfg.evaluation.workplace_weight}%</span>
          {resolvedCfg.compliance.audit_trail_required && (
            <>
              <span className="h-3 w-px bg-border" />
              <span className="text-warning flex items-center gap-1"><Shield className="w-3 h-3" /> Audit Trail</span>
            </>
          )}
        </div>
      )}

      {/* Version Status Bar */}
      <div className="flex items-center gap-2 px-1 flex-wrap">
        {(["draft", "submitted", "pending_approval", "approved", "published", "archived"] as LifecycleStatus[]).map((status, i) => {
          const isActive = status === currentStatus;
          const statuses = ["draft", "submitted", "pending_approval", "approved", "published", "archived"] as LifecycleStatus[];
          const isPast = statuses.indexOf(currentStatus) > i;
          // Show rejected/suspended as special indicators
          const isRejected = currentStatus === "rejected" && status === "pending_approval";
          const isSuspended = currentStatus === "suspended" && status === "published";
          return (
            <div key={status} className="flex items-center gap-2">
              {i > 0 && <div className={cn("w-6 h-px", isPast || isActive ? "bg-primary" : "bg-border")} />}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors",
                isActive ? LIFECYCLE_COLORS[status] :
                isRejected ? "bg-destructive/10 text-destructive border-destructive/20" :
                isSuspended ? "bg-destructive/10 text-destructive border-destructive/20" :
                isPast ? "bg-primary/5 text-primary border-primary/20" :
                "bg-muted/50 text-muted-foreground border-border/50"
              )}>
                {isPast && !isRejected && !isSuspended && <CheckCircle2 className="w-2.5 h-2.5" />}
                {isRejected ? "Rejected" : isSuspended ? "Suspended" : LIFECYCLE_LABELS[status]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Super Admin Override Controls */}
      {programmeId && programme && (
        <OverrideControls
          programmeId={programmeId}
          programmeTitle={programme.title}
          currentStatus={currentStatus}
        />
      )}

      {/* Per-Programme AI Workflow Toggle */}
      {programmeId && (
        <AIWorkflowTogglePanel programmeId={programmeId} />
      )}

      {/* Two-Pane Layout — resizable on lg+, stacked on mobile */}
      <div className="hidden lg:block min-h-[600px] h-[calc(100vh-280px)] rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <ResizablePanelGroup direction="horizontal" autoSaveId="programme-builder-panes">
        <ResizablePanel defaultSize={24} minSize={15} maxSize={45} className="bg-card">
          <EnhancedStructureTree
            tree={tree}
            selectedNode={selectedNode}
            onSelectNode={handleSelectNode}
            isDraft={isDraft}
            programmeTitle={programme.title}
            onAddPathway={() => setAddPathwayOpen(true)}
            onAddModule={() => setAddModuleOpen(true)}
            onAddLesson={() => setAddLessonOpen(true)}
            onEditNode={handleEditNode}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={(node) => {
              if (node.type === "module") {
                const mod = (modules as any[]).find((m: any) => m.id === node.id);
                if (mod && programmeId) {
                  const nextOrder = modules.length > 0 ? Math.max(...(modules as any[]).map((m: any) => m.sequence_order)) + 1 : 1;
                  createModule.mutate(
                    { programme_id: programmeId, title: mod.title + " (Copy)", module_type: mod.module_type, pathway_id: mod.pathway_id, sequence_order: nextOrder },
                    { onSuccess: () => toast.success("Module duplicated"), onError: (err) => toast.error("Failed: " + err.message) }
                  );
                }
              }
            }}
            onMoveModule={(moduleId, targetPathwayId) => {
              const mod = (modules as any[]).find((m: any) => m.id === moduleId);
              if (!mod) return;
              updateModule.mutate(
                { id: moduleId, pathway_id: targetPathwayId },
                { onSuccess: () => toast.success("Module moved"), onError: (err) => toast.error("Failed to move: " + err.message) }
              );
            }}
            onOpenLinkingPanel={() => setLinkingPanelOpen(true)}
            onReorderModules={(activeId, overId, newPathwayId) => {
              const allModulesOrdered: { id: string; pathwayId: string | null }[] = [];
              tree.forEach((p) => {
                (p.children ?? []).forEach((c) => {
                  allModulesOrdered.push({ id: c.id, pathwayId: p.id === "_unassigned" ? null : p.id });
                });
              });

              const oldIndex = allModulesOrdered.findIndex((m) => m.id === activeId);
              const newIndex = allModulesOrdered.findIndex((m) => m.id === overId);
              if (oldIndex === -1 || newIndex === -1) return;

              const [moved] = allModulesOrdered.splice(oldIndex, 1);
              moved.pathwayId = newPathwayId;
              allModulesOrdered.splice(newIndex, 0, moved);

              const updates = allModulesOrdered.map((m, i) => ({
                id: m.id,
                sequence_order: i + 1,
                pathway_id: m.pathwayId,
              }));

              reorderModules.mutate(updates, {
                onError: (err) => toast.error("Failed to reorder: " + err.message),
                onSuccess: () => toast.success("Modules reordered"),
              });
            }}
            onDropAssessment={(assessmentId, nodeType, nodeId) => {
              const linkData: any = { assessment_id: assessmentId };
              if (nodeType === "pathway") linkData.pathway_id = nodeId;
              if (nodeType === "module") linkData.module_id = nodeId;
              if (nodeType === "lesson") linkData.lesson_id = nodeId;
              createAssessmentLink.mutate(linkData, {
                onSuccess: () => toast.success(`Assessment linked to ${nodeType}`),
                onError: (err) => toast.error("Failed to link: " + err.message),
              });
            }}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={56} minSize={30} className="bg-background">
          <EnhancedBuilderContentEditor
            selectedNode={selectedNode}
            parentNode={parentNode}
            onBack={handleBack}
            onSelectChild={handleSelectChild}
            isDraft={isContentEditable}
            contentBlocks={contentBlocks}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteBlock}
            onReorderBlocks={handleReorderBlocks}
            allowedBlockTypes={allowedBlocks}
            onEditBlock={handleEditBlock}
            onAddAIBlocks={handleAddAIBlocks}
            programmeTitle={programme?.title || ""}
            programmeId={programmeId}
            moduleType={selectedNode?.moduleType}
            aiEnabled={aiContentEnabled}
            onEditSelectedNode={handleEditNode}
            onDeleteSelectedNode={handleDeleteNode}
            autoSaveStatus={lastSaved ? "saved" : "idle"}
            lastSavedAt={lastSaved}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={20} minSize={14} maxSize={40}>
          {/* Assessment Library Sidebar */}
          <AssessmentLibrarySidebar
            assessments={assessments as any[]}
            assessmentLinks={assessmentLinksData}
            isDraft={isDraft}
            onOpenLinkingPanel={() => setLinkingPanelOpen(true)}
            onCreateAssessment={() => setCreateAssessmentOpen(true)}
            draggedAssessmentId={draggedAssessmentId}
            onDragStart={(id) => setDraggedAssessmentId(id)}
            onDragEnd={() => setDraggedAssessmentId(null)}
          />
        </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile stacked fallback */}
      <div className="lg:hidden grid grid-cols-1 gap-0 min-h-[600px] rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="border-b border-border bg-card">
          <EnhancedStructureTree
            tree={tree}
            selectedNode={selectedNode}
            onSelectNode={handleSelectNode}
            isDraft={isDraft}
            programmeTitle={programme.title}
          />
        </div>
        <div className="bg-background">
          <EnhancedBuilderContentEditor
            selectedNode={selectedNode}
            parentNode={parentNode}
            onBack={handleBack}
            onSelectChild={handleSelectChild}
            isDraft={isContentEditable}
            contentBlocks={contentBlocks}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteBlock}
            onReorderBlocks={handleReorderBlocks}
            allowedBlockTypes={allowedBlocks}
            onEditBlock={handleEditBlock}
            onAddAIBlocks={handleAddAIBlocks}
            programmeTitle={programme?.title || ""}
            programmeId={programmeId}
            moduleType={selectedNode?.moduleType}
            aiEnabled={aiContentEnabled}
            onEditSelectedNode={handleEditNode}
            onDeleteSelectedNode={handleDeleteNode}
            autoSaveStatus={lastSaved ? "saved" : "idle"}
            lastSavedAt={lastSaved}
          />
        </div>
        <AssessmentLibrarySidebar
          assessments={assessments as any[]}
          assessmentLinks={assessmentLinksData}
          isDraft={isDraft}
          onOpenLinkingPanel={() => setLinkingPanelOpen(true)}
          onCreateAssessment={() => setCreateAssessmentOpen(true)}
          draggedAssessmentId={draggedAssessmentId}
          onDragStart={(id) => setDraggedAssessmentId(id)}
          onDragEnd={() => setDraggedAssessmentId(null)}
        />
      </div>
      {/* Builder Dialogs */}
      <AddPathwayDialog open={addPathwayOpen} onOpenChange={setAddPathwayOpen} onAdd={handleAddPathway} />
      <AddModuleDialog open={addModuleOpen} onOpenChange={setAddModuleOpen} onAdd={handleAddModule} pathways={pathways.map((p: any) => ({ id: p.id, title: p.title }))} />
      <EditPathwayDialog open={editPathwayOpen} onOpenChange={setEditPathwayOpen} onSave={handleSavePathway} pathway={editingPathway} />
      <EditModuleDialog open={editModuleOpen} onOpenChange={setEditModuleOpen} onSave={handleSaveModule} module={editingModule} pathways={pathways.map((p: any) => ({ id: p.id, title: p.title }))} />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title={`Delete ${deletingNode?.type === "pathway" ? "Track" : "Module"}?`}
        description={deletingNode?.type === "pathway"
          ? `This will delete the track "${deletingNode?.label}" and unassign all its modules. This action cannot be undone.`
          : `This will permanently delete the module "${deletingNode?.label}" and all its content blocks. This action cannot be undone.`}
        isPending={deletePathwayMut.isPending || deleteModuleMut.isPending}
      />

      {/* Edit Content Block Dialog */}
      <EditContentBlockDialog
        open={editBlockOpen}
        onOpenChange={setEditBlockOpen}
        block={editingBlock}
        onSave={handleSaveBlock}
        isPending={updateBlock.isPending}
        programmeId={programmeId}
        programmeTitle={programme?.title || ""}
        moduleTitle={selectedNode?.label || ""}
        aiEnabled={aiContentEnabled}
      />

      {/* AI Curriculum Import Dialog */}
      {programmeId && (
        <AICurriculumImportDialog
          open={aiImportOpen}
          onOpenChange={setAiImportOpen}
          programmeId={programmeId}
          programmeTitle={programme.title}
          programmeTypeConfig={typeConfig as Record<string, any> | undefined}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["pathways"] });
            queryClient.invalidateQueries({ queryKey: ["programme_modules"] });
            queryClient.invalidateQueries({ queryKey: ["content_blocks"] });
            toast.success("AI curriculum imported successfully!");
          }}
        />
      )}

      {/* Unified Content Wizard */}
      {programmeId && (
        <UnifiedContentWizard
          open={contentWizardOpen}
          onOpenChange={setContentWizardOpen}
          programmeId={programmeId}
          programmeTitle={programme.title}
          programmeTypeConfig={typeConfig as Record<string, any> | undefined}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["pathways"] });
            queryClient.invalidateQueries({ queryKey: ["programme_modules"] });
            queryClient.invalidateQueries({ queryKey: ["content_blocks"] });
            toast.success("Content structure generated successfully!");
          }}
          onCreateSingleModule={(title) => {
            if (pathways.length > 0) {
              createModule.mutate({
                programme_id: programmeId,
                title,
                pathway_id: (pathways[0] as any).id,
                module_type: "theory",
                sequence_order: modules.length + 1,
              } as any);
            } else {
              createPathway.mutate({ programme_id: programmeId, title: "Main Track", phase: "knowledge", sequence_order: 1 } as any, {
                onSuccess: (newPathway: any) => {
                  createModule.mutate({
                    programme_id: programmeId,
                    title,
                    pathway_id: newPathway.id,
                    module_type: "theory",
                    sequence_order: 1,
                  } as any);
                },
              });
            }
          }}
        />
      )}

      {/* Add Lesson Dialog */}
      <AddLessonDialog
        open={addLessonOpen}
        onOpenChange={setAddLessonOpen}
        onAdd={handleAddLesson}
        moduleName={selectedNode?.type === "module" ? selectedNode.label : undefined}
      />

      {/* Assessment Linking Panel */}
      <AssessmentLinkingPanel
        open={linkingPanelOpen}
        onOpenChange={setLinkingPanelOpen}
        assessments={assessments as any[]}
        assessmentLinks={assessmentLinksData}
        pathways={pathways.map((p: any) => ({ id: p.id, title: p.title }))}
        modules={modules.map((m: any) => ({ id: m.id, title: m.title, pathway_id: m.pathway_id, module_type: m.module_type }))}
        lessons={allLessons}
        onCreateLink={(data) => {
          createAssessmentLink.mutate(data, {
            onSuccess: () => toast.success("Assessment linked"),
            onError: (err) => toast.error("Failed to link: " + err.message),
          });
        }}
        onDeleteLink={(id) => {
          deleteAssessmentLink.mutate(id, {
            onSuccess: () => toast.success("Link removed"),
            onError: (err) => toast.error("Failed: " + err.message),
          });
        }}
        isDraft={isDraft}
      />

      {/* Coverage & Validation Panel */}
      <CoverageValidationPanel
        open={coveragePanelOpen}
        onOpenChange={setCoveragePanelOpen}
        assessments={assessments as any[]}
        assessmentLinks={assessmentLinksData}
        pathways={pathways.map((p: any) => ({ id: p.id, title: p.title }))}
        modules={modules.map((m: any) => ({ id: m.id, title: m.title, pathway_id: m.pathway_id }))}
        lessons={allLessons}
      />

      {/* Create Assessment Dialog */}
      {programmeId && (
        <CreateAssessmentDialog
          open={createAssessmentOpen}
          onOpenChange={setCreateAssessmentOpen}
          programmeId={programmeId}
          modules={modules.map((m: any) => ({ id: m.id, title: m.title }))}
          onSubmit={(data) => {
            createAssessmentMut.mutate(
              { ...data, programme_id: programmeId, module_id: data.module_id === "none" ? null : data.module_id },
              {
                onSuccess: () => {
                  toast.success("Assessment created");
                  setCreateAssessmentOpen(false);
                },
                onError: (err) => toast.error("Failed: " + err.message),
              }
            );
          }}
          isPending={createAssessmentMut.isPending}
        />
      )}
    </div>
  );
}
