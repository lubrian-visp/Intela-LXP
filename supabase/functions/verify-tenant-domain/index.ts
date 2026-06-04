// Verifies a tenant custom domain by performing a live DNS lookup
// and confirming either a TXT or CNAME record matches the expected value.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TARGET_CNAME = "lovable.app"; // expected CNAME target for proxied custom domains

async function lookupTxt(host: string): Promise<string[]> {
  try {
    const records = await Deno.resolveDns(host, "TXT");
    return records.flat();
  } catch {
    return [];
  }
}

async function lookupCname(host: string): Promise<string[]> {
  try {
    return await Deno.resolveDns(host, "CNAME");
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domain_id } = await req.json();
    if (!domain_id) throw new Error("domain_id required");

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    // Read the domain row using caller's RLS
    const { data: domain, error: readErr } = await supabase
      .from("tenant_domains")
      .select("id, hostname, verification_token, verification_method")
      .eq("id", domain_id)
      .single();
    if (readErr || !domain) throw new Error("Domain not found or not accessible");

    let verified = false;
    let detail = "";

    if (domain.verification_method === "TXT") {
      const txt = await lookupTxt(`_lovable.${domain.hostname}`);
      verified = txt.some((t) => t.includes(domain.verification_token));
      detail = verified ? "TXT record matched" : `TXT not found at _lovable.${domain.hostname}`;
    } else {
      const cname = await lookupCname(domain.hostname);
      verified = cname.some((c) => c.toLowerCase().includes(TARGET_CNAME));
      detail = verified ? `CNAME → ${cname.join(", ")}` : `CNAME does not point to ${TARGET_CNAME}`;
    }

    const { data, error } = await supabase.rpc("verify_tenant_domain", {
      _domain_id: domain_id,
      _verified: verified,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ verified, detail, domain: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
