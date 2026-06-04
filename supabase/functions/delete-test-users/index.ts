import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_EMAIL_SUFFIX = "@test.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller is super_admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin");

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Only super admins can delete test users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List all users and filter test accounts
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const testUsers = (users ?? []).filter(
      (u) => u.email?.endsWith(TEST_EMAIL_SUFFIX) && u.id !== caller.id
    );

    const results: { email: string; status: string; error?: string }[] = [];

    for (const testUser of testUsers) {
      try {
        // Delete profile first (cascade should handle roles)
        await adminClient.from("profiles").delete().eq("user_id", testUser.id);
        await adminClient.from("user_roles").delete().eq("user_id", testUser.id);

        // Delete auth user
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(testUser.id);
        if (deleteError) {
          results.push({ email: testUser.email!, status: "error", error: deleteError.message });
        } else {
          results.push({ email: testUser.email!, status: "deleted" });
        }
      } catch (err) {
        results.push({ email: testUser.email!, status: "error", error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ deleted_count: results.filter((r) => r.status === "deleted").length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
