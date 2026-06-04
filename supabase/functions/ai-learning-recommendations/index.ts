import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- AUTH GATE ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    let learner_id: string | undefined = body?.learner_id;

    // Determine if caller is staff
    const STAFF_ROLES = ["super_admin", "systems_admin", "operations", "programme_manager", "talent_manager", "assessor", "moderator"];
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const callerRoles = (roleRows || []).map((r: any) => r.role);
    const isStaff = callerRoles.some((r: string) => STAFF_ROLES.includes(r));

    if (!isStaff) {
      // Learners can only act on themselves — force-overwrite learner_id
      learner_id = callerId;
    } else {
      // Staff may target a learner; default to self if omitted
      if (!learner_id) learner_id = callerId;
    }

    if (!learner_id) throw new Error("learner_id is required");

    // Gather learner context
    const [profileRes, enrolmentsRes, submissionsRes, skillsRes, existingRecsRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", learner_id).single(),
      supabase.from("enrolments").select("*, cohorts(name, programme_id, programmes(title, description))").eq("learner_id", learner_id).in("status", ["active", "enrolled"]),
      supabase.from("assessment_submissions").select("*, assessments(title, assessment_category)").eq("learner_id", learner_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("learner_skill_profiles").select("*, skills(name, category)").eq("learner_id", learner_id),
      supabase.from("learning_recommendations").select("id").eq("learner_id", learner_id).eq("is_dismissed", false),
    ]);

    // Get available content to recommend
    const [programmesRes, ugcRes, externalRes] = await Promise.all([
      supabase.from("programmes").select("id, title, description").in("status", ["approved", "published"]).limit(20),
      supabase.from("user_generated_content").select("id, title, description, content_type, tags").eq("status", "published").limit(20),
      supabase.from("external_content_items").select("id, title, description, content_type, tags, difficulty_level, external_content_providers(provider_name)").eq("is_active", true).limit(20),
    ]);

    const learnerContext = {
      name: profileRes.data?.full_name || "Learner",
      enrolments: (enrolmentsRes.data || []).map((e: any) => ({
        programme: e.cohorts?.programmes?.title,
        progress: e.progress_percentage,
        status: e.status,
      })),
      recentSubmissions: (submissionsRes.data || []).map((s: any) => ({
        assessment: s.assessments?.title,
        category: s.assessments?.assessment_category,
        score: s.score,
        status: s.status,
      })),
      skillProfile: (skillsRes.data || []).map((sp: any) => ({
        skill: sp.skills?.name,
        category: sp.skills?.category,
        current: sp.proficiency_level,
        target: sp.target_level,
      })),
    };

    const availableContent = {
      programmes: (programmesRes.data || []).map((p: any) => ({ id: p.id, title: p.title, type: "programme" })),
      ugc: (ugcRes.data || []).map((u: any) => ({ id: u.id, title: u.title, type: u.content_type, tags: u.tags })),
      external: (externalRes.data || []).map((e: any) => ({
        title: e.title, description: e.description, type: e.content_type,
        provider: e.external_content_providers?.provider_name, difficulty: e.difficulty_level, tags: e.tags,
      })),
    };

    const systemPrompt = `You are a learning recommendation engine. Based on the learner's profile, current enrolments, assessment performance, and skill gaps, suggest 5 personalised learning recommendations.

For each recommendation, return a JSON array with objects containing:
- "title": short recommendation title
- "reason": one-sentence explanation of why this is recommended
- "type": one of "programme", "ugc", "external", "skill_focus"
- "relevance_score": 0-100 indicating relevance
- "content_id": if matching available content, include its id (or null)

Focus on:
1. Skill gaps (difference between current and target proficiency)
2. Complementary content to current enrolments
3. Areas where assessment scores are weak
4. Career development opportunities`;

    const userPrompt = `Learner Context: ${JSON.stringify(learnerContext)}

Available Content: ${JSON.stringify(availableContent)}

Generate 5 personalised learning recommendations as a JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_recommendations",
              description: "Return personalised learning recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        reason: { type: "string" },
                        type: { type: "string", enum: ["programme", "ugc", "external", "skill_focus"] },
                        relevance_score: { type: "number" },
                        content_id: { type: "string" },
                      },
                      required: ["title", "reason", "type", "relevance_score"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let recommendations: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      recommendations = parsed.recommendations || [];
    }

    // Clear old non-dismissed recommendations
    await supabase.from("learning_recommendations").delete()
      .eq("learner_id", learner_id).eq("is_dismissed", false);

    // Insert new recommendations
    if (recommendations.length > 0) {
      const inserts = recommendations.map((rec: any) => ({
        learner_id,
        recommendation_type: "ai",
        reason: `${rec.title}: ${rec.reason}`,
        relevance_score: rec.relevance_score || 50,
        programme_id: rec.type === "programme" && rec.content_id ? rec.content_id : null,
        ugc_id: rec.type === "ugc" && rec.content_id ? rec.content_id : null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      await supabase.from("learning_recommendations").insert(inserts);
    }

    return new Response(JSON.stringify({ success: true, count: recommendations.length, recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommendation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
