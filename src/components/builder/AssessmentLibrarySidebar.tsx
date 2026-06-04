import { useState, useMemo, useCallback } from "react";
import {
  DndContext, closestCenter, useSensor, useSensors, PointerSensor,
  type DragEndEvent, DragOverlay, type DragStartEvent,
} from "@dnd-kit/core";
import {
  Search, Zap, Filter, FolderOpen, BookOpen, FileText,
  Link2, GripVertical, ChevronDown, ChevronRight, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { AssessmentLink } from "@/hooks/useAssessmentLinks";

interface Assessment {
  id: string;
  title: string;
  assessment_type: string;
  assessment_category?: string;
  module_id: string | null;
  programme_id: string;
  max_score?: number | null;
  pass_mark?: number | null;
}

interface AssessmentLibrarySidebarProps {
  assessments: Assessment[];
  assessmentLinks: AssessmentLink[];
  isDraft: boolean;
  onDropOnNode?: (assessmentId: string, nodeType: "pathway" | "module" | "lesson", nodeId: string) => void;
  onOpenLinkingPanel?: () => void;
  onCreateAssessment?: () => void;
  /** Currently hovered drop target from the tree */
  draggedAssessmentId: string | null;
  onDragStart: (assessmentId: string) => void;
  onDragEnd: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  diagnostic: "bg-info/10 text-info border-info/20",
  formative: "bg-success/10 text-success border-success/20",
  summative: "bg-warning/10 text-warning border-warning/20",
  transfer: "bg-primary/10 text-primary border-primary/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic",
  formative: "Formative",
  summative: "Summative",
  transfer: "Transfer",
};

const TYPE_ICONS: Record<string, string> = {
  quiz: "📝",
  test: "📊",
  project: "🎯",
  simulation: "🎭",
  peer_review: "👥",
  self_assessment: "🔍",
  skills_check: "✅",
  action_plan: "📋",
  observation: "👁️",
  portfolio: "📁",
};

export function AssessmentLibrarySidebar({
  assessments,
  assessmentLinks,
  isDraft,
  onOpenLinkingPanel,
  onCreateAssessment,
  draggedAssessmentId,
  onDragStart,
  onDragEnd,
}: AssessmentLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(true);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || a.assessment_category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [assessments, searchQuery, categoryFilter]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Assessment[]> = {};
    filteredAssessments.forEach((a) => {
      const cat = a.assessment_category || "formative";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });
    return groups;
  }, [filteredAssessments]);

  const categoryOrder = ["diagnostic", "formative", "summative", "transfer"];

  return (
    <div className="flex flex-col h-full border-l border-border bg-card">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Assessment Library
          </h3>
          <Badge variant="secondary" className="text-[9px]">
            {assessments.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-7 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            <SelectItem value="diagnostic" className="text-xs">Diagnostic</SelectItem>
            <SelectItem value="formative" className="text-xs">Formative</SelectItem>
            <SelectItem value="summative" className="text-xs">Summative</SelectItem>
            <SelectItem value="transfer" className="text-xs">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drag hint */}
      {isDraft && assessments.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border/50 text-[9px] text-muted-foreground bg-muted/30">
          <GripVertical className="w-2.5 h-2.5 inline mr-1" />
          Drag assessments onto the structure tree to link them, or use the{" "}
          <button onClick={onOpenLinkingPanel} className="text-primary hover:underline font-medium">
            Linking Panel
          </button>
        </div>
      )}

      {/* Assessment List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredAssessments.length === 0 ? (
            <div className="py-8 text-center">
              <Zap className="w-6 h-6 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">
                {assessments.length === 0 ? "No assessments created yet" : "No matching assessments"}
              </p>
              {assessments.length === 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Create assessments from the Assessments page
                </p>
              )}
            </div>
          ) : (
            categoryOrder
              .filter((cat) => grouped[cat]?.length > 0)
              .map((cat) => (
                <AssessmentCategoryGroup
                  key={cat}
                  category={cat}
                  assessments={grouped[cat]}
                  assessmentLinks={assessmentLinks}
                  isDraft={isDraft}
                  draggedAssessmentId={draggedAssessmentId}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))
          )}
        </div>
      </ScrollArea>

      {/* Footer: Quick actions */}
      {isDraft && (
        <div className="px-3 py-2 border-t border-border space-y-1.5">
          {onCreateAssessment && (
            <Button
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={onCreateAssessment}
            >
              <Plus className="w-3 h-3" />
              New Assessment
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-xs"
            onClick={onOpenLinkingPanel}
          >
            <Link2 className="w-3 h-3" />
            Open Linking Panel
          </Button>
        </div>
      )}
    </div>
  );
}

function AssessmentCategoryGroup({
  category,
  assessments,
  assessmentLinks,
  isDraft,
  draggedAssessmentId,
  onDragStart,
  onDragEnd,
}: {
  category: string;
  assessments: Assessment[];
  assessmentLinks: AssessmentLink[];
  isDraft: boolean;
  draggedAssessmentId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
        <Badge variant="outline" className={cn("text-[8px] px-1.5 border", CATEGORY_COLORS[category])}>
          {CATEGORY_LABELS[category]}
        </Badge>
        <span className="ml-auto text-[9px] font-normal">{assessments.length}</span>
      </button>

      {expanded && (
        <div className="space-y-0.5 mt-0.5">
          {assessments.map((assessment) => {
            const linkCount = assessmentLinks.filter((l) => l.assessment_id === assessment.id).length;
            const isDragging = draggedAssessmentId === assessment.id;

            return (
              <div
                key={assessment.id}
                draggable={isDraft}
                onDragStart={(e) => {
                  e.dataTransfer.setData("assessment_id", assessment.id);
                  e.dataTransfer.effectAllowed = "link";
                  onDragStart(assessment.id);
                }}
                onDragEnd={onDragEnd}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all group",
                  isDraft ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                  isDragging
                    ? "opacity-40 bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50 border border-transparent"
                )}
              >
                {isDraft && (
                  <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
                )}
                <span className="text-sm shrink-0">
                  {TYPE_ICONS[assessment.assessment_type] || "⚡"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">{assessment.title}</p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {assessment.assessment_type.replace(/_/g, " ")}
                    {assessment.max_score ? ` · ${assessment.max_score} marks` : ""}
                  </p>
                </div>
                {linkCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-[8px] px-1 shrink-0">
                          <Link2 className="w-2 h-2 mr-0.5" />{linkCount}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Linked to {linkCount} component{linkCount !== 1 ? "s" : ""}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
