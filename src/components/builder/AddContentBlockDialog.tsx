import { useState } from "react";
import {
  FileText, Video, Package, File, Zap, Image,
  ClipboardCheck, CalendarCheck, UserCheck, FolderOpen,
  MessageSquare, BookOpen, Users, FileSignature, Library,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const ALL_BLOCK_TYPES = [
  // Content
  { value: "text", label: "Rich Text", icon: FileText, description: "Formatted text, tables, images", category: "content" },
  { value: "video", label: "Video", icon: Video, description: "Embedded or uploaded video", category: "content" },
  { value: "document", label: "Document", icon: File, description: "PDF, Word, PowerPoint", category: "content" },
  { value: "scorm", label: "SCORM", icon: Package, description: "SCORM/xAPI content package", category: "content" },
  { value: "image", label: "Image", icon: Image, description: "Image content block", category: "content" },
  { value: "interactive", label: "Interactive", icon: Zap, description: "Interactive element", category: "content" },
  { value: "resource_library", label: "Resource Library", icon: Library, description: "Additional materials & files", category: "content" },
  // Assessment
  { value: "assessment", label: "Assessment", icon: ClipboardCheck, description: "Test, exam, knowledge check", category: "assessment" },
  { value: "assignment", label: "Assignment", icon: FileSignature, description: "Learner task submission", category: "assessment" },
  { value: "rubric", label: "Rubric", icon: BookOpen, description: "Grading criteria & weightings", category: "assessment" },
  { value: "evidence_portfolio", label: "Evidence Portfolio", icon: FolderOpen, description: "Portfolio of evidence upload", category: "assessment" },
  { value: "peer_review", label: "Peer Review", icon: Users, description: "Peer feedback allocation", category: "assessment" },
  // Workplace
  { value: "attendance", label: "Attendance Log", icon: CalendarCheck, description: "Session/workplace attendance", category: "workplace" },
  { value: "mentor_review", label: "Mentor Review", icon: UserCheck, description: "Mentor sign-off checkpoint", category: "workplace" },
  { value: "dual_signoff", label: "Dual Sign-off", icon: UserCheck, description: "Two mentor signatures required", category: "workplace" },
  { value: "workplace_logbook", label: "Workplace Logbook", icon: CalendarCheck, description: "On-job training log entries", category: "workplace" },
  // Engagement
  { value: "discussion", label: "Discussion", icon: MessageSquare, description: "Forum thread / Q&A", category: "engagement" },
] as const;

interface AddContentBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (block: {
    title: string;
    block_type: string;
    is_required: boolean;
    duration_minutes?: number;
  }) => void;
  allowedBlockTypes?: string[];
}

export function AddContentBlockDialog({ open, onOpenChange, onAdd, allowedBlockTypes }: AddContentBlockDialogProps) {
  const [selectedType, setSelectedType] = useState<string>("text");
  const [title, setTitle] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [duration, setDuration] = useState("");

  const visibleTypes = allowedBlockTypes
    ? ALL_BLOCK_TYPES.filter(bt => allowedBlockTypes.includes(bt.value))
    : ALL_BLOCK_TYPES;

  const categories = [
    { key: "content", label: "Content" },
    { key: "assessment", label: "Assessment" },
    { key: "workplace", label: "Workplace" },
    { key: "engagement", label: "Engagement" },
  ].filter(c => visibleTypes.some(bt => bt.category === c.key));

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      block_type: selectedType,
      is_required: isRequired,
      duration_minutes: duration ? parseInt(duration) : undefined,
    });
    setTitle("");
    setSelectedType("text");
    setIsRequired(true);
    setDuration("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content Block</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {categories.map(cat => {
            const catTypes = visibleTypes.filter(bt => bt.category === cat.key);
            if (catTypes.length === 0) return null;
            return (
              <div key={cat.key}>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  {cat.label}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {catTypes.map((bt) => {
                    const Icon = bt.icon;
                    return (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => setSelectedType(bt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-colors",
                          selectedType === bt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-medium leading-tight">{bt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <Label htmlFor="block-title">Title</Label>
            <Input id="block-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Key Concepts" />
          </div>

          <div>
            <Label htmlFor="block-duration">Duration (minutes, optional)</Label>
            <Input id="block-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 15" min={1} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="block-required" className="cursor-pointer">Required for completion</Label>
            <Switch id="block-required" checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>Add Block</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
