import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { submission_id, learner_id, text_content, assessment_id } = await req.json();

    if (!submission_id || !learner_id || !text_content || !assessment_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Fetch other submissions for the same assessment for cross-comparison
    const { data: otherSubmissions } = await supabase
      .from("quiz_responses")
      .select("text_answer, submission_id")
      .not("submission_id", "eq", submission_id)
      .not("text_answer", "is", null);

    const otherTexts = (otherSubmissions || [])
      .filter((s: any) => s.text_answer && s.text_answer.length > 20)
      .map((s: any) => s.text_answer)
      .slice(0, 10);

    // Use AI to analyse text for originality
    let similarityScore = 0;
    let flaggedSegments: any[] = [];
    let aiAnalysis = "";

    if (lovableApiKey) {
      const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an academic integrity checker. Analyse the submitted text for:
1. Signs of AI-generated content (formulaic patterns, unnaturally perfect grammar, generic phrasing)
2. Similarity with the comparison texts provided
3. Indicators of plagiarism (inconsistent writing style, vocabulary shifts)

Return a JSON object with:
- similarity_score: 0-100 (estimated originality concern percentage)
- flagged_segments: array of { text: string, reason: string }
- analysis: brief summary of findings

Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: `SUBMITTED TEXT:\n${text_content.substring(0, 3000)}\n\nCOMPARISON TEXTS:\n${otherTexts.map((t: string, i: number) => `[${i + 1}] ${t.substring(0, 500)}`).join("\n\n")}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleaned);
          similarityScore = parsed.similarity_score || 0;
          flaggedSegments = parsed.flagged_segments || [];
          aiAnalysis = parsed.analysis || "";
        } catch {
          aiAnalysis = content;
          similarityScore = 0;
        }
      }
    } else {
      // Basic text comparison without AI
      for (const other of otherTexts) {
        const similarity = basicSimilarity(text_content, other);
        if (similarity > similarityScore) similarityScore = Math.round(similarity * 100);
      }
      aiAnalysis = `Basic text comparison completed. Highest similarity: ${similarityScore}%`;
    }

    // Store the result
    const { data: check, error } = await supabase
      .from("plagiarism_checks")
      .upsert(
        {
          submission_id,
          learner_id,
          similarity_score: similarityScore,
          flagged_segments: flaggedSegments,
          ai_analysis: aiAnalysis,
          status: similarityScore > 30 ? "flagged" : "clear",
          checked_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" }
      )
      .select()
      .single();

    if (error) {
      // If upsert fails due to no unique constraint, try insert
      const { data: insertCheck, error: insertErr } = await supabase
        .from("plagiarism_checks")
        .insert({
          submission_id,
          learner_id,
          similarity_score: similarityScore,
          flagged_segments: flaggedSegments,
          ai_analysis: aiAnalysis,
          status: similarityScore > 30 ? "flagged" : "clear",
          checked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify(insertCheck), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(check), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Basic n-gram similarity for fallback when no AI key */
function basicSimilarity(a: string, b: string): number {
  const ngramSize = 3;
  const aNgrams = getNgrams(a.toLowerCase(), ngramSize);
  const bNgrams = getNgrams(b.toLowerCase(), ngramSize);
  if (aNgrams.size === 0 || bNgrams.size === 0) return 0;

  let intersection = 0;
  for (const ng of aNgrams) {
    if (bNgrams.has(ng)) intersection++;
  }
  return (2 * intersection) / (aNgrams.size + bNgrams.size);
}

function getNgrams(text: string, n: number): Set<string> {
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const ngrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}
