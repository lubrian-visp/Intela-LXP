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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { moduleTitle, moduleType, programmeTitle, prompt, blockCount } = await req.json();
    if (!moduleTitle) throw new Error("Missing moduleTitle");

    const systemPrompt = `You are an expert curriculum content designer for a learning management platform.

Given a module title, type, and programme context, generate content blocks (lessons/activities) for the module.

Programme: "${programmeTitle || "Untitled Programme"}"
Module: "${moduleTitle}" (Type: ${moduleType || "theory"})

You MUST return valid JSON using this exact schema (no markdown, no code fences, just raw JSON):

{
  "blocks": [
    {
      "title": "string - descriptive lesson/activity title",
      "block_type": "text | video | document | assessment | assignment | discussion | attendance | mentor_review | evidence_portfolio | workplace_logbook | rubric | peer_review | resource_library | interactive | scorm | image | dual_signoff",
      "is_required": boolean,
      "duration_minutes": number,
      "content": {
        "text": "string - rich lesson content in HTML format. For text blocks, write 2-4 paragraphs wrapped in <p> tags. Use <h3>, <ul>, <ol>, <strong>, <em> tags for structure.",
        "video_url": "string (optional) - for video blocks, provide a real YouTube embed URL like https://www.youtube.com/embed/VIDEO_ID. Search for a relevant educational video on the topic.",
        "image_url": "string (optional) - for image blocks, provide a relevant Unsplash image URL like https://images.unsplash.com/photo-XXXXX?w=800&auto=format. Choose images that relate to the lesson topic.",
        "image_caption": "string (optional) - descriptive caption for the image"
      }
    }
  ],
  "summary": "string - brief summary of generated content"
}

Guidelines:
- Generate ${blockCount || "3-5"} content blocks.
- Start with introductory/foundational content, then build to application.
- Use "text" for written lessons, "video" for suggested videos, "assessment" for knowledge checks, "assignment" for practical tasks.
- For theory modules: focus on text, video, and assessment blocks.
- For practical modules: include assignment and evidence_portfolio blocks.
- For workplace modules: include workplace_logbook, mentor_review, and attendance blocks.
- Write substantive content for text blocks (2-4 paragraphs of actual lesson content) using HTML formatting.
- For text blocks, include relevant images using <img> tags within the HTML content where appropriate, using Unsplash URLs.
- For video blocks: ALWAYS include a "video_url" field with a YouTube embed URL relevant to the topic. Also include a "text" field with a brief description of the video content.
- For image blocks: ALWAYS include an "image_url" field with a relevant Unsplash URL and an "image_caption" field.
- Set realistic durations.
- Mark foundational blocks as required.
- Aim for a rich multimedia experience mixing text, video, and image blocks.
${prompt ? `\nAdditional user instructions: ${prompt}` : ""}`;

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
          { role: "user", content: `Generate content blocks for the module "${moduleTitle}".${prompt ? ` Additional context: ${prompt}` : ""}` },
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

    let parsed;
    try {
      // Strip markdown code fences
      let cleaned = rawContent
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      // Find JSON boundaries
      const jsonStart = cleaned.search(/[\{\[]/);
      const jsonEnd = cleaned.lastIndexOf(jsonStart !== -1 && cleaned[jsonStart] === '[' ? ']' : '}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON object found in response");
      }

      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Fix common issues: trailing commas, control characters
        cleaned = cleaned
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, " ");
        parsed = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent.substring(0, 800));
      throw new Error("AI returned invalid structure. Please try again.");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate-content-block error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
