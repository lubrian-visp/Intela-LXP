import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { attempt_id, reflection_text, changes_cited, reasoning_depth, learning_objectives_connection } = await req.json();

    if (!attempt_id || !reflection_text) throw new Error("Missing attempt_id or reflection_text");

    // Validate attempt
    const { data: attempt } = await anonClient
      .from("ai_learning_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("learner_id", user.id)
      .single();

    if (!attempt) throw new Error("Attempt not found");
    if (attempt.current_phase !== "reflection") throw new Error("Must be in reflection phase");

    // Load config
    const { data: configs } = await adminClient.from("ai_scoring_config").select("config_key, config_value");
    const cfg: Record<string, any> = {};
    (configs || []).forEach((c: any) => {
      try { cfg[c.config_key] = JSON.parse(c.config_value); } catch { cfg[c.config_key] = c.config_value; }
    });

    const minRds = Number(cfg.min_reflection_score) || 40;
    const adsWeight = Number(cfg.ads_weight) || 0.3;
    const dqsWeight = Number(cfg.dqs_weight) || 0.4;
    const rdsWeight = Number(cfg.rds_weight) || 0.3;

    // Score reflection using AI
    // ═══════════════════════════════════════════
    // ENHANCED RDS (Reflection Depth Score)
    // RDS = w1×Relevance + w2×ErrorIdentification + w3×ReasoningQuality
    // Each sub-score is AI-evaluated 0-100 with specific rubrics
    // ═══════════════════════════════════════════

    const scoringPrompt = `You are an expert educational assessment engine specialising in metacognitive evaluation.
Score the following learner reflection using THREE distinct rubrics.

CONTEXT:
- Initial attempt (before AI help): ${(attempt.initial_attempt_text || "").substring(0, 600)}
- Revised solution (after AI help): ${(attempt.revised_solution_text || "").substring(0, 600)}

REFLECTION SUBMISSION:
${reflection_text}

CHANGES CITED: ${changes_cited || "Not provided"}
REASONING DEPTH: ${reasoning_depth || "Not provided"}
LEARNING OBJECTIVES CONNECTION: ${learning_objectives_connection || "Not provided"}

RUBRIC 1 — RELEVANCE SCORE (0-100):
- 0-20: Generic, vague, or off-topic reflection
- 21-40: Mentions the task but lacks specificity about what changed
- 41-60: References specific changes but doesn't explain their significance
- 61-80: Clearly identifies specific changes with meaningful context
- 81-100: Precisely cites changes, connects to AI suggestions, and evaluates their impact

RUBRIC 2 — ERROR IDENTIFICATION SCORE (0-100):
- 0-20: No recognition of errors or misconceptions in original attempt
- 21-40: Vaguely acknowledges "mistakes" without specifics
- 41-60: Identifies 1-2 specific errors but doesn't analyse root causes
- 61-80: Identifies errors, explains root causes, and describes corrections
- 81-100: Comprehensive error analysis with root causes, corrections, and prevention strategies

RUBRIC 3 — REASONING QUALITY SCORE (0-100):
- 0-20: No reasoning provided, just assertions
- 21-40: Surface-level reasoning ("I changed it because AI said so")
- 41-60: Shows some logical analysis but lacks depth
- 61-80: Clear logical chain connecting observations to decisions
- 81-100: Deep critical reasoning with evaluation of alternatives and trade-offs

You MUST respond with ONLY valid JSON (no markdown, no code fences):
{
  "relevance_score": <number 0-100>,
  "error_identification_score": <number 0-100>,
  "reasoning_quality_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "relevance_rationale": "<1-2 sentences>",
  "error_rationale": "<1-2 sentences>",
  "reasoning_rationale": "<1-2 sentences>",
  "rationale": "<overall summary>"
}`;

    const aiModel = String(cfg.ai_model || "google/gemini-2.5-flash");
    const reflectionMinWords = Number(cfg.reflection_min_word_count) || 50;

    // Validate minimum word count
    const reflectionWordCount = reflection_text.trim().split(/\s+/).length;
    if (reflectionWordCount < reflectionMinWords) {
      return new Response(JSON.stringify({
        error: `Reflection must be at least ${reflectionMinWords} words. You wrote ${reflectionWordCount}.`,
        word_count: reflectionWordCount,
        min_word_count: reflectionMinWords,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: "You are a scoring engine. Return ONLY valid JSON. No markdown." },
          { role: "user", content: scoringPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI scoring failed:", aiResponse.status);
      throw new Error("AI scoring service unavailable");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let scoringResult: any;
    try {
      const cleaned = rawContent.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      scoringResult = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
    } catch {
      // Heuristic fallback
      const wordCount = reflection_text.trim().split(/\s+/).length;
      const hasCitations = changes_cited && changes_cited.trim().length > 20;
      const hasReasoning = reasoning_depth && reasoning_depth.trim().length > 30;
      const hasObjectives = learning_objectives_connection && learning_objectives_connection.trim().length > 20;

      scoringResult = {
        relevance_score: Math.min(100, wordCount * 0.3 + (hasCitations ? 30 : 0) + 10),
        error_identification_score: Math.min(100, (hasCitations ? 40 : 10) + (hasReasoning ? 20 : 0)),
        reasoning_quality_score: Math.min(100, (hasReasoning ? 40 : 10) + (hasObjectives ? 25 : 0) + wordCount * 0.1),
        rationale: "Scored using heuristic fallback (AI unavailable)",
      };
      scoringResult.overall_score = Math.round(
        0.3 * scoringResult.relevance_score +
        0.35 * scoringResult.error_identification_score +
        0.35 * scoringResult.reasoning_quality_score
      );
    }

    // Calculate weighted RDS from sub-scores
    const relevanceScore = Math.max(0, Math.min(100, scoringResult.relevance_score || 0));
    const errorIdScore = Math.max(0, Math.min(100, scoringResult.error_identification_score || 0));
    const reasoningScore = Math.max(0, Math.min(100, scoringResult.reasoning_quality_score || 0));

    const rds = Math.round((0.3 * relevanceScore + 0.35 * errorIdScore + 0.35 * reasoningScore) * 100) / 100;
    const ads = attempt.ai_dependency_score || 50;
    const dqs = attempt.decision_quality_score || 50;
    const composite = Math.round((ads * adsWeight + dqs * dqsWeight + rds * rdsWeight) * 100) / 100;

    const isValidated = rds >= minRds;

    // Save reflection
    const { data: reflection, error: refErr } = await anonClient
      .from("ai_reflections")
      .insert({
        attempt_id,
        learner_id: user.id,
        reflection_text,
        changes_cited: changes_cited || null,
        reasoning_depth: reasoning_depth || null,
        learning_objectives_connection: learning_objectives_connection || null,
        ai_scored_rds: rds,
        ai_scoring_rationale: scoringResult.rationale || null,
        is_validated: isValidated,
      })
      .select()
      .single();

    if (refErr) throw refErr;

    // Update attempt with all sub-scores
    const updateData: any = {
      reflection_depth_score: rds,
      composite_score: composite,
      rds_relevance_score: relevanceScore,
      rds_error_identification: errorIdScore,
      rds_reasoning_quality: reasoningScore,
    };

    if (isValidated) {
      updateData.current_phase = "completed";
      updateData.completed_at = new Date().toISOString();
    }

    const { data: updated, error: updateErr } = await anonClient
      .from("ai_learning_attempts")
      .update(updateData)
      .eq("id", attempt_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({
      reflection,
      scores: {
        ai_dependency_score: ads,
        decision_quality_score: dqs,
        reflection_depth_score: rds,
        composite_score: composite,
        rds_sub_scores: {
          relevance: relevanceScore,
          error_identification: errorIdScore,
          reasoning_quality: reasoningScore,
        },
      },
      is_validated: isValidated,
      phase: isValidated ? "completed" : "reflection",
      message: isValidated
        ? "Reflection validated. Workflow complete!"
        : `Reflection score (${rds}) is below the minimum (${minRds}). Please revise and resubmit.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-score-reflection error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
