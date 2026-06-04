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

    const { action, attempt_id, content_block_id, assessment_id, programme_id, initial_attempt_text, time_spent_seconds, revised_solution_text } = await req.json();

    // Check global kill-switch
    const { data: killSwitch } = await adminClient
      .from("ai_scoring_config")
      .select("config_value")
      .eq("config_key", "ai_workflow_enabled")
      .single();

    if (killSwitch && JSON.parse(killSwitch.config_value) === false) {
      return new Response(JSON.stringify({ error: "AI Learning Workflow is currently disabled by the administrator." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also check feature_flags table
    const { data: featureFlag } = await adminClient
      .from("feature_flags")
      .select("is_enabled")
      .eq("flag_key", "ai_learning_workflow")
      .single();

    if (featureFlag && !featureFlag.is_enabled) {
      return new Response(JSON.stringify({ error: "AI Learning Workflow feature is disabled." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load scoring config
    const { data: configs } = await adminClient.from("ai_scoring_config").select("config_key, config_value");
    const cfg: Record<string, any> = {};
    (configs || []).forEach((c: any) => {
      try { cfg[c.config_key] = JSON.parse(c.config_value); } catch { cfg[c.config_key] = c.config_value; }
    });

    const minTime = Number(cfg.phase_gate_min_time_seconds) || 300;
    const minQuality = Number(cfg.phase_gate_min_quality_score) || 30;
    const gateMode = cfg.phase_gate_quality_or_time || "either";

    if (action === "start_attempt") {
      // Create or get existing attempt
      const { data: existing } = await anonClient
        .from("ai_learning_attempts")
        .select("*")
        .eq("learner_id", user.id)
        .eq(content_block_id ? "content_block_id" : "assessment_id", content_block_id || assessment_id)
        .eq("current_phase", "completed")
        .not("current_phase", "eq", "completed")
        .limit(1);

      // Check for non-completed attempt
      const { data: activeAttempt } = await anonClient
        .from("ai_learning_attempts")
        .select("*")
        .eq("learner_id", user.id)
        .neq("current_phase", "completed")
        .or(content_block_id ? `content_block_id.eq.${content_block_id}` : `assessment_id.eq.${assessment_id}`)
        .limit(1)
        .maybeSingle();

      if (activeAttempt) {
        return new Response(JSON.stringify({ attempt: activeAttempt, phase: activeAttempt.current_phase }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Adaptive engine: evaluate learner history before creating attempt ──
      let adaptiveActions: any[] = [];
      let adaptiveParams: Record<string, any> = {};
      try {
        const { data: recentAttempts } = await adminClient
          .from("ai_learning_attempts")
          .select("*")
          .eq("learner_id", user.id)
          .eq("current_phase", "completed")
          .order("completed_at", { ascending: false })
          .limit(5);

        if (recentAttempts && recentAttempts.length > 0) {
          const avgScores: Record<string, number> = {};
          const scoreMetrics = ["ai_dependency_score", "decision_quality_score", "reflection_depth_score", "composite_score", "attempt_quality_score"];
          for (const metric of scoreMetrics) {
            const vals = recentAttempts.map((a: any) => a[metric]).filter((v: any) => v != null);
            if (vals.length > 0) avgScores[metric] = vals.reduce((s: number, v: number) => s + v, 0) / vals.length;
          }

          const { data: adaptiveRules } = await adminClient
            .from("ai_adaptive_rules")
            .select("*")
            .eq("is_active", true)
            .order("priority", { ascending: true });

          if (adaptiveRules) {
            for (const rule of adaptiveRules) {
              const metricValue = avgScores[rule.condition_metric];
              if (metricValue == null) continue;
              const threshold = Number(rule.condition_threshold);
              const op = rule.condition_operator;
              let triggered = false;
              if (op === "gte") triggered = metricValue >= threshold;
              else if (op === "gt") triggered = metricValue > threshold;
              else if (op === "lte") triggered = metricValue <= threshold;
              else if (op === "lt") triggered = metricValue < threshold;
              else if (op === "eq") triggered = metricValue === threshold;

              if (triggered) {
                const params = typeof rule.action_params === "string" ? JSON.parse(rule.action_params) : rule.action_params;
                adaptiveActions.push({ rule_key: rule.rule_key, action_type: rule.action_type, params });
                adaptiveParams = { ...adaptiveParams, ...params };
              }
            }
          }
        }
      } catch (adaptiveErr) {
        console.error("Adaptive engine evaluation (non-fatal):", adaptiveErr);
      }

      const isAiDisabledByAdaptive = adaptiveParams.disable_ai === true;
      const adaptiveAiLevel = adaptiveParams.max_ai_level ?? 3;

      const { data: newAttempt, error: insertErr } = await anonClient
        .from("ai_learning_attempts")
        .insert({
          learner_id: user.id,
          content_block_id: content_block_id || null,
          assessment_id: assessment_id || null,
          programme_id: programme_id || null,
          current_phase: "manual_attempt",
          is_ai_enabled: false,
          ai_access_level: adaptiveAiLevel,
          phase_gate_reason: isAiDisabledByAdaptive ? (adaptiveParams.message || "AI disabled by adaptive engine") : null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Record adaptive history
      if (adaptiveActions.length > 0 && newAttempt) {
        for (const aa of adaptiveActions) {
          await adminClient.from("ai_adaptive_history").insert({
            learner_id: user.id,
            attempt_id: newAttempt.id,
            rule_id: aa.rule_key, // Will be resolved by rule_key lookup
            triggered_metric: aa.action_type,
            triggered_value: 0,
            action_applied: aa.params,
          }).catch(() => {}); // Non-fatal
        }
      }

      return new Response(JSON.stringify({
        attempt: newAttempt,
        phase: "manual_attempt",
        adaptive_actions: adaptiveActions,
        adaptive_params: adaptiveParams,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit_initial_attempt") {
      if (!attempt_id || !initial_attempt_text) throw new Error("Missing attempt_id or initial_attempt_text");

      // Validate attempt belongs to user
      const { data: attempt } = await anonClient
        .from("ai_learning_attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("learner_id", user.id)
        .single();

      if (!attempt) throw new Error("Attempt not found");
      if (attempt.current_phase !== "manual_attempt") throw new Error("Invalid phase for this action");

      const timeSpent = time_spent_seconds || 0;

      // Score attempt quality (dynamic heuristic from config)
      const qualityWordWeight = Number(cfg.quality_word_weight) || 0.33;
      const qualityParaBonus = Number(cfg.quality_paragraph_bonus) || 15;
      const qualityStructBonus = Number(cfg.quality_structure_bonus) || 20;
      const qualityStructMinLen = Number(cfg.quality_structure_min_length) || 200;

      const wordCount = initial_attempt_text.trim().split(/\s+/).length;
      const hasParagraphs = (initial_attempt_text.match(/\n\n/g) || []).length > 0;
      const hasStructure = initial_attempt_text.length > qualityStructMinLen;
      let qualityScore = Math.min(100, (wordCount * qualityWordWeight) + (hasParagraphs ? qualityParaBonus : 0) + (hasStructure ? qualityStructBonus : 0));
      qualityScore = Math.round(qualityScore * 100) / 100;

      // Determine if AI should unlock
      let shouldUnlock = false;
      let gateReason = "";

      if (gateMode === "either") {
        shouldUnlock = timeSpent >= minTime || qualityScore >= minQuality;
        gateReason = shouldUnlock
          ? `Unlocked: ${timeSpent >= minTime ? "time threshold met" : "quality threshold met"}`
          : `Locked: time ${timeSpent}s < ${minTime}s AND quality ${qualityScore} < ${minQuality}`;
      } else if (gateMode === "both") {
        shouldUnlock = timeSpent >= minTime && qualityScore >= minQuality;
        gateReason = shouldUnlock ? "Both thresholds met" : `Requires both: time=${timeSpent}/${minTime}s, quality=${qualityScore}/${minQuality}`;
      } else if (gateMode === "time_only") {
        shouldUnlock = timeSpent >= minTime;
        gateReason = shouldUnlock ? "Time threshold met" : `Time ${timeSpent}s < ${minTime}s`;
      } else if (gateMode === "quality_only") {
        shouldUnlock = qualityScore >= minQuality;
        gateReason = shouldUnlock ? "Quality threshold met" : `Quality ${qualityScore} < ${minQuality}`;
      }

      const nextPhase = shouldUnlock ? "ai_assisted" : "manual_attempt";

      const { data: updated, error: updateErr } = await anonClient
        .from("ai_learning_attempts")
        .update({
          initial_attempt_text,
          initial_attempt_submitted_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
          attempt_quality_score: qualityScore,
          current_phase: nextPhase,
          is_ai_enabled: shouldUnlock,
          ai_phase_started_at: shouldUnlock ? new Date().toISOString() : null,
          phase_gate_reason: gateReason,
        })
        .eq("id", attempt_id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // ── Token generation on AI unlock ──
      let accessToken: string | null = null;
      if (shouldUnlock) {
        const tokenPayload = `${attempt_id}:${user.id}:${Date.now()}:${crypto.randomUUID()}`;
        const encoder = new TextEncoder();
        const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const key = await crypto.subtle.importKey(
          "raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(tokenPayload));
        const hashArray = Array.from(new Uint8Array(signature));
        const tokenHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        accessToken = `${btoa(tokenPayload)}.${tokenHash}`;

        const tokenExpiryMinutes = Number(cfg.token_expiry_minutes) || 60;
        const tokenMaxUsage = Number(cfg.token_max_usage) || 50;
        const expiresAt = new Date(Date.now() + tokenExpiryMinutes * 60 * 1000).toISOString();

        // Revoke any existing tokens for this attempt
        await adminClient
          .from("ai_access_tokens")
          .update({ is_revoked: true, revoked_at: new Date().toISOString(), revocation_reason: "New token issued" })
          .eq("attempt_id", attempt_id)
          .eq("is_revoked", false);

        // Insert new token
        await anonClient
          .from("ai_access_tokens")
          .insert({
            attempt_id,
            learner_id: user.id,
            token_hash: tokenHash,
            expires_at: expiresAt,
            max_usage: tokenMaxUsage,
          });
      }

      return new Response(JSON.stringify({
        attempt: updated,
        phase: nextPhase,
        ai_unlocked: shouldUnlock,
        gate_reason: gateReason,
        quality_score: qualityScore,
        access_token: accessToken,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "submit_revised_solution") {
      if (!attempt_id || !revised_solution_text) throw new Error("Missing attempt_id or revised_solution_text");

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      const { data: attempt } = await anonClient
        .from("ai_learning_attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("learner_id", user.id)
        .single();

      if (!attempt) throw new Error("Attempt not found");
      if (attempt.current_phase !== "ai_assisted") throw new Error("Must be in AI-assisted phase");
      if (attempt.ai_interaction_count < 1) throw new Error("Must have at least 1 AI interaction before submitting revised solution");

      const maxInteractions = Number(cfg.max_ai_interactions) || 10;
      const { data: logs } = await anonClient
        .from("ai_interaction_logs")
        .select("suggestion_accepted, suggestion_improved, accepted_without_change, was_bad_suggestion, created_at")
        .eq("attempt_id", attempt_id)
        .order("created_at", { ascending: true });

      const interactionCount = logs?.length || 0;
      const initialQuality = attempt.attempt_quality_score || 1;

      // ═══════════════════════════════════════════
      // ENHANCED ADS (AI Dependency Score)
      // ADS = w1×FrequencyScore + w2×TimingScore + w3×AcceptanceScore
      // ═══════════════════════════════════════════

      // FrequencyScore: fewer interactions = higher score
      const frequencyScore = Math.max(0, (1 - (interactionCount / maxInteractions)) * 100);

      // TimingScore: later AI usage = higher score (used AI later in the phase = more independent)
      let timingScore = 50; // default
      if (logs && logs.length > 0 && attempt.ai_phase_started_at) {
        const phaseStart = new Date(attempt.ai_phase_started_at).getTime();
        const now = Date.now();
        const phaseDuration = Math.max(now - phaseStart, 1);
        const avgInteractionTime = logs.reduce((sum: number, l: any) => {
          return sum + (new Date(l.created_at).getTime() - phaseStart);
        }, 0) / logs.length;
        timingScore = Math.min(100, (avgInteractionTime / phaseDuration) * 100);
      }

      // AcceptanceScore: penalise blind acceptance (accepted without making changes)
      const blindlyAccepted = (logs || []).filter((l: any) => l.accepted_without_change === true).length;
      const acceptanceScore = interactionCount > 0
        ? Math.max(0, (1 - (blindlyAccepted / interactionCount)) * 100)
        : 100;

      const ads = Math.round((0.4 * frequencyScore + 0.2 * timingScore + 0.4 * acceptanceScore) * 100) / 100;

      // ═══════════════════════════════════════════
      // ENHANCED DQS (Decision Quality Score)
      // DQS = w1×ImprovementDelta + w2×CritiqueScore + w3×BlindPenalty
      // ═══════════════════════════════════════════

      // ImprovementDelta: AI-compared quality improvement
      let improvementDelta = 50; // default
      if (LOVABLE_API_KEY) {
        try {
          const compareResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You are a scoring engine. Return ONLY a JSON object." },
                { role: "user", content: `Compare these two student solutions and score the improvement on a scale of 0-100.
0 = no improvement or regression
50 = moderate improvement
100 = dramatic improvement in quality, depth, and correctness

INITIAL ATTEMPT:
${(attempt.initial_attempt_text || "").substring(0, 1000)}

REVISED SOLUTION:
${revised_solution_text.substring(0, 1000)}

Return ONLY: {"improvement_score": <number 0-100>, "reasoning": "<brief explanation>"}` },
              ],
            }),
          });
          if (compareResponse.ok) {
            const compareData = await compareResponse.json();
            const raw = compareData.choices?.[0]?.message?.content || "";
            const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
              improvementDelta = Math.max(0, Math.min(100, parsed.improvement_score || 50));
            }
          }
        } catch (e) {
          console.error("Improvement scoring fallback:", e);
          // Heuristic fallback
          const initialWords = (attempt.initial_attempt_text || "").trim().split(/\s+/).length;
          const revisedWords = revised_solution_text.trim().split(/\s+/).length;
          improvementDelta = Math.min(100, Math.max(0, ((revisedWords - initialWords) / Math.max(initialWords, 1)) * 50 + 50));
        }
      }

      // CritiqueScore: correctly rejected bad suggestions + improved after accepting
      const rejectedBad = (logs || []).filter((l: any) => l.was_bad_suggestion === true && !l.suggestion_accepted).length;
      const improvedAccepted = (logs || []).filter((l: any) => l.suggestion_accepted && l.suggestion_improved).length;
      const critiqueScore = interactionCount > 0
        ? Math.min(100, ((rejectedBad + improvedAccepted) / interactionCount) * 100)
        : 50;

      // BlindPenalty: penalise accepting without improvement
      const totalAccepted = (logs || []).filter((l: any) => l.suggestion_accepted).length;
      const acceptedNoImprovement = (logs || []).filter((l: any) => l.suggestion_accepted && !l.suggestion_improved).length;
      const blindPenalty = totalAccepted > 0
        ? Math.max(0, 100 - ((acceptedNoImprovement / totalAccepted) * 100))
        : 100;

      const dqs = Math.round((0.5 * improvementDelta + 0.3 * critiqueScore + 0.2 * blindPenalty) * 100) / 100;

      const { data: updated, error: updateErr } = await anonClient
        .from("ai_learning_attempts")
        .update({
          revised_solution_text,
          revised_solution_submitted_at: new Date().toISOString(),
          current_phase: "reflection",
          reflection_started_at: new Date().toISOString(),
          is_ai_enabled: false,
          ai_dependency_score: Math.min(100, Math.max(0, ads)),
          decision_quality_score: Math.min(100, Math.max(0, dqs)),
          ads_frequency_score: Math.round(frequencyScore * 100) / 100,
          ads_timing_score: Math.round(timingScore * 100) / 100,
          ads_acceptance_score: Math.round(acceptanceScore * 100) / 100,
          dqs_improvement_delta: Math.round(improvementDelta * 100) / 100,
          dqs_critique_score: Math.round(critiqueScore * 100) / 100,
          dqs_blind_penalty: Math.round(blindPenalty * 100) / 100,
        })
        .eq("id", attempt_id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({
        attempt: updated,
        phase: "reflection",
        scores: {
          ads: { total: ads, frequency: frequencyScore, timing: timingScore, acceptance: acceptanceScore },
          dqs: { total: dqs, improvement_delta: improvementDelta, critique: critiqueScore, blind_penalty: blindPenalty },
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_attempt_status") {
      const filter: any = { learner_id: user.id };
      if (content_block_id) filter.content_block_id = content_block_id;
      if (assessment_id) filter.assessment_id = assessment_id;

      let query = anonClient.from("ai_learning_attempts").select("*").match(filter).neq("current_phase", "completed").limit(1).maybeSingle();
      const { data: attempt } = await query;

      return new Response(JSON.stringify({ attempt: attempt || null, phase: attempt?.current_phase || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action: " + action);
  } catch (e) {
    console.error("ai-learning-gate error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
