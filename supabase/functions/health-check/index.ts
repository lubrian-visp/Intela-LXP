import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database connectivity check
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const dbStart = Date.now();
    const { error } = await supabase.from("feature_flags").select("id").limit(1);
    checks.database = {
      status: error ? "degraded" : "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: "unhealthy" };
  }

  // Auth service check
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const authStart = Date.now();
    await supabase.auth.getSession();
    checks.auth = { status: "healthy", latencyMs: Date.now() - authStart };
  } catch {
    checks.auth = { status: "unhealthy" };
  }

  const overallStatus = Object.values(checks).every((c) => c.status === "healthy")
    ? "healthy"
    : Object.values(checks).some((c) => c.status === "unhealthy")
    ? "unhealthy"
    : "degraded";

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - start,
      checks,
    }),
    {
      status: overallStatus === "unhealthy" ? 503 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
