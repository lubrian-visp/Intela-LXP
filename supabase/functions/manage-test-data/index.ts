/**
 * manage-test-data
 * action = "seed"    → creates realistic test data for learner dashboard testing
 * action = "cleanup" → deletes everything created in a previous seed session
 * action = "status"  → lists current test sessions and their record counts
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function uid(): string {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { action, sessionId, requestedBy } = await req.json();

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (action === "status") {
      const { data } = await supa
        .from("test_data_registry")
        .select("session_id, table_name, label, created_at")
        .order("created_at", { ascending: false });

      const sessions: Record<string, any[]> = {};
      (data ?? []).forEach((r: any) => {
        if (!sessions[r.session_id]) sessions[r.session_id] = [];
        sessions[r.session_id].push(r);
      });

      return new Response(JSON.stringify({ sessions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    if (action === "cleanup") {
      const targetSession = sessionId;

      let query = supa.from("test_data_registry").select("*");
      if (targetSession) query = query.eq("session_id", targetSession);
      const { data: registry } = await query.order("created_at", { ascending: false });

      if (!registry?.length) {
        return new Response(JSON.stringify({ message: "Nothing to clean up." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete order matters (FK dependencies: delete children before parents)
      const deleteOrder = [
        "rubric_scores", "discussion_posts", "discussion_threads",
        "moderation_items", "assessment_submissions", "learner_study_log",
        "learner_streaks", "issued_credentials", "portfolio_evidence",
        "enrolments", "training_sessions", "announcements",
        "notifications", "content_blocks", "programme_modules",
        "pathways", "cohorts", "assessments", "rubric_criteria",
        "rubrics", "programmes", "profiles", "test_data_registry",
      ];

      let deleted = 0;
      for (const table of deleteOrder) {
        const ids = registry
          .filter(r => r.table_name === table)
          .map(r => r.record_id);
        if (!ids.length) continue;

        const { error } = await (supa as any).from(table).delete().in("id", ids);
        if (!error) deleted += ids.length;
      }

      // Also delete auth users we created
      const userIds = registry
        .filter(r => r.table_name === "auth.users")
        .map(r => r.record_id);
      for (const uid of userIds) {
        await supa.auth.admin.deleteUser(uid).catch(() => {});
      }

      // Clean the registry itself
      let cleanQuery = supa.from("test_data_registry").delete();
      if (targetSession) cleanQuery = cleanQuery.eq("session_id", targetSession);
      else cleanQuery = cleanQuery.neq("session_id", "");
      await cleanQuery;

      return new Response(JSON.stringify({ deleted, message: `Cleaned up ${deleted} test records.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SEED ──────────────────────────────────────────────────────────────────
    if (action === "seed") {
      const session = `TEST_${Date.now()}`;
      const reg: { table_name: string; record_id: string; label: string }[] = [];

      const track = (table: string, id: string, label: string) => {
        reg.push({ table_name: table, record_id: id, label });
      };

      // ── 1. Test learner auth user ──────────────────────────────────────────
      const learnerEmail = `test.learner.${Date.now()}@intela-test.co.za`;
      const { data: authUser, error: authErr } = await supa.auth.admin.createUser({
        email: learnerEmail,
        password: "TestLearner@123",
        email_confirm: true,
        user_metadata: { full_name: "[TEST] Alex Johnson" },
      });
      if (authErr) throw new Error(`Auth user: ${authErr.message}`);
      const learnerId = authUser.user!.id;
      track("auth.users", learnerId, "Test learner auth account");

      // Assign learner role
      await supa.from("user_roles").insert({ user_id: learnerId, role: "learner" });

      // Profile
      const profileId = uid();
      await (supa as any).from("profiles").insert({
        id: profileId, user_id: learnerId,
        full_name: "[TEST] Alex Johnson", job_title: "Learner (Test Account)",
      });
      track("profiles", profileId, "Test learner profile");

      // Tenant membership
      await (supa as any).from("tenant_users").insert({
        tenant_id: "e0363493-7891-40cc-8f37-4233dc25b5ef",
        user_id: learnerId, role: "member", is_active: true,
      }).onConflict(["tenant_id","user_id"]).ignore();

      // ── 2. Programme ───────────────────────────────────────────────────────
      const progId = uid();
      await (supa as any).from("programmes").insert({
        id: progId, title: "[TEST] Data Analytics Foundation",
        description: "Seed test programme for dashboard testing. Safe to delete.",
        status: "active", nqf_level: 5, credits: 60,
        programme_type_id: null, created_by: requestedBy,
      });
      track("programmes", progId, "Test programme");

      // ── 3. Rubric ──────────────────────────────────────────────────────────
      const rubricId = uid();
      await (supa as any).from("rubrics").insert({
        id: rubricId, name: "[TEST] Project Assessment Rubric",
        description: "Test rubric with 3 criteria", rubric_type: "analytic",
        programme_id: progId, max_score: 30, is_reusable: false,
        created_by: requestedBy,
      });
      track("rubrics", rubricId, "Test rubric");

      const crit1 = uid(); const crit2 = uid(); const crit3 = uid();
      for (const [id, name, pts, seq] of [[crit1,"Understanding",10,1],[crit2,"Application",10,2],[crit3,"Presentation",10,3]]) {
        await (supa as any).from("rubric_criteria").insert({
          id, rubric_id: rubricId, criterion_name: name,
          description: `[TEST] ${name} criterion`, max_points: pts, sequence_order: seq,
          performance_levels: [
            { level: "Excellent", points: pts, description: "Outstanding" },
            { level: "Good",      points: Math.floor((pts as number)*0.75), description: "Meets expectations" },
            { level: "Adequate",  points: Math.floor((pts as number)*0.5),  description: "Partially meets" },
            { level: "Poor",      points: 0, description: "Does not meet" },
          ],
        });
        track("rubric_criteria", id as string, `Test criterion: ${name}`);
      }

      // ── 4. Assessments ─────────────────────────────────────────────────────
      const asmFormative = uid(); const asmSummative = uid(); const asmJournal = uid();
      for (const [id, title, cat, type, maxS, passM, due] of [
        [asmFormative, "[TEST] Week 1 Knowledge Check", "formative", "formative", 20, 12, new Date(Date.now()+3*86400000).toISOString().split("T")[0]],
        [asmSummative, "[TEST] Mid-Programme Project",  "summative", "summative", 30, 18, new Date(Date.now()+14*86400000).toISOString().split("T")[0]],
        [asmJournal,   "[TEST] Reflection Journal",     "formative", "reflection_journal", 10, 6, new Date(Date.now()+7*86400000).toISOString().split("T")[0]],
      ]) {
        await (supa as any).from("assessments").insert({
          id, programme_id: progId, title, description: `[TEST] ${title}`,
          assessment_category: cat, assessment_type: type,
          max_score: maxS, pass_mark: passM, due_date: due,
          rubric_id: id === asmSummative ? rubricId : null,
          created_by: requestedBy,
        });
        track("assessments", id as string, `Test assessment: ${title}`);
      }

      // ── 5. Cohort ──────────────────────────────────────────────────────────
      const cohortId = uid();
      await (supa as any).from("cohorts").insert({
        id: cohortId, programme_id: progId, name: "[TEST] Cohort A - Jun 2026",
        status: "active", max_learners: 30,
        start_date: "2026-01-01", end_date: "2026-12-31",
      });
      track("cohorts", cohortId, "Test cohort");

      // ── 6. Peer learners (for cohort comparison widget) ─────────────────────
      for (let i = 0; i < 4; i++) {
        const peerId = uid();
        await (supa as any).from("enrolments").insert({
          id: peerId, learner_id: requestedBy || learnerId,
          cohort_id: cohortId, status: "active",
          enrolled_at: new Date().toISOString(),
          progress_percentage: [60, 75, 30, 85][i],
        });
        // We track these under enrolments so they get cleaned up
        track("enrolments", peerId, `Test peer enrolment ${i+1}`);
      }

      // ── 7. Main enrolment ──────────────────────────────────────────────────
      const enrolId = uid();
      await (supa as any).from("enrolments").insert({
        id: enrolId, learner_id: learnerId, cohort_id: cohortId,
        status: "active", enrolled_at: new Date().toISOString(),
        progress_percentage: 45,
      });
      track("enrolments", enrolId, "Test learner enrolment (45%)");

      // Learner registration record
      const regId = uid();
      await (supa as any).from("learner_registrations").insert({
        id: regId, full_name: "[TEST] Alex Johnson", email: learnerEmail,
        programme_id: progId, programme_name: "[TEST] Data Analytics Foundation",
        status: "enrolled", user_id: learnerId,
        registration_method: "admin-override",
        notes: "[TEST_DATA] Auto-seeded for dashboard testing",
      }).onConflict(["id"]).ignore();

      // ── 8. Modules + content blocks ─────────────────────────────────────────
      const mod1 = uid(); const mod2 = uid();
      for (const [id, title, seq] of [[mod1,"[TEST] Module 1: Foundations",1],[mod2,"[TEST] Module 2: Application",2]]) {
        await (supa as any).from("programme_modules").insert({
          id, programme_id: progId, title, module_type: "theory",
          sequence_order: seq, is_mandatory: true, duration_hours: 4,
        });
        track("programme_modules", id as string, `Test module: ${title}`);
      }

      // Content blocks for module 1
      for (let i = 0; i < 4; i++) {
        const blockId = uid();
        await (supa as any).from("content_blocks").insert({
          id: blockId, module_id: mod1,
          title: `[TEST] Lesson ${i+1}: ${["Introduction","Core Concepts","Practical Examples","Summary"][i]}`,
          block_type: ["text","video","text","text"][i],
          sequence_order: i+1, duration_minutes: [5,12,8,3][i],
          content: { body: `[TEST] Content for lesson ${i+1}. This is seeded test data.` },
        });
        track("content_blocks", blockId, `Test content block ${i+1}`);
      }

      // ── 9. Submissions ─────────────────────────────────────────────────────
      const sub1 = uid(); const sub2 = uid();

      // Graded submission with rubric
      await (supa as any).from("assessment_submissions").insert({
        id: sub1, assessment_id: asmSummative, learner_id: learnerId,
        enrolment_id: enrolId, status: "graded", score: 24,
        submitted_at: new Date(Date.now() - 2*86400000).toISOString(),
        feedback: "[TEST] Strong understanding of core concepts. Application section could use more real-world examples. Overall a solid submission.",
        assessor_id: requestedBy,
      });
      track("assessment_submissions", sub1, "Test graded submission (24/30)");

      // Rubric scores for sub1
      for (const [critId, score, fb] of [
        [crit1, 8, "[TEST] Good understanding demonstrated"],
        [crit2, 9, "[TEST] Excellent application of concepts"],
        [crit3, 7, "[TEST] Clear presentation, minor formatting issues"],
      ]) {
        await (supa as any).from("rubric_scores").insert({
          submission_id: sub1, rubric_id: rubricId,
          criterion_id: critId, score,
          feedback: fb, scored_by: requestedBy,
        });
      }

      // Pending submission
      await (supa as any).from("assessment_submissions").insert({
        id: sub2, assessment_id: asmFormative, learner_id: learnerId,
        enrolment_id: enrolId, status: "submitted", score: null,
        submitted_at: new Date(Date.now() - 1*86400000).toISOString(),
        feedback: null,
      });
      track("assessment_submissions", sub2, "Test pending submission");

      // ── 10. Credential ──────────────────────────────────────────────────────
      const credId = uid();
      await (supa as any).from("issued_credentials").insert({
        id: credId, learner_id: learnerId, programme_id: progId,
        title: "[TEST] Data Analytics Foundation Badge",
        credential_type: "badge", status: "active",
        issued_at: new Date().toISOString(),
        blockchain_hash: "0xTEST" + Math.random().toString(16).slice(2, 18),
      });
      track("issued_credentials", credId, "Test credential");

      // ── 11. Notifications ───────────────────────────────────────────────────
      for (const [title, body, cat] of [
        ["[TEST] Assignment Graded", "Your Mid-Programme Project has been graded. Score: 24/30.", "submission"],
        ["[TEST] New Announcement",  "Important update for your cohort. Please read.", "general"],
        ["[TEST] Deadline Reminder", "Week 1 Knowledge Check is due in 3 days.", "general"],
      ]) {
        const nId = uid();
        await (supa as any).from("notifications").insert({
          id: nId, user_id: learnerId, title, body,
          category: cat, is_read: false,
          action_url: "/learner/assessments",
        });
        track("notifications", nId, `Test notification: ${title}`);
      }

      // ── 12. Training sessions ───────────────────────────────────────────────
      for (const [title, daysAhead] of [["[TEST] Week 2 Live Session", 2], ["[TEST] Mentor Check-in", 5]]) {
        const sId = uid();
        const start = new Date(Date.now() + (daysAhead as number)*86400000);
        const end   = new Date(start.getTime() + 2*3600000);
        await (supa as any).from("training_sessions").insert({
          id: sId, title, programme_id: progId, cohort_id: cohortId,
          session_type: "live", status: "scheduled",
          scheduled_start: start.toISOString(), scheduled_end: end.toISOString(),
          facilitator_id: requestedBy,
          description: "[TEST] Seeded test session.",
        });
        track("training_sessions", sId, `Test session: ${title}`);
      }

      // ── 13. Announcements ───────────────────────────────────────────────────
      for (const [title, body, priority] of [
        ["[TEST] Welcome to the Programme", "Welcome to Data Analytics Foundation! Please review the course materials.", "normal"],
        ["[TEST] Important Deadline Update", "The Week 1 assessment deadline has been extended by 3 days.", "high"],
      ]) {
        const aId = uid();
        await (supa as any).from("announcements").insert({
          id: aId, title, body, priority,
          is_published: true, published_at: new Date().toISOString(),
          created_by: requestedBy,
        });
        track("announcements", aId, `Test announcement: ${title}`);
      }

      // ── 14. Discussion threads ──────────────────────────────────────────────
      for (const [modId, threadTitle, postBody] of [
        [mod1, "[TEST] Question about Lesson 2", "[TEST] Can someone clarify the difference between supervised and unsupervised learning?"],
        [mod1, "[TEST] Study group formation", "[TEST] Anyone interested in forming a study group for the project?"],
      ]) {
        const tId = uid();
        await (supa as any).from("discussion_threads").insert({
          id: tId, title: threadTitle, scope_type: "module", scope_id: modId,
          author_id: learnerId, reply_count: 1,
          last_activity_at: new Date().toISOString(),
        });
        track("discussion_threads", tId, `Test thread: ${threadTitle}`);

        const pId = uid();
        await (supa as any).from("discussion_posts").insert({
          id: pId, thread_id: tId, author_id: learnerId,
          body: postBody,
        });
        track("discussion_posts", pId, `Test post in: ${threadTitle}`);
      }

      // ── 15. Study log (streak data) ─────────────────────────────────────────
      for (let i = 0; i < 3; i++) {
        const logId = uid();
        const d = new Date(); d.setDate(d.getDate() - i);
        await (supa as any).from("learner_study_log").insert({
          id: logId, user_id: learnerId,
          study_date: d.toISOString().split("T")[0],
          minutes: 25, activity: "content",
        }).onConflict(["user_id","study_date","activity"]).ignore();
        track("learner_study_log", logId, `Test study log day -${i}`);
      }

      const streakId = uid();
      await (supa as any).from("learner_streaks").insert({
        id: streakId, user_id: learnerId, current_streak: 3,
        longest_streak: 3, last_study_date: new Date().toISOString().split("T")[0],
        weekly_goal_minutes: 120,
      }).onConflict(["user_id"]).ignore();
      track("learner_streaks", streakId, "Test streak record");

      // ── Register everything ─────────────────────────────────────────────────
      await (supa as any).from("test_data_registry").insert(
        reg.map(r => ({ ...r, session_id: session }))
      );

      return new Response(JSON.stringify({
        session_id: session,
        learner_email: learnerEmail,
        learner_password: "TestLearner@123",
        records_created: reg.length,
        summary: {
          programme:      "[TEST] Data Analytics Foundation",
          cohort:         "[TEST] Cohort A - Jun 2026",
          assessments:    3,
          submissions:    2,
          credentials:    1,
          notifications:  3,
          sessions:       2,
          announcements:  2,
          discussions:    2,
          study_streak:   "3 days",
        },
        message: `Test data seeded successfully. Log in as ${learnerEmail} with password TestLearner@123 to test the learner dashboard.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("manage-test-data error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
