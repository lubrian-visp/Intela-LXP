import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAILearningWorkflow } from "@/hooks/useAILearningWorkflow";
import { ReflectionSubmissionPanel } from "./ReflectionSubmissionPanel";
import {
  Brain, Lock, Unlock, Send, Clock, CheckCircle2,
  MessageSquare, Star, ArrowRight, AlertTriangle, Sparkles,
} from "lucide-react";

interface AILearningWorkflowProps {
  contentBlockId?: string;
  assessmentId?: string;
  programmeId?: string;
  title?: string;
}

const PHASE_CONFIG = [
  { key: "manual_attempt", label: "Manual Attempt", icon: Lock, description: "Complete your own attempt first" },
  { key: "ai_assisted", label: "AI Assisted", icon: Brain, description: "Get AI guidance" },
  { key: "reflection", label: "Reflection", icon: Star, description: "Reflect on your learning" },
  { key: "completed", label: "Complete", icon: CheckCircle2, description: "Workflow finished" },
];

export default function AILearningWorkflow({ contentBlockId, assessmentId, programmeId, title }: AILearningWorkflowProps) {
  const {
    isEnabled, attempt, attemptLoading, currentPhase, interactionLogs,
    elapsedSeconds, incrementTimer,
    startAttempt, submitInitialAttempt, askAI, rateSuggestion,
    submitRevisedSolution, submitReflection,
  } = useAILearningWorkflow(contentBlockId, assessmentId);

  const [initialText, setInitialText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [revisedText, setRevisedText] = useState("");
  const [aiResponse, setAiResponse] = useState<{ text: string; logId: string } | null>(null);
  const [currentLevel, setCurrentLevel] = useState<{ level: number; label: string; reason: string } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for phase 1
  useEffect(() => {
    if (currentPhase === "manual_attempt") {
      timerRef.current = setInterval(incrementTimer, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentPhase, incrementTimer]);

  if (!isEnabled) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">AI Learning Workflow is currently disabled by the administrator.</p>
        </CardContent>
      </Card>
    );
  }

  if (attemptLoading) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading workflow...</CardContent></Card>;
  }

  // No active attempt - show start button
  if (!attempt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Controlled Learning Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This activity uses a 3-phase workflow: first complete your own attempt, then get AI guidance, and finally reflect on what you learnt.
          </p>
          <div className="flex gap-2">
            {PHASE_CONFIG.map((p, i) => (
              <div key={p.key} className="flex items-center gap-1 text-xs text-muted-foreground">
                <p.icon className="w-3 h-3" />
                <span>{p.label}</span>
                {i < PHASE_CONFIG.length - 1 && <ArrowRight className="w-3 h-3 ml-1" />}
              </div>
            ))}
          </div>
          <Button onClick={() => startAttempt.mutate(programmeId)} disabled={startAttempt.isPending}>
            {startAttempt.isPending ? "Starting..." : "Begin Workflow"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const phaseIndex = PHASE_CONFIG.findIndex((p) => p.key === currentPhase);
  const progressPercent = ((phaseIndex + 1) / PHASE_CONFIG.length) * 100;

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Workflow Progress</span>
            <Badge variant={currentPhase === "completed" ? "default" : "secondary"} className="text-xs">
              {PHASE_CONFIG[phaseIndex]?.label || "Unknown"}
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between mt-2">
            {PHASE_CONFIG.map((p, i) => (
              <div key={p.key} className={`flex items-center gap-1 text-xs ${i <= phaseIndex ? "text-primary font-medium" : "text-muted-foreground"}`}>
                <p.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{p.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scores (when available) */}
      {(attempt.ai_dependency_score || attempt.composite_score) && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: "AI Dependency", value: attempt.ai_dependency_score, color: "text-blue-600" },
                { label: "Decision Quality", value: attempt.decision_quality_score, color: "text-green-600" },
                { label: "Reflection Depth", value: attempt.reflection_depth_score, color: "text-purple-600" },
                { label: "Composite", value: attempt.composite_score, color: "text-primary" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value != null ? s.value.toFixed(1) : "—"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 1: Manual Attempt */}
      {currentPhase === "manual_attempt" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="w-5 h-5 text-amber-500" />
              Phase 1: Manual Attempt
              <Badge variant="outline" className="ml-auto text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Complete your best attempt without AI assistance. AI will unlock when your attempt meets the quality or time threshold.
            </p>
            <Textarea
              value={initialText}
              onChange={(e) => setInitialText(e.target.value)}
              placeholder="Write your initial attempt here..."
              rows={8}
              className="text-sm"
            />
            {attempt.phase_gate_reason && !attempt.is_ai_enabled && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {attempt.phase_gate_reason}
              </p>
            )}
            <Button
              onClick={() => submitInitialAttempt.mutate({ text: initialText, timeSpent: elapsedSeconds })}
              disabled={!initialText.trim() || submitInitialAttempt.isPending}
            >
              <Send className="w-4 h-4 mr-1" />
              {submitInitialAttempt.isPending ? "Submitting..." : "Submit Attempt"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: AI Assisted */}
      {currentPhase === "ai_assisted" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unlock className="w-5 h-5 text-green-500" />
              Phase 2: AI-Assisted Learning
              {currentLevel && (
                <Badge variant={currentLevel.level === 1 ? "secondary" : currentLevel.level === 2 ? "outline" : "default"} className="text-xs">
                  Level {currentLevel.level}: {currentLevel.label}
                </Badge>
              )}
              <Badge variant="outline" className="ml-auto text-xs">
                {attempt.ai_interaction_count || 0} interactions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentLevel && (
              <p className="text-xs text-muted-foreground italic">{currentLevel.reason}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {currentLevel?.level === 1
                ? "AI will provide hints and guiding questions only. Think critically about each hint."
                : currentLevel?.level === 3
                ? "AI can provide full worked solutions. Study the approach carefully."
                : "AI will guide you through structured steps. Try each step before asking for more."}
            </p>

            {/* Chat history */}
            {interactionLogs.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3 bg-muted/30">
                {interactionLogs.map((log: any) => (
                  <div key={log.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary" className="text-xs shrink-0">You</Badge>
                      <p className="text-xs">{log.request_prompt}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="text-xs shrink-0">AI</Badge>
                      <p className="text-xs whitespace-pre-wrap">{log.response_text}</p>
                    </div>
                    {log.suggestion_accepted == null && (
                      <div className="flex gap-1 ml-8">
                        <Button
                          variant="ghost" size="sm" className="h-6 text-xs"
                          onClick={() => rateSuggestion.mutate({ logId: log.id, accepted: true, improved: true })}
                        >
                          ✓ Helpful
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-6 text-xs"
                          onClick={() => rateSuggestion.mutate({ logId: log.id, accepted: false, improved: false })}
                        >
                          ✗ Not helpful
                        </Button>
                      </div>
                    )}
                    <Separator />
                  </div>
                ))}
              </div>
            )}

            {/* AI prompt input */}
            <div className="flex gap-2">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask the AI for guidance..."
                rows={2}
                className="text-sm flex-1"
              />
              <Button
                onClick={async () => {
                  const result = await askAI.mutateAsync(aiPrompt);
                  setAiResponse({ text: result.response, logId: result.log_id });
                  if (result.ai_level) {
                    setCurrentLevel({ level: result.ai_level, label: result.ai_level_label, reason: result.ai_level_reason });
                  }
                  setAiPrompt("");
                }}
                disabled={!aiPrompt.trim() || askAI.isPending}
                className="self-end"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>

            <Separator />

            {/* Revised solution */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Revised Solution</p>
              <p className="text-xs text-muted-foreground">
                After using AI guidance, submit your improved solution.
              </p>
              <Textarea
                value={revisedText}
                onChange={(e) => setRevisedText(e.target.value)}
                placeholder="Write your revised solution here..."
                rows={6}
                className="text-sm"
              />
              <Button
                onClick={() => submitRevisedSolution.mutate(revisedText)}
                disabled={!revisedText.trim() || submitRevisedSolution.isPending || (attempt.ai_interaction_count || 0) < 1}
              >
                <ArrowRight className="w-4 h-4 mr-1" />
                {submitRevisedSolution.isPending ? "Submitting..." : "Submit & Move to Reflection"}
              </Button>
              {(attempt.ai_interaction_count || 0) < 1 && (
                <p className="text-xs text-amber-600">You must have at least 1 AI interaction before submitting.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 3: Reflection */}
      {currentPhase === "reflection" && (
        <ReflectionSubmissionPanel
          attemptId={attempt.id}
          onSubmit={submitReflection.mutate}
          isSubmitting={submitReflection.isPending}
        />
      )}

      {/* Completed */}
      {currentPhase === "completed" && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
            <p className="text-sm font-medium">Workflow Complete!</p>
            <p className="text-xs text-muted-foreground">
              Composite Score: <span className="font-bold text-primary">{attempt.composite_score?.toFixed(1)}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
