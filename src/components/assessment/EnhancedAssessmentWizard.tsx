import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Zap, Clock, Target, Award, FileText, Users, Clipboard, BookOpen,
  Settings2, Shield, Eye, Calendar, HelpCircle, Lock, Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpsertAssessmentSettings } from "@/hooks/useAssessmentSettings";

interface Module {
  id: string;
  title: string;
}

interface EnhancedAssessmentWizardProps {
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
  }, settings?: {
    time_limit_minutes: number | null;
    attempts_allowed: number;
    availability_start: string | null;
    availability_end: string | null;
    display_mode: string;
    allow_backtracking: boolean;
    show_question_flagging: boolean;
    feedback_release: string;
    randomise_questions: boolean;
    randomise_options: boolean;
    show_correct_answers: boolean;
    require_lockdown_browser: boolean;
    access_code: string | null;
  }) => void;
  isPending?: boolean;
}

const CATEGORIES = [
  {
    value: "diagnostic", label: "Diagnostic",
    description: "Pre-assessments to gauge entering knowledge",
    tooltip: "Use before instruction to identify gaps and tailor content",
    icon: Target, color: "text-info",
    types: [
      { value: "self_assessment", label: "Self-Assessment", tip: "Learner rates own abilities" },
      { value: "pre_test", label: "Pre-Test", tip: "Baseline knowledge measurement" },
      { value: "skills_gap", label: "Skills Gap Analysis", tip: "Identifies competency gaps" },
      { value: "prior_knowledge", label: "Prior Knowledge Check", tip: "Checks existing understanding" },
    ],
  },
  {
    value: "formative", label: "Formative",
    description: "Practice & feedback during learning",
    tooltip: "Low-stakes checks used during instruction to guide learning",
    icon: BookOpen, color: "text-success",
    types: [
      { value: "formative", label: "Quiz", tip: "Short knowledge check with auto-grading" },
      { value: "homework", label: "Homework", tip: "Take-home practice assignment" },
      { value: "peer_group", label: "Peer Review", tip: "Learners evaluate each other" },
      { value: "knowledge_check", label: "Knowledge Check", tip: "Quick comprehension verification" },
      { value: "reflection_journal", label: "Reflection Journal", tip: "Guided self-reflection" },
      { value: "exit_ticket", label: "Exit Ticket", tip: "End-of-session understanding check" },
      { value: "simulation", label: "Practice Simulation", tip: "Scenario-based practice" },
      { value: "polling", label: "Polling", tip: "Real-time audience response" },
    ],
  },
  {
    value: "summative", label: "Summative",
    description: "Formal evaluation of competency",
    tooltip: "High-stakes assessments used to certify achievement or competence",
    icon: Award, color: "text-warning",
    types: [
      { value: "summative", label: "Test / Exam", tip: "Timed formal examination" },
      { value: "final_project", label: "Final Project / Capstone", tip: "Comprehensive project" },
      { value: "competency", label: "Competency Assessment", tip: "Standards-based evaluation" },
      { value: "oral", label: "Oral Examination", tip: "Verbal assessment by examiner" },
      { value: "portfolio", label: "Portfolio Assessment", tip: "Collection of evidence" },
      { value: "group_project", label: "Group Project", tip: "Collaborative deliverable" },
      { value: "practical_exam", label: "Practical Exam", tip: "Hands-on skills demonstration" },
      { value: "certification_exam", label: "Certification Exam", tip: "Industry certification test" },
    ],
  },
  {
    value: "transfer", label: "Transfer",
    description: "Post-training application & verification",
    tooltip: "Measures real-world application of learning after programme completion",
    icon: Clipboard, color: "text-primary",
    types: [
      { value: "action_plan", label: "Action Plan (30-60-90)", tip: "Staged implementation plan" },
      { value: "manager_observation", label: "Manager Observation", tip: "Supervisor evaluation" },
      { value: "follow_up", label: "Follow-Up Assessment", tip: "Delayed retention check" },
      { value: "workplace", label: "On-Job Verification", tip: "Workplace competency proof" },
    ],
  },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  diagnostic: "bg-info/10 text-info border-info/20",
  formative: "bg-success/10 text-success border-success/20",
  summative: "bg-warning/10 text-warning border-warning/20",
  transfer: "bg-primary/10 text-primary border-primary/20",
};

export function EnhancedAssessmentWizard({
  open, onOpenChange, programmeId, modules, onSubmit, isPending,
}: EnhancedAssessmentWizardProps) {
  const [activeTab, setActiveTab] = useState("basics");

  // Basic fields
  const [category, setCategory] = useState("");
  const [assessmentType, setAssessmentType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [passMark, setPassMark] = useState("50");
  const [dueDate, setDueDate] = useState("");
  const [weighting, setWeighting] = useState("");

  // Advanced settings
  const [timeLimit, setTimeLimit] = useState("");
  const [attemptsAllowed, setAttemptsAllowed] = useState("1");
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [displayMode, setDisplayMode] = useState("all_at_once");
  const [allowBacktracking, setAllowBacktracking] = useState(true);
  const [showFlagging, setShowFlagging] = useState(true);
  const [feedbackRelease, setFeedbackRelease] = useState("after_submission");
  const [randomiseQuestions, setRandomiseQuestions] = useState(false);
  const [randomiseOptions, setRandomiseOptions] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [requireLockdown, setRequireLockdown] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const selectedCategory = CATEGORIES.find((c) => c.value === category);
  const availableTypes = selectedCategory?.types || [];
  const showScoring = category === "formative" || category === "summative";
  const showWeighting = category === "summative";
  const showPassMark = category === "summative" || category === "formative";

  const handleSubmit = () => {
    if (!title || !assessmentType || !category) return;
    onSubmit(
      {
        title, description,
        assessment_type: assessmentType,
        assessment_category: category,
        module_id: moduleId || null,
        max_score: maxScore ? parseInt(maxScore) : null,
        pass_mark: passMark ? parseInt(passMark) : null,
        due_date: dueDate || null,
        weighting: weighting ? parseFloat(weighting) : null,
      },
      {
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        attempts_allowed: parseInt(attemptsAllowed) || 1,
        availability_start: availabilityStart || null,
        availability_end: availabilityEnd || null,
        display_mode: displayMode,
        allow_backtracking: allowBacktracking,
        show_question_flagging: showFlagging,
        feedback_release: feedbackRelease,
        randomise_questions: randomiseQuestions,
        randomise_options: randomiseOptions,
        show_correct_answers: showCorrectAnswers,
        require_lockdown_browser: requireLockdown,
        access_code: accessCode || null,
      }
    );
    // Reset
    setCategory(""); setAssessmentType(""); setTitle(""); setDescription("");
    setModuleId(""); setMaxScore("100"); setPassMark("50"); setDueDate(""); setWeighting("");
    setTimeLimit(""); setAttemptsAllowed("1"); setAvailabilityStart(""); setAvailabilityEnd("");
    setDisplayMode("all_at_once"); setAllowBacktracking(true); setShowFlagging(true);
    setFeedbackRelease("after_submission"); setRandomiseQuestions(false); setRandomiseOptions(false);
    setShowCorrectAnswers(true); setRequireLockdown(false); setAccessCode("");
    setActiveTab("basics");
  };

  const canProceedToSettings = !!category && !!assessmentType && !!title;

  if (!open) return null;

  return (
    <section
      aria-label="Create Assessment (Enhanced)"
      className="w-full space-y-4 animate-slide-up border border-border rounded-lg bg-card overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">Create Assessment (Advanced)</h2>
            <p className="text-[11px] text-muted-foreground truncate">Configure assessment details, delivery settings, and security options</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1 shrink-0">
          <X className="w-3.5 h-3.5" /> Close
        </Button>
      </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="basics" className="text-xs gap-1.5">
                <FileText className="w-3 h-3" /> Basics
              </TabsTrigger>
              <TabsTrigger value="delivery" className="text-xs gap-1.5" disabled={!canProceedToSettings}>
                <Settings2 className="w-3 h-3" /> Delivery
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs gap-1.5" disabled={!canProceedToSettings}>
                <Shield className="w-3 h-3" /> Security
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4">
            {/* BASICS TAB */}
            <TabsContent value="basics" className="mt-4 space-y-5 pb-6">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Assessment Category
                </Label>
                <TooltipProvider>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.value;
                      return (
                        <Tooltip key={cat.value}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => { setCategory(cat.value); setAssessmentType(""); }}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                                isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/30"
                              )}
                            >
                              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cat.color)} />
                              <div>
                                <p className="text-xs font-semibold text-foreground">{cat.label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{cat.description}</p>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                            {cat.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </div>

              {/* Type Selection */}
              {category && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Assessment Type
                  </Label>
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTypes.map((type) => (
                        <Tooltip key={type.value}>
                          <TooltipTrigger asChild>
                            <button
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
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">{type.tip}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              )}

              {/* Details */}
              {assessmentType && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      3. Details
                    </Label>
                    <div className="space-y-1">
                      <Label className="text-xs">Title *</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Module 1 Knowledge Check" className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description / Instructions</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions for learners..." className="text-sm min-h-[80px]" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Linked Module (optional)</Label>
                      <Select value={moduleId} onValueChange={setModuleId}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select module..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">None (Programme-level)</SelectItem>
                          {modules.map((m) => (<SelectItem key={m.id} value={m.id} className="text-xs">{m.title}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    {showScoring && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Max Score</Label>
                          <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="text-sm" />
                        </div>
                        {showPassMark && (
                          <div className="space-y-1">
                            <Label className="text-xs">Pass Mark</Label>
                            <Input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} className="text-sm" />
                          </div>
                        )}
                      </div>
                    )}
                    {showWeighting && (
                      <div className="space-y-1">
                        <Label className="text-xs">Weighting (%)</Label>
                        <Input type="number" value={weighting} onChange={(e) => setWeighting(e.target.value)} className="text-sm" min={0} max={100} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Due Date (optional)</Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-sm" />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* DELIVERY TAB */}
            <TabsContent value="delivery" className="mt-4 space-y-5 pb-6">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Timing & Attempts
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Time Limit (minutes)</Label>
                    <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="No limit" className="text-sm" />
                    <p className="text-[10px] text-muted-foreground">Leave empty for untimed</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Attempts Allowed</Label>
                    <Input type="number" value={attemptsAllowed} onChange={(e) => setAttemptsAllowed(e.target.value)} min={1} className="text-sm" />
                    <p className="text-[10px] text-muted-foreground">Set to 0 for unlimited</p>
                  </div>
                </div>

                <Separator />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Availability Window
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Available From</Label>
                    <Input type="datetime-local" value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Available Until</Label>
                    <Input type="datetime-local" value={availabilityEnd} onChange={(e) => setAvailabilityEnd(e.target.value)} className="text-sm" />
                  </div>
                </div>

                <Separator />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Eye className="w-3 h-3" /> Display & Navigation
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Display Mode</Label>
                    <Select value={displayMode} onValueChange={setDisplayMode}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_at_once" className="text-xs">All questions at once</SelectItem>
                        <SelectItem value="one_at_a_time" className="text-xs">One question at a time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <div>
                      <p className="text-xs font-medium text-foreground">Allow Backtracking</p>
                      <p className="text-[10px] text-muted-foreground">Learners can revisit previous questions</p>
                    </div>
                    <Switch checked={allowBacktracking} onCheckedChange={setAllowBacktracking} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <div>
                      <p className="text-xs font-medium text-foreground">Question Flagging</p>
                      <p className="text-[10px] text-muted-foreground">Learners can flag questions for review</p>
                    </div>
                    <Switch checked={showFlagging} onCheckedChange={setShowFlagging} />
                  </div>
                </div>

                <Separator />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feedback Release
                </h4>
                <Select value={feedbackRelease} onValueChange={setFeedbackRelease}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="after_submission" className="text-xs">Immediately after submission</SelectItem>
                    <SelectItem value="after_due_date" className="text-xs">After due date</SelectItem>
                    <SelectItem value="after_grading" className="text-xs">After manual grading</SelectItem>
                    <SelectItem value="never" className="text-xs">Never</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">Show Correct Answers</p>
                    <p className="text-[10px] text-muted-foreground">Display correct answers in feedback</p>
                  </div>
                  <Switch checked={showCorrectAnswers} onCheckedChange={setShowCorrectAnswers} />
                </div>
              </div>
            </TabsContent>

            {/* SECURITY TAB */}
            <TabsContent value="security" className="mt-4 space-y-5 pb-6">
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shuffle className="w-3 h-3" /> Randomisation
                </h4>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">Randomise Question Order</p>
                    <p className="text-[10px] text-muted-foreground">Each learner sees questions in a different order</p>
                  </div>
                  <Switch checked={randomiseQuestions} onCheckedChange={setRandomiseQuestions} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">Randomise Answer Options</p>
                    <p className="text-[10px] text-muted-foreground">Shuffle answer option order per learner</p>
                  </div>
                  <Switch checked={randomiseOptions} onCheckedChange={setRandomiseOptions} />
                </div>

                <Separator />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Access Control
                </h4>
                <div className="space-y-1">
                  <Label className="text-xs">Access Code (optional)</Label>
                  <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Leave empty for no code" className="text-sm" />
                  <p className="text-[10px] text-muted-foreground">Learners must enter this code to start the assessment</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">Require Lockdown Browser</p>
                    <p className="text-[10px] text-muted-foreground">Prevent tab switching and copy/paste during assessment</p>
                  </div>
                  <Switch checked={requireLockdown} onCheckedChange={setRequireLockdown} />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3 flex-wrap bg-secondary/20">
          <div className="flex items-center gap-2">
            {category && (
              <Badge variant="outline" className={cn("text-[9px] border", CATEGORY_BADGE_COLORS[category])}>
                {selectedCategory?.label}
              </Badge>
            )}
            {assessmentType && (
              <Badge variant="outline" className="text-[9px]">
                {availableTypes.find((t) => t.value === assessmentType)?.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            {activeTab === "basics" && canProceedToSettings ? (
              <Button size="sm" variant="outline" onClick={() => setActiveTab("delivery")} className="gap-1.5 text-xs">
                <Settings2 className="w-3 h-3" /> Configure Delivery →
              </Button>
            ) : null}
            <Button
              size="sm" onClick={handleSubmit}
              disabled={!title || !assessmentType || !category || isPending}
              className="gap-1.5"
            >
              <Zap className="w-3 h-3" />
              {isPending ? "Creating..." : "Create Assessment"}
            </Button>
          </div>
        </div>
    </section>
  );
}
