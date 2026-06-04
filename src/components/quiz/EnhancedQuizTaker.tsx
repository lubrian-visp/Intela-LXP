import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLearnerQuizQuestions, useSubmitQuiz, type QuizQuestion } from "@/hooks/useQuizBuilder";
import { useQuizSections, samplePoolQuestions } from "@/hooks/useQuizSections";
import { useAssessmentSettings } from "@/hooks/useAssessmentSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Loader2, Trophy, HelpCircle, Send, Flag, Clock, AlertTriangle,
  Lock, Eye,
} from "lucide-react";
import { toast } from "sonner";

interface EnhancedQuizTakerProps {
  assessmentId: string;
  assessmentTitle: string;
  enrolmentId?: string;
  onComplete?: (score: number) => void;
  onClose?: () => void;
}

function shuffleArray<T>(arr: T[], seed?: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function EnhancedQuizTaker({
  assessmentId, assessmentTitle, enrolmentId, onComplete, onClose,
}: EnhancedQuizTakerProps) {
  const { user } = useAuth();
  const { data: rawQuestions = [], isLoading: questionsLoading } = useLearnerQuizQuestions(assessmentId);
  const { data: sections = [] } = useQuizSections(assessmentId);
  const { data: settings } = useAssessmentSettings(assessmentId);
  const submitQuiz = useSubmitQuiz();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selected_option_id?: string; text_answer?: string }>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; earnedPoints: number; totalPoints: number } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Sample pool questions ONCE per attempt (cached in localStorage so refresh keeps the same set)
  const sampledIds = useMemo(() => {
    if (!rawQuestions.length) return [] as string[];
    const cacheKey = `quiz_sample_${assessmentId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const ids: string[] = JSON.parse(cached);
        // Validate all cached ids still exist
        if (ids.every((id) => rawQuestions.some((q) => q.id === id))) return ids;
      }
    } catch { /* ignore */ }
    const ids = samplePoolQuestions(sections as any, rawQuestions as any);
    try { localStorage.setItem(cacheKey, JSON.stringify(ids)); } catch { /* ignore */ }
    return ids;
  }, [rawQuestions, sections, assessmentId]);

  // Build the visible question list, then apply randomisation toggles
  const questions = useMemo(() => {
    const map = new Map(rawQuestions.map((q) => [q.id, q]));
    let qs = sampledIds.map((id) => map.get(id)!).filter(Boolean) as QuizQuestion[];
    if (settings?.randomise_questions) qs = shuffleArray(qs);
    if (settings?.randomise_options) {
      qs = qs.map((q) => ({
        ...q,
        options: q.options ? shuffleArray(q.options) : q.options,
      }));
    }
    return qs;
  }, [rawQuestions, sampledIds, settings]);

  const displayMode = settings?.display_mode || "one_at_a_time";
  const allowBacktracking = settings?.allow_backtracking ?? true;
  const showFlagging = settings?.show_question_flagging ?? true;
  const timeLimitMinutes = settings?.time_limit_minutes;

  // Access code check — use requires_access_code flag (access_code is hidden from learners)
  useEffect(() => {
    const requiresCode = (settings as any)?.requires_access_code || !!settings?.access_code;
    if (requiresCode && !accessGranted) {
      setShowAccessCodeDialog(true);
    } else if (!requiresCode) {
      setAccessGranted(true);
    }
  }, [(settings as any)?.requires_access_code, settings?.access_code, accessGranted]);

  // Timer
  useEffect(() => {
    if (!timeLimitMinutes || !accessGranted || submitted) return;
    setTimeRemaining(timeLimitMinutes * 60);
  }, [timeLimitMinutes, accessGranted, submitted]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Auto-submit on time expiry
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, submitted]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (submitted) return;
    autoSaveRef.current = setInterval(() => {
      // Save to localStorage as backup
      if (Object.keys(answers).length > 0) {
        try {
          localStorage.setItem(`quiz_autosave_${assessmentId}`, JSON.stringify(answers));
        } catch { /* ignore */ }
      }
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [answers, assessmentId, submitted]);

  // Restore from auto-save
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`quiz_autosave_${assessmentId}`);
      if (saved && Object.keys(answers).length === 0) {
        setAnswers(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }, [assessmentId]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const unansweredCount = totalQuestions - answeredCount;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { selected_option_id: optionId } }));
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { text_answer: text } }));
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setShowSubmitConfirm(false);
    const answerArray = Object.entries(answers).map(([question_id, a]) => ({
      question_id,
      selected_option_id: a.selected_option_id,
      text_answer: a.text_answer,
    }));

    try {
      // Only grade against the questions that were actually shown to this learner
      const sampledSet = new Set(sampledIds);
      const sampledQuestions = rawQuestions.filter((q) => sampledSet.has(q.id));
      const res = await submitQuiz.mutateAsync({
        assessment_id: assessmentId,
        learner_id: user.id,
        enrolment_id: enrolmentId,
        answers: answerArray.filter((a) => sampledSet.has(a.question_id)),
        questions: sampledQuestions,
      });
      // Persist the sampled set on the submission for reproducible review
      try {
        await (supabase as any)
          .from("assessment_submissions")
          .update({ selected_question_ids: sampledIds })
          .eq("id", (res as any).submissionId);
      } catch { /* non-critical */ }

      setResult(res);
      setSubmitted(true);
      onComplete?.(res.score);
      // Clear auto-save and pool cache
      localStorage.removeItem(`quiz_autosave_${assessmentId}`);
      localStorage.removeItem(`quiz_sample_${assessmentId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quiz");
    }
  };

  const handleAccessCodeSubmit = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-access-code", {
        body: { assessment_id: assessmentId, code: accessCodeInput },
      });
      if (error) throw error;
      if (data?.granted) {
        setAccessGranted(true);
        setShowAccessCodeDialog(false);
      } else {
        toast.error("Incorrect access code");
      }
    } catch {
      toast.error("Failed to verify access code");
    }
  };

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No questions have been added to this quiz yet.</p>
        {onClose && <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>Close</Button>}
      </div>
    );
  }

  // Access code dialog
  if (showAccessCodeDialog) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" /> Access Code Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the access code provided by your instructor to begin this assessment.</p>
            <Input
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              placeholder="Enter access code..."
              type="password"
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAccessCodeSubmit()}
            />
          </div>
          <DialogFooter>
            {onClose && <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>}
            <Button size="sm" onClick={handleAccessCodeSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Result screen
  if (submitted && result) {
    const showAnswers = settings?.show_correct_answers ?? true;
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-6">
        <div className={cn(
          "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
          result.score >= 70 ? "bg-success/10" : result.score >= 50 ? "bg-warning/10" : "bg-destructive/10"
        )}>
          <Trophy className={cn(
            "w-10 h-10",
            result.score >= 70 ? "text-success" : result.score >= 50 ? "text-warning" : "text-destructive"
          )} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Quiz Complete!</h2>
          <p className="text-muted-foreground text-sm">{assessmentTitle}</p>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card">
          <p className="text-4xl font-bold text-foreground mb-1">{result.score}%</p>
          <p className="text-sm text-muted-foreground">{result.earnedPoints} of {result.totalPoints} points earned</p>
          <Progress value={result.score} className="h-2 mt-4" />
        </div>
        <Badge variant="outline" className={cn(
          "text-sm px-4 py-1",
          result.score >= 70 ? "border-success text-success" : result.score >= 50 ? "border-warning text-warning" : "border-destructive text-destructive"
        )}>
          {result.score >= 70 ? "Passed" : result.score >= 50 ? "Needs Improvement" : "Not Yet Competent"}
        </Badge>
        {onClose && <Button onClick={onClose} className="mt-4">Done</Button>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with timer */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{assessmentTitle}</h2>
          <p className="text-xs text-muted-foreground">
            {displayMode === "one_at_a_time" ? `Question ${currentIndex + 1} of ${totalQuestions}` : `${totalQuestions} questions`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {timeRemaining !== null && (
            <Badge variant={timeRemaining < 60 ? "destructive" : timeRemaining < 300 ? "default" : "outline"} className="gap-1.5 text-xs font-mono">
              <Clock className="w-3 h-3" />
              {formatTime(timeRemaining)}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">{answeredCount}/{totalQuestions} answered</Badge>
          {flaggedQuestions.size > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Flag className="w-3 h-3" /> {flaggedQuestions.size}
            </Badge>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-1.5" />

      {/* Questions */}
      {displayMode === "one_at_a_time" && currentQuestion ? (
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          answer={answers[currentQuestion.id]}
          isFlagged={flaggedQuestions.has(currentQuestion.id)}
          showFlagging={showFlagging}
          onSelectOption={(optId) => handleSelectOption(currentQuestion.id, optId)}
          onTextAnswer={(text) => handleTextAnswer(currentQuestion.id, text)}
          onToggleFlag={() => toggleFlag(currentQuestion.id)}
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              answer={answers[q.id]}
              isFlagged={flaggedQuestions.has(q.id)}
              showFlagging={showFlagging}
              onSelectOption={(optId) => handleSelectOption(q.id, optId)}
              onTextAnswer={(text) => handleTextAnswer(q.id, text)}
              onToggleFlag={() => toggleFlag(q.id)}
            />
          ))}
        </div>
      )}

      {/* Navigation (one-at-a-time mode) */}
      {displayMode === "one_at_a_time" && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline" size="sm"
            disabled={currentIndex === 0 || !allowBacktracking}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          {(() => {
            const cq = currentQuestion;
            const ans = cq ? answers[cq.id] : undefined;
            const rule = (cq as any)?.branching_rules?.find?.((r: any) => r.if_option_id === ans?.selected_option_id);
            const endNow = rule?.action === "end";
            const isLast = currentIndex >= totalQuestions - 1;
            if (endNow || isLast) {
              return (
                <Button size="sm" onClick={() => setShowSubmitConfirm(true)} disabled={submitQuiz.isPending || answeredCount === 0} className="gap-1">
                  <Send className="w-4 h-4" /> {endNow ? "Submit (quiz ended)" : "Submit Quiz"}
                </Button>
              );
            }
            return (
              <Button size="sm" onClick={() => setCurrentIndex((i) => i + 1)} className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            );
          })()}
        </div>
      )}

      {/* Submit for all-at-once mode */}
      {displayMode !== "one_at_a_time" && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowSubmitConfirm(true)} disabled={submitQuiz.isPending || answeredCount === 0} className="gap-1">
            <Send className="w-4 h-4" /> Submit Quiz
          </Button>
        </div>
      )}

      {/* Question dots navigation */}
      {displayMode === "one_at_a_time" && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => allowBacktracking && setCurrentIndex(i)}
              disabled={!allowBacktracking && i < currentIndex}
              className={cn(
                "w-7 h-7 rounded-full text-[10px] font-medium transition-all relative",
                i === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                    ? "bg-success/20 text-success"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              {i + 1}
              {flaggedQuestions.has(q.id) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Submit confirmation dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Submit Quiz?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {unansweredCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                <p className="text-xs text-warning">You have {unansweredCount} unanswered question{unansweredCount !== 1 ? "s" : ""}.</p>
              </div>
            )}
            {flaggedQuestions.size > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
                <Flag className="w-4 h-4 text-info shrink-0" />
                <p className="text-xs text-info">{flaggedQuestions.size} question{flaggedQuestions.size !== 1 ? "s" : ""} flagged for review.</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">Once submitted, you cannot change your answers.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSubmitConfirm(false)}>Review</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitQuiz.isPending}>
              {submitQuiz.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual question card component
function QuestionCard({
  question, index, answer, isFlagged, showFlagging,
  onSelectOption, onTextAnswer, onToggleFlag,
}: {
  question: QuizQuestion;
  index: number;
  answer?: { selected_option_id?: string; text_answer?: string };
  isFlagged: boolean;
  showFlagging: boolean;
  onSelectOption: (optionId: string) => void;
  onTextAnswer: (text: string) => void;
  onToggleFlag: () => void;
}) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border/50 shadow-card space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg shrink-0">
            Q{index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{question.question_text}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[9px]">{question.question_type.replace(/_/g, " ")}</Badge>
              <span className="text-[10px] text-muted-foreground">{question.points} point{question.points !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        {showFlagging && (
          <Button
            variant="ghost" size="icon" className={cn("h-7 w-7", isFlagged && "text-warning")}
            onClick={onToggleFlag}
            title={isFlagged ? "Remove flag" : "Flag for review"}
          >
            <Flag className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Multiple choice / True-False */}
      {(question.question_type === "multiple_choice" || question.question_type === "true_false") && (
        <RadioGroup
          value={answer?.selected_option_id || ""}
          onValueChange={onSelectOption}
          className="space-y-2"
        >
          {(question.options ?? []).map((opt) => (
            <div key={opt.id} className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
              answer?.selected_option_id === opt.id
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-border"
            )}>
              <RadioGroupItem value={opt.id} id={`${question.id}-${opt.id}`} />
              <Label htmlFor={`${question.id}-${opt.id}`} className="text-sm cursor-pointer flex-1">{opt.option_text}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* Short answer / Essay */}
      {(question.question_type === "short_answer" || question.question_type === "essay") && (
        <Textarea
          value={answer?.text_answer || ""}
          onChange={(e) => onTextAnswer(e.target.value)}
          placeholder={question.question_type === "essay" ? "Write your essay response here..." : "Type your answer here..."}
          className={cn("min-h-[100px]", question.question_type === "essay" && "min-h-[200px]")}
        />
      )}

      {/* Numerical with tolerance */}
      {question.question_type === "numerical" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="any"
            value={answer?.text_answer || ""}
            onChange={(e) => onTextAnswer(e.target.value)}
            placeholder="Enter a number"
            className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
          />
          {(question as any).metadata?.unit && (
            <span className="text-xs text-muted-foreground shrink-0">{(question as any).metadata.unit}</span>
          )}
        </div>
      )}

      {/* Fill in the blank — render dedicated inputs per blank */}
      {(question.question_type === "fill_blank" || question.question_type === "fill_in_blank") && (
        <FillBlankTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}

      {/* File upload placeholder */}
      {question.question_type === "file_upload" && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-sm text-muted-foreground">Drag and drop your file here, or click to browse</p>
          <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, images up to 10MB</p>
        </div>
      )}

      {/* Likert scale */}
      {question.question_type === "likert" && (
        <div className="space-y-2">
          {(question.options ?? []).map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelectOption(opt.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                answer?.selected_option_id === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border/50 hover:border-border"
              )}
            >
              <span className="text-sm">{opt.option_text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Matching */}
      {question.question_type === "matching" && (
        <MatchingTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}

      {/* Ordering */}
      {question.question_type === "ordering" && (
        <OrderingTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}

      {/* Hotspot */}
      {question.question_type === "hotspot" && (
        <HotspotTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}

      {/* Drag & drop */}
      {question.question_type === "drag_drop" && (
        <DragDropTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}

      {/* Code */}
      {question.question_type === "code" && (
        <CodeTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}

      {/* Formula */}
      {question.question_type === "formula" && (
        <FormulaTaker question={question as any} value={answer?.text_answer} onChange={onTextAnswer} />
      )}
    </div>
  );
}

/* ─────────── Learner sub-takers for new question types ─────────── */
function FillBlankTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const blanks = (question.metadata?.blanks ?? []) as { answers: string[] }[];
  let current: string[] = [];
  try { current = value ? JSON.parse(value) : []; } catch { current = []; }
  const setAt = (i: number, v: string) => {
    const next = [...current];
    while (next.length < blanks.length) next.push("");
    next[i] = v;
    onChange(JSON.stringify(next));
  };
  if (blanks.length === 0) return <p className="text-xs text-muted-foreground">No blanks configured.</p>;
  return (
    <div className="space-y-2">
      {blanks.map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground w-12">Blank {i + 1}</span>
          <input
            value={current[i] ?? ""}
            onChange={(e) => setAt(i, e.target.value)}
            className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
      ))}
    </div>
  );
}

function MatchingTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const pairs = (question.metadata?.pairs ?? []) as { left: string; right: string }[];
  const rights = useMemo(() => [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5), [question.id]);
  let answer: Record<string, string> = {};
  try { answer = value ? JSON.parse(value) : {}; } catch { answer = {}; }
  const setMatch = (left: string, right: string) => {
    const next = { ...answer, [left]: right };
    onChange(JSON.stringify(next));
  };
  if (pairs.length === 0) return <p className="text-xs text-muted-foreground">No pairs configured.</p>;
  return (
    <div className="space-y-2">
      {pairs.map((p) => (
        <div key={p.left} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-sm p-2 rounded-md bg-secondary/30 border border-border/50">{p.left}</div>
          <span className="text-muted-foreground text-xs">→</span>
          <select
            value={answer[p.left] ?? ""}
            onChange={(e) => setMatch(p.left, e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">— select —</option>
            {rights.map((r, i) => <option key={i} value={r}>{r}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function OrderingTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const correct = (question.metadata?.items ?? []) as string[];
  const initial = useMemo(() => [...correct].sort(() => Math.random() - 0.5), [question.id]);
  let order: string[] = [];
  try { order = value ? JSON.parse(value) : []; } catch { order = []; }
  if (order.length !== correct.length) order = initial;
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(JSON.stringify(next));
  };
  if (correct.length === 0) return <p className="text-xs text-muted-foreground">No items configured.</p>;
  return (
    <div className="space-y-2">
      {order.map((it, i) => (
        <div key={`${it}-${i}`} className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-card">
          <span className="text-[10px] font-bold text-muted-foreground w-5">{i + 1}.</span>
          <span className="flex-1 text-sm">{it}</span>
          <button onClick={() => move(i, -1)} className="text-xs px-2 py-1 rounded hover:bg-muted">▲</button>
          <button onClick={() => move(i, 1)} className="text-xs px-2 py-1 rounded hover:bg-muted">▼</button>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Hotspot Taker ─────────── */
function HotspotTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const md = question.metadata || {};
  const click = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange(JSON.stringify({ x, y }));
  };
  let pt: { x: number; y: number } | null = null;
  try { pt = value ? JSON.parse(value) : null; } catch { pt = null; }
  if (!md.image_url) return <p className="text-xs text-muted-foreground">No image configured.</p>;
  return (
    <div className="relative border border-border/40 rounded-md overflow-hidden cursor-crosshair" onClick={click}>
      <img src={md.image_url} alt="hotspot question" className="w-full block" />
      {pt && (
        <div className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/40"
          style={{ left: `${pt.x}%`, top: `${pt.y}%` }} />
      )}
    </div>
  );
}

/* ─────────── Drag & Drop Taker ─────────── */
function DragDropTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const md = question.metadata || {};
  const items: { id: string; label: string }[] = md.items || [];
  const targets: { id: string; label: string }[] = md.targets || [];
  let mapping: Record<string, string> = {};
  try { mapping = value ? JSON.parse(value) : {}; } catch { mapping = {}; }
  const onDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData("text/plain", itemId);
  };
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    onChange(JSON.stringify({ ...mapping, [itemId]: targetId }));
  };
  const placedIds = new Set(Object.keys(mapping));
  if (items.length === 0 || targets.length === 0)
    return <p className="text-xs text-muted-foreground">Drag & drop not configured.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-md min-h-[60px]">
        {items.filter((i) => !placedIds.has(i.id)).map((it) => (
          <div key={it.id} draggable onDragStart={(e) => onDragStart(e, it.id)}
            className="px-3 py-1.5 rounded border border-border bg-card text-xs cursor-grab active:cursor-grabbing">
            {it.label}
          </div>
        ))}
        {items.every((i) => placedIds.has(i.id)) && <span className="text-[10px] text-muted-foreground italic">All items placed</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {targets.map((t) => {
          const placed = items.filter((i) => mapping[i.id] === t.id);
          return (
            <div key={t.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, t.id)}
              className="border-2 border-dashed border-border/50 rounded-md p-3 min-h-[80px]">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">{t.label}</p>
              <div className="flex flex-wrap gap-1">
                {placed.map((p) => (
                  <button key={p.id} onClick={() => {
                    const next = { ...mapping }; delete next[p.id]; onChange(JSON.stringify(next));
                  }} className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">{p.label} ×</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Code Taker ─────────── */
function CodeTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const md = question.metadata || {};
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">{md.language || "code"}</Badge>
        {md.language === "javascript" && <span className="text-[10px] text-muted-foreground italic">Auto-graded</span>}
      </div>
      <Textarea
        rows={8}
        className="font-mono text-xs"
        value={value ?? md.starter_code ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your code…"
      />
    </div>
  );
}

/* ─────────── Formula Taker ─────────── */
function FormulaTaker({ question, value, onChange }: { question: any; value?: string; onChange: (v: string) => void }) {
  const md = question.metadata || {};
  const vars: { name: string; value: number }[] = md.variables || [];
  return (
    <div className="space-y-2">
      <div className="text-xs p-2 rounded bg-secondary/30 border border-border/50">
        <div className="font-mono">{md.expression}</div>
        {vars.length > 0 && (
          <div className="text-[10px] text-muted-foreground mt-1">
            where {vars.map((v) => `${v.name} = ${v.value}`).join(", ")}
          </div>
        )}
      </div>
      <input type="number" step="any" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder="Your numeric answer"
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
    </div>
  );
}
