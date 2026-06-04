import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap, Clock, Target, Award, FileText, Users, Clipboard, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
}

interface CreateAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmeId: string;
  modules: Module[];
  onSubmit: (data: {
    title: string;
    description: string;
    assessment_type: string;
    assessment_category: string;
    module_id: string | null;
    max_score: number | null;
    pass_mark: number | null;
    due_date: string | null;
    weighting: number | null;
  }) => void;
  isPending?: boolean;
  /** Pre-fill for editing */
  initialData?: {
    id: string;
    title: string;
    description?: string | null;
    assessment_type: string;
    assessment_category?: string;
    module_id?: string | null;
    max_score?: number | null;
    pass_mark?: number | null;
    due_date?: string | null;
    weighting?: number | null;
  };
}

const CATEGORIES = [
  {
    value: "diagnostic",
    label: "Diagnostic",
    description: "Pre-assessments to gauge entering knowledge",
    icon: Target,
    color: "text-info",
    types: [
      { value: "self_assessment", label: "Self-Assessment" },
      { value: "pre_test", label: "Pre-Test" },
      { value: "skills_gap", label: "Skills Gap Analysis" },
      { value: "prior_knowledge", label: "Prior Knowledge Check" },
    ],
  },
  {
    value: "formative",
    label: "Formative",
    description: "Practice & feedback during learning",
    icon: BookOpen,
    color: "text-success",
    types: [
      { value: "formative", label: "Quiz" },
      { value: "homework", label: "Homework" },
      { value: "peer_group", label: "Peer Review" },
      { value: "knowledge_check", label: "Knowledge Check" },
      { value: "reflection_journal", label: "Reflection Journal" },
      { value: "exit_ticket", label: "Exit Ticket" },
      { value: "simulation", label: "Practice Simulation" },
      { value: "polling", label: "Polling / Audience Response" },
    ],
  },
  {
    value: "summative",
    label: "Summative",
    description: "Formal evaluation of competency",
    icon: Award,
    color: "text-warning",
    types: [
      { value: "summative", label: "Test / Exam" },
      { value: "final_project", label: "Final Project / Capstone" },
      { value: "competency", label: "Competency Assessment" },
      { value: "oral", label: "Oral Examination" },
      { value: "portfolio", label: "Portfolio Assessment" },
      { value: "group_project", label: "Group Project" },
      { value: "practical_exam", label: "Practical Exam" },
      { value: "certification_exam", label: "Certification Exam" },
    ],
  },
  {
    value: "transfer",
    label: "Transfer",
    description: "Post-training application & verification",
    icon: Clipboard,
    color: "text-primary",
    types: [
      { value: "action_plan", label: "Action Plan (30-60-90 day)" },
      { value: "manager_observation", label: "Manager Observation Checklist" },
      { value: "follow_up", label: "Follow-Up Assessment" },
      { value: "workplace", label: "On-Job Application Verification" },
    ],
  },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  diagnostic: "bg-info/10 text-info border-info/20",
  formative: "bg-success/10 text-success border-success/20",
  summative: "bg-warning/10 text-warning border-warning/20",
  transfer: "bg-primary/10 text-primary border-primary/20",
};

export function CreateAssessmentDialog({
  open,
  onOpenChange,
  programmeId,
  modules,
  onSubmit,
  isPending,
  initialData,
}: CreateAssessmentDialogProps) {
  const isEditing = !!initialData;

  const [category, setCategory] = useState(initialData?.assessment_category || "");
  const [assessmentType, setAssessmentType] = useState(initialData?.assessment_type || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [moduleId, setModuleId] = useState(initialData?.module_id || "");
  const [maxScore, setMaxScore] = useState(initialData?.max_score?.toString() || "100");
  const [passMark, setPassMark] = useState(initialData?.pass_mark?.toString() || "50");
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");
  const [weighting, setWeighting] = useState(initialData?.weighting?.toString() || "");
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimit, setTimeLimit] = useState("");

  const selectedCategory = CATEGORIES.find((c) => c.value === category);
  const availableTypes = selectedCategory?.types || [];

  const handleSubmit = () => {
    if (!title || !assessmentType || !category) return;
    onSubmit({
      title,
      description,
      assessment_type: assessmentType,
      assessment_category: category,
      module_id: moduleId || null,
      max_score: maxScore ? parseInt(maxScore) : null,
      pass_mark: passMark ? parseInt(passMark) : null,
      due_date: dueDate || null,
      weighting: weighting ? parseFloat(weighting) : null,
    });

    if (!isEditing) {
      // Reset form
      setCategory("");
      setAssessmentType("");
      setTitle("");
      setDescription("");
      setModuleId("");
      setMaxScore("100");
      setPassMark("50");
      setDueDate("");
      setWeighting("");
    }
  };

  // Category-specific field visibility
  const showScoring = category === "formative" || category === "summative";
  const showDueDate = category !== "diagnostic";
  const showWeighting = category === "summative";
  const showPassMark = category === "summative" || category === "formative";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            {isEditing ? "Edit Assessment" : "Create Assessment"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update assessment details and configuration"
              : "Select a category and type, then configure the assessment"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 pb-6">
            {/* Step 1: Category Selection */}
            {!isEditing && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Assessment Category
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => {
                          setCategory(cat.value);
                          setAssessmentType("");
                        }}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cat.color)} />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{cat.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cat.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Type Selection */}
            {category && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isEditing ? "Assessment Type" : "2. Assessment Type"}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setAssessmentType(type.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        assessmentType === type.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {assessmentType && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isEditing ? "Details" : "3. Details"}
                  </Label>

                  <div className="space-y-3">
                    {/* Title */}
                    <div className="space-y-1">
                      <Label className="text-xs">Title *</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Module 1 Knowledge Check"
                        className="text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label className="text-xs">Description / Instructions</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Instructions for learners..."
                        className="text-sm min-h-[80px]"
                      />
                    </div>

                    {/* Module */}
                    <div className="space-y-1">
                      <Label className="text-xs">Linked Module (optional)</Label>
                      <Select value={moduleId} onValueChange={setModuleId}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select module..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">None (Programme-level)</SelectItem>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs">{m.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Scoring fields */}
                    {showScoring && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Max Score</Label>
                          <Input
                            type="number"
                            value={maxScore}
                            onChange={(e) => setMaxScore(e.target.value)}
                            placeholder="100"
                            className="text-sm"
                          />
                        </div>
                        {showPassMark && (
                          <div className="space-y-1">
                            <Label className="text-xs">Pass Mark</Label>
                            <Input
                              type="number"
                              value={passMark}
                              onChange={(e) => setPassMark(e.target.value)}
                              placeholder="50"
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weighting */}
                    {showWeighting && (
                      <div className="space-y-1">
                        <Label className="text-xs">Weighting (%)</Label>
                        <Input
                          type="number"
                          value={weighting}
                          onChange={(e) => setWeighting(e.target.value)}
                          placeholder="e.g., 30"
                          className="text-sm"
                          min={0}
                          max={100}
                        />
                        <p className="text-[10px] text-muted-foreground">Percentage contribution to overall grade</p>
                      </div>
                    )}

                    {/* Due Date */}
                    {showDueDate && (
                      <div className="space-y-1">
                        <Label className="text-xs">Due Date (optional)</Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {/* Summary badge */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                      <Badge variant="outline" className={cn("text-[9px] border", CATEGORY_BADGE_COLORS[category])}>
                        {selectedCategory?.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <Badge variant="outline" className="text-[9px]">
                        {availableTypes.find((t) => t.value === assessmentType)?.label}
                      </Badge>
                      {title && (
                        <>
                          <span className="text-[10px] text-muted-foreground">→</span>
                          <span className="text-[10px] font-medium text-foreground truncate">{title}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title || !assessmentType || !category || isPending}
            className="gap-1.5"
          >
            <Zap className="w-3 h-3" />
            {isPending ? "Saving..." : isEditing ? "Update Assessment" : "Create Assessment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
