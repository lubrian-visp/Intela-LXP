import { CheckCircle2, Lock, Brain, Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AIWorkflowPhase } from "@/hooks/useAILearningWorkflow";

const STEPS = [
  { key: "manual_attempt", label: "Manual Attempt", icon: Lock, description: "Complete without AI" },
  { key: "ai_assisted", label: "AI Assisted", icon: Brain, description: "Get guided help" },
  { key: "reflection", label: "Reflection", icon: Star, description: "Reflect & validate" },
  { key: "completed", label: "Complete", icon: CheckCircle2, description: "Workflow done" },
] as const;

interface AIWorkflowProgressBarProps {
  currentPhase: AIWorkflowPhase;
}

export default function AIWorkflowProgressBar({ currentPhase }: AIWorkflowProgressBarProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentPhase);

  return (
    <div className="flex items-center gap-1 w-full py-3 px-2">
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1 flex-1 min-w-0">
            <div
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all w-full
                ${isDone
                  ? "bg-primary/10 text-primary"
                  : isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"}
              `}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate hidden sm:inline">{step.label}</span>
              {isDone && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className={`w-3 h-3 shrink-0 ${isDone ? "text-primary" : "text-muted-foreground/40"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
