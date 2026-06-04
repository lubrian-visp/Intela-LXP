import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { topic, count = 5, types = ["multiple_choice"], difficulty = "medium", context } = await req.json();
    if (!topic) throw new Error("Missing topic");

    const systemPrompt = `You are an expert assessment designer. Generate ${count} high-quality quiz questions on the topic: "${topic}".
${context ? `Context/learning material:\n${context}\n` : ""}
Difficulty: ${difficulty}.
Allowed question types: ${types.join(", ")}.

Return ONLY raw JSON (no markdown) with this exact schema:
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "multiple_choice | true_false | short_answer | matching | ordering | fill_blank | numerical | hotspot | drag_drop | code | formula",
      "points": 1,
      "explanation": "brief explanation of correct answer",
      "options": [ { "option_text": "string", "is_correct": boolean } ],
      "metadata": {
        "pairs": [ { "left": "string", "right": "string" } ],
        "items": [ "string" ],
        "blanks": [ { "answers": ["string"], "case_sensitive": false } ],
        "answer": 0, "tolerance": 0, "unit": "",
        "image_url": "string", "hotspots": [{ "x": 50, "y": 50, "radius": 8, "is_correct": true, "label": "string" }],
        "targets": [{ "id": "string", "label": "string" }], "correct_mapping": {},
        "language": "javascript", "starter_code": "string", "expected_output": "string",
        "expression": "x+y", "variables": [{ "name": "x", "value": 0 }], "expected": 0
      }
    }
  ]
}
Rules:
- multiple_choice: 4 options, exactly one is_correct=true. Omit metadata.
- true_false: 2 options "True"/"False", one correct. Omit metadata.
- short_answer: omit options and metadata.
- matching: omit options. metadata.pairs = 3-5 left/right pairs.
- ordering: omit options. metadata.items = 3-6 items in correct order.
- fill_blank: omit options. metadata.blanks = one entry per blank with accepted answers.
- numerical: omit options. metadata.answer (number), metadata.tolerance (number), metadata.unit (string).
- hotspot: omit options. metadata.image_url + metadata.hotspots array (x/y in 0-100 percent, radius percent, is_correct).
- drag_drop: omit options. metadata.items (id+label), metadata.targets (id+label), metadata.correct_mapping ({itemId: targetId}).
- code: omit options. metadata.language, metadata.starter_code, metadata.expected_output (only auto-graded for javascript).
- formula: omit options. metadata.expression, metadata.variables (name+value), metadata.expected (number), metadata.tolerance.
- Vary cognitive level (recall, application, analysis).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${count} questions on "${topic}".` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${response.status}`);
    }

    const aiData = await response.json();
    const raw = aiData.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const s = cleaned.search(/[\{\[]/);
    const e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) cleaned = cleaned.substring(s, e + 1);
    cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate-questions error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Unauthorized") ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
