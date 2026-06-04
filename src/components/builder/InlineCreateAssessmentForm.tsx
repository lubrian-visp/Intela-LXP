import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Zap, Target, Award, Clipboard, BookOpen, X, Users, FileText, Settings2,
  CheckCircle2, ShieldCheck, ListChecks, Library, Database, Trash2, Plus,
  ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRubrics } from "@/hooks/useRubrics";
import { useQuestionBanks } from "@/hooks/useQuestionBank";
import { useProgrammeAssessmentConfig } from "@/hooks/useProgrammeAssessmentConfig";

interface Module { id: string; title: string }
export interface LearningOutcome { code: string; description: string; bloom_level?: string }

interface InlineCreateAssessmentFormProps {
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
    requires_moderation: boolean;
    learning_outcomes: LearningOutcome[];
    rubric_id: string | null;
    question_bank_id: string | null;
  }) => void;
  onCancel: () => void;
  isPending?: boolean;
  mode?: "create" | "edit";
  initialData?: {
    title?: string | null;
    description?: string | null;
    assessment_type?: string | null;
    assessment_category?: string | null;
    module_id?: string | null;
    max_score?: number | null;
    pass_mark?: number | null;
    due_date?: string | null;
    weighting?: number | null;
    requires_moderation?: boolean | null;
    learning_outcomes?: LearningOutcome[] | null;
    rubric_id?: string | null;
    question_bank_id?: string | null;
  };
}

const CATEGORIES = [
  {
    value: "diagnostic", label: "Diagnostic",
    description: "Pre-assessments to gauge entering knowledge",
    icon: Target, accent: "text-info", ring: "ring-info/40", soft: "bg-info/5",
    types: [
      { value: "self_assessment", label: "Self-Assessment" },
      { value: "pre_test", label: "Pre-Test" },
      { value: "skills_gap", label: "Skills Gap Analysis" },
      { value: "prior_knowledge", label: "Prior Knowledge Check" },
    ],
  },
  {
    value: "formative", label: "Formative",
    description: "Practice & feedback during learning",
    icon: BookOpen, accent: "text-success", ring: "ring-success/40", soft: "bg-success/5",
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
    value: "summative", label: "Summative",
    description: "Formal evaluation of competency",
    icon: Award, accent: "text-warning", ring: "ring-warning/40", soft: "bg-warning/5",
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
    value: "transfer", label: "Transfer",
    description: "Post-training application & verification",
    icon: Clipboard, accent: "text-primary", ring: "ring-primary/40", soft: "bg-primary/5",
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

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];

type StepKey = "basics" | "details" | "scoring" | "resources";

interface StepDef {
  key: StepKey;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  { key: "basics",    label: "Basics",                shortLabel: "Basics",    description: "Category & assessment type", icon: Target },
  { key: "details",   label: "Details & Outcomes",    shortLabel: "Details",   description: "Title, module & learning outcomes", icon: Settings2 },
  { key: "scoring",   label: "Scoring & Candidates",  shortLabel: "Scoring",   description: "Marks, moderation & audience", icon: Award },
  { key: "resources", label: "Resources",             shortLabel: "Resources", description: "Rubric & question bank (optional)", icon: Library },
];

export function InlineCreateAssessmentForm({
  programmeId, modules, onSubmit, onCancel, isPending, mode = "create", initialData,
}: InlineCreateAssessmentFormProps) {
  const isEdit = mode === "edit";
  const [stepKey, setStepKey] = useState<StepKey>("basics");
  const [category, setCategory] = useState(initialData?.assessment_category ?? "");
  const [assessmentType, setAssessmentType] = useState(initialData?.assessment_type ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [moduleId, setModuleId] = useState(initialData?.module_id ?? "");
  const [maxScore, setMaxScore] = useState(initialData?.max_score?.toString() ?? "100");
  const [passMark, setPassMark] = useState(initialData?.pass_mark?.toString() ?? "50");
  const [dueDate, setDueDate] = useState(initialData?.due_date ?? "");
  const [weighting, setWeighting] = useState(initialData?.weighting?.toString() ?? "");
  const [audience, setAudience] = useState("all");
  const [requiresModeration, setRequiresModeration] = useState<boolean>(initialData?.requires_moderation ?? false);
  const [moderationTouched, setModerationTouched] = useState(false);
  const [outcomes, setOutcomes] = useState<LearningOutcome[]>(initialData?.learning_outcomes ?? []);
  const [rubricId, setRubricId] = useState<string>(initialData?.rubric_id ?? "");
  const [questionBankId, setQuestionBankId] = useState<string>(initialData?.question_bank_id ?? "");

  const { data: programmeConfig = [] } = useProgrammeAssessmentConfig(programmeId);
  const { data: rubrics = [] } = useRubrics(programmeId);
  const { data: questionBanks = [] } = useQuestionBanks(programmeId);

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  const availableTypes = useMemo(() => {
    const baseTypes = selectedCategory?.types || [];
    if (!programmeConfig.length) return baseTypes;
    const enabledTypeNames = new Set(
      programmeConfig.filter((c) => c.enabled).map((c) => c.assessment_type)
    );
    const filtered = baseTypes.filter((t) => enabledTypeNames.has(t.value));
    return filtered.length ? filtered : baseTypes;
  }, [selectedCategory, programmeConfig]);

  const typeConfig = programmeConfig.find((c) => c.assessment_type === assessmentType);
  const moderationDefault = typeConfig?.requires_moderation ?? (category === "summative");
  const effectiveRequiresModeration = moderationTouched ? requiresModeration : moderationDefault;

  const showWeighting = category === "summative";

  const addOutcome = () =>
    setOutcomes([...outcomes, { code: `LO${outcomes.length + 1}`, description: "", bloom_level: "Apply" }]);
  const removeOutcome = (i: number) => setOutcomes(outcomes.filter((_, idx) => idx !== i));
  const updateOutcome = (i: number, patch: Partial<LearningOutcome>) =>
    setOutcomes(outcomes.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  // Step completion logic
  const stepStatus: Record<StepKey, "complete" | "active" | "pending"> = {
    basics: category && assessmentType ? "complete" : "pending",
    details: title ? "complete" : "pending",
    scoring: maxScore && passMark ? "complete" : "pending",
    resources: (rubricId && rubricId !== "none") || (questionBankId && questionBankId !== "none") ? "complete" : "pending",
  };
  stepStatus[stepKey] = stepStatus[stepKey] === "complete" ? "complete" : "active";

  const stepIndex = STEPS.findIndex((s) => s.key === stepKey);
  const completedCount = Object.values(stepStatus).filter((s) => s === "complete").length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  const canSubmit = !!title && !!assessmentType && !!category;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      title,
      description,
      assessment_type: assessmentType,
      assessment_category: category,
      module_id: moduleId && moduleId !== "none" ? moduleId : null,
      max_score: maxScore ? parseInt(maxScore) : null,
      pass_mark: passMark ? parseInt(passMark) : null,
      due_date: dueDate || null,
      weighting: weighting ? parseFloat(weighting) : null,
      requires_moderation: effectiveRequiresModeration,
      learning_outcomes: outcomes.filter((o) => o.code.trim() && o.description.trim()),
      rubric_id: rubricId && rubricId !== "none" ? rubricId : null,
      question_bank_id: questionBankId && questionBankId !== "none" ? questionBankId : null,
    });
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStepKey(STEPS[stepIndex + 1].key);
  };
  const goBack = () => {
    if (stepIndex > 0) setStepKey(STEPS[stepIndex - 1].key);
  };
  const isLastStep = stepIndex === STEPS.length - 1;

  // Per-step "can advance" rules (soft — never block, but indicate)
  const canAdvance =
    stepKey === "basics" ? !!category && !!assessmentType :
    stepKey === "details" ? !!title :
    true;

  return (
    <section
      aria-label={isEdit ? "Edit Assessment" : "Create Assessment"}
      className="w-full animate-fade-in"
    >
      {/* Workspace shell */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Top bar */}
        <header className="px-5 py-4 border-b border-border bg-gradient-to-r from-secondary/40 to-secondary/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {isEdit ? "Edit Assessment" : "New Assessment"}
                </h2>
                <p className="text-[11px] text-muted-foreground truncate">
                  Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {category && assessmentType && (
                <Badge variant="outline" className={cn("text-[10px] hidden md:inline-flex", CATEGORY_BADGE_COLORS[category])}>
                  {selectedCategory?.label}
                  {assessmentType && ` · ${availableTypes.find((t) => t.value === assessmentType)?.label ?? assessmentType}`}
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1 h-8">
                <X className="w-3.5 h-3.5" /> Close
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div className="mt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STEPS.map((s, i) => {
                const status = stepStatus[s.key];
                const isActive = stepKey === s.key;
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStepKey(s.key)}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : status === "complete"
                          ? "border-success/30 bg-success/5 text-foreground hover:border-success/50"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : status === "complete"
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {status === "complete" && !isActive ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </span>
                    <Icon className="w-3.5 h-3.5 hidden sm:inline" />
                    <span>{s.shortLabel}</span>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className={cn("w-3 h-3 ml-1 shrink-0 hidden lg:inline", isActive ? "text-primary-foreground/70" : "text-border")} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={progress} className="h-1 flex-1" />
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{progress}%</span>
            </div>
          </div>
        </header>

        {/* Body grid: main + summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          {/* Main panel */}
          <div className="p-6 lg:p-8 min-h-[480px]">
            {stepKey === "basics" && (
              <div className="space-y-8 max-w-3xl">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Assessment Category</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose the pedagogical purpose of this assessment.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => { setCategory(cat.value); setAssessmentType(""); }}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                            isSelected
                              ? cn("border-primary shadow-sm ring-2 ring-primary/20", cat.soft)
                              : "border-border hover:border-primary/30 hover:bg-muted/30"
                          )}
                          aria-pressed={isSelected}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Icon className={cn("w-4 h-4", !isSelected && cat.accent)} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{cat.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Assessment Type</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {category
                          ? programmeConfig.length
                            ? `Pick a ${selectedCategory?.label.toLowerCase()} format (filtered by programme config).`
                            : `Pick a ${selectedCategory?.label.toLowerCase()} format.`
                          : "Select a category above to enable the type options."}
                      </p>
                    </div>
                    {assessmentType && (
                      <Badge variant="outline" className="text-[10px]">
                        {availableTypes.find((t) => t.value === assessmentType)?.label}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    {!category ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <div key={i} className="h-9 rounded-lg bg-muted/40 border border-dashed border-border" />
                        ))}
                      </div>
                    ) : availableTypes.length ? (
                      <div className="flex flex-wrap gap-2">
                        {availableTypes.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setAssessmentType(type.value)}
                            className={cn(
                              "px-3.5 py-2 rounded-lg text-xs font-medium border transition-all",
                              assessmentType === type.value
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/30"
                            )}
                            aria-pressed={assessmentType === type.value}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No types enabled for this programme. Adjust Programme Type or programme overrides.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stepKey === "details" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Assessment Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Give the assessment a clear title and instructions. Link it to a module if applicable.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Module 1 Knowledge Check"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Description / Instructions</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instructions for learners..."
                    className="text-sm min-h-[110px]"
                  />
                </div>

                {/* Learning Outcomes */}
                <div className="rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Learning Outcomes</p>
                        <p className="text-[11px] text-muted-foreground">Map this assessment to measurable outcomes (required at publish).</p>
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addOutcome} className="gap-1 h-8">
                      <Plus className="w-3 h-3" /> Add outcome
                    </Button>
                  </div>
                  {outcomes.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic mt-3">
                      No outcomes added yet. You can add them now or before publishing.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {outcomes.map((o, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border border-border bg-card">
                          <Input
                            value={o.code}
                            onChange={(e) => updateOutcome(i, { code: e.target.value })}
                            placeholder="LO1"
                            className="col-span-2 text-xs h-8"
                          />
                          <Input
                            value={o.description}
                            onChange={(e) => updateOutcome(i, { description: e.target.value })}
                            placeholder="Learners will be able to…"
                            className="col-span-7 text-xs h-8"
                          />
                          <Select value={o.bloom_level ?? "Apply"} onValueChange={(v) => updateOutcome(i, { bloom_level: v })}>
                            <SelectTrigger className="col-span-2 text-xs h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {BLOOM_LEVELS.map((b) => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button type="button" size="icon" variant="ghost" onClick={() => removeOutcome(i)} className="col-span-1 h-8 w-8">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {stepKey === "scoring" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Scoring, Schedule & Candidates</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set the marks, pass threshold and audience. Configure moderation under the 4-Eyes Principle.
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Score</Label>
                    <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="100" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pass Mark</Label>
                    <Input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} placeholder="50" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={cn("text-xs", !showWeighting && "text-muted-foreground/60")}>
                      Weighting (%) {!showWeighting && <span className="text-[9px]">— summative only</span>}
                    </Label>
                    <Input
                      type="number" value={weighting} onChange={(e) => setWeighting(e.target.value)}
                      placeholder={showWeighting ? "e.g., 30" : "—"} className="text-sm"
                      disabled={!showWeighting} min={0} max={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date (optional)</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-sm" />
                  </div>
                </div>

                {/* Moderation */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-secondary/20">
                  <ShieldCheck className={cn("w-4 h-4 mt-0.5 shrink-0", effectiveRequiresModeration ? "text-warning" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="requires-moderation" className="text-sm font-semibold">
                        Requires Moderation (4-Eyes Principle)
                      </Label>
                      <Switch
                        id="requires-moderation"
                        checked={effectiveRequiresModeration}
                        onCheckedChange={(v) => { setRequiresModeration(v); setModerationTouched(true); }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {moderationTouched
                        ? (effectiveRequiresModeration
                          ? "Grades must be reviewed by a second person before release."
                          : "Grades will be released without secondary moderation.")
                        : (typeConfig
                          ? `Default from programme config (${typeConfig.requires_moderation ? "on" : "off"}). Toggle to override.`
                          : `Suggested default for ${category || "this category"}. Toggle to override.`)}
                    </p>
                  </div>
                </div>

                {/* Candidates */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">The Candidates</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {[
                      { value: "all", label: "All enrolled learners", desc: "Every active learner on the programme" },
                      { value: "cohort", label: "Specific cohort(s)", desc: "Restrict to selected cohorts at delivery time" },
                      { value: "manual", label: "Manual assignment", desc: "Assign per learner from the gradebook" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAudience(opt.value)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          audience === opt.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        )}
                        aria-pressed={audience === opt.value}
                      >
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Detailed cohort or learner selection happens after creation in the Assessment Builder workspace.
                  </p>
                </div>
              </div>
            )}

            {stepKey === "resources" && (
              <div className="space-y-6 max-w-3xl">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Resources <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attach a rubric and seed questions from a bank to accelerate authoring.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Library className="w-3.5 h-3.5 text-primary" /> Attach Rubric
                    </Label>
                    <Select value={rubricId} onValueChange={setRubricId}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="No rubric" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">No rubric</SelectItem>
                        {rubrics.map((r) => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.name}{r.is_reusable ? " · shared" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {rubrics.length === 0
                        ? "No rubrics yet for this programme. Create one in the Rubrics tab."
                        : "Rubric criteria will guide assessors during grading."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-primary" /> Pull from Question Bank
                    </Label>
                    <Select value={questionBankId} onValueChange={setQuestionBankId}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="No question bank" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">No question bank</SelectItem>
                        {questionBanks.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name}{b.is_shared ? " · shared" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {questionBanks.length === 0
                        ? "No banks available. Build one in the Question Bank tab."
                        : "After creation, import items from the selected bank."}
                    </p>
                  </div>
                </div>

                {/* Final review summary */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Ready to create</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <SummaryRow label="Category" value={selectedCategory?.label} />
                    <SummaryRow label="Type" value={availableTypes.find((t) => t.value === assessmentType)?.label ?? assessmentType} />
                    <SummaryRow label="Title" value={title} />
                    <SummaryRow label="Module" value={moduleId && moduleId !== "none" ? modules.find((m) => m.id === moduleId)?.title : "Programme-level"} />
                    <SummaryRow label="Max / Pass" value={`${maxScore || "—"} / ${passMark || "—"}`} />
                    <SummaryRow label="Moderation" value={effectiveRequiresModeration ? "Required" : "Not required"} />
                  </dl>
                </div>
              </div>
            )}
          </div>

          {/* Side summary */}
          <aside className="hidden lg:block border-l border-border bg-muted/20 p-5 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
              <p className="text-sm font-semibold text-foreground mt-1 break-words">
                {title || <span className="text-muted-foreground italic font-normal">Untitled assessment</span>}
              </p>
              {category && (
                <Badge variant="outline" className={cn("text-[10px] mt-2", CATEGORY_BADGE_COLORS[category])}>
                  {selectedCategory?.label}
                </Badge>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-border">
              {STEPS.map((s) => {
                const status = stepStatus[s.key];
                const isActive = stepKey === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStepKey(s.key)}
                    className={cn(
                      "w-full flex items-start gap-2 text-left text-xs px-2 py-1.5 rounded-md transition-colors",
                      isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/40"
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5",
                      isActive ? "bg-primary text-primary-foreground"
                        : status === "complete" ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {status === "complete" && !isActive ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium truncate", isActive ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Outcomes</span>
                <span className="font-medium text-foreground">{outcomes.filter((o) => o.code.trim() && o.description.trim()).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Moderation</span>
                <span className="font-medium text-foreground">{effectiveRequiresModeration ? "On" : "Off"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rubric</span>
                <span className="font-medium text-foreground">{rubricId && rubricId !== "none" ? "Attached" : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Question bank</span>
                <span className="font-medium text-foreground">{questionBankId && questionBankId !== "none" ? "Linked" : "—"}</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky footer */}
        <footer className="px-5 py-3 border-t border-border bg-card flex items-center justify-between gap-3 sticky bottom-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-9">Cancel</Button>
            <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
              {canSubmit ? (isEdit ? "Ready to save." : "Ready to create.") : "Complete category, type & title to continue."}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={goBack} disabled={stepIndex === 0} className="gap-1 h-9">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
            {!isLastStep ? (
              <Button size="sm" onClick={goNext} disabled={!canAdvance} className="gap-1 h-9">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || isPending} className="gap-1.5 h-9">
                <Zap className="w-3.5 h-3.5" />
                {isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Assessment")}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground truncate">{value || <span className="text-muted-foreground italic font-normal">—</span>}</dd>
    </>
  );
}
