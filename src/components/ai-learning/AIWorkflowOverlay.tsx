import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, ChevronUp, ChevronDown } from "lucide-react";
import AILearningWorkflow from "./AILearningWorkflow";
import AIWorkflowProgressBar from "./AIWorkflowProgressBar";
import AIDependencyGauge from "./AIDependencyGauge";
import AdaptiveLearningIndicator from "./AdaptiveLearningIndicator";
import { useAILearningWorkflow } from "@/hooks/useAILearningWorkflow";

interface AIWorkflowOverlayProps {
  contentBlockId?: string;
  assessmentId?: string;
  programmeId?: string;
  title?: string;
}

/**
 * Overlay panel that appears at the bottom of the content viewer
 * when the AI learning workflow is active for a given content block.
 * Shows the progress bar, dependency gauge, and the full workflow.
 */
export default function AIWorkflowOverlay({ contentBlockId, assessmentId, programmeId, title }: AIWorkflowOverlayProps) {
  const { isEnabled, attempt, currentPhase } = useAILearningWorkflow(contentBlockId, assessmentId);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (!isEnabled || dismissed) return null;

  // If no attempt yet, show a compact start prompt
  if (!attempt) {
    return (
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">AI Learning Workflow available for this content</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-2">
            <AILearningWorkflow contentBlockId={contentBlockId} assessmentId={assessmentId} programmeId={programmeId} title={title} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card">
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">AI Workflow</span>
          {currentPhase && currentPhase !== "completed" && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {currentPhase === "manual_attempt" ? "Phase 1" : currentPhase === "ai_assisted" ? "Phase 2" : "Phase 3"}
            </Badge>
          )}
          {currentPhase === "completed" && (
            <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-0">Complete</Badge>
          )}
          <AdaptiveLearningIndicator contentBlockId={contentBlockId} assessmentId={assessmentId} />
        </div>
        <div className="flex items-center gap-1">
          {currentPhase === "ai_assisted" && attempt.ai_dependency_score != null && (
            <AIDependencyGauge score={attempt.ai_dependency_score} interactionCount={attempt.ai_interaction_count ?? 0} compact />
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Progress bar always visible */}
      <AIWorkflowProgressBar currentPhase={currentPhase} />

      {/* Expandable body */}
      {expanded && (
        <div className="px-4 pb-4 max-h-[50vh] overflow-y-auto">
          {currentPhase === "ai_assisted" && (
            <div className="mb-3 flex justify-center">
              <AIDependencyGauge
                score={attempt.ai_dependency_score}
                interactionCount={attempt.ai_interaction_count ?? 0}
                maxInteractions={10}
              />
            </div>
          )}
          <AILearningWorkflow contentBlockId={contentBlockId} assessmentId={assessmentId} programmeId={programmeId} title={title} />
        </div>
      )}
    </div>
  );
}
