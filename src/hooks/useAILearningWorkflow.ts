import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AIWorkflowPhase = "manual_attempt" | "ai_assisted" | "reflection" | "completed" | null;

interface AttemptData {
  id: string;
  current_phase: string;
  initial_attempt_text?: string;
  revised_solution_text?: string;
  time_spent_seconds?: number;
  attempt_quality_score?: number;
  ai_interaction_count?: number;
  ai_dependency_score?: number;
  decision_quality_score?: number;
  reflection_depth_score?: number;
  composite_score?: number;
  is_ai_enabled?: boolean;
  phase_gate_reason?: string;
  completed_at?: string;
}

interface AIInteraction {
  response: string;
  log_id: string;
  interaction_number: number;
  max_interactions: number;
  remaining: number;
  ai_level?: number;
  ai_level_label?: string;
  ai_level_reason?: string;
}

export function useAILearningWorkflow(contentBlockId?: string, assessmentId?: string, programmeId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const queryKey = ["ai-learning-attempt", contentBlockId, assessmentId, user?.id];

  // Check if feature is enabled (global + per-programme override)
  const { data: isEnabled } = useQuery({
    queryKey: ["ai-workflow-enabled", programmeId],
    queryFn: async () => {
      // 1. Check per-programme override first
      if (programmeId) {
        const { data: prog } = await (supabase as any)
          .from("programmes")
          .select("ai_workflow_enabled")
          .eq("id", programmeId)
          .maybeSingle();
        if (prog && prog.ai_workflow_enabled !== null) {
          return prog.ai_workflow_enabled as boolean;
        }
      }

      // 2. Fall back to global feature flag
      const { data } = await supabase
        .from("feature_flags" as any)
        .select("is_enabled")
        .eq("flag_key", "ai_learning_workflow")
        .maybeSingle();
      if (data && !(data as any).is_enabled) return false;

      const { data: config } = await supabase
        .from("ai_scoring_config" as any)
        .select("config_value")
        .eq("config_key", "ai_workflow_enabled")
        .maybeSingle();
      if (config) {
        try { return JSON.parse((config as any).config_value) !== false; } catch { return true; }
      }
      return true;
    },
    staleTime: 30000,
  });

  // Get current attempt status
  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey,
    enabled: !!user && (!!contentBlockId || !!assessmentId) && isEnabled !== false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-learning-gate", {
        body: {
          action: "get_attempt_status",
          content_block_id: contentBlockId,
          assessment_id: assessmentId,
        },
      });
      if (error) throw error;
      return data?.attempt as AttemptData | null;
    },
  });

  // Get interaction logs
  const { data: interactionLogs } = useQuery({
    queryKey: ["ai-interaction-logs", attempt?.id],
    enabled: !!attempt?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_interaction_logs" as any)
        .select("*")
        .eq("attempt_id", attempt!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Start attempt
  const startAttempt = useMutation({
    mutationFn: async (programmeId?: string) => {
      const { data, error } = await supabase.functions.invoke("ai-learning-gate", {
        body: {
          action: "start_attempt",
          content_block_id: contentBlockId,
          assessment_id: assessmentId,
          programme_id: programmeId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Learning workflow started. Complete your initial attempt first.");
    },
    onError: (e: any) => toast.error(e.message || "Failed to start attempt"),
  });

  // Submit initial attempt
  const submitInitialAttempt = useMutation({
    mutationFn: async ({ text, timeSpent }: { text: string; timeSpent: number }) => {
      const { data, error } = await supabase.functions.invoke("ai-learning-gate", {
        body: {
          action: "submit_initial_attempt",
          attempt_id: attempt?.id,
          initial_attempt_text: text,
          time_spent_seconds: timeSpent,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey });
      if (data.ai_unlocked) {
        if (data.access_token) setAccessToken(data.access_token);
        toast.success("AI assistant unlocked! You can now ask for guidance.");
      } else {
        toast.info(data.gate_reason || "Keep working on your attempt to unlock AI assistance.");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit attempt"),
  });

  // Ask AI
  const askAI = useMutation({
    mutationFn: async (prompt: string): Promise<AIInteraction> => {
      const { data, error } = await supabase.functions.invoke("ai-learning-assist", {
        body: { attempt_id: attempt?.id, prompt, access_token: accessToken },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as AIInteraction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-interaction-logs", attempt?.id] }),
    onError: (e: any) => toast.error(e.message || "AI request failed"),
  });

  // Rate AI suggestion
  const rateSuggestion = useMutation({
    mutationFn: async ({ logId, accepted, improved }: { logId: string; accepted: boolean; improved: boolean }) => {
      const { data, error } = await supabase.functions.invoke("ai-learning-assist", {
        body: { log_id: logId, suggestion_accepted: accepted, suggestion_improved: improved },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-interaction-logs", attempt?.id] }),
  });

  // Submit revised solution
  const submitRevisedSolution = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke("ai-learning-gate", {
        body: {
          action: "submit_revised_solution",
          attempt_id: attempt?.id,
          revised_solution_text: text,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setAccessToken(null); // Revoke client-side token on phase transition
      toast.success("Revised solution submitted. Now complete your reflection.");
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit revised solution"),
  });

  // Submit reflection
  const submitReflection = useMutation({
    mutationFn: async (input: {
      reflection_text: string;
      changes_cited?: string;
      reasoning_depth?: string;
      learning_objectives_connection?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-score-reflection", {
        body: { attempt_id: attempt?.id, ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey });
      if (data.is_validated) {
        toast.success(`Workflow complete! Composite score: ${data.scores.composite_score}`);
      } else {
        toast.warning(data.message || "Reflection needs improvement.");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to score reflection"),
  });

  const incrementTimer = useCallback(() => {
    setElapsedSeconds((s) => s + 1);
  }, []);

  return {
    isEnabled: isEnabled !== false,
    attempt,
    attemptLoading,
    currentPhase: (attempt?.current_phase as AIWorkflowPhase) || null,
    interactionLogs: interactionLogs || [],
    elapsedSeconds,
    incrementTimer,
    accessToken,
    startAttempt,
    submitInitialAttempt,
    askAI,
    rateSuggestion,
    submitRevisedSolution,
    submitReflection,
  };
}
