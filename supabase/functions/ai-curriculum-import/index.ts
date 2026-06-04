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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check feature flag
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("is_enabled")
      .eq("flag_key", "ai_curriculum_import")
      .single();
    if (!flag?.is_enabled) {
      return new Response(
        JSON.stringify({ error: "AI Curriculum Import is currently disabled by your administrator." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role access
    const allowedRoles = ["super_admin", "operations", "programme_manager", "facilitator", "systems_admin"];
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (userRoles || []).map((r: any) => r.role);
    const hasAccess = roles.some((r: string) => allowedRoles.includes(r));
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to use AI Curriculum Import." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentText, programmeId, programmeTitle, programmeTypeConfig } = await req.json();
    if (!documentText || !programmeId) {
      throw new Error("Missing required fields: documentText and programmeId");
    }

    const systemPrompt = `You are an expert curriculum architect for a learning management platform. 
Given a curriculum document or course outline, you must parse it and generate a structured programme framework.

The programme is titled: "${programmeTitle || "Untitled Programme"}"

You MUST return valid JSON using this exact schema (no markdown, no code fences, just raw JSON):

{
  "pathways": [
    {
      "title": "string - the learning track/pathway name",
      "phase": "knowledge | practical | workplace",
      "modules": [
        {
          "title": "string - module title",
          "module_type": "theory | practical | workplace",
          "description": "string - 2-3 sentence description",
          "duration_hours": number,
          "credits": number,
          "is_mandatory": boolean,
          "content_blocks": [
            {
              "title": "string - block title",
              "block_type": "text | video | document | assessment | assignment | discussion | attendance_log",
              "is_required": boolean,
              "duration_minutes": number,
              "content_summary": "string - brief description of what this block should contain"
            }
          ]
        }
      ]
    }
  ],
  "summary": "string - brief summary of the imported curriculum"
}

Guidelines:
- Group related topics into pathways by phase (knowledge first, then practical, then workplace if applicable).
- Create 2-6 content blocks per module depending on complexity.
- Use "text" blocks for written lessons, "video" for suggested video content, "document" for reference materials, "assessment" for quizzes/tests, "assignment" for practical tasks.
- Set realistic durations and credit values.
- Mark foundational modules as mandatory.
- Generate meaningful, well-structured descriptions.
${programmeTypeConfig ? `\nProgramme Type Configuration: ${JSON.stringify(programmeTypeConfig)}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the curriculum document to parse:\n\n${documentText}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI processing failed (${response.status})`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No response from AI");

    // Parse JSON from AI response (handle possible markdown fences)
    let parsed;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      throw new Error("AI returned invalid structure. Please try again.");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-curriculum-import error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("permission") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
