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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller has appropriate role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const allowedRoles = ["super_admin", "systems_admin", "operations", "programme_manager"];
    const hasPermission = callerRoles?.some((r: any) => allowedRoles.includes(r.role));
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { learners, programme_id, programme_name, cohort_id, auto_approve } = await req.json();

    if (!Array.isArray(learners) || learners.length === 0 || !programme_id) {
      return new Response(JSON.stringify({ error: "learners array and programme_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap at 200 per batch
    const batch = learners.slice(0, 200);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const learner of batch) {
      try {
        const { full_name, email, phone, national_id, date_of_birth, gender, country, education_level } = learner;

        if (!full_name || !email) {
          errors.push(`${email || "unknown"}: Missing name or email`);
          failed++;
          continue;
        }

        // Generate temp password
        const tempPassword = crypto.randomUUID().slice(0, 14);

        // Provision auth user
        let userId: string | undefined;
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createErr) {
          if (createErr.message?.includes("already") || createErr.message?.includes("exists")) {
            const { data: listData } = await adminClient.auth.admin.listUsers();
            const existing = listData?.users?.find((u: any) => u.email === email);
            if (existing) {
              userId = existing.id;
            } else {
              errors.push(`${email}: ${createErr.message}`);
              failed++;
              continue;
            }
          } else {
            errors.push(`${email}: ${createErr.message}`);
            failed++;
            continue;
          }
        } else {
          userId = newUser.user?.id;
        }

        if (!userId) {
          errors.push(`${email}: Could not resolve user ID`);
          failed++;
          continue;
        }

        // Assign learner role (upsert)
        await adminClient.from("user_roles").upsert(
          { user_id: userId, role: "learner" },
          { onConflict: "user_id,role" }
        );

        // Create registration
        const regStatus = auto_approve ? "approved" : "submitted";
        const { data: reg, error: regErr } = await adminClient
          .from("learner_registrations")
          .insert({
            full_name,
            email,
            phone: phone || null,
            national_id: national_id || null,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            country: country || null,
            education_level: education_level || null,
            programme_id,
            programme_name: programme_name || null,
            registration_method: "bulk-import",
            status: regStatus,
            user_id: userId,
            registered_by: caller.id,
            reviewed_by: auto_approve ? caller.id : null,
            reviewed_at: auto_approve ? new Date().toISOString() : null,
          })
          .select("id")
          .single();

        if (regErr) {
          errors.push(`${email}: Registration failed — ${regErr.message}`);
          failed++;
          continue;
        }

        // Audit log
        await adminClient.from("onboarding_audit_log").insert({
          entity_type: "learner",
          entity_id: reg.id,
          action: "registered",
          performed_by: caller.id,
          details: { method: "bulk-import", auto_approve },
        });

        // Auto-approve + enrol
        if (auto_approve && cohort_id) {
          // Enrol
          await adminClient.from("enrolments").upsert({
            learner_id: userId,
            cohort_id,
            status: "active",
            enrolled_at: new Date().toISOString(),
            approved_by: caller.id,
          }, {
            onConflict: "cohort_id,learner_id",
            ignoreDuplicates: true,
          });

          // Update registration to enrolled
          await adminClient
            .from("learner_registrations")
            .update({ status: "enrolled" })
            .eq("id", reg.id);

          // Audit enrolment
          await adminClient.from("onboarding_audit_log").insert({
            entity_type: "learner",
            entity_id: reg.id,
            action: "enrolled",
            performed_by: caller.id,
            details: { cohort_id, programme_id, method: "bulk-import" },
          });
        }

        success++;
      } catch (innerErr: any) {
        errors.push(`${learner.email || "unknown"}: ${innerErr.message}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success, failed, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
