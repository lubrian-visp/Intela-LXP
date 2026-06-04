import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateAssessment } from "@/hooks/useCoreData";
import {
  useQuizQuestions,
  useCreateQuizQuestion,
  useDeleteQuizQuestion,
  useUpdateQuizQuestion,
  useReorderQuizQuestions,
  type QuizQuestion,
} from "@/hooks/useQuizBuilder";
import { useAssessmentSettings, useUpsertAssessmentSettings } from "@/hooks/useAssessmentSettings";
import {
  useQuestionBanks, useQuestionBankItems, useImportBankItemToQuiz,
  type QuestionBankItem,
} from "@/hooks/useQuestionBank";
import {
  useQuizSections, useCreateQuizSection, useUpdateQuizSection,
  useDeleteQuizSection, useAssignQuestionToSection, useSyncSmartPool,
  type QuizSection,
} from "@/hooks/useQuizSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Settings2, ListChecks, Shuffle, BarChart3, Eye, Sparkles, Plus,
  GripVertical, Trash2, Check, ChevronRight, Loader2, Wand2, Save, CircleCheck, Circle,
  Library, Search, FolderOpen,
} from "lucide-react";
import { BulkImportDialog } from "@/components/quiz/BulkImportDialog";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Step = "settings" | "questions" | "pool" | "results";

const STEPS: { key: Step; label: string; icon: any; desc: string }[] = [
  { key: "settings", label: "Settings", icon: Settings2, desc: "Title, timing, attempts" },
  { key: "questions", label: "Questions", icon: ListChecks, desc: "Author your questions" },
  { key: "pool", label: "Pool & Randomisation", icon: Shuffle, desc: "Shuffle and pick rules" },
  { key: "results", label: "Results & Review", icon: BarChart3, desc: "Feedback and publish" },
];

export default function AssessmentBuilderV2() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("settings");

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment-detail", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, programme_modules(title)")
        .eq("id", assessmentId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions = [] } = useQuizQuestions(assessmentId);
  const { data: settings } = useAssessmentSettings(assessmentId);

  if (isLoading) return <Skeleton className="h-screen rounded-xl" />;
  if (!assessment) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">Assessment not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/assessments")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Assessments
        </Button>
      </div>
    );
  }

  const completion: Record<Step, boolean> = {
    settings: !!assessment.title && !!assessment.assessment_type,
    questions: questions.length > 0,
    pool: true,
    results: assessment.status === "published" || assessment.status === "active",
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <button
            onClick={() => navigate("/assessments")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Assessments
          </button>
          <h1 className="text-2xl font-bold text-foreground truncate">{assessment.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(assessment as any).programme_modules?.title || "Unassigned module"} ·{" "}
            <Badge variant="outline" className="ml-1 text-[10px]">{assessment.status}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/quiz/${assessmentId}`}>
              <Eye className="w-4 h-4 mr-1" /> Learner Preview
            </Link>
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-card rounded-xl border border-border/50 p-2 shadow-card">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const done = completion[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-left transition-all relative",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary/50"
                )}
              >
                <div className={cn(
                  "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                  isActive ? "bg-primary-foreground/20" : "bg-secondary"
                )}>
                  {done && !isActive ? <CircleCheck className="w-4 h-4 text-success" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className={cn("text-[10px] uppercase tracking-wider font-semibold opacity-70")}>
                    Step {idx + 1}
                  </p>
                  <p className="text-xs font-semibold truncate">{s.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="min-w-0 space-y-4">
          {step === "settings" && <SettingsStep assessment={assessment} settings={settings} />}
          {step === "questions" && <QuestionsStep assessmentId={assessmentId!} questions={questions} />}
          {step === "pool" && <PoolStep assessmentId={assessmentId!} settings={settings} questions={questions} />}
          {step === "results" && <ResultsStep assessment={assessment} settings={settings} />}
        </div>
        <SidePreview assessment={assessment} questions={questions} settings={settings} />
      </div>
    </div>
  );
}

/* ─────────── Settings Step ─────────── */
function SettingsStep({ assessment, settings }: { assessment: any; settings: any }) {
  const update = useUpdateAssessment();
  const upsertSettings = useUpsertAssessmentSettings();
  const [title, setTitle] = useState(assessment.title);
  const [description, setDescription] = useState(assessment.description ?? "");
  const [assessmentType, setAssessmentType] = useState<string>(assessment.assessment_type ?? "formative");
  const [maxScore, setMaxScore] = useState(assessment.max_score ?? 100);
  const [passMark, setPassMark] = useState(assessment.pass_mark ?? 50);
  const [timeLimit, setTimeLimit] = useState<number | "">(settings?.time_limit_minutes ?? "");
  const [attempts, setAttempts] = useState<number | "">(settings?.attempts_allowed ?? "");
  const [accessCode, setAccessCode] = useState((settings as any)?.access_code ?? "");

  useEffect(() => {
    setTimeLimit(settings?.time_limit_minutes ?? "");
    setAttempts(settings?.attempts_allowed ?? "");
  }, [settings]);

  const save = async () => {
    await update.mutateAsync({
      id: assessment.id,
      title, description: description || null,
      assessment_type: assessmentType,
      max_score: maxScore, pass_mark: passMark,
    } as any);
    await upsertSettings.mutateAsync({
      assessment_id: assessment.id,
      time_limit_minutes: timeLimit === "" ? null : Number(timeLimit),
      attempts_allowed: attempts === "" ? null : Number(attempts),
      access_code: accessCode || null,
    } as any);
  };

  const ASSESSMENT_TYPES: { value: string; label: string; desc: string }[] = [
    { value: "formative", label: "Formative", desc: "Low-stakes check for learning (quizzes, practice)" },
    { value: "summative", label: "Summative", desc: "High-stakes evaluation (tests, exams)" },
    { value: "diagnostic", label: "Diagnostic", desc: "Pre-assessment to identify gaps" },
    { value: "rubric", label: "Rubric-based", desc: "Criterion-referenced manual grading" },
    { value: "exam", label: "Exam", desc: "Formal timed examination" },
    { value: "peer_review", label: "Peer Review", desc: "Learner-to-learner evaluation" },
    { value: "self_assessment", label: "Self-Assessment", desc: "Learner reflection and self-grading" },
    { value: "portfolio", label: "Portfolio", desc: "Cumulative evidence-based assessment" },
    { value: "practical", label: "Practical / POE", desc: "Workplace or skills demonstration" },
  ];

  // Type-driven field rules: which fields are shown, required, or hidden per assessment type.
  type FieldRule = "required" | "optional" | "hidden";
  type RuleSet = {
    timeLimit: FieldRule; attempts: FieldRule; accessCode: FieldRule;
    passMark: FieldRule; maxScore: FieldRule;
    note?: string;
  };
  const TYPE_RULES: Record<string, RuleSet> = {
    formative:       { timeLimit: "optional", attempts: "optional", accessCode: "optional", passMark: "optional", maxScore: "required" },
    summative:       { timeLimit: "optional", attempts: "required", accessCode: "optional", passMark: "required", maxScore: "required" },
    diagnostic:      { timeLimit: "optional", attempts: "optional", accessCode: "hidden",   passMark: "hidden",   maxScore: "required",
                       note: "Diagnostic assessments don't require a pass mark — they identify gaps." },
    rubric:          { timeLimit: "hidden",   attempts: "optional", accessCode: "hidden",   passMark: "required", maxScore: "required",
                       note: "Link a rubric on the Results step. Time limits don't apply to rubric-based grading." },
    exam:            { timeLimit: "required", attempts: "required", accessCode: "required", passMark: "required", maxScore: "required",
                       note: "Exams require a time limit, attempt cap and access code." },
    peer_review:     { timeLimit: "hidden",   attempts: "hidden",   accessCode: "hidden",   passMark: "optional", maxScore: "required",
                       note: "Peer reviews are graded by learners — timing & attempts handled by the review window." },
    self_assessment: { timeLimit: "hidden",   attempts: "optional", accessCode: "hidden",   passMark: "optional", maxScore: "required" },
    portfolio:       { timeLimit: "hidden",   attempts: "hidden",   accessCode: "hidden",   passMark: "required", maxScore: "required",
                       note: "Portfolios collect evidence over time — no time limit or attempt cap." },
    practical:       { timeLimit: "hidden",   attempts: "optional", accessCode: "hidden",   passMark: "required", maxScore: "required",
                       note: "Practical / POE is observed live — link a rubric and ensure a pass mark is set." },
  };
  const rules = TYPE_RULES[assessmentType] ?? TYPE_RULES.formative;

  // Validation
  const errors: Record<string, string> = {};
  if (!title.trim()) errors.title = "Title is required.";
  if (rules.maxScore === "required" && (!maxScore || maxScore <= 0)) errors.maxScore = "Max score must be greater than 0.";
  if (rules.passMark === "required" && (passMark === null || passMark === undefined || passMark < 0 || passMark > 100))
    errors.passMark = "Pass mark must be between 0 and 100.";
  if (rules.timeLimit === "required" && (timeLimit === "" || Number(timeLimit) <= 0))
    errors.timeLimit = "Time limit is required for this assessment type.";
  if (rules.attempts === "required" && (attempts === "" || Number(attempts) <= 0))
    errors.attempts = "Maximum attempts is required for this assessment type.";
  if (rules.accessCode === "required" && !accessCode.trim())
    errors.accessCode = "Access code is required for this assessment type.";
  const isValid = Object.keys(errors).length === 0;

  const guardedSave = async () => {
    if (!isValid) {
      toast.error("Please resolve the validation errors before saving.");
      return;
    }
    await save();
    toast.success("Settings saved");
  };

  const reqBadge = (rule: FieldRule) =>
    rule === "required" ? <span className="text-[9px] font-bold text-destructive ml-1">REQUIRED</span> : null;

  return (
    <Card title="General Settings" description="Basic information shown to learners">
      <div className="grid gap-4">
        <Field label={<>Title{reqBadge("required")}</>}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
          {errors.title && <p className="text-[10px] text-destructive mt-1">{errors.title}</p>}
        </Field>
        <Field label="Assessment type">
          <Select value={assessmentType} onValueChange={setAssessmentType}>
            <SelectTrigger><SelectValue placeholder="Choose a type" /></SelectTrigger>
            <SelectContent>
              {ASSESSMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rules.note && (
            <p className="text-[10px] text-info bg-info/5 border border-info/20 rounded p-2 mt-2">
              {rules.note}
            </p>
          )}
        </Field>
        <Field label="Description">
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {rules.maxScore !== "hidden" && (
            <Field label={<>Max score{reqBadge(rules.maxScore)}</>}>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} aria-invalid={!!errors.maxScore} />
              {errors.maxScore && <p className="text-[10px] text-destructive mt-1">{errors.maxScore}</p>}
            </Field>
          )}
          {rules.passMark !== "hidden" && (
            <Field label={<>Pass mark (%){reqBadge(rules.passMark)}</>}>
              <Input type="number" value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} aria-invalid={!!errors.passMark} />
              {errors.passMark && <p className="text-[10px] text-destructive mt-1">{errors.passMark}</p>}
            </Field>
          )}
        </div>
        {(rules.timeLimit !== "hidden" || rules.attempts !== "hidden") && (
          <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-3">
            {rules.timeLimit !== "hidden" && (
              <Field label={<>Time limit (mins){reqBadge(rules.timeLimit)}</>}>
                <Input type="number" placeholder={rules.timeLimit === "required" ? "Required" : "Unlimited"} value={timeLimit}
                  aria-invalid={!!errors.timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))} />
                {errors.timeLimit && <p className="text-[10px] text-destructive mt-1">{errors.timeLimit}</p>}
              </Field>
            )}
            {rules.attempts !== "hidden" && (
              <Field label={<>Max attempts{reqBadge(rules.attempts)}</>}>
                <Input type="number" placeholder={rules.attempts === "required" ? "Required" : "Unlimited"} value={attempts}
                  aria-invalid={!!errors.attempts}
                  onChange={(e) => setAttempts(e.target.value === "" ? "" : Number(e.target.value))} />
                {errors.attempts && <p className="text-[10px] text-destructive mt-1">{errors.attempts}</p>}
              </Field>
            )}
          </div>
        )}
        {rules.accessCode !== "hidden" && (
          <Field label={<>Access code{reqBadge(rules.accessCode)}</>}>
            <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="e.g. EXAM2026" aria-invalid={!!errors.accessCode} />
            {errors.accessCode && <p className="text-[10px] text-destructive mt-1">{errors.accessCode}</p>}
          </Field>
        )}
      </div>
      <div className="flex items-center justify-between pt-4">
        <p className="text-[10px] text-muted-foreground">
          {isValid
            ? <span className="text-success">All required fields complete.</span>
            : <span className="text-destructive">{Object.keys(errors).length} field(s) need attention.</span>}
        </p>
        <Button onClick={guardedSave} disabled={!isValid || update.isPending || upsertSettings.isPending}>
          <Save className="w-4 h-4 mr-1" /> Save settings
        </Button>
      </div>
    </Card>
  );
}

/* ─────────── Questions Step ─────────── */
function QuestionsStep({ assessmentId, questions }: { assessmentId: string; questions: QuizQuestion[] }) {
  const create = useCreateQuizQuestion();
  const reorder = useReorderQuizQuestions();
  const remove = useDeleteQuizQuestion();
  const [showAi, setShowAi] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex((q) => q.id === active.id);
    const newIdx = questions.findIndex((q) => q.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const ordered = arrayMove(questions, oldIdx, newIdx);
    reorder.mutate({ assessment_id: assessmentId, orderedIds: ordered.map((q) => q.id) });
  };

  const addBlank = (type: string) => {
    const base: any = {
      assessment_id: assessmentId,
      question_text: "Untitled question",
      question_type: type,
      points: 1,
      sequence_order: questions.length,
    };
    if (type === "short_answer") {
      // no options, no metadata
    } else if (type === "true_false") {
      base.options = [{ option_text: "True", is_correct: true }, { option_text: "False", is_correct: false }];
    } else if (type === "multiple_choice") {
      base.options = [
        { option_text: "Option A", is_correct: true },
        { option_text: "Option B", is_correct: false },
        { option_text: "Option C", is_correct: false },
        { option_text: "Option D", is_correct: false },
      ];
    } else if (type === "matching") {
      base.metadata = { pairs: [{ left: "Term 1", right: "Definition 1" }, { left: "Term 2", right: "Definition 2" }] };
    } else if (type === "ordering") {
      base.metadata = { items: ["First step", "Second step", "Third step"] };
    } else if (type === "fill_blank") {
      base.metadata = { blanks: [{ answers: ["answer"], case_sensitive: false }] };
    } else if (type === "numerical") {
      base.metadata = { answer: 0, tolerance: 0, unit: "" };
    } else if (type === "hotspot") {
      base.metadata = { image_url: "", hotspots: [{ x: 50, y: 50, radius: 8, is_correct: true, label: "Target" }] };
    } else if (type === "drag_drop") {
      base.metadata = {
        items: [{ id: "i1", label: "Item 1" }, { id: "i2", label: "Item 2" }],
        targets: [{ id: "t1", label: "Bucket A" }, { id: "t2", label: "Bucket B" }],
        correct_mapping: { i1: "t1", i2: "t2" },
      };
    } else if (type === "code") {
      base.metadata = { language: "javascript", starter_code: "// write code", expected_output: "" };
    } else if (type === "formula") {
      base.metadata = { expression: "x + y", variables: [{ name: "x", value: 2 }, { name: "y", value: 3 }], expected: 5, tolerance: 0 };
    }
    create.mutate(base);
  };

  return (
    <>
      <Card title="Questions" description={`${questions.length} question${questions.length === 1 ? "" : "s"} · drag to reorder`}>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => addBlank("multiple_choice")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Multiple choice
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("true_false")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> True / False
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("short_answer")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Short answer
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("matching")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Matching
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("ordering")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Ordering
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("fill_blank")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Fill in the blank
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("numerical")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Numerical
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("hotspot")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Hotspot
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("drag_drop")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Drag & drop
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("code")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Code
          </Button>
          <Button variant="outline" size="sm" onClick={() => addBlank("formula")}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Formula
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBank(true)} className="ml-auto">
            <Library className="w-3.5 h-3.5 mr-1" /> From Question Bank
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulk(true)}>
            <FolderOpen className="w-3.5 h-3.5 mr-1" /> Bulk import
          </Button>
          <Button variant="default" size="sm" onClick={() => setShowAi(true)}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate with AI
          </Button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-lg">
            <ListChecks className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No questions yet. Add manually or generate with AI.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <SortableQuestion
                    key={q.id} question={q} index={idx}
                    onDelete={() => remove.mutate({ id: q.id, assessment_id: assessmentId })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {showAi && <AiGenerateDialog assessmentId={assessmentId} startOrder={questions.length} onClose={() => setShowAi(false)} />}
      {showBank && <QuestionBankDialog assessmentId={assessmentId} startOrder={questions.length} onClose={() => setShowBank(false)} />}
      {showBulk && <BulkImportDialog assessmentId={assessmentId} startOrder={questions.length} onClose={() => setShowBulk(false)} />}
    </>
  );
}

function SortableQuestion({ question, index, onDelete }: { question: QuizQuestion; index: number; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const update = useUpdateQuizQuestion();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(question.question_text);
  const [points, setPoints] = useState(question.points);
  const [opts, setOpts] = useState(question.options ?? []);
  const [meta, setMeta] = useState<any>((question as any).metadata ?? {});

  const style = { transform: CSS.Transform.toString(transform), transition };

  const isOptionsType = question.question_type === "multiple_choice" || question.question_type === "true_false";
  const isMetaType = ["matching", "ordering", "fill_blank", "numerical", "hotspot", "drag_drop", "code", "formula"].includes(question.question_type);
  const supportsBranching = isOptionsType;
  const [branching, setBranching] = useState<any[]>(((question as any).branching_rules ?? []) as any[]);

  const save = () => {
    update.mutate({
      id: question.id,
      assessment_id: question.assessment_id,
      question_text: text,
      points,
      metadata: isMetaType ? meta : {},
      options: isOptionsType ? opts.map(o => ({ option_text: o.option_text, is_correct: o.is_correct })) : undefined,
      branching_rules: branching,
    } as any);
    setExpanded(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "bg-card border border-border/50 rounded-lg overflow-hidden transition-shadow",
      isDragging && "shadow-lg ring-2 ring-primary/30"
    )}>
      <div className="flex items-center gap-2 p-3">
        <button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-bold text-muted-foreground w-6">Q{index + 1}</span>
        <Badge variant="secondary" className="text-[9px]">{question.question_type.replace(/_/g, " ")}</Badge>
        <p className="flex-1 text-xs text-foreground truncate">{question.question_text}</p>
        <span className="text-[10px] text-muted-foreground shrink-0">{question.points} pt</span>
        <Button variant="ghost" size="sm" aria-label={expanded ? "Collapse question" : "Expand question"} onClick={() => setExpanded((v) => !v)}>
          <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Delete question" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-3 bg-secondary/20">
          <Field label="Question text">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Points">
              <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </Field>
          </div>

          {isOptionsType && (
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Options</Label>
              <div className="space-y-2">
                {opts.map((o, i) => (
                  <div key={o.id || i} className="flex items-center gap-2">
                    <button
                      onClick={() => setOpts(opts.map((x, j) => ({ ...x, is_correct: j === i })))}
                      className={cn(
                        "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        o.is_correct ? "border-success bg-success/20" : "border-border"
                      )}
                    >
                      {o.is_correct && <Check className="w-3 h-3 text-success" />}
                    </button>
                    <Input
                      value={o.option_text}
                      onChange={(e) => setOpts(opts.map((x, j) => j === i ? { ...x, option_text: e.target.value } : x))}
                      className="text-xs"
                    />
                    {question.question_type === "multiple_choice" && opts.length > 2 && (
                      <Button variant="ghost" size="sm" aria-label="Remove option" onClick={() => setOpts(opts.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {question.question_type === "multiple_choice" && (
                  <Button variant="outline" size="sm" onClick={() => setOpts([...opts, { id: "", question_id: question.id, option_text: `Option ${String.fromCharCode(65 + opts.length)}`, is_correct: false, sequence_order: opts.length, created_at: "" } as any])}>
                    <Plus className="w-3 h-3 mr-1" /> Add option
                  </Button>
                )}
              </div>
            </div>
          )}

          {question.question_type === "matching" && (
            <MatchingEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "ordering" && (
            <OrderingEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "fill_blank" && (
            <FillBlankEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "numerical" && (
            <NumericalEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "hotspot" && (
            <HotspotEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "drag_drop" && (
            <DragDropEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "code" && (
            <CodeEditor meta={meta} setMeta={setMeta} />
          )}
          {question.question_type === "formula" && (
            <FormulaEditor meta={meta} setMeta={setMeta} />
          )}

          {supportsBranching && opts.length > 0 && (
            <BranchingEditor opts={opts} branching={branching} setBranching={setBranching} />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={update.isPending}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Type-specific Editors ─────────── */
function MatchingEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  const pairs: { left: string; right: string }[] = meta.pairs || [];
  const upd = (i: number, k: "left" | "right", v: string) =>
    setMeta({ ...meta, pairs: pairs.map((p, j) => j === i ? { ...p, [k]: v } : p) });
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground mb-1 block">Matching pairs (learner matches Left → Right)</Label>
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
            <Input value={p.left} onChange={(e) => upd(i, "left", e.target.value)} placeholder="Term" className="text-xs" />
            <span className="text-muted-foreground text-xs">→</span>
            <Input value={p.right} onChange={(e) => upd(i, "right", e.target.value)} placeholder="Definition" className="text-xs" />
            <Button variant="ghost" size="sm" aria-label="Delete pair" onClick={() => setMeta({ ...meta, pairs: pairs.filter((_, j) => j !== i) })}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setMeta({ ...meta, pairs: [...pairs, { left: "", right: "" }] })}>
          <Plus className="w-3 h-3 mr-1" /> Add pair
        </Button>
      </div>
    </div>
  );
}

function OrderingEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  const items: string[] = meta.items || [];
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground mb-1 block">Items in correct order (learner sees them shuffled)</Label>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground w-5">{i + 1}.</span>
            <Input value={it} onChange={(e) => setMeta({ ...meta, items: items.map((x, j) => j === i ? e.target.value : x) })} className="text-xs" />
            <Button variant="ghost" size="sm" aria-label="Delete item" onClick={() => setMeta({ ...meta, items: items.filter((_, j) => j !== i) })}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setMeta({ ...meta, items: [...items, ""] })}>
          <Plus className="w-3 h-3 mr-1" /> Add item
        </Button>
      </div>
    </div>
  );
}

function FillBlankEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  const blanks: { answers: string[]; case_sensitive?: boolean }[] = meta.blanks || [];
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground mb-1 block">
        Use ___ in the question text per blank. List accepted answers below (comma-separated).
      </Label>
      <div className="space-y-2">
        {blanks.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground w-12">Blank {i + 1}</span>
            <Input
              value={b.answers.join(", ")}
              placeholder="answer1, alt-spelling"
              onChange={(e) => setMeta({ ...meta, blanks: blanks.map((x, j) => j === i ? { ...x, answers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } : x) })}
              className="text-xs"
            />
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <input type="checkbox" checked={!!b.case_sensitive} onChange={(e) => setMeta({ ...meta, blanks: blanks.map((x, j) => j === i ? { ...x, case_sensitive: e.target.checked } : x) })} />
              Case
            </label>
            <Button variant="ghost" size="sm" aria-label="Delete blank" onClick={() => setMeta({ ...meta, blanks: blanks.filter((_, j) => j !== i) })}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setMeta({ ...meta, blanks: [...blanks, { answers: [], case_sensitive: false }] })}>
          <Plus className="w-3 h-3 mr-1" /> Add blank
        </Button>
      </div>
    </div>
  );
}

function NumericalEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Expected answer">
        <Input type="number" step="any" value={meta.answer ?? ""} onChange={(e) => setMeta({ ...meta, answer: Number(e.target.value) })} />
      </Field>
      <Field label="Tolerance (±)">
        <Input type="number" step="any" value={meta.tolerance ?? 0} onChange={(e) => setMeta({ ...meta, tolerance: Number(e.target.value) })} />
      </Field>
      <Field label="Unit (optional)">
        <Input value={meta.unit ?? ""} onChange={(e) => setMeta({ ...meta, unit: e.target.value })} placeholder="kg, m/s, %…" />
      </Field>
    </div>
  );
}

/* ─────────── Hotspot Editor ─────────── */
function HotspotEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  const hotspots: { x: number; y: number; radius: number; is_correct: boolean; label?: string }[] = meta.hotspots || [];
  const upd = (i: number, patch: any) =>
    setMeta({ ...meta, hotspots: hotspots.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  const onImgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setMeta({ ...meta, hotspots: [...hotspots, { x, y, radius: 8, is_correct: true, label: `Spot ${hotspots.length + 1}` }] });
  };
  return (
    <div className="space-y-2">
      <Field label="Image URL">
        <Input value={meta.image_url ?? ""} onChange={(e) => setMeta({ ...meta, image_url: e.target.value })} placeholder="https://…" />
      </Field>
      {meta.image_url && (
        <div className="relative border border-border/40 rounded-md overflow-hidden cursor-crosshair" onClick={onImgClick}>
          <img src={meta.image_url} alt="Hotspot question image" className="w-full block" />
          {hotspots.map((h, i) => (
            <div key={i}
              className={cn("absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2",
                h.is_correct ? "border-success bg-success/20" : "border-destructive bg-destructive/20")}
              style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.radius * 2}%`, height: `${h.radius * 2}%` }}
              title={h.label}
            />
          ))}
        </div>
      )}
      <Label className="text-[10px] text-muted-foreground">Click image to add a hotspot. Configure each below.</Label>
      <div className="space-y-1">
        {hotspots.map((h, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <Input className="text-xs h-7 w-28" value={h.label ?? ""} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Label" />
            <Input className="text-xs h-7 w-14" type="number" value={h.x} onChange={(e) => upd(i, { x: Number(e.target.value) })} title="x %" />
            <Input className="text-xs h-7 w-14" type="number" value={h.y} onChange={(e) => upd(i, { y: Number(e.target.value) })} title="y %" />
            <Input className="text-xs h-7 w-14" type="number" value={h.radius} onChange={(e) => upd(i, { radius: Number(e.target.value) })} title="radius %" />
            <label className="flex items-center gap-1 text-[10px]">
              <input type="checkbox" checked={h.is_correct} onChange={(e) => upd(i, { is_correct: e.target.checked })} /> Correct
            </label>
            <Button variant="ghost" size="sm" aria-label="Delete hotspot" onClick={() => setMeta({ ...meta, hotspots: hotspots.filter((_, j) => j !== i) })}>
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Drag & Drop Editor ─────────── */
function DragDropEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  const items: { id: string; label: string }[] = meta.items || [];
  const targets: { id: string; label: string }[] = meta.targets || [];
  const mapping: Record<string, string> = meta.correct_mapping || {};
  const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}`;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Draggable items</Label>
        <div className="space-y-1">
          {items.map((it, i) => (
            <div key={it.id} className="flex items-center gap-1">
              <Input className="text-xs h-8" value={it.label} onChange={(e) =>
                setMeta({ ...meta, items: items.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
              <Select value={mapping[it.id] ?? ""} onValueChange={(v) =>
                setMeta({ ...meta, correct_mapping: { ...mapping, [it.id]: v } })}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="→ target" /></SelectTrigger>
                <SelectContent>
                  {targets.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" aria-label="Delete item" onClick={() => {
                const { [it.id]: _, ...rest } = mapping;
                setMeta({ ...meta, items: items.filter((_, j) => j !== i), correct_mapping: rest });
              }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() =>
            setMeta({ ...meta, items: [...items, { id: newId("i"), label: `Item ${items.length + 1}` }] })}>
            <Plus className="w-3 h-3 mr-1" /> Add item
          </Button>
        </div>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Drop targets</Label>
        <div className="space-y-1">
          {targets.map((t, i) => (
            <div key={t.id} className="flex items-center gap-1">
              <Input className="text-xs h-8" value={t.label} onChange={(e) =>
                setMeta({ ...meta, targets: targets.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
              <Button variant="ghost" size="sm" aria-label="Delete target" onClick={() =>
                setMeta({ ...meta, targets: targets.filter((_, j) => j !== i) })}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() =>
            setMeta({ ...meta, targets: [...targets, { id: newId("t"), label: `Bucket ${targets.length + 1}` }] })}>
            <Plus className="w-3 h-3 mr-1" /> Add target
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Code Editor ─────────── */
function CodeEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Language">
          <Select value={meta.language ?? "javascript"} onValueChange={(v) => setMeta({ ...meta, language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python (manual grading)</SelectItem>
              <SelectItem value="sql">SQL (manual grading)</SelectItem>
              <SelectItem value="other">Other (manual grading)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Expected stdout / return value">
          <Input value={meta.expected_output ?? ""} onChange={(e) => setMeta({ ...meta, expected_output: e.target.value })} placeholder="e.g. 42" />
        </Field>
      </div>
      <Field label="Starter code">
        <Textarea rows={4} className="font-mono text-xs" value={meta.starter_code ?? ""} onChange={(e) => setMeta({ ...meta, starter_code: e.target.value })} />
      </Field>
      <p className="text-[10px] text-muted-foreground italic">JavaScript code is auto-graded by comparing the last expression's value to the expected output. Other languages require manual grading.</p>
    </div>
  );
}

/* ─────────── Formula Editor ─────────── */
function FormulaEditor({ meta, setMeta }: { meta: any; setMeta: (m: any) => void }) {
  const vars: { name: string; value: number }[] = meta.variables || [];
  return (
    <div className="space-y-2">
      <Field label="Formula expression (use variables, e.g. x + y * 2)">
        <Input className="font-mono text-xs" value={meta.expression ?? ""} onChange={(e) => setMeta({ ...meta, expression: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expected result">
          <Input type="number" step="any" value={meta.expected ?? 0} onChange={(e) => setMeta({ ...meta, expected: Number(e.target.value) })} />
        </Field>
        <Field label="Tolerance (±)">
          <Input type="number" step="any" value={meta.tolerance ?? 0} onChange={(e) => setMeta({ ...meta, tolerance: Number(e.target.value) })} />
        </Field>
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Variables shown to learner</Label>
        <div className="space-y-1">
          {vars.map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input className="text-xs h-7 w-20 font-mono" value={v.name} onChange={(e) =>
                setMeta({ ...meta, variables: vars.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
              <Input className="text-xs h-7 w-24" type="number" value={v.value} onChange={(e) =>
                setMeta({ ...meta, variables: vars.map((x, j) => j === i ? { ...x, value: Number(e.target.value) } : x) })} />
              <Button variant="ghost" size="sm" aria-label="Delete variable" onClick={() =>
                setMeta({ ...meta, variables: vars.filter((_, j) => j !== i) })}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() =>
            setMeta({ ...meta, variables: [...vars, { name: `v${vars.length + 1}`, value: 0 }] })}>
            <Plus className="w-3 h-3 mr-1" /> Add variable
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Branching Editor (per-option next/end rules) ─────────── */
function BranchingEditor({ opts, branching, setBranching }: { opts: any[]; branching: any[]; setBranching: (b: any[]) => void }) {
  const ruleFor = (optionId: string) => branching.find((r) => r.if_option_id === optionId);
  const setRule = (optionId: string, action: "next" | "end" | "skip_to") => {
    const rest = branching.filter((r) => r.if_option_id !== optionId);
    if (action === "next") setBranching(rest);
    else setBranching([...rest, { if_option_id: optionId, action }]);
  };
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground mb-1 block">Branching (adaptive flow per answer)</Label>
      <div className="space-y-1">
        {opts.map((o, i) => {
          const r = ruleFor(o.id);
          return (
            <div key={o.id || i} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-32 truncate">{o.option_text}</span>
              <span className="text-muted-foreground">→</span>
              <Select value={r?.action ?? "next"} onValueChange={(v) => setRule(o.id, v as any)}>
                <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="next" className="text-xs">Continue (default)</SelectItem>
                  <SelectItem value="end" className="text-xs">End quiz immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground italic mt-1">Set "End quiz" to terminate after a learner picks a disqualifying answer (one-at-a-time mode).</p>
    </div>
  );
}


function AiGenerateDialog({ assessmentId, startOrder, onClose }: { assessmentId: string; startOrder: number; onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [busy, setBusy] = useState(false);
  const create = useCreateQuizQuestion();

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-questions", {
        body: {
          topic, count, difficulty,
          types: ["multiple_choice", "true_false", "short_answer", "matching", "ordering", "fill_blank", "numerical", "hotspot", "drag_drop", "code", "formula"],
        },
      });
      if (error) throw error;
      const qs = (data as any)?.questions ?? [];
      if (!qs.length) throw new Error("No questions returned");
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        await create.mutateAsync({
          assessment_id: assessmentId,
          question_text: q.question_text,
          question_type: q.question_type || "multiple_choice",
          points: q.points || 1,
          sequence_order: startOrder + i,
          explanation: q.explanation,
          metadata: q.metadata,
          options: q.options,
        });
      }
      toast.success(`Added ${qs.length} AI-generated questions`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">Generate questions with AI</h3>
        </div>
        <div className="space-y-3">
          <Field label="Topic / learning objective">
            <Textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Photosynthesis basics for grade 9 biology" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number of questions">
              <Input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </Field>
            <Field label="Difficulty">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Question Bank Picker ─────────── */
function QuestionBankDialog({ assessmentId, startOrder, onClose }:
  { assessmentId: string; startOrder: number; onClose: () => void }) {
  const { data: banks = [], isLoading: banksLoading } = useQuestionBanks();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const { data: items = [], isLoading: itemsLoading } = useQuestionBankItems(selectedBank ?? undefined);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const importItem = useImportBankItemToQuiz();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.question_text.toLowerCase().includes(q) ||
      (it.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [items, search]);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const importPicked = async () => {
    const toImport = items.filter((it) => picked.has(it.id));
    if (!toImport.length) {
      toast.error("Select at least one question");
      return;
    }
    setImporting(true);
    try {
      for (let i = 0; i < toImport.length; i++) {
        await importItem.mutateAsync({
          item: toImport[i],
          assessment_id: assessmentId,
          sequence_order: startOrder + i,
        });
      }
      toast.success(`Imported ${toImport.length} question${toImport.length === 1 ? "" : "s"}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-5 border-b border-border/50">
          <Library className="w-5 h-5 text-accent" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Insert from Question Bank</h3>
            <p className="text-[11px] text-muted-foreground">Reuse questions across assessments</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{picked.size} selected</Badge>
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-0 flex-1 min-h-0">
          {/* Bank list */}
          <div className="border-r border-border/40 overflow-y-auto p-2 bg-secondary/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Banks</p>
            {banksLoading ? (
              <Skeleton className="h-8 m-2" />
            ) : banks.length === 0 ? (
              <p className="text-[11px] text-muted-foreground p-2">
                No banks yet. Create one in Question Banks.
              </p>
            ) : (
              banks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBank(b.id); setPicked(new Set()); }}
                  className={cn(
                    "w-full text-left p-2 rounded-md text-xs flex items-center gap-2 transition-colors",
                    selectedBank === b.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/60 text-foreground"
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1">{b.name}</span>
                  {b.is_shared && <Badge variant="secondary" className="text-[8px]">shared</Badge>}
                </button>
              ))
            )}
          </div>

          {/* Items */}
          <div className="flex flex-col min-h-0">
            <div className="p-3 border-b border-border/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search question text or tags…"
                  className="pl-8 h-8 text-xs"
                  disabled={!selectedBank}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!selectedBank ? (
                <p className="text-xs text-muted-foreground text-center py-12">
                  Select a question bank to view items
                </p>
              ) : itemsLoading ? (
                <Skeleton className="h-24" />
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">
                  {items.length === 0 ? "This bank is empty." : "No questions match your search."}
                </p>
              ) : (
                filtered.map((it) => {
                  const isPicked = picked.has(it.id);
                  return (
                    <button
                      key={it.id}
                      onClick={() => togglePick(it.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all flex gap-3",
                        isPicked
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border hover:bg-secondary/30"
                      )}
                    >
                      <div className={cn(
                        "shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5",
                        isPicked ? "border-primary bg-primary" : "border-border"
                      )}>
                        {isPicked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground line-clamp-2">{it.question_text}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[9px]">{it.question_type.replace("_", " ")}</Badge>
                          {it.difficulty_level && (
                            <Badge variant="outline" className="text-[9px]">{it.difficulty_level}</Badge>
                          )}
                          <span className="text-[9px] text-muted-foreground">{it.points} pt</span>
                          {(it.tags || []).slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[9px]">#{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border/50">
          <Button variant="ghost" onClick={onClose} disabled={importing}>Cancel</Button>
          <Button onClick={importPicked} disabled={importing || picked.size === 0}>
            {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Import {picked.size > 0 ? `${picked.size} question${picked.size === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Pool / Randomisation Step ─────────── */
function PoolStep({ assessmentId, settings, questions }: { assessmentId: string; settings: any; questions: QuizQuestion[] }) {
  const upsert = useUpsertAssessmentSettings();
  const [randQ, setRandQ] = useState(settings?.randomise_questions ?? false);
  const [randO, setRandO] = useState(settings?.randomise_options ?? false);
  const [showFlag, setShowFlag] = useState(settings?.show_question_flagging ?? true);
  const [allowBack, setAllowBack] = useState(settings?.allow_backtracking ?? true);

  useEffect(() => {
    setRandQ(settings?.randomise_questions ?? false);
    setRandO(settings?.randomise_options ?? false);
    setShowFlag(settings?.show_question_flagging ?? true);
    setAllowBack(settings?.allow_backtracking ?? true);
  }, [settings]);

  const save = () => {
    upsert.mutate({
      assessment_id: assessmentId,
      randomise_questions: randQ,
      randomise_options: randO,
      show_question_flagging: showFlag,
      allow_backtracking: allowBack,
    } as any);
  };

  return (
    <div className="space-y-4">
      <Card title="Randomisation" description="Control how questions appear to each learner">
        <div className="space-y-3">
          <ToggleRow label="Randomise question order" desc="Each learner sees questions in a different order" value={randQ} onChange={setRandQ} />
          <ToggleRow label="Randomise option order" desc="Shuffle multiple-choice options per attempt" value={randO} onChange={setRandO} />
          <ToggleRow label="Allow question flagging" desc="Learners can mark questions for review" value={showFlag} onChange={setShowFlag} />
          <ToggleRow label="Allow backtracking" desc="Learners can return to previous questions" value={allowBack} onChange={setAllowBack} />
        </div>
        <div className="border-t border-border/40 pt-4 mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{questions.length} questions total</p>
          <Button onClick={save} disabled={upsert.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </Card>

      <SectionsManager assessmentId={assessmentId} questions={questions} />
    </div>
  );
}

/* ─────────── Sections + Random Pools ─────────── */
function SectionsManager({ assessmentId, questions }: { assessmentId: string; questions: QuizQuestion[] }) {
  const { data: sections = [] } = useQuizSections(assessmentId);
  const create = useCreateQuizSection();
  const update = useUpdateQuizSection();
  const remove = useDeleteQuizSection();
  const assign = useAssignQuestionToSection();

  const orphans = questions.filter((q) => !q.section_id);

  const addSection = () => {
    create.mutate({
      assessment_id: assessmentId,
      title: `Section ${sections.length + 1}`,
      sequence_order: sections.length,
      is_pool: false,
      shuffle_questions: false,
    });
  };

  return (
    <Card
      title="Sections & Random Pools"
      description="Group questions into sections. Mark a section as a pool to pick N at random per attempt."
    >
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={addSection} disabled={create.isPending}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add section
        </Button>
      </div>

      {sections.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border/40 rounded-lg mb-3">
          <Shuffle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No sections yet — all questions form one flat list.</p>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((s) => {
          const inSec = questions.filter((q) => q.section_id === s.id);
          return (
            <SectionCard
              key={s.id}
              section={s}
              inSection={inSec}
              orphans={orphans}
              onUpdate={(patch) => update.mutate({ id: s.id, assessment_id: assessmentId, patch })}
              onDelete={() => remove.mutate({ id: s.id, assessment_id: assessmentId })}
              onAssign={(qid, sid) => assign.mutate({ question_id: qid, assessment_id: assessmentId, section_id: sid })}
            />
          );
        })}
      </div>

      {sections.length > 0 && orphans.length > 0 && (
        <div className="border-t border-border/40 pt-3 mt-4">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">
            Unassigned questions ({orphans.length}) — appear before all sections
          </p>
          <ul className="space-y-1">
            {orphans.map((q) => (
              <li key={q.id} className="text-xs text-foreground truncate flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px] shrink-0">{q.question_type.replace(/_/g, " ")}</Badge>
                <span className="flex-1 truncate">{q.question_text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function SectionCard({
  section, inSection, orphans, onUpdate, onDelete, onAssign,
}: {
  section: QuizSection;
  inSection: QuizQuestion[];
  orphans: QuizQuestion[];
  onUpdate: (patch: Partial<QuizSection>) => void;
  onDelete: () => void;
  onAssign: (qid: string, sid: string | null) => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [pickCount, setPickCount] = useState<number>(section.pick_count ?? 1);

  useEffect(() => { setTitle(section.title); }, [section.title]);
  useEffect(() => { setPickCount(section.pick_count ?? 1); }, [section.pick_count]);

  const total = inSection.length;
  const effectivePick = section.is_pool ? Math.min(pickCount || 0, total) : total;

  return (
    <div className="border border-border/50 rounded-lg p-3 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== section.title && onUpdate({ title })}
          className="text-sm font-semibold flex-1"
        />
        <Badge variant="secondary" className="text-[9px]">
          {effectivePick}/{total} questions
        </Badge>
        <Button variant="ghost" size="sm" aria-label="Delete section" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <ToggleRow
          label="Random pool"
          desc="Pick N at random per attempt"
          value={section.is_pool}
          onChange={(v) => onUpdate({ is_pool: v })}
        />
        <ToggleRow
          label="Shuffle within section"
          desc="Randomise order shown to learner"
          value={section.shuffle_questions}
          onChange={(v) => onUpdate({ shuffle_questions: v })}
        />
      </div>

      {section.is_pool && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Label className="text-[11px] text-muted-foreground">Pick</Label>
            <Input
              type="number"
              min={1}
              value={pickCount}
              onChange={(e) => setPickCount(Number(e.target.value))}
              onBlur={() => onUpdate({ pick_count: pickCount })}
              className="w-20 h-8 text-xs"
            />
            <Label className="text-[11px] text-muted-foreground">of {total} question{total === 1 ? "" : "s"} in section</Label>
            {!section.source_bank_id && pickCount > total && total > 0 && (
              <Badge variant="destructive" className="text-[9px]">Pick exceeds available</Badge>
            )}
          </div>
          <SmartPoolEditor section={section} onUpdate={onUpdate} />
        </>
      )}

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Questions in this section</Label>
        {inSection.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No questions assigned yet.</p>
        ) : (
          <ul className="space-y-1 mb-2">
            {inSection.map((q) => (
              <li key={q.id} className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="text-[9px] shrink-0">{q.question_type.replace(/_/g, " ")}</Badge>
                <span className="flex-1 truncate">{q.question_text}</span>
                <Button variant="ghost" size="sm" aria-label="Remove from section" onClick={() => onAssign(q.id, null)} title="Remove from section">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {orphans.length > 0 && (
          <Select value="" onValueChange={(v) => onAssign(v, section.id)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={`+ Add unassigned question (${orphans.length})`} />
            </SelectTrigger>
            <SelectContent>
              {orphans.map((q) => (
                <SelectItem key={q.id} value={q.id} className="text-xs">
                  {q.question_text.slice(0, 80)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

/* ─────────── Smart Pool Editor (tag/difficulty bank picker) ─────────── */
function SmartPoolEditor({
  section, onUpdate,
}: {
  section: QuizSection;
  onUpdate: (patch: Partial<QuizSection>) => void;
}) {
  const { data: banks = [] } = useQuestionBanks();
  const sync = useSyncSmartPool();
  const [tagInput, setTagInput] = useState("");

  const tags = section.filter_tags || [];
  const difficulties = section.filter_difficulty || [];
  const types = section.filter_question_types || [];

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) { setTagInput(""); return; }
    onUpdate({ filter_tags: [...tags, t] });
    setTagInput("");
  };
  const removeTag = (t: string) => onUpdate({ filter_tags: tags.filter((x) => x !== t) });
  const toggleDiff = (d: string) =>
    onUpdate({ filter_difficulty: difficulties.includes(d) ? difficulties.filter((x) => x !== d) : [...difficulties, d] });
  const toggleType = (t: string) =>
    onUpdate({ filter_question_types: types.includes(t) ? types.filter((x) => x !== t) : [...types, t] });

  return (
    <div className="border border-border/40 rounded-md p-3 mb-3 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-foreground">Smart pool from question bank (optional)</Label>
        {section.source_bank_id && (
          <Button
            size="sm" variant="outline"
            disabled={sync.isPending}
            onClick={() => sync.mutate({ section })}
          >
            {sync.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Shuffle className="w-3 h-3 mr-1" />}
            Sync now
          </Button>
        )}
      </div>

      <Select
        value={section.source_bank_id || "none"}
        onValueChange={(v) => onUpdate({ source_bank_id: v === "none" ? null : v })}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">— No bank (manual section) —</SelectItem>
          {banks.map((b: any) => (
            <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {section.source_bank_id && (
        <>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Tags (must match any)</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] gap-1">
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-destructive">×</button>
                </Badge>
              ))}
              {tags.length === 0 && <span className="text-[10px] text-muted-foreground italic">Any tag</span>}
            </div>
            <div className="flex gap-1">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
                className="h-7 text-xs"
              />
              <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Difficulty</Label>
            <div className="flex gap-1">
              {["easy", "medium", "hard"].map((d) => (
                <Badge
                  key={d}
                  variant={difficulties.includes(d) ? "default" : "outline"}
                  className="cursor-pointer text-[10px] capitalize"
                  onClick={() => toggleDiff(d)}
                >{d}</Badge>
              ))}
              {difficulties.length === 0 && <span className="text-[10px] text-muted-foreground italic ml-1">Any</span>}
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Question types</Label>
            <div className="flex flex-wrap gap-1">
              {["multiple_choice", "true_false", "short_answer", "matching", "ordering", "fill_blank", "numerical", "hotspot", "drag_drop", "code", "formula"].map((t) => (
                <Badge
                  key={t}
                  variant={types.includes(t) ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => toggleType(t)}
                >{t.replace(/_/g, " ")}</Badge>
              ))}
              {types.length === 0 && <span className="text-[10px] text-muted-foreground italic ml-1">Any</span>}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Click "Sync now" to pull <strong>{section.pick_count || 10}</strong> random matching questions into this section.
            Existing section questions will be replaced.
          </p>
        </>
      )}
    </div>
  );
}
function ResultsStep({ assessment, settings }: { assessment: any; settings: any }) {
  const upsert = useUpsertAssessmentSettings();
  const [feedback, setFeedback] = useState(settings?.feedback_release ?? "after_submit");
  const [showAnswers, setShowAnswers] = useState(settings?.show_correct_answers ?? false);

  useEffect(() => {
    setFeedback(settings?.feedback_release ?? "after_submit");
    setShowAnswers(settings?.show_correct_answers ?? false);
  }, [settings]);

  const save = () => {
    upsert.mutate({
      assessment_id: assessment.id,
      feedback_release: feedback,
      show_correct_answers: showAnswers,
    } as any);
  };

  return (
    <Card title="Results & Review" description="What learners see after submitting">
      <div className="space-y-4">
        <Field label="Feedback release">
          <Select value={feedback} onValueChange={setFeedback}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediately per question</SelectItem>
              <SelectItem value="after_submit">After submission</SelectItem>
              <SelectItem value="after_grading">After moderator grading</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <ToggleRow label="Show correct answers" desc="Reveal correct options in the review screen" value={showAnswers} onChange={setShowAnswers} />
      </div>
      <div className="border-t border-border/40 pt-4 mt-4 flex items-center justify-between">
        <Badge variant={assessment.status === "published" ? "default" : "outline"}>{assessment.status}</Badge>
        <Button onClick={save} disabled={upsert.isPending}>
          <Save className="w-4 h-4 mr-1" /> Save
        </Button>
      </div>
    </Card>
  );
}

/* ─────────── Side Preview ─────────── */
function SidePreview({ assessment, questions, settings }: { assessment: any; questions: QuizQuestion[]; settings: any }) {
  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);
  const [mode, setMode] = useState<"summary" | "live">("summary");
  const [qIndex, setQIndex] = useState(0);
  const safeIndex = Math.min(qIndex, Math.max(0, questions.length - 1));
  const current = questions[safeIndex];

  return (
    <div className="space-y-3 xl:sticky xl:top-4 self-start">
      <div className="bg-card rounded-xl border border-border/50 p-4 shadow-card">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</h3>
          </div>
          <div className="flex rounded-md border border-border/50 overflow-hidden">
            <button
              onClick={() => setMode("summary")}
              className={cn(
                "text-[10px] px-2 py-1 transition-colors",
                mode === "summary" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/60"
              )}
            >
              Summary
            </button>
            <button
              onClick={() => setMode("live")}
              className={cn(
                "text-[10px] px-2 py-1 transition-colors",
                mode === "live" ? "bg-primary text-primary-foreground" : "hover:bg-secondary/60"
              )}
            >
              Live
            </button>
          </div>
        </div>

        {mode === "summary" && (
          <>
            <h4 className="text-sm font-bold text-foreground">{assessment.title}</h4>
            {assessment.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{assessment.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
              <Stat label="Questions" value={questions.length} />
              <Stat label="Total points" value={totalPoints} />
              <Stat label="Pass mark" value={`${assessment.pass_mark ?? "—"}%`} />
              <Stat label="Time limit" value={settings?.time_limit_minutes ? `${settings.time_limit_minutes}m` : "∞"} />
            </div>
          </>
        )}

        {mode === "live" && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Add a question to see the learner preview.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    className="px-2 py-1 rounded border border-border/50 hover:bg-secondary/60 disabled:opacity-40"
                    disabled={safeIndex === 0}
                    onClick={() => setQIndex(safeIndex - 1)}
                  >
                    ← Prev
                  </button>
                  <span className="text-muted-foreground">
                    Question {safeIndex + 1} / {questions.length}
                  </span>
                  <button
                    className="px-2 py-1 rounded border border-border/50 hover:bg-secondary/60 disabled:opacity-40"
                    disabled={safeIndex >= questions.length - 1}
                    onClick={() => setQIndex(safeIndex + 1)}
                  >
                    Next →
                  </button>
                </div>
                {current && <LearnerQuestionPreview question={current} />}
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Checklist</h3>
        <div className="space-y-2">
          <CheckItem ok={!!assessment.title} label="Has a title" />
          <CheckItem ok={questions.length > 0} label="At least one question" />
          <CheckItem ok={!!assessment.pass_mark} label="Pass mark configured" />
          <CheckItem ok={assessment.status === "published" || assessment.status === "active"} label="Published" />
        </div>
      </div>
    </div>
  );
}

/* ─────────── Learner question preview (read-only mock) ─────────── */
function LearnerQuestionPreview({ question }: { question: QuizQuestion }) {
  const md: any = (question as any).metadata || {};
  const type = question.question_type;

  return (
    <div className="rounded-lg border border-border/50 bg-background p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[9px] uppercase">{type.replace("_", " ")}</Badge>
        <span className="text-[10px] text-muted-foreground">{question.points} pts</span>
      </div>
      <p className="text-xs font-medium text-foreground whitespace-pre-wrap">
        {question.question_text || <span className="italic text-muted-foreground">No prompt yet</span>}
      </p>

      {(type === "multiple_choice" || type === "true_false") && (
        <div className="space-y-1.5">
          {(question.options || []).map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-[11px] p-2 rounded border border-border/40 cursor-default">
              <input type="radio" disabled className="pointer-events-none" />
              <span>{o.option_text}</span>
            </label>
          ))}
          {(question.options || []).length === 0 && (
            <p className="text-[10px] italic text-muted-foreground">No options yet</p>
          )}
        </div>
      )}

      {type === "short_answer" && (
        <Textarea disabled placeholder="Learner answer…" className="text-[11px] h-16" />
      )}

      {type === "numerical" && (
        <div className="flex items-center gap-2">
          <Input disabled placeholder="0" className="text-[11px] h-8" />
          {md.unit && <span className="text-[10px] text-muted-foreground">{md.unit}</span>}
        </div>
      )}

      {type === "fill_blank" && (
        <div className="space-y-1.5">
          {(md.blanks || []).map((_b: any, i: number) => (
            <Input key={i} disabled placeholder={`Blank ${i + 1}`} className="text-[11px] h-8" />
          ))}
          {(!md.blanks || md.blanks.length === 0) && (
            <p className="text-[10px] italic text-muted-foreground">No blanks defined</p>
          )}
        </div>
      )}

      {type === "matching" && (
        <div className="space-y-1.5">
          {(md.pairs || []).map((p: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-[11px]">
              <span className="px-2 py-1 rounded bg-secondary/40">{p.left || `Item ${i + 1}`}</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-2 py-1 rounded border border-dashed border-border/60 italic text-muted-foreground">drag match</span>
            </div>
          ))}
          {(!md.pairs || md.pairs.length === 0) && (
            <p className="text-[10px] italic text-muted-foreground">No pairs defined</p>
          )}
        </div>
      )}

      {type === "ordering" && (
        <div className="space-y-1.5">
          {(md.items || []).map((it: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded border border-border/40 bg-secondary/20">
              <GripVertical className="w-3 h-3 text-muted-foreground" />
              <span>{it || `Item ${i + 1}`}</span>
            </div>
          ))}
          {(!md.items || md.items.length === 0) && (
            <p className="text-[10px] italic text-muted-foreground">No items defined</p>
          )}
        </div>
      )}

      {question.explanation && (
        <p className="text-[10px] italic text-muted-foreground border-t border-border/40 pt-2">
          Hint shown after submission: {question.explanation}
        </p>
      )}
    </div>
  );
}

/* ─────────── Reusable bits ─────────── */
function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-secondary/20">
      <Switch checked={value} onCheckedChange={onChange} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {ok ? <CircleCheck className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
      <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}
