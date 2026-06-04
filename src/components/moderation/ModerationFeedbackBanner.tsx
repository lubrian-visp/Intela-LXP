import { AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModerationFeedbackBannerProps {
  status: string;
  feedback?: string | null;
  rejectionCategory?: string | null;
  reviewedAt?: string | null;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  grading_error: "Grading Error",
  insufficient_evidence: "Insufficient Evidence",
  rubric_misapplication: "Rubric Misapplication",
  bias_concern: "Bias Concern",
  procedural_violation: "Procedural Violation",
  other: "Other",
};

export function ModerationFeedbackBanner({ status, feedback, rejectionCategory, reviewedAt, className }: ModerationFeedbackBannerProps) {
  if (!feedback && status !== "rejected") return null;

  const isRejected = status === "rejected";

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-2",
      isRejected
        ? "border-destructive/30 bg-destructive/5"
        : "border-success/30 bg-success/5",
      className
    )}>
      <div className="flex items-center gap-2">
        {isRejected ? (
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        )}
        <span className={cn("text-xs font-semibold", isRejected ? "text-destructive" : "text-success")}>
          Moderation {isRejected ? "Rejected" : "Approved"}
        </span>
        {rejectionCategory && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
            {categoryLabels[rejectionCategory] ?? rejectionCategory}
          </span>
        )}
        {reviewedAt && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {new Date(reviewedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {feedback && (
        <div className="flex gap-2 items-start">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  );
}
