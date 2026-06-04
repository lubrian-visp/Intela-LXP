import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Default level-specific system prompts (overridden by ai_scoring_config) ──
const DEFAULT_LEVEL_PROMPTS: Record<number, string> = {
  1: `You are a learning assistant operating in HINTS-ONLY mode.
Rules:
- Give ONLY subtle hints and thought-provoking questions
- NEVER provide step-by-step instructions
- NEVER reveal answers or solutions
- Use Socratic questioning to guide the student
- Limit each response to 2-3 short hints maximum
- Encourage the student to think independently
Keep responses under 150 words.`,

  2: `You are a learning assistant operating in GUIDED-STEPS mode.
Rules:
- Provide structured guidance with numbered steps
- Explain the reasoning behind each step
- Point to relevant concepts but do NOT solve the problem
- You may show partial examples or analogies
- Help the student build a mental framework
- Encourage them to attempt each step before asking for more help
Keep responses under 250 words.`,

  3: `You are a learning assistant operating in FULL-SOLUTION mode.
Rules:
- You may provide a complete worked example or solution
- Explain each step in detail with reasoning
- Include alternative approaches where relevant
- Highlight common mistakes and how to avoid them
- Connect the solution to underlying theory
- After showing the solution, ask the student to explain it back in their own words
Keep responses under 400 words.`,
};

// ── Decision tree for AI access level ──
function calculateAccessLevel(
  interactionCount: number,
  maxInteractions: number,
  qualityScore: number
): { level: number; reason: string } {
  // AI Dependency Score (real-time): ratio of interactions used
  const dependencyRatio = interactionCount / Math.max(maxInteractions, 1);

  // High dependency (>70% interactions used) → restrict to Level 1
  if (dependencyRatio > 0.7) {
    return { level: 1, reason: `High AI dependency (${Math.round(dependencyRatio * 100)}% interactions used). Restricted to hints only.` };
  }

  // Low initial performance (<40 quality) → allow Level 3
  if (qualityScore < 40) {
    return { level: 3, reason: `Low initial performance (quality: ${qualityScore}). Full solution guidance available.` };
  }

  // Moderate dependency (40-70%) → Level 1
  if (dependencyRatio > 0.4) {
    return { level: 1, reason: `Moderate AI dependency (${Math.round(dependencyRatio * 100)}%). Hints only.` };
  }

  // Moderate performance (40-70 quality) → Level 2
  if (qualityScore < 70) {
    return { level: 2, reason: `Moderate performance (quality: ${qualityScore}). Guided steps available.` };
  }

  // Good performance + low dependency → Level 2 (encourage self-reliance)
  return { level: 2, reason: `Good performance with low dependency. Guided steps available.` };
}

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

    const { attempt_id, prompt, suggestion_accepted, suggestion_improved, log_id, access_token } = await req.json();

    // Load all config (including dynamic prompts, model, cooldown)
    const { data: allConfigs } = await adminClient.from("ai_scoring_config").select("config_key, config_value");
    const cfg: Record<string, any> = {};
    (allConfigs || []).forEach((c: any) => {
      try { cfg[c.config_key] = JSON.parse(c.config_value); } catch { cfg[c.config_key] = c.config_value; }
    });

    const rapidFireCooldown = Number(cfg.rapid_fire_cooldown_seconds) || 3;
    const aiModel = String(cfg.ai_model || "google/gemini-2.5-flash");

    // Build level prompts from config (with defaults)
    const LEVEL_PROMPTS: Record<number, string> = {
      1: cfg.ai_level_1_system_prompt || DEFAULT_LEVEL_PROMPTS[1],
      2: cfg.ai_level_2_system_prompt || DEFAULT_LEVEL_PROMPTS[2],
      3: cfg.ai_level_3_system_prompt || DEFAULT_LEVEL_PROMPTS[3],
    };

    // Check kill-switch
    if (cfg.ai_workflow_enabled === false) {
      return new Response(JSON.stringify({ error: "AI Learning Workflow is disabled." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If updating feedback on a previous interaction
    if (log_id && (suggestion_accepted !== undefined || suggestion_improved !== undefined)) {
      const { error } = await anonClient
        .from("ai_interaction_logs")
        .update({ suggestion_accepted, suggestion_improved })
        .eq("id", log_id)
        .eq("learner_id", user.id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!attempt_id || !prompt) throw new Error("Missing attempt_id or prompt");

    // access_token already extracted from request body above

    // Validate attempt is in ai_assisted phase
    const { data: attempt } = await anonClient
      .from("ai_learning_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("learner_id", user.id)
      .single();

    if (!attempt) throw new Error("Attempt not found");
    if (attempt.current_phase !== "ai_assisted") throw new Error("AI is not available in the current phase");
    if (!attempt.is_ai_enabled) throw new Error("AI access has not been unlocked for this attempt");

    // ── Token-based access control validation ──
    if (access_token) {
      const parts = access_token.split(".");
      if (parts.length !== 2) throw new Error("Invalid access token format");

      const tokenHash = parts[1];

      const { data: tokenRecord } = await adminClient
        .from("ai_access_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("attempt_id", attempt_id)
        .eq("learner_id", user.id)
        .single();

      if (!tokenRecord) throw new Error("Invalid or unknown access token");
      if (tokenRecord.is_revoked) throw new Error("Access token has been revoked: " + (tokenRecord.revocation_reason || ""));
      if (new Date(tokenRecord.expires_at) < new Date()) {
        await adminClient.from("ai_access_tokens")
          .update({ is_revoked: true, revoked_at: new Date().toISOString(), revocation_reason: "Token expired" })
          .eq("id", tokenRecord.id);
        throw new Error("Access token has expired");
      }
      if (tokenRecord.usage_count >= tokenRecord.max_usage) {
        await adminClient.from("ai_access_tokens")
          .update({ is_revoked: true, revoked_at: new Date().toISOString(), revocation_reason: "Max usage exceeded" })
          .eq("id", tokenRecord.id);
        throw new Error("Access token usage limit exceeded");
      }

      // Misuse detection: rapid-fire requests (dynamic cooldown)
      if (tokenRecord.last_used_at) {
        const timeSinceLastUse = Date.now() - new Date(tokenRecord.last_used_at).getTime();
        if (timeSinceLastUse < rapidFireCooldown * 1000) {
          await adminClient.from("ai_access_tokens")
            .update({ is_revoked: true, revoked_at: new Date().toISOString(), revocation_reason: "Rapid-fire misuse detected" })
            .eq("id", tokenRecord.id);
          throw new Error("Access token revoked due to misuse (rapid requests)");
        }
      }

      // Update token usage
      await adminClient.from("ai_access_tokens")
        .update({ usage_count: tokenRecord.usage_count + 1, last_used_at: new Date().toISOString() })
        .eq("id", tokenRecord.id);
    }

    // Check max interactions
    const { data: maxConfig } = await adminClient
      .from("ai_scoring_config")
      .select("config_value")
      .eq("config_key", "max_ai_interactions")
      .single();

    const maxInteractions = maxConfig ? Number(JSON.parse(maxConfig.config_value)) : 10;

    if (attempt.ai_interaction_count >= maxInteractions) {
      return new Response(JSON.stringify({
        error: `Maximum AI interactions (${maxInteractions}) reached. Please submit your revised solution.`,
        max_reached: true,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Calculate adaptive AI access level ──
    const { level, reason } = calculateAccessLevel(
      attempt.ai_interaction_count || 0,
      maxInteractions,
      attempt.attempt_quality_score || 50
    );

    const LEVEL_LABELS: Record<number, string> = { 1: "Hints Only", 2: "Guided Steps", 3: "Full Solution" };

    // Update attempt with current level
    await anonClient
      .from("ai_learning_attempts")
      .update({ ai_access_level: level })
      .eq("id", attempt_id);

    const startTime = Date.now();

    // Use level-specific system prompt (dynamic from config)
    const systemPrompt = LEVEL_PROMPTS[level] || LEVEL_PROMPTS[1];
    const contextPrompt = `Student's initial attempt:\n${attempt.initial_attempt_text}\n\nStudent's question:\n${prompt}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI processing failed (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || "No response generated.";
    const tokensUsed = aiData.usage?.total_tokens || 0;
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // Log the interaction
    const { data: log, error: logErr } = await anonClient
      .from("ai_interaction_logs")
      .insert({
        attempt_id,
        learner_id: user.id,
        request_prompt: prompt,
        response_text: responseText,
        model_used: aiModel,
        tokens_used: tokensUsed,
        interaction_duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (logErr) console.error("Failed to log interaction:", logErr);

    // Increment interaction count
    await anonClient
      .from("ai_learning_attempts")
      .update({ ai_interaction_count: (attempt.ai_interaction_count || 0) + 1 })
      .eq("id", attempt_id);

    return new Response(JSON.stringify({
      response: responseText,
      log_id: log?.id,
      interaction_number: (attempt.ai_interaction_count || 0) + 1,
      max_interactions: maxInteractions,
      remaining: maxInteractions - (attempt.ai_interaction_count || 0) - 1,
      ai_level: level,
      ai_level_label: LEVEL_LABELS[level],
      ai_level_reason: reason,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-learning-assist error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
