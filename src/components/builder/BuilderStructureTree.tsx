import { useState, useCallback } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, type DragStartEvent, type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronRight, ChevronDown, Plus, Lock, AlertTriangle,
  Pencil, FileText, CheckSquare, Square, Layers, FolderOpen,
  BookOpen, FileCheck, MoreVertical, Copy, Trash2, GripVertical, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TreeNode = {
  id: string;
  type: "pathway" | "module" | "lesson" | "assessment";
  label: string;
  subtitle?: string;
  children?: TreeNode[];
  moduleType?: string;
  isLocked?: boolean;
  isComplete?: boolean;
  isGovernanceLocked?: boolean;
  hasComplianceWarning?: boolean;
  complianceMessage?: string;
  progress?: number;
  isDraft?: boolean;
  assessmentCategory?: string;
  linkCount?: number;
  questionCount?: number;
};

interface BuilderStructureTreeProps {
  tree: TreeNode[];
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
  isDraft: boolean;
  programmeTitle?: string;
  onAddPathway?: () => void;
  onAddModule?: () => void;
  onAddLesson?: () => void;
  onDeleteNode?: (node: TreeNode) => void;
  onDuplicateNode?: (node: TreeNode) => void;
  onEditNode?: (node: TreeNode) => void;
  onReorderModules?: (activeId: string, overId: string, newPathwayId: string | null) => void;
  onOpenLinkingPanel?: () => void;
  onDropAssessment?: (assessmentId: string, nodeType: "pathway" | "module" | "lesson", nodeId: string) => void;
}

const nodeTypeIcons: Record<string, any> = {
  pathway: FolderOpen,
  module: BookOpen,
  lesson: FileText,
  assessment: FileCheck,
};

const moduleTypeColors: Record<string, string> = {
  theory: "text-info",
  practical: "text-warning",
  workplace: "text-success",
};

// ── Sortable Module Item ──
function SortableModuleNode({
  node,
  isSelected,
  isDraft,
  onSelect,
  getStatusIndicator,
  renderContextMenu,
  dropHandlers,
  isDropTarget,
}: {
  node: TreeNode;
  isSelected: boolean;
  isDraft: boolean;
  onSelect: () => void;
  getStatusIndicator: (node: TreeNode) => JSX.Element;
  renderContextMenu: (node: TreeNode) => JSX.Element | null;
  dropHandlers?: Record<string, any>;
  isDropTarget?: boolean;
}) {
  const canDrag = isDraft && !node.isGovernanceLocked;
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: node.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = node.children && node.children.length > 0;
  const TypeIcon = nodeTypeIcons[node.type] || FileText;
  const moduleColor = node.moduleType ? moduleTypeColors[node.moduleType] : "";

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40 z-50")}>
      <div
        onClick={onSelect}
        {...(dropHandlers || {})}
        className={cn(
          "group relative w-full flex items-center gap-3 px-3 py-3 text-left transition-all text-sm cursor-pointer border-b border-border/40 last:border-b-0",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-card hover:bg-muted/40 text-foreground",
          isDropTarget && "ring-2 ring-primary ring-inset"
        )}
      >
        {/* Drag handle (hover only) */}
        {canDrag && (
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute left-0.5 top-1/2 -translate-y-1/2"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className={cn(
              "w-3 h-3",
              isSelected ? "text-primary-foreground/60" : "text-muted-foreground/40"
            )} />
          </button>
        )}

        <TypeIcon className={cn(
          "w-5 h-5 shrink-0",
          isSelected ? "text-primary-foreground" : moduleColor || "text-primary"
        )} />

        <span className="flex-1 font-medium leading-snug break-words min-w-0">{node.label}</span>

        <div className="flex items-center gap-1.5 shrink-0">
          {node.hasComplianceWarning && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className={cn("w-3.5 h-3.5", isSelected ? "text-primary-foreground" : "text-destructive")} />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-[200px]">
                  {node.complianceMessage || "Missing required element"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {node.isGovernanceLocked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className={cn("w-3 h-3", isSelected ? "text-primary-foreground/80" : "text-warning/70")} />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Template-locked</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {node.moduleType && !isSelected && (
            <Badge variant="outline" className={cn(
              "text-[9px] px-1.5 py-0 h-4 border-none font-medium",
              node.moduleType === "theory" ? "bg-info/10 text-info" :
              node.moduleType === "practical" ? "bg-warning/10 text-warning" :
              "bg-success/10 text-success"
            )}>
              {node.moduleType === "theory" ? "K" : node.moduleType === "practical" ? "P" : "W"}
            </Badge>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {renderContextMenu(node)}
          </div>
          {/* Chevron circle indicator */}
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
            isSelected ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"
          )}>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuilderStructureTree({
  tree,
  selectedNode,
  onSelectNode,
  isDraft,
  programmeTitle,
  onAddPathway,
  onAddModule,
  onAddLesson,
  onDeleteNode,
  onDuplicateNode,
  onEditNode,
  onReorderModules,
  onOpenLinkingPanel,
  onDropAssessment,
}: BuilderStructureTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(tree.map((p) => p.id))
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // HTML5 drag-and-drop handlers for assessment linking
  const makeDropHandlers = (nodeType: "pathway" | "module" | "lesson", nodeId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("assessment_id")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "link";
      setDropTargetId(nodeId);
    },
    onDragLeave: () => setDropTargetId((prev) => (prev === nodeId ? null : prev)),
    onDrop: (e: React.DragEvent) => {
      const assessmentId = e.dataTransfer.getData("assessment_id");
      if (assessmentId && onDropAssessment) {
        onDropAssessment(assessmentId, nodeType, nodeId);
      }
      setDropTargetId(null);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalModules = tree.reduce((acc, p) => acc + (p.children?.length ?? 0), 0);
  const completedModules = tree.reduce(
    (acc, p) => acc + (p.children?.filter((c) => c.isComplete).length ?? 0), 0
  );
  const overallProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  // Collect all module IDs across all pathways for the sortable context
  const allModuleIds = tree.flatMap((p) => (p.children ?? []).map((c) => c.id));

  const getStatusIndicator = useCallback((node: TreeNode) => {
    if (node.isGovernanceLocked) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="w-3 h-3 text-warning shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Governance-locked. Cannot modify.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (node.hasComplianceWarning) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs max-w-[200px]">
              {node.complianceMessage || "Missing required element"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    if (node.isComplete) {
      return <CheckSquare className="w-3 h-3 text-success shrink-0" />;
    }
    if (node.isLocked) {
      return <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />;
    }
    return <Square className="w-3 h-3 text-muted-foreground/40 shrink-0" />;
  }, []);

  const renderContextMenu = useCallback((node: TreeNode) => {
    if (!isDraft) return null;
    const canModify = !node.isGovernanceLocked;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Open actions menu"
            className="transition-opacity p-0.5 rounded hover:bg-muted"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {node.type === "pathway" && (
            <DropdownMenuItem onClick={onAddModule} className="text-xs gap-2">
              <Plus className="w-3 h-3" /> Add Module
            </DropdownMenuItem>
          )}
          {node.type === "module" && (
            <DropdownMenuItem onClick={onAddLesson} className="text-xs gap-2">
              <Plus className="w-3 h-3" /> Add Lesson
            </DropdownMenuItem>
          )}
          {(node.type === "pathway" || node.type === "module") && canModify && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onEditNode?.(node); }}
              className="text-xs gap-2"
            >
              <Pencil className="w-3 h-3" /> Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDuplicateNode?.(node)}
            className="text-xs gap-2"
            disabled={!canModify}
          >
            <Copy className="w-3 h-3" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {(node.type === "pathway" || node.type === "module") && canModify && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDeleteNode?.(node); }}
              className="text-xs gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }, [isDraft, onAddModule, onAddLesson, onEditNode, onDuplicateNode, onDeleteNode]);

  // Find which pathway a module belongs to
  const findPathwayForModule = (moduleId: string): TreeNode | undefined => {
    return tree.find((p) => p.children?.some((c) => c.id === moduleId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine the target pathway
    const overPathway = findPathwayForModule(overId);
    const newPathwayId = overPathway?.id === "_unassigned" ? null : (overPathway?.id ?? null);

    onReorderModules?.(activeId, overId, newPathwayId);
  };

  const draggingNode = draggingId
    ? tree.flatMap((p) => p.children ?? []).find((c) => c.id === draggingId)
    : null;

  const renderPathway = (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const childIds = (node.children ?? []).map((c) => c.id);

    return (
      <div key={node.id} className="mb-4">
        <button
          {...(isDraft && node.id !== "_unassigned" ? makeDropHandlers("pathway", node.id) : {})}
          onClick={() => {
            onSelectNode(node);
            toggleExpand(node.id);
          }}
          className={cn(
            "w-full flex items-center gap-2.5 px-2 py-2 text-left transition-all group",
            dropTargetId === node.id && "ring-2 ring-primary ring-offset-1 bg-primary/5 rounded-md"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          )}
          <FolderOpen className="w-5 h-5 shrink-0 text-muted-foreground" />
          <span className="text-base font-bold text-foreground truncate flex-1">
            {node.label}
          </span>
          {node.hasComplianceWarning && (
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          )}
          {hasChildren && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground min-w-[28px] text-center">
              {node.children!.length}
            </span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {renderContextMenu(node)}
          </div>
        </button>
        {isExpanded && (
          <div className="mt-1.5 rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
              {(node.children ?? []).map((child) => {
                if (child.type === "module") {
                  const moduleExpanded = expandedNodes.has(child.id);
                  const hasLessonChildren = child.children && child.children.some((c) => c.type === "lesson");
                  return (
                    <div key={child.id} className="border-b border-border/40 last:border-b-0">
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <SortableModuleNode
                            node={child}
                            isSelected={selectedNode?.id === child.id}
                            isDraft={isDraft}
                            onSelect={() => {
                              onSelectNode(child);
                              if (child.children && child.children.length > 0) toggleExpand(child.id);
                            }}
                            getStatusIndicator={getStatusIndicator}
                            renderContextMenu={renderContextMenu}
                            dropHandlers={isDraft ? makeDropHandlers("module", child.id) : undefined}
                            isDropTarget={dropTargetId === child.id}
                          />
                        </div>
                      </div>
                      {/* Render lesson & assessment children under module */}
                      {moduleExpanded && child.children && child.children.length > 0 && (
                        <div className="bg-muted/30 border-t border-border/40 py-1.5 px-2 space-y-0.5">
                          {child.children.map((grandchild) => {
                            const Icon = nodeTypeIcons[grandchild.type] || FileText;
                            const isGcSelected = selectedNode?.id === grandchild.id;
                            return (
                              <button
                                key={grandchild.id}
                                onClick={() => onSelectNode(grandchild)}
                                {...(isDraft && grandchild.type === "lesson" ? makeDropHandlers("lesson", grandchild.id) : {})}
                                className={cn(
                                  "w-full flex items-center gap-2.5 pl-8 pr-2 py-1.5 text-left rounded-md transition-all text-xs group",
                                  isGcSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground hover:bg-card",
                                  dropTargetId === grandchild.id && "ring-2 ring-primary ring-offset-1 bg-primary/5"
                                )}
                              >
                                <Icon className={cn("w-3.5 h-3.5 shrink-0", isGcSelected ? "text-primary-foreground" : grandchild.type === "lesson" ? "text-info" : "text-accent")} />
                                <span className="truncate flex-1 font-medium">{grandchild.label}</span>
                                {grandchild.questionCount != null && grandchild.type === "assessment" && (
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-medium",
                                    isGcSelected ? "bg-primary-foreground/20 text-primary-foreground" :
                                    grandchild.questionCount === 0 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                                  )}>
                                    {grandchild.questionCount} Q
                                  </span>
                                )}
                                {grandchild.linkCount != null && grandchild.linkCount > 0 && (
                                  <span className={cn(
                                    "text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5",
                                    isGcSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                                  )}>
                                    <Link2 className="w-2.5 h-2.5" />{grandchild.linkCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                // assessment / other nodes (non-draggable)
                const isASelected = selectedNode?.id === child.id;
                return (
                  <div key={child.id} className="border-b border-border/40 last:border-b-0">
                    <button
                      onClick={() => onSelectNode(child)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 text-left transition-all text-sm group",
                        isASelected ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted/40"
                      )}
                    >
                      <FileCheck className={cn("w-5 h-5 shrink-0", isASelected ? "text-primary-foreground" : "text-accent")} />
                      <span className="truncate flex-1 font-medium">{child.label}</span>
                      {child.questionCount != null && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          isASelected ? "bg-primary-foreground/20 text-primary-foreground" :
                          child.questionCount === 0 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                        )}>
                          {child.questionCount} Q
                        </span>
                      )}
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
                        isASelected ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </div>
                );
              })}
            </SortableContext>
            {(!node.children || node.children.length === 0) && (
              <p className="text-xs text-muted-foreground/60 px-4 py-3 italic">No modules</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Structure
          </h3>
          <div className="flex items-center gap-0.5">
            {isDraft && (
              <>
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-1" onClick={onAddPathway}>
                  <Plus className="w-3 h-3" /> Track
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-1" onClick={onAddModule}>
                  <Plus className="w-3 h-3" /> Module
                </Button>
              </>
            )}
            {onOpenLinkingPanel && (
              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] gap-1 text-primary" onClick={onOpenLinkingPanel}>
                <Link2 className="w-3 h-3" /> Link
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-warning" /> Locked</span>
        <span className="flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-destructive" /> Warning</span>
        <span className="flex items-center gap-1"><GripVertical className="w-2.5 h-2.5" /> Drag</span>
        <span className="flex items-center gap-1"><CheckSquare className="w-2.5 h-2.5 text-success" /> Done</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
        {tree.length === 0 ? (
          <div className="p-6 text-center">
            <Layers className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">
              No pathways or modules yet.
            </p>
            {isDraft && (
              <div className="flex flex-col gap-2 mt-3">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={onAddPathway}>
                  <Plus className="w-3 h-3" /> Add Learning Track
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={onAddModule}>
                  <Plus className="w-3 h-3" /> Add Module
                </Button>
              </div>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allModuleIds} strategy={verticalListSortingStrategy}>
              {tree.map((node) => renderPathway(node))}
            </SortableContext>

            <DragOverlay>
              {draggingNode ? (
                <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md bg-primary text-primary-foreground shadow-lg text-xs font-medium border border-primary/50">
                  <GripVertical className="w-3 h-3 text-primary-foreground/50" />
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="truncate">{draggingNode.label}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Overall Progress Footer */}
      <div className="px-3 py-2.5 border-t border-border space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-foreground">
            Progress
          </span>
          <span className="text-[10px] font-bold text-primary">
            {totalModules > 0 ? `${overallProgress}%` : "—"}
          </span>
        </div>
        <Progress value={overallProgress} className="h-1.5" />
        <div className="text-[9px] text-muted-foreground">
          {completedModules}/{totalModules} modules · {tree.length} tracks
        </div>
      </div>
    </div>
  );
}
