import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Create sponsor user (or find existing)
    const sponsorEmail = "sponsor@test.com";
    const sponsorPassword = "TestUser123!";
    let sponsorUserId: string;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingSponsor = existingUsers?.users?.find(u => u.email === sponsorEmail);

    if (existingSponsor) {
      sponsorUserId = existingSponsor.id;
      console.log("Sponsor user already exists:", sponsorUserId);
    } else {
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: sponsorEmail,
        password: sponsorPassword,
        email_confirm: true,
        user_metadata: { full_name: "Demo Sponsor Corp" },
      });
      if (userError) throw userError;
      sponsorUserId = newUser.user.id;
      console.log("Created sponsor user:", sponsorUserId);
    }

    // Ensure profile exists
    await supabase.from("profiles").upsert({
      user_id: sponsorUserId,
      full_name: "Demo Sponsor Corp",
      organisation: "Acme Holdings Ltd",
      job_title: "Skills Development Manager",
    }, { onConflict: "user_id" });

    // Ensure sponsor role
    await supabase.from("user_roles").upsert({
      user_id: sponsorUserId,
      role: "sponsor",
    }, { onConflict: "user_id,role" });

    // 2. Ensure we have programmes and cohorts
    const { data: programmes } = await supabase
      .from("programmes")
      .select("id, title")
      .limit(3);

    if (!programmes?.length) {
      // Create sample programmes
      const { data: country } = await supabase
        .from("countries")
        .select("id")
        .eq("iso_code", "ZA")
        .single();

      const countryId = country?.id;

      const progData = [
        { title: "Business Administration NQF4", status: "active", country_id: countryId },
        { title: "Project Management NQF5", status: "active", country_id: countryId },
        { title: "IT Systems Support NQF4", status: "active", country_id: countryId },
      ];

      const { data: newProgs, error: progErr } = await supabase
        .from("programmes")
        .insert(progData)
        .select("id, title");
      if (progErr) throw progErr;
      programmes?.push(...(newProgs ?? []));
    }

    const progIds = (programmes ?? []).map(p => p.id);

    // 3. Ensure cohorts exist for each programme
    const cohortIds: string[] = [];
    for (const progId of progIds) {
      const { data: existing } = await supabase
        .from("cohorts")
        .select("id")
        .eq("programme_id", progId)
        .limit(1);

      if (existing?.length) {
        cohortIds.push(existing[0].id);
      } else {
        const { data: newCohort, error: cohErr } = await supabase
          .from("cohorts")
          .insert({
            name: `Cohort 2026-A`,
            programme_id: progId,
            status: "active",
            start_date: "2026-01-15",
            end_date: "2026-12-15",
            max_learners: 30,
          })
          .select("id")
          .single();
        if (cohErr) throw cohErr;
        cohortIds.push(newCohort.id);
      }
    }

    // 4. Create dummy learner users + enrolments linked to sponsor
    const learnerEmails = [
      "learner1@test.com", "learner2@test.com", "learner3@test.com",
      "learner4@test.com", "learner5@test.com", "learner6@test.com",
      "learner7@test.com", "learner8@test.com",
    ];

    const learnerNames = [
      "Thabo Mokoena", "Naledi Khumalo", "Sipho Dlamini",
      "Ayanda Nkosi", "Lerato Molefe", "Bongani Zulu",
      "Fatima Hendricks", "David van Wyk",
    ];

    const learnerIds: string[] = [];
    for (let i = 0; i < learnerEmails.length; i++) {
      const email = learnerEmails[i];
      const existing = existingUsers?.users?.find(u => u.email === email);
      if (existing) {
        learnerIds.push(existing.id);
      } else {
        const { data: newLearner, error: lErr } = await supabase.auth.admin.createUser({
          email,
          password: sponsorPassword,
          email_confirm: true,
          user_metadata: { full_name: learnerNames[i] },
        });
        if (lErr) {
          console.warn(`Skipping ${email}:`, lErr.message);
          continue;
        }
        learnerIds.push(newLearner.user.id);

        await supabase.from("user_roles").upsert({
          user_id: newLearner.user.id,
          role: "learner",
        }, { onConflict: "user_id,role" });
      }
    }

    // 5. Create enrolments linked to sponsor
    const statuses = ["active", "active", "active", "active", "completed", "active", "active", "active"];
    const progresses = [72, 45, 88, 23, 100, 56, 34, 91];

    for (let i = 0; i < learnerIds.length; i++) {
      const cohortIdx = i % cohortIds.length;
      await supabase.from("enrolments").upsert({
        learner_id: learnerIds[i],
        cohort_id: cohortIds[cohortIdx],
        sponsor_id: sponsorUserId,
        status: statuses[i] ?? "active",
        progress_percentage: progresses[i] ?? 50,
        enrolled_at: "2026-01-20",
      }, { onConflict: "learner_id,cohort_id" }).select();
    }

    // 6. Create sponsor invoices
    const invoiceData = [
      { invoice_number: "INV-2026-001", description: "Q1 Training Fees - Business Admin", amount: 45000, currency: "ZAR", status: "paid", issued_date: "2026-01-15", due_date: "2026-02-15" },
      { invoice_number: "INV-2026-002", description: "Q1 Training Fees - Project Management", amount: 62000, currency: "ZAR", status: "issued", issued_date: "2026-02-01", due_date: "2026-03-01" },
      { invoice_number: "INV-2026-003", description: "Q2 Training Fees - IT Support", amount: 38000, currency: "ZAR", status: "draft", issued_date: "2026-03-01", due_date: "2026-04-01" },
      { invoice_number: "INV-2026-004", description: "Skills Levy Claim Reconciliation", amount: 15000, currency: "ZAR", status: "overdue", issued_date: "2026-01-01", due_date: "2026-02-01" },
    ];

    for (const inv of invoiceData) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("sponsor_invoices" as any)
        .select("id")
        .eq("invoice_number", inv.invoice_number)
        .limit(1);

      if (!existing?.length) {
        await supabase.from("sponsor_invoices" as any).insert({
          ...inv,
          sponsor_id: sponsorUserId,
          programme_id: progIds[0] ?? null,
        });
      }
    }

    // 7. Create sponsor quotes
    const quoteData = [
      { quote_number: "QT-2026-001", description: "Annual Business Admin Training Package", total_amount: 180000, currency: "ZAR", status: "accepted", valid_until: "2026-06-30" },
      { quote_number: "QT-2026-002", description: "Project Management Skills Programme", total_amount: 124000, currency: "ZAR", status: "pending", valid_until: "2026-04-30" },
    ];

    for (const qt of quoteData) {
      const { data: existing } = await supabase
        .from("sponsor_quotes" as any)
        .select("id")
        .eq("quote_number", qt.quote_number)
        .limit(1);

      if (!existing?.length) {
        await supabase.from("sponsor_quotes" as any).insert({
          ...qt,
          sponsor_id: sponsorUserId,
          programme_id: progIds[0] ?? null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sponsor: { email: sponsorEmail, password: sponsorPassword, userId: sponsorUserId },
        learners: learnerIds.length,
        enrolments: learnerIds.length,
        invoices: invoiceData.length,
        quotes: quoteData.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
