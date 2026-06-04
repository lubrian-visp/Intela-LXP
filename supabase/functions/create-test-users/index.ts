import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_USERS = [
  { email: "superadmin@test.com", name: "Super Admin Test", role: "super_admin" },
  { email: "sysadmin@test.com", name: "Systems Admin Test", role: "systems_admin" },
  { email: "progmanager@test.com", name: "Programme Manager Test", role: "programme_manager" },
  { email: "operations@test.com", name: "Operations Test", role: "operations" },
  { email: "talentmgr@test.com", name: "Talent Manager Test", role: "talent_manager" },
  { email: "sponsor@test.com", name: "Sponsor Test", role: "sponsor" },
  { email: "facilitator@test.com", name: "Facilitator Test", role: "facilitator" },
  { email: "assessor@test.com", name: "Assessor Test", role: "assessor" },
  { email: "moderator@test.com", name: "Moderator Test", role: "moderator" },
  { email: "mentor@test.com", name: "Mentor Test", role: "mentor" },
  { email: "learner@test.com", name: "Learner Test", role: "learner" },
];

const SHARED_PASSWORD = "TestUser123!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is a super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller role
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
      return new Response(JSON.stringify({ error: "Only super admins can create test users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const testUser of TEST_USERS) {
      try {
        // Create user via admin API (auto-confirms email)
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: testUser.email,
          password: SHARED_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: testUser.name },
        });

        if (createError) {
          // User might already exist
          if (createError.message?.includes("already been registered")) {
            results.push({ email: testUser.email, status: "already_exists" });
            continue;
          }
          results.push({ email: testUser.email, status: "error", error: createError.message });
          continue;
        }

        if (newUser?.user) {
          // Assign role
          const { error: roleError } = await adminClient
            .from("user_roles")
            .upsert(
              { user_id: newUser.user.id, role: testUser.role },
              { onConflict: "user_id,role" }
            );

          if (roleError) {
            results.push({ email: testUser.email, status: "created_no_role", error: roleError.message });
          } else {
            results.push({ email: testUser.email, status: "created" });
          }
        }
      } catch (err) {
        results.push({ email: testUser.email, status: "error", error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ password: SHARED_PASSWORD, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
