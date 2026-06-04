import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { learner_id } = await req.json();
    if (!learner_id) {
      return new Response(JSON.stringify({ error: "learner_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch learner's profile and skills
    const { data: profile } = await supabase.from("profiles").select("full_name, bio").eq("user_id", learner_id).single();

    // Fetch learner's existing applications
    const { data: apps } = await supabase.from("wbt_project_applications").select("project_id").eq("learner_id", learner_id);
    const appliedIds = (apps || []).map((a: any) => a.project_id);

    // Fetch available projects
    const { data: projects } = await supabase
      .from("wbt_projects")
      .select("id, title, description, required_skills, agile_framework, payment_model, project_model")
      .eq("status", "published")
      .limit(50);

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], message: "No projects available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out already-applied projects
    const available = projects.filter((p: any) => !appliedIds.includes(p.id));
    if (available.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], message: "You have applied to all available projects" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectList = available.map((p: any) =>
      `- ID: ${p.id} | Title: "${p.title}" | Skills: ${(p.required_skills || []).join(", ")} | Framework: ${p.agile_framework} | Model: ${p.project_model}`
    ).join("\n");

    const prompt = `You are a career advisor for a work-based training platform. A learner named "${profile?.full_name || 'Learner'}" (bio: "${profile?.bio || 'No bio'}") needs project recommendations.

Available projects:
${projectList}

Return a JSON array of the top 5 most suitable project IDs with a short reason for each recommendation. Format:
[{"project_id": "...", "reason": "..."}]

Consider skill alignment, learning opportunity, and career growth. Return ONLY the JSON array, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful career advisor. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse AI response - extract JSON array
    let recommendations: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) recommendations = JSON.parse(jsonMatch[0]);
    } catch {
      recommendations = [];
    }

    // Enrich with project details
    const enriched = recommendations.map((rec: any) => {
      const proj = available.find((p: any) => p.id === rec.project_id);
      return proj ? { ...rec, project: proj } : null;
    }).filter(Boolean);

    return new Response(JSON.stringify({ recommendations: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("wbt-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
