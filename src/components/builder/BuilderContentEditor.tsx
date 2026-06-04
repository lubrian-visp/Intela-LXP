import { useState } from "react";
import {
  ChevronLeft, Pencil, MoreHorizontal, Plus, FileText, Video,
  Lock, BookOpen, FileCheck, Sparkles, Trash2,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TreeNode } from "./BuilderStructureTree";
import { SortableContentBlock } from "./SortableContentBlock";
import { AddContentBlockDialog } from "./AddContentBlockDialog";
import { AIGenerateBlocksDialog } from "./AIGenerateBlocksDialog";
import { AssessmentNodePanel } from "./AssessmentNodePanel";
import { cn } from "@/lib/utils";

interface BuilderContentEditorProps {
  selectedNode: TreeNode | null;
  parentNode?: TreeNode | null;
  onBack?: () => void;
  onSelectChild: (child: TreeNode) => void;
  isDraft: boolean;
  contentBlocks?: any[];
  onAddBlock?: (block: { title: string; block_type: string; is_required: boolean; duration_minutes?: number }) => void;
  onDeleteBlock?: (id: string) => void;
  onReorderBlocks?: (activeId: string, overId: string) => void;
  allowedBlockTypes?: string[];
  onEditBlock?: (block: any) => void;
  onAddAIBlocks?: (blocks: { title: string; block_type: string; is_required: boolean; duration_minutes?: number; content?: any }[]) => void;
  programmeTitle?: string;
  programmeId?: string;
  moduleType?: string;
  aiEnabled?: boolean;
  onEditSelectedNode?: (node: TreeNode) => void;
  onDeleteSelectedNode?: (node: TreeNode) => void;
}

export function BuilderContentEditor({
  selectedNode, parentNode, onBack, onSelectChild, isDraft,
  contentBlocks = [], onAddBlock, onDeleteBlock, onReorderBlocks, allowedBlockTypes, onEditBlock,
  onAddAIBlocks, programmeTitle, programmeId, moduleType, aiEnabled = true, onEditSelectedNode, onDeleteSelectedNode,
}: BuilderContentEditorProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderBlocks?.(active.id as string, over.id as string);
    }
  };

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <BookOpen className="w-16 h-16 text-muted-foreground/10 mb-6" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          Select an item from the structure tree
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-md">
          Click on a module, lesson, or assessment to view and edit its details,
          content blocks, and configuration.
        </p>
      </div>
    );
  }

  const isModule = selectedNode.type === "module";
  const isAssessment = selectedNode.type === "assessment";
  const isPathway = selectedNode.type === "pathway";

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm min-w-0">
          {parentNode && (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                {parentNode.label}
              </button>
              <span className="text-muted-foreground/50">›</span>
            </>
          )}
          <span className="font-semibold text-foreground truncate underline decoration-primary underline-offset-4">
            {selectedNode.label}
          </span>
          {selectedNode.isGovernanceLocked && (
            <Badge variant="outline" className="text-[9px] gap-1 text-warning border-warning/30">
              <Lock className="w-2.5 h-2.5" /> Governance Locked
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isDraft && !selectedNode.isGovernanceLocked && (isPathway || isModule) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onEditSelectedNode?.(selectedNode)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onEditSelectedNode?.(selectedNode)}
                disabled={!isDraft || selectedNode.isGovernanceLocked || (!isPathway && !isModule)}
                className="text-xs gap-2"
              >
                <Pencil className="w-3 h-3" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteSelectedNode?.(selectedNode)}
                disabled={!isDraft || selectedNode.isGovernanceLocked || (!isPathway && !isModule)}
                className="text-xs gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable Content with Tabs */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Module View ── */}
        {isModule && (
          <Tabs defaultValue="content" className="h-full">
            <div className="px-6 pt-3 border-b border-border">
              <TabsList className="h-8">
                <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                <TabsTrigger value="outcomes" className="text-xs">Outcomes</TabsTrigger>
                <TabsTrigger value="weighting" className="text-xs">Weighting</TabsTrigger>
                <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
              </TabsList>
            </div>

            {/* Content Tab */}
            <TabsContent value="content" className="p-6 space-y-6 mt-0">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-foreground">
                    Content Blocks
                    {contentBlocks.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({contentBlocks.length})
                      </span>
                    )}
                  </h3>
                  {isDraft && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Manual
                      </Button>
                      {aiEnabled && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5" onClick={() => setAiDialogOpen(true)}>
                          <Sparkles className="w-3.5 h-3.5" /> AI Generate
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {contentBlocks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No content blocks yet. Add blocks manually or generate with AI.
                    </p>
                    {isDraft && (
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setAddDialogOpen(true)}>
                          <Plus className="w-3 h-3" /> Add Manually
                        </Button>
                        {aiEnabled && (
                          <Button size="sm" variant="outline" className="text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setAiDialogOpen(true)}>
                            <Sparkles className="w-3 h-3" /> AI Generate
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={contentBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {contentBlocks.map((block) => (
                          <SortableContentBlock key={block.id} block={block} isDraft={isDraft} onDelete={onDeleteBlock} onEdit={onEditBlock} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Linked assessments */}
              {selectedNode.children && selectedNode.children.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Linked Assessments</h3>
                    {selectedNode.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => onSelectChild(child)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 text-left transition-colors"
                      >
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{child.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Unlocks after completing this module
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="p-6 space-y-4 mt-0">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Module Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailCard label="Title" value={selectedNode.label} />
                  <DetailCard label="Type" value={selectedNode.moduleType ?? "theory"} />
                  <DetailCard label="Duration" value={selectedNode.subtitle?.match(/(\d+)h/)?.[1] ? `${selectedNode.subtitle?.match(/(\d+)h/)?.[1]} hours` : "—"} />
                  <DetailCard label="Credits" value={selectedNode.subtitle?.match(/(\d+) credits/)?.[1] ?? "—"} />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Availability Rules</h3>
                <p className="text-xs text-muted-foreground">
                  Configure release dates, prerequisites, and access windows for this module.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailCard label="Prerequisites" value="None configured" />
                  <DetailCard label="Access Window" value="Always available" />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Completion Rules</h3>
                <p className="text-xs text-muted-foreground">Define what marks this module as complete.</p>
                <div className="grid grid-cols-2 gap-3">
                  <DetailCard label="Completion Type" value="All required blocks" />
                  <DetailCard label="Min. Score" value="50%" />
                </div>
              </div>
            </TabsContent>

            {/* Outcomes Tab */}
            <TabsContent value="outcomes" className="p-6 space-y-4 mt-0">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-3">Learning Outcomes</h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                  <li>Understand the core concepts of this module.</li>
                  <li>Identify key terminology and definitions.</li>
                  <li>Apply theoretical knowledge in practical scenarios.</li>
                </ul>
                {isDraft && (
                  <Button size="sm" variant="outline" className="mt-4 text-xs gap-1">
                    <Pencil className="w-3 h-3" /> Edit Outcomes
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Weighting Tab */}
            <TabsContent value="weighting" className="p-6 space-y-4 mt-0">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Weighting Allocation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailCard label="Programme Contribution" value="—" />
                  <DetailCard label="Assessment Weight" value="100%" />
                  <DetailCard label="Domain" value={selectedNode.moduleType === "theory" ? "Knowledge" : selectedNode.moduleType === "practical" ? "Practical" : "Workplace"} />
                  <DetailCard label="Mandatory" value="Yes" />
                </div>
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="p-6 space-y-4 mt-0">
              <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h3 className="text-base font-semibold text-foreground">Compliance Check</h3>
                <div className="space-y-2">
                  <ComplianceRow status="pass" label="Has content blocks" />
                  <ComplianceRow status={contentBlocks.length > 0 ? "pass" : "fail"} label="At least one required block" />
                  <ComplianceRow status="warn" label="Assessment linked to module" />
                  <ComplianceRow status="pass" label="Duration configured" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* ── Assessment View ── */}
        {isAssessment && programmeId && (
          <AssessmentNodePanel
            assessmentId={selectedNode.id}
            programmeId={programmeId}
            isDraft={isDraft}
          />
        )}

        {/* ── Pathway View ── */}
        {isPathway && (
          <div className="p-6 space-y-6">
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground mb-2">{selectedNode.label}</h3>
              {selectedNode.subtitle && (
                <p className="text-sm text-muted-foreground">{selectedNode.subtitle}</p>
              )}
            </div>

            {selectedNode.children && selectedNode.children.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                  Modules ({selectedNode.children.length})
                </h3>
                <div className="space-y-2">
                  {selectedNode.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onSelectChild(child)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-left transition-colors border border-border/50"
                    >
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{child.label}</p>
                        {child.subtitle && (
                          <p className="text-xs text-muted-foreground">{child.subtitle}</p>
                        )}
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Block Dialog */}
      <AddContentBlockDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={(block) => onAddBlock?.(block)}
        allowedBlockTypes={allowedBlockTypes}
      />

      {/* AI Generate Blocks Dialog */}
      {isModule && (
        <AIGenerateBlocksDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          moduleTitle={selectedNode.label}
          moduleType={moduleType || selectedNode.moduleType || "theory"}
          programmeTitle={programmeTitle || ""}
          onAddBlocks={(blocks) => onAddAIBlocks?.(blocks)}
        />
      )}
    </div>
  );
}

/* ── Helper Components ── */

function DetailCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-medium text-foreground mt-1 flex items-center gap-1.5">
        {icon}
        {value}
      </p>
    </div>
  );
}

function ComplianceRow({ status, label }: { status: "pass" | "fail" | "warn"; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={cn(
        "w-2 h-2 rounded-full shrink-0",
        status === "pass" ? "bg-success" : status === "fail" ? "bg-destructive" : "bg-warning"
      )} />
      <span className={cn(
        status === "pass" ? "text-foreground" : status === "fail" ? "text-destructive" : "text-warning"
      )}>
        {label}
      </span>
    </div>
  );
}
