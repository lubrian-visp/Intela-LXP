import { Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { AIWorkflowPhase } from "@/hooks/useAILearningWorkflow";

const PHASE_MESSAGES: Record<string, string> = {
  manual_attempt: "Complete your manual attempt before accessing AI assistance.",
  ai_assisted: "Submit your revised solution before proceeding to reflection.",
  reflection: "Submit a valid reflection before marking this as complete.",
};

interface AIPhaseBlockerProps {
  currentPhase: AIWorkflowPhase;
  attemptedAction: "ai_access" | "skip_to_reflection" | "complete";
  children?: React.ReactNode;
}

/**
 * Utility component that renders an inline warning when a learner
 * tries to skip a phase. Also fires a toast on mount.
 */
export default function AIPhaseBlocker({ currentPhase, attemptedAction, children }: AIPhaseBlockerProps) {
  const message = getBlockMessage(currentPhase, attemptedAction);

  return (
    <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm">
      <Lock className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-destructive text-xs">Action Blocked</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        {children}
      </div>
    </div>
  );
}

function getBlockMessage(phase: AIWorkflowPhase, action: string): string {
  if (action === "ai_access" && phase === "manual_attempt") {
    return "AI is locked. You must submit a valid manual attempt first.";
  }
  if (action === "skip_to_reflection" && phase === "ai_assisted") {
    return "You must interact with the AI and submit a revised solution before reflecting.";
  }
  if (action === "complete" && phase === "reflection") {
    return "Your reflection must be submitted and validated before completion.";
  }
  return PHASE_MESSAGES[phase ?? ""] ?? "You cannot perform this action in the current phase.";
}

/** Fire a toast when a user clicks a blocked action */
export function showPhaseBlockToast(currentPhase: AIWorkflowPhase, attemptedAction: string) {
  const msg = getBlockMessage(currentPhase, attemptedAction);
  toast.error(msg, { icon: <AlertTriangle className="w-4 h-4" /> });
}
