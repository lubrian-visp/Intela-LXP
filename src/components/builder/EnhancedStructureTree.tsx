import { useState, useCallback, useMemo } from "react";
import { Search, X, CircleDot, CircleCheck, Lock, FileEdit, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BuilderStructureTree, type TreeNode } from "./BuilderStructureTree";
import { cn } from "@/lib/utils";

// ── Status badge logic ──
function getNodeStatusBadge(node: TreeNode): { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any } | null {
  if (node.isGovernanceLocked) {
    return { label: "Locked", variant: "outline", icon: Lock };
  }
  if (node.isComplete) {
    return { label: "Complete", variant: "default", icon: CircleCheck };
  }
  if (node.isDraft !== false) {
    return { label: "Draft", variant: "secondary", icon: FileEdit };
  }
  return { label: "Published", variant: "default", icon: CircleDot };
}

// ── Filter helper: recursively match nodes ──
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return nodes;
  const q = query.toLowerCase();
  return nodes.reduce<TreeNode[]>((acc, node) => {
    const labelMatch = node.label.toLowerCase().includes(q);
    const typeMatch = node.type.toLowerCase().includes(q);
    const subtitleMatch = node.subtitle?.toLowerCase().includes(q);
    const filteredChildren = node.children ? filterTree(node.children, query) : [];

    if (labelMatch || typeMatch || subtitleMatch || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      });
    }
    return acc;
  }, []);
}

// ── Flatten tree for move-target selection ──
function flattenPathways(tree: TreeNode[]): { id: string; label: string }[] {
  return tree
    .filter((n) => n.type === "pathway" && n.id !== "_unassigned")
    .map((n) => ({ id: n.id, label: n.label }));
}

// ── Move Module Dialog ──
interface MoveModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: TreeNode | null;
  pathways: { id: string; label: string }[];
  currentPathwayId?: string;
  onMove: (moduleId: string, targetPathwayId: string | null) => void;
}

function MoveModuleDialog({ open, onOpenChange, node, pathways, currentPathwayId, onMove }: MoveModuleDialogProps) {
  const [targetPathway, setTargetPathway] = useState<string>("");

  const handleMove = () => {
    if (!node) return;
    onMove(node.id, targetPathway === "none" ? null : targetPathway);
    onOpenChange(false);
    setTargetPathway("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Move Module</DialogTitle>
          <DialogDescription className="text-xs">
            Move &ldquo;{node?.label}&rdquo; to a different learning track.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Select value={targetPathway} onValueChange={setTargetPathway}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select target track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Unassigned</SelectItem>
              {pathways
                .filter((p) => p.id !== currentPathwayId)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs" onClick={handleMove} disabled={!targetPathway}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Status legend strip ──
function StatusLegend() {
  return (
    <div className="px-3 py-1 flex items-center gap-2 text-[9px] text-muted-foreground border-b border-border/30">
      <span className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success" /> Published
      </span>
      <span className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" /> Draft
      </span>
      <span className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Locked
      </span>
    </div>
  );
}

// ── Main Enhanced Wrapper ──
export interface EnhancedStructureTreeProps {
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
  onMoveModule?: (moduleId: string, targetPathwayId: string | null) => void;
}

export function EnhancedStructureTree(props: EnhancedStructureTreeProps) {
  const {
    tree, selectedNode, onSelectNode, isDraft, onMoveModule, onDuplicateNode,
    ...restProps
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingNode, setMovingNode] = useState<TreeNode | null>(null);
  const [movingCurrentPathway, setMovingCurrentPathway] = useState<string | undefined>();

  // Filtered tree
  const filteredTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);

  // Pathway options for move dialog
  const pathwayOptions = useMemo(() => flattenPathways(tree), [tree]);

  // Count matching nodes for search feedback
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const countNodes = (nodes: TreeNode[]): number =>
      nodes.reduce((sum, n) => sum + 1 + (n.children ? countNodes(n.children) : 0), 0);
    return countNodes(filteredTree);
  }, [filteredTree, searchQuery]);

  // Enhanced duplicate handler — pass through
  const handleDuplicate = useCallback(
    (node: TreeNode) => {
      onDuplicateNode?.(node);
    },
    [onDuplicateNode]
  );

  // Move handler — opens dialog for modules
  const handleMoveNode = useCallback(
    (node: TreeNode) => {
      if (node.type !== "module") return;
      // Find current pathway
      const parentPathway = tree.find((p) => p.children?.some((c) => c.id === node.id));
      setMovingCurrentPathway(parentPathway?.id);
      setMovingNode(node);
      setMoveDialogOpen(true);
    },
    [tree]
  );

  const handleMoveConfirm = useCallback(
    (moduleId: string, targetPathwayId: string | null) => {
      onMoveModule?.(moduleId, targetPathwayId);
    },
    [onMoveModule]
  );

  // Annotate tree nodes with status badges for the enhanced view
  const annotatedTree = useMemo(() => {
    const annotate = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((node) => ({
        ...node,
        children: node.children ? annotate(node.children) : undefined,
      }));
    return annotate(filteredTree);
  }, [filteredTree]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="px-2 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search outline..."
            className="h-7 text-xs pl-7 pr-7 bg-muted/30 border-border/50 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        {matchCount !== null && (
          <p className="text-[9px] text-muted-foreground mt-0.5 px-1">
            {matchCount} {matchCount === 1 ? "item" : "items"} found
          </p>
        )}
      </div>

      {/* Status Legend */}
      <StatusLegend />

      {/* Delegate to existing BuilderStructureTree */}
      <div className="flex-1 min-h-0">
        <BuilderStructureTree
          tree={annotatedTree}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          isDraft={isDraft}
          onDuplicateNode={handleDuplicate}
          {...restProps}
        />
      </div>

      {/* Move Module Dialog */}
      <MoveModuleDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        node={movingNode}
        pathways={pathwayOptions}
        currentPathwayId={movingCurrentPathway}
        onMove={handleMoveConfirm}
      />
    </div>
  );
}
