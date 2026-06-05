/**
 * GradeSubmissionDialog
 *
 * The core grading interface — opened from AssessorPortal (Eye button)
 * and AssessorQueue (card click). Allows the assessor to:
 *  - Read the learner's submission (notes/response, file list)
 *  - Enter a numeric score with live pass/fail feedback
 *  - Select an NQF outcome (Competent / Not Yet Competent / Remedial)
 *  - Write feedback to the learner
 *  - Grade & Submit → status: "graded" + assessed_at
 *  - Save Draft     → status: "in_review"
 *  - Request Resubmission → status: "resubmit"
 *
 * Data saved to assessment_submissions via useUpdateSubmission().
 * Learner sees the grade + feedback in their My Grades page.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertTriangle, Send, Save, RotateCcw,
  User, Calendar, FileText, Award, Loader2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUpdateSubmission } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Submission {
  id: string;
  learner_id: string;
  assessment_id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  assessed_at: string | null;
  moderation_status?: string;
  assessments?: {
    title?: string;
    max_score?: number | null;
    pass_mark?: number | null;
    assessment_category?: string;
  } | null;
}

interface GradeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: Submission | null;
}

// ─── NQF outcome options ──────────────────────────────────────────────────────
const OUTCOMES = [
  { value: "competent",          label: "Competent",            color: "text-success",     bg: "bg-success/10"     },
  { value: "not_yet_competent",  label: "Not Yet Competent",    color: "text-warning",     bg: "bg-warning/10"     },
  { value: "remedial",           label: "Remedial Support Req.", color: "text-destructive", bg: "bg-destructive/10" },
];

const CATEGORY_BADGE: Record<string, string> = {
  diagnostic: "bg-info/10 text-info border-info/20",
  formative:  "bg-success/10 text-success border-success/20",
  summative:  "bg-warning/10 text-warning border-warning/20",
  transfer:   "bg-primary/10 text-primary border-primary/20",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function GradeSubmissionDialog({
  open, onOpenChange, submission,
}: GradeSubmissionDialogProps) {
  const { user } = useAuth();
  const updateSubmission = useUpdateSubmission();

  const [score,    setScore]    = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [outcome,  setOutcome]  = useState<string>("competent");
  const [saving,   setSaving]   = useState<"grade" | "draft" | "resubmit" | null>(null);

  // Pre-populate fields if submission already has grades (re-grade scenario)
  useEffect(() => {
    if (submission) {
      setScore(submission.score != null ? String(submission.score) : "");
      setFeedback(submission.feedback ?? "");
      // Infer outcome from existing score
      if (submission.score != null && submission.assessments?.pass_mark != null) {
        setOutcome(submission.score >= submission.assessments.pass_mark ? "competent" : "not_yet_competent");
      } else {
        setOutcome("competent");
      }
    }
  }, [submission?.id]);

  // Fetch learner profile for display
  const { data: learnerProfile } = useQuery({
    queryKey: ["grade-dialog-profile", submission?.learner_id],
    enabled: !!submission?.learner_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, job_title")
        .eq("user_id", submission!.learner_id)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  if (!submission) return null;

  const maxScore   = submission.assessments?.max_score ?? null;
  const passMark   = submission.assessments?.pass_mark ?? null;
  const scoreNum   = score !== "" ? parseFloat(score) : null;
  const isOverMax  = maxScore != null && scoreNum != null && scoreNum > maxScore;
  const isNegative = scoreNum != null && scoreNum < 0;
  const passes     = passMark != null && scoreNum != null && scoreNum >= passMark;
  const fails      = passMark != null && scoreNum != null && scoreNum < passMark;
  const pct        = maxScore && scoreNum != null ? Math.round((scoreNum / maxScore) * 100) : null;

  const isResubmission = submission.status === "resubmit";
  const canGrade       = !isOverMax && !isNegative && feedback.trim().length > 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleAction = async (action: "grade" | "draft" | "resubmit") => {
    if (!user?.id) return;
    setSaving(action);
    try {
      const updates: Record<string, any> = {
        id:          submission.id,
        assessor_id: user.id,
        feedback:    feedback.trim() || null,
      };

      if (action === "grade") {
        if (scoreNum == null) { toast.error("Please enter a score."); setSaving(null); return; }
        updates.score       = scoreNum;
        updates.status      = "graded";
        updates.assessed_at = new Date().toISOString();
      } else if (action === "draft") {
        if (scoreNum != null) updates.score = scoreNum;
        updates.status = "in_review";
      } else {
        updates.status = "resubmit";
      }

      await updateSubmission.mutateAsync(updates);
      toast.success(
        action === "grade"    ? "Submission graded successfully" :
        action === "draft"    ? "Draft saved — submission marked In Review" :
        "Learner notified to resubmit"
      );
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const handleClose = () => {
    setScore(""); setFeedback(""); setOutcome("competent"); setSaving(null);
    onOpenChange(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            {isResubmission ? "Re-grade Submission" : "Grade Submission"}
          </DialogTitle>
          <DialogDescription className="text-xs sr-only">
            Grade the learner's submitted work
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Assessment info ── */}
          <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/50 space-y-1.5">
            <div className="flex items-start gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground flex-1">
                {submission.assessments?.title ?? "Assessment"}
              </p>
              {submission.assessments?.assessment_category && (
                <Badge variant="outline" className={cn("text-[9px] capitalize shrink-0", CATEGORY_BADGE[submission.assessments.assessment_category])}>
                  {submission.assessments.assessment_category}
                </Badge>
              )}
              {isResubmission && (
                <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20 shrink-0">
                  Re-submission
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              {maxScore  && <span>Max score: <strong className="text-foreground">{maxScore}</strong></span>}
              {passMark  && <span>Pass mark: <strong className="text-foreground">{passMark}</strong></span>}
            </div>
          </div>

          {/* ── Learner info ── */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/40">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {learnerProfile?.full_name ?? `Learner ${submission.learner_id.slice(0, 8)}…`}
              </p>
              {learnerProfile?.job_title && (
                <p className="text-[10px] text-muted-foreground">{learnerProfile.job_title}</p>
              )}
            </div>
            {submission.submitted_at && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Calendar className="w-3 h-3" />
                {format(new Date(submission.submitted_at), "d MMM yyyy")}
              </div>
            )}
          </div>

          {/* ── Learner's response/notes ── */}
          {submission.feedback && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                Learner's Submission Notes
              </Label>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-xs text-foreground leading-relaxed max-h-32 overflow-y-auto">
                {submission.feedback}
              </div>
            </div>
          )}

          {/* ── Score entry ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Score {maxScore ? `(out of ${maxScore})` : ""}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={maxScore ?? undefined}
                step={0.5}
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder={maxScore ? `0 – ${maxScore}` : "Enter score"}
                className={cn(
                  "w-28 text-center font-bold text-lg",
                  isOverMax && "border-destructive ring-destructive",
                  isNegative && "border-destructive ring-destructive",
                )}
                aria-label="Enter score for this submission"
              />

              {/* Live pass/fail indicator */}
              {scoreNum != null && !isOverMax && !isNegative && (
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full",
                  passes ? "bg-success/10 text-success" : fails ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                )}>
                  {passes
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Pass ({pct}%)</>
                    : fails
                      ? <><AlertTriangle className="w-3.5 h-3.5" /> Fail ({pct}%)</>
                      : `${pct}%`
                  }
                </div>
              )}

              {isOverMax && <p className="text-xs text-destructive">Exceeds max ({maxScore})</p>}
              {isNegative && <p className="text-xs text-destructive">Score cannot be negative</p>}
            </div>
          </div>

          {/* ── NQF Outcome ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              NQF Outcome
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={cn(
                    "text-[11px] font-medium px-3 py-2 rounded-lg border transition-all text-center",
                    outcome === o.value
                      ? cn("border-current ring-1 ring-current", o.color, o.bg)
                      : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary"
                  )}
                  aria-pressed={outcome === o.value}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Feedback to learner ── */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              Feedback to Learner
              <span className="text-muted-foreground font-normal">(required to submit)</span>
            </Label>
            <Textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Provide clear, constructive feedback. Reference specific aspects of the learner's work and suggest areas for improvement…"
              className="min-h-[110px] resize-y text-sm"
              maxLength={3000}
              aria-label="Feedback for the learner"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-1.5">
                <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  Feedback is visible to the learner in their My Grades page.
                </p>
              </div>
              <p className="text-[9px] text-muted-foreground">{feedback.length}/3000</p>
            </div>
          </div>

          {/* ── Moderation note ── */}
          {(submission as any).moderation_status === "rejected" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-[11px] text-destructive">
                This submission was <strong>rejected by the moderator</strong>. Review their feedback above and re-grade accordingly.
              </p>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/40">
          {/* Resubmit — only for pending/in_review */}
          {["pending", "in_review", "submitted"].includes(submission.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("resubmit")}
              disabled={!!saving}
              className="gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
              aria-label="Request learner to resubmit"
            >
              {saving === "resubmit"
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RotateCcw className="w-3 h-3" />}
              Resubmit
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("draft")}
            disabled={!!saving}
            className="gap-1.5"
            aria-label="Save grade as draft (marks as In Review)"
          >
            {saving === "draft"
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Save className="w-3 h-3" />}
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleAction("grade")}
            disabled={!!saving || !canGrade}
            className="gap-1.5 flex-1"
            aria-label="Submit grade and feedback to learner"
          >
            {saving === "grade"
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Grading…</>
              : <><Send className="w-3 h-3" /> Grade & Submit</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
