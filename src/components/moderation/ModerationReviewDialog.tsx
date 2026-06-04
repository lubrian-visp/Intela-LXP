import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const REJECTION_CATEGORIES = [
  { value: "grading_error", label: "Grading Error" },
  { value: "insufficient_evidence", label: "Insufficient Evidence" },
  { value: "rubric_misapplication", label: "Rubric Misapplication" },
  { value: "bias_concern", label: "Bias Concern" },
  { value: "procedural_violation", label: "Procedural Violation" },
  { value: "other", label: "Other" },
];

interface ModerationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  onSubmit: (data: {
    id: string;
    status: "approved" | "rejected";
    moderation_feedback: string;
    rejection_category?: string;
    review_notes?: string;
  }) => void;
  isLoading?: boolean;
}

export function ModerationReviewDialog({ open, onOpenChange, item, onSubmit, isLoading }: ModerationReviewDialogProps) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!decision) return;
    onSubmit({
      id: item.id,
      status: decision,
      moderation_feedback: feedback,
      rejection_category: decision === "rejected" ? category : undefined,
      review_notes: notes || undefined,
    });
    // reset
    setDecision(null);
    setFeedback("");
    setCategory("");
    setNotes("");
  };

  const canSubmit = decision && feedback.trim().length >= 5 && (decision === "approved" || category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Moderation Review</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Review this flagged item and provide detailed feedback.
          </DialogDescription>
        </DialogHeader>

        {/* Item summary */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">
              {item?.item_type?.replace(/_/g, " ")}
            </span>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize",
              item?.priority === "high" ? "bg-destructive/10 text-destructive" :
              item?.priority === "medium" ? "bg-warning/10 text-warning" :
              "bg-muted-foreground/10 text-muted-foreground"
            )}>
              {item?.priority}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-3">{item?.content}</p>
          <p className="text-[10px] text-muted-foreground">Flag reason: {item?.reason}</p>
        </div>

        {/* Decision buttons */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Decision</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision("approved")}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                decision === "approved"
                  ? "border-success bg-success/10 text-success"
                  : "border-border bg-background text-muted-foreground hover:border-success/50"
              )}
            >
              <ThumbsUp className="w-4 h-4" /> Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision("rejected")}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                decision === "rejected"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-background text-muted-foreground hover:border-destructive/50"
              )}
            >
              <ThumbsDown className="w-4 h-4" /> Reject
            </button>
          </div>
        </div>

        {/* Rejection category */}
        {decision === "rejected" && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Rejection Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Feedback */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            {decision === "rejected" ? "Feedback for Assessor" : "Moderation Notes"}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder={decision === "rejected"
              ? "Explain why this grading is rejected and what corrective action is needed…"
              : "Confirm why this assessment was graded correctly…"
            }
            className="text-xs min-h-[80px]"
          />
          {feedback.length > 0 && feedback.length < 5 && (
            <p className="text-[10px] text-destructive">Minimum 5 characters required.</p>
          )}
        </div>

        {/* Internal notes */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Internal Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Private notes for audit trail…"
            className="text-xs min-h-[50px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            disabled={!canSubmit || isLoading}
            onClick={handleSubmit}
            className={cn(
              decision === "approved" ? "bg-success hover:bg-success/90 text-success-foreground" :
              decision === "rejected" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""
            )}
          >
            {isLoading ? "Submitting…" : decision === "approved" ? "Confirm Approval" : decision === "rejected" ? "Confirm Rejection" : "Select Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
