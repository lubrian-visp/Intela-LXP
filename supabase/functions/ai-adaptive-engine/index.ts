import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdaptiveAction {
  rule_key: string;
  rule_name: string;
  action_type: string;
  action_params: Record<string, any>;
  triggered_metric: string;
  triggered_value: number;
  message: string;
}

function evaluateCondition(operator: string, actual: number, threshold: number): boolean {
  switch (operator) {
    case "gte": return actual >= threshold;
    case "gt": return actual > threshold;
    case "lte": return actual <= threshold;
    case "lt": return actual < threshold;
    case "eq": return actual === threshold;
    case "neq": return actual !== threshold;
    default: return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, attempt_id, learner_id } = await req.json();

    // ─── ACTION: evaluate ───
    // Evaluates all active rules against a learner's latest scores
    // Returns triggered adaptations
    if (action === "evaluate") {
      if (!learner_id) throw new Error("Missing learner_id");

      // Get learner's most recent completed attempts for scoring history
      const { data: recentAttempts } = await adminClient
        .from("ai_learning_attempts")
        .select("*")
        .eq("learner_id", learner_id)
        .eq("current_phase", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);

      if (!recentAttempts || recentAttempts.length === 0) {
        return new Response(JSON.stringify({ actions: [], message: "No completed attempts to evaluate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate averages from recent attempts
      const avgScores: Record<string, number> = {};
      const metrics = [
        "ai_dependency_score", "decision_quality_score", "reflection_depth_score", "composite_score",
        "attempt_quality_score",
      ];

      for (const metric of metrics) {
        const values = recentAttempts
          .map((a: any) => a[metric])
          .filter((v: any) => v != null);
        if (values.length > 0) {
          avgScores[metric] = values.reduce((s: number, v: number) => s + v, 0) / values.length;
        }
      }

      // Also use latest attempt scores directly
      const latest = recentAttempts[0];
      for (const metric of metrics) {
        if (latest[metric] != null && avgScores[metric] == null) {
          avgScores[metric] = latest[metric];
        }
      }

      // Load active rules sorted by priority
      const { data: rules } = await adminClient
        .from("ai_adaptive_rules")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (!rules || rules.length === 0) {
        return new Response(JSON.stringify({ actions: [], message: "No active adaptive rules" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const triggeredActions: AdaptiveAction[] = [];

      for (const rule of rules) {
        const metricValue = avgScores[rule.condition_metric];
        if (metricValue == null) continue;

        if (evaluateCondition(rule.condition_operator, metricValue, Number(rule.condition_threshold))) {
          const params = typeof rule.action_params === "string" ? JSON.parse(rule.action_params) : rule.action_params;
          triggeredActions.push({
            rule_key: rule.rule_key,
            rule_name: rule.rule_name,
            action_type: rule.action_type,
            action_params: params,
            triggered_metric: rule.condition_metric,
            triggered_value: Math.round(metricValue * 100) / 100,
            message: params.message || rule.description || "",
          });
        }
      }

      return new Response(JSON.stringify({
        actions: triggeredActions,
        scores: avgScores,
        attempts_evaluated: recentAttempts.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: apply ───
    // Records which adaptations were applied to a specific attempt
    if (action === "apply") {
      if (!attempt_id || !learner_id) throw new Error("Missing attempt_id or learner_id");

      // First evaluate
      const { data: rules } = await adminClient
        .from("ai_adaptive_rules")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true });

      const { data: recentAttempts } = await adminClient
        .from("ai_learning_attempts")
        .select("*")
        .eq("learner_id", learner_id)
        .eq("current_phase", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);

      if (!recentAttempts || recentAttempts.length === 0 || !rules || rules.length === 0) {
        return new Response(JSON.stringify({ applied: [], message: "Nothing to apply" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const avgScores: Record<string, number> = {};
      const metrics = ["ai_dependency_score", "decision_quality_score", "reflection_depth_score", "composite_score", "attempt_quality_score"];
      for (const metric of metrics) {
        const values = recentAttempts.map((a: any) => a[metric]).filter((v: any) => v != null);
        if (values.length > 0) avgScores[metric] = values.reduce((s: number, v: number) => s + v, 0) / values.length;
      }

      const applied: any[] = [];
      let mergedParams: Record<string, any> = {};

      for (const rule of rules) {
        const metricValue = avgScores[rule.condition_metric];
        if (metricValue == null) continue;

        if (evaluateCondition(rule.condition_operator, metricValue, Number(rule.condition_threshold))) {
          const params = typeof rule.action_params === "string" ? JSON.parse(rule.action_params) : rule.action_params;

          // Record in history
          await adminClient.from("ai_adaptive_history").insert({
            learner_id,
            attempt_id,
            rule_id: rule.id,
            triggered_metric: rule.condition_metric,
            triggered_value: metricValue,
            action_applied: params,
          });

          applied.push({
            rule_key: rule.rule_key,
            action_type: rule.action_type,
            params,
          });

          // Merge params for the attempt
          mergedParams = { ...mergedParams, ...params };
        }
      }

      // Apply merged adaptations to the attempt
      const updateFields: Record<string, any> = {};

      if (mergedParams.disable_ai === true) {
        updateFields.is_ai_enabled = false;
        updateFields.phase_gate_reason = mergedParams.message || "AI disabled by adaptive engine";
      }
      if (mergedParams.max_ai_level != null) {
        updateFields.ai_access_level = mergedParams.max_ai_level;
      }

      if (Object.keys(updateFields).length > 0) {
        await adminClient
          .from("ai_learning_attempts")
          .update(updateFields)
          .eq("id", attempt_id);
      }

      return new Response(JSON.stringify({
        applied,
        merged_params: mergedParams,
        scores: avgScores,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: get_history ───
    // Returns adaptive history for a learner
    if (action === "get_history") {
      const targetLearnerId = learner_id || user.id;

      const { data: history } = await adminClient
        .from("ai_adaptive_history")
        .select("*, ai_adaptive_rules(rule_key, rule_name, action_type)")
        .eq("learner_id", targetLearnerId)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ history: history || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: get_rules ───
    // Returns all adaptive rules (for admin panel)
    if (action === "get_rules") {
      const { data: rules } = await adminClient
        .from("ai_adaptive_rules")
        .select("*")
        .order("priority", { ascending: true });

      return new Response(JSON.stringify({ rules: rules || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action: " + action);
  } catch (e) {
    console.error("ai-adaptive-engine error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
