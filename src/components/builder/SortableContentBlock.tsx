import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText, Video, Package, File, Zap, Image, GripVertical, Trash2,
  ClipboardCheck, CalendarCheck, UserCheck, FolderOpen,
  MessageSquare, BookOpen, Users, FileSignature, Library, Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const blockTypeIcons: Record<string, any> = {
  text: FileText,
  video: Video,
  scorm: Package,
  file: File,
  document: File,
  interactive: Zap,
  image: Image,
  assignment: FileSignature,
  assessment: ClipboardCheck,
  attendance: CalendarCheck,
  mentor_review: UserCheck,
  dual_signoff: UserCheck,
  evidence_portfolio: FolderOpen,
  workplace_logbook: CalendarCheck,
  rubric: BookOpen,
  peer_review: Users,
  discussion: MessageSquare,
  resource_library: Library,
};

const blockTypeLabels: Record<string, string> = {
  text: "Rich Text",
  video: "Video",
  scorm: "SCORM Package",
  file: "File",
  document: "Document",
  interactive: "Interactive",
  image: "Image",
  assignment: "Assignment",
  assessment: "Assessment",
  attendance: "Attendance Log",
  mentor_review: "Mentor Review",
  dual_signoff: "Dual Sign-off",
  evidence_portfolio: "Evidence Portfolio",
  workplace_logbook: "Workplace Logbook",
  rubric: "Rubric",
  peer_review: "Peer Review",
  discussion: "Discussion",
  resource_library: "Resource Library",
};

const blockCategoryColors: Record<string, string> = {
  attendance: "border-l-success",
  mentor_review: "border-l-info",
  dual_signoff: "border-l-info",
  workplace_logbook: "border-l-success",
  evidence_portfolio: "border-l-accent",
  assessment: "border-l-destructive",
  assignment: "border-l-primary",
  rubric: "border-l-warning",
  peer_review: "border-l-warning",
  discussion: "border-l-secondary",
};

interface SortableContentBlockProps {
  block: {
    id: string;
    title: string;
    block_type: string;
    is_required: boolean;
    duration_minutes: number | null;
    is_governance_locked?: boolean;
    content?: any;
    file_url?: string | null;
  };
  isDraft: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (block: SortableContentBlockProps["block"]) => void;
}

export function SortableContentBlock({ block, isDraft, onDelete, onEdit }: SortableContentBlockProps) {
  const isLocked = block.is_governance_locked;
  const canDrag = isDraft && !isLocked;
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: block.id, disabled: !canDrag });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = blockTypeIcons[block.block_type] ?? FileText;
  const borderColor = blockCategoryColors[block.block_type];
  const isSpecial = !!borderColor;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => isDraft && !isLocked && onEdit?.(block)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors group",
        isSpecial ? `border-l-4 ${borderColor}` : "border-border",
        isDragging && "opacity-50 shadow-lg z-50",
        isLocked && "opacity-75",
        isDraft && !isLocked && "cursor-pointer"
      )}
    >
      {canDrag && (
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none shrink-0" tabIndex={-1}>
          <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
        </button>
      )}
      {isLocked && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="text-xs">Governance-locked block</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isSpecial ? "bg-secondary" : "bg-primary/10")}>
        <Icon className={cn("w-4 h-4", isSpecial ? "text-foreground" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{block.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {blockTypeLabels[block.block_type] ?? block.block_type}
          {block.duration_minutes ? ` · ${block.duration_minutes} min` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={block.is_required ? "default" : "outline"} className="text-[9px] px-1.5">
          {block.is_required ? "Required" : "Optional"}
        </Badge>
        {isDraft && !isLocked && onDelete && (
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
