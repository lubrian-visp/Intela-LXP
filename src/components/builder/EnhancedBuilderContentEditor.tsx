import { useState, useCallback } from "react";
import { Eye, EyeOff, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BuilderContentEditor } from "./BuilderContentEditor";
import { ContentPreviewPanel } from "./ContentPreviewPanel";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { useUndoRedo, type UndoRedoAction } from "@/hooks/useUndoRedo";
import { useAutoSave, type AutoSaveStatus } from "@/hooks/useAutoSave";
import type { TreeNode } from "./BuilderStructureTree";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EnhancedBuilderContentEditorProps {
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
  autoSaveStatus?: AutoSaveStatus;
  lastSavedAt?: Date | null;
}

export function EnhancedBuilderContentEditor(props: EnhancedBuilderContentEditorProps) {
  const {
    selectedNode, contentBlocks = [], onAddBlock, onDeleteBlock, onReorderBlocks,
    isDraft, autoSaveStatus: externalStatus, lastSavedAt: externalLastSaved,
    ...restProps
  } = props;

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Undo/Redo for block operations
  const { pushAction, undo, redo, canUndo, canRedo, lastAction } = useUndoRedo({
    onUndo: (action) => toast.info(`Undone: ${action.label}`),
    onRedo: (action) => toast.info(`Redone: ${action.label}`),
  });

  // Auto-save — uses external status if provided, else internal tracking
  const { status: internalStatus, lastSavedAt: internalLastSaved, markDirty } = useAutoSave({
    enabled: isDraft,
    debounceMs: 2000,
  });

  const saveStatus = externalStatus ?? internalStatus;
  const savedAt = externalLastSaved ?? internalLastSaved;

  // Enhanced add block with undo support
  const handleAddBlock = useCallback(
    (block: { title: string; block_type: string; is_required: boolean; duration_minutes?: number }) => {
      onAddBlock?.(block);
      markDirty();
      // Note: We can't easily undo adds without knowing the created ID.
      // For now, we track it for the action count but true undo would need the callback to return the ID.
      pushAction({
        type: "add",
        payload: block,
        label: `Add "${block.title}"`,
        undo: () => {
          // Full undo of add requires the block ID — this is a limitation
          // that would be resolved with a more integrated state management approach
          toast.info("Undo for add operations requires page refresh");
        },
        redo: () => onAddBlock?.(block),
      });
    },
    [onAddBlock, pushAction, markDirty]
  );

  // Enhanced delete with undo support
  const handleDeleteBlock = useCallback(
    (id: string) => {
      const deletedBlock = contentBlocks.find((b) => b.id === id);
      onDeleteBlock?.(id);
      markDirty();
      if (deletedBlock) {
        pushAction({
          type: "delete",
          payload: deletedBlock,
          label: `Delete "${deletedBlock.title}"`,
          undo: () => {
            // Re-add the block
            onAddBlock?.({
              title: deletedBlock.title,
              block_type: deletedBlock.block_type,
              is_required: deletedBlock.is_required,
              duration_minutes: deletedBlock.duration_minutes,
            });
          },
          redo: () => onDeleteBlock?.(id),
        });
      }
    },
    [onDeleteBlock, onAddBlock, contentBlocks, pushAction, markDirty]
  );

  // Enhanced reorder with undo support
  const handleReorderBlocks = useCallback(
    (activeId: string, overId: string) => {
      onReorderBlocks?.(activeId, overId);
      markDirty();
      pushAction({
        type: "reorder",
        payload: { activeId, overId },
        label: "Reorder blocks",
        undo: () => onReorderBlocks?.(overId, activeId),
        redo: () => onReorderBlocks?.(activeId, overId),
      });
    },
    [onReorderBlocks, pushAction, markDirty]
  );

  // Preview mode — show learner view
  if (isPreviewMode && selectedNode?.type === "module") {
    return (
      <ContentPreviewPanel
        blocks={contentBlocks}
        moduleTitle={selectedNode.label}
        onClose={() => setIsPreviewMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Toolbar */}
      {selectedNode && isDraft && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={undo}
                    disabled={!canUndo}
                    aria-label="Undo (Ctrl+Z)"
                  >
                    <Undo2 className={cn("w-3.5 h-3.5", canUndo ? "text-foreground" : "text-muted-foreground/40")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Undo{lastAction ? `: ${lastAction.label}` : ""} (Ctrl+Z)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={redo}
                    disabled={!canRedo}
                    aria-label="Redo (Ctrl+Shift+Z)"
                  >
                    <Redo2 className={cn("w-3.5 h-3.5", canRedo ? "text-foreground" : "text-muted-foreground/40")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Redo (Ctrl+Shift+Z)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-4 mx-1" />

            {/* Preview Toggle */}
            {selectedNode.type === "module" && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={isPreviewMode ? "secondary" : "ghost"}
                      className="h-7 gap-1.5 text-xs px-2"
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                    >
                      {isPreviewMode ? (
                        <><EyeOff className="w-3.5 h-3.5" /> Edit</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5" /> Preview</>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Toggle learner preview
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Auto-save Indicator */}
          <AutoSaveIndicator status={saveStatus} lastSavedAt={savedAt} />
        </div>
      )}

      {/* Delegate to existing BuilderContentEditor */}
      <div className="flex-1 min-h-0">
        <BuilderContentEditor
          selectedNode={selectedNode}
          isDraft={isDraft}
          contentBlocks={contentBlocks}
          onAddBlock={handleAddBlock}
          onDeleteBlock={handleDeleteBlock}
          onReorderBlocks={handleReorderBlocks}
          {...restProps}
        />
      </div>
    </div>
  );
}
