/**
 * manage-test-data — Comprehensive Seed
 *
 * Creates a complete multi-role test environment:
 *   • 3 Learners  (varying progress levels)
 *   • 1 Facilitator
 *   • 1 Assessor
 *
 * Covers every major cross-role interaction:
 *   Facilitator records activity grades → visible in Learner My Grades
 *   Learner submits → appears in Assessor queue
 *   Assessor grades → Learner sees result in My Grades
 *   Assessor requests resubmission → Learner sees resubmit alert
 *   Assessor escalates to moderation → Moderator sees item
 *   Learner takes auto-graded quiz → system records score instantly
 *   Facilitator posts announcement → all cohort members notified
 *   Discussions cross all roles
 *   Sessions visible on all calendars
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TENANT_ID                 = "e0363493-7891-40cc-8f37-4233dc25b5ef";
const PASSWORD                  = "Test@Intela2026!";

function uid(): string { return crypto.randomUUID(); }

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ok  = (data: unknown) => new Response(JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const err = (msg: string)   => new Response(JSON.stringify({ error: msg }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { action, sessionId, requestedBy } = await req.json();

    // ════════════════════════════════════════════════════════════════════════
    // STATUS
    // ════════════════════════════════════════════════════════════════════════
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
      return ok({ sessions });
    }

    // ════════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ════════════════════════════════════════════════════════════════════════
    if (action === "cleanup") {
      let query = (supa as any).from("test_data_registry").select("*");
      if (sessionId) query = query.eq("session_id", sessionId);
      const { data: registry } = await query.order("created_at", { ascending: false });

      if (!registry?.length) return ok({ message: "Nothing to clean up." });

      const deleteOrder = [
        "quiz_responses",   "rubric_scores",          "discussion_posts",
        "discussion_threads","moderation_items",       "assessment_submissions",
        "quiz_options",     "quiz_questions",          "learner_study_log",
        "learner_streaks",  "learner_badges",          "issued_credentials",
        "activity_grades",  "learner_registrations",   "portfolio_evidence",      "enrolments",
        "cohort_staff_assignments", "training_sessions","announcements",
        "notifications",    "content_blocks",          "programme_modules",
        "cohorts",          "assessments",             "rubric_criteria",
        "rubrics",          "badges",                  "programmes",
        "user_roles",       "tenant_users",            "profiles",
        "test_data_registry",
      ];

      let deleted = 0;
      for (const table of deleteOrder) {
        const ids = (registry as any[]).filter(r => r.table_name === table).map((r: any) => r.record_id);
        if (!ids.length) continue;
        const { error } = await (supa as any).from(table).delete().in("id", ids);
        if (!error) deleted += ids.length;
      }

      // Delete auth users
      const userIds = (registry as any[]).filter(r => r.table_name === "auth.users").map((r: any) => r.record_id);
      for (const id of userIds) { await supa.auth.admin.deleteUser(id).catch(() => {}); }

      let cleanQ = (supa as any).from("test_data_registry").delete();
      if (sessionId) cleanQ = cleanQ.eq("session_id", sessionId);
      else cleanQ = cleanQ.neq("session_id", "");
      await cleanQ;

      return ok({ deleted, message: `Cleaned up ${deleted + userIds.length} test records.` });
    }

    // ════════════════════════════════════════════════════════════════════════
    // SEED
    // ════════════════════════════════════════════════════════════════════════
    if (action === "seed") {
      const session = `TEST_${Date.now()}`;
      const reg: { table_name: string; record_id: string; label: string }[] = [];
      let step = "init";

      const track = (table: string, id: string, label: string) =>
        reg.push({ table_name: table, record_id: id, label });

      const ins = async (table: string, data: any, label?: string) => {
        step = `insert:${table}`;
        const { error } = await (supa as any).from(table).insert(data);
        if (error) throw new Error(`[${step}] ${label ?? ""}: ${error.message}`);
      };

      const ups = async (table: string, data: any, onConflict: string) => {
        step = `upsert:${table}`;
        const { error } = await (supa as any).from(table).upsert(data, { onConflict });
        if (error) throw new Error(`[${step}]: ${error.message}`);
      };

      // Helper: create an auth user + profile + role + tenant membership
      const createUser = async (
        slug: string, fullName: string, role: string, jobTitle: string
      ) => {
        const email = `test.${slug}.${Date.now()}@intela-test.co.za`;
        const { data: au, error: ae } = await supa.auth.admin.createUser({
          email, password: PASSWORD, email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (ae) throw new Error(`Auth user ${slug}: ${ae.message}`);
        const userId = au.user!.id;
        track("auth.users", userId, `${fullName} auth account`);

        await ins("user_roles",  { user_id: userId, role }, `${fullName} role`);

        const profId = uid();
        await ins("profiles", {
          id: profId, user_id: userId, full_name: fullName,
          job_title: jobTitle, tenant_id: TENANT_ID,
        }, `${fullName} profile`);
        track("profiles", profId, `${fullName} profile`);

        await ups("tenant_users",
          { tenant_id: TENANT_ID, user_id: userId, role: "member", is_active: true },
          "tenant_id,user_id"
        );

        return { userId, email, profId };
      };

      // ── §1  USERS ──────────────────────────────────────────────────────────
      step = "users";

      // Core L&D roles
      const alex   = await createUser("alex",    "[TEST] Alex Johnson",      "learner",             "Learner — In Progress");
      const priya  = await createUser("priya",   "[TEST] Priya Naidoo",      "learner",             "Learner — High Achiever");
      const sipho  = await createUser("sipho",   "[TEST] Sipho Dlamini",     "learner",             "Learner — Needs Support");
      const fatima = await createUser("fatima",  "[TEST] Dr. Fatima Osei",   "facilitator",         "Senior Facilitator");
      const marcus = await createUser("marcus",  "[TEST] Marcus Webb",       "assessor",            "Lead Assessor");
      // Management roles (sync with Facilitator + Assessor)
      const nomsa  = await createUser("nomsa",   "[TEST] Nomsa Khumalo",     "programme_manager",   "Senior Programme Manager");
      const david  = await createUser("david",   "[TEST] David Okonkwo",     "operations",          "Operations Manager");

      // 4th learner — pending registration (Operations must approve & enrol)
      const thabo  = await createUser("thabo",   "[TEST] Thabo Molefe",      "learner",             "Learner — Pending Enrolment");

      // ── §2  PROGRAMME + MODULES ────────────────────────────────────────────
      step = "programme";
      const progId = uid();
      await ins("programmes", {
        id: progId, title: "[TEST] Project Leadership Fundamentals",
        description: "Comprehensive seed programme. Safe to delete.",
        status: "active", nqf_level: 5, credits: 120,
        duration_months: 6,
        manager_id: nomsa.userId,      // PM owns the programme
        created_by: nomsa.userId,      // PM created it
        tenant_id: TENANT_ID,
      }, "Programme");
      track("programmes", progId, "[TEST] Programme: Project Leadership Fundamentals");

      const mod1 = uid(); const mod2 = uid();
      await ins("programme_modules", {
        id: mod1, programme_id: progId,
        title: "[TEST] Module 1: Foundations of Project Leadership",
        module_type: "theory", sequence_order: 1, is_mandatory: true, duration_hours: 8,
      });
      track("programme_modules", mod1, "Module 1: Foundations");

      await ins("programme_modules", {
        id: mod2, programme_id: progId,
        title: "[TEST] Module 2: Stakeholder & Risk Management",
        module_type: "theory", sequence_order: 2, is_mandatory: true, duration_hours: 8,
      });
      track("programme_modules", mod2, "Module 2: Stakeholder & Risk");

      // Content blocks
      for (let i = 0; i < 4; i++) {
        const cbId = uid();
        await ins("content_blocks", {
          id: cbId, module_id: mod1,
          title: `[TEST] Lesson ${i+1}: ${["Introduction to PM","RACI Framework","Stakeholder Analysis","Project Charter"][i]}`,
          block_type: ["text","video","text","document"][i],
          sequence_order: i + 1, duration_minutes: [5, 10, 8, 6][i],
          content: { body: `[TEST] Content for lesson ${i+1}.` },
        });
        track("content_blocks", cbId, `Content block ${i+1}`);
      }

      // ── §3  ASSESSMENTS ────────────────────────────────────────────────────
      step = "assessments";

      // 3a: Auto-graded online quiz
      const asmQuiz = uid();
      await ins("assessments", {
        id: asmQuiz, programme_id: progId, module_id: mod1,
        title: "[TEST] Week 1 Knowledge Check (Auto-Graded Quiz)",
        description: "MCQ quiz automatically scored by the system. Tests PM fundamentals.",
        assessment_category: "formative", assessment_type: "formative",
        max_score: 10, pass_mark: 6, weighting: 10,
        due_date: daysFromNow(5).slice(0,10),
        status: "draft", created_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("assessments", asmQuiz, "Assessment: Quiz (auto-grade)");

      // 3b: Manual formative submission
      const asmFormative = uid();
      await ins("assessments", {
        id: asmFormative, programme_id: progId, module_id: mod1,
        title: "[TEST] RACI Matrix Assignment",
        description: "Learners produce a RACI matrix for a given project scenario.",
        assessment_category: "formative", assessment_type: "formative",
        max_score: 20, pass_mark: 12, weighting: 20,
        due_date: daysFromNow(10).slice(0,10),
        status: "draft", created_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("assessments", asmFormative, "Assessment: Formative (manual)");

      // 3c: Summative (requires moderation)
      const asmSummative = uid();
      await ins("assessments", {
        id: asmSummative, programme_id: progId, module_id: mod2,
        title: "[TEST] Stakeholder Engagement Plan",
        description: "Summative: full stakeholder analysis and communication plan.",
        assessment_category: "summative", assessment_type: "summative",
        max_score: 50, pass_mark: 30, weighting: 50,
        due_date: daysFromNow(21).slice(0,10),
        status: "draft", requires_moderation: true,
        created_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("assessments", asmSummative, "Assessment: Summative (moderated)");

      // 3d: Journal
      const asmJournal = uid();
      await ins("assessments", {
        id: asmJournal, programme_id: progId, module_id: mod2,
        title: "[TEST] Reflective Practice Journal",
        description: "Weekly reflection journal on leadership learnings.",
        assessment_category: "formative", assessment_type: "portfolio",
        max_score: 10, pass_mark: 6, weighting: 10,
        due_date: daysFromNow(7).slice(0,10),
        status: "draft", created_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("assessments", asmJournal, "Assessment: Journal");

      // ── §4  QUIZ QUESTIONS + OPTIONS ────────────────────────────────────────
      step = "quiz_questions";

      type QDef = { id: string; text: string; type: string; pts: number; opts?: { text: string; correct: boolean }[]; meta?: Record<string,unknown> };

      const questions: QDef[] = [
        {
          id: uid(), text: "What does RACI stand for in project management?",
          type: "multiple_choice", pts: 2,
          opts: [
            { text: "Responsible, Accountable, Consulted, Informed", correct: true },
            { text: "Report, Assign, Coordinate, Initiate", correct: false },
            { text: "Review, Approve, Control, Issue", correct: false },
            { text: "Risk, Action, Change, Impact", correct: false },
          ],
        },
        {
          id: uid(), text: "A stakeholder is anyone who can affect or be affected by the project.",
          type: "true_false", pts: 1,
          opts: [
            { text: "True", correct: true },
            { text: "False", correct: false },
          ],
        },
        {
          id: uid(), text: "Which of the following is a risk RESPONSE strategy (not identification)?",
          type: "multiple_choice", pts: 2,
          opts: [
            { text: "Risk register", correct: false },
            { text: "Risk assessment", correct: false },
            { text: "Risk transfer", correct: true },
            { text: "Risk analysis", correct: false },
          ],
        },
        {
          id: uid(), text: "What is the PRIMARY purpose of a project charter?",
          type: "multiple_choice", pts: 2,
          opts: [
            { text: "To track daily tasks and progress",    correct: false },
            { text: "To formally authorise the project and the project manager", correct: true },
            { text: "To document lessons learned at project close", correct: false },
            { text: "To allocate the project budget",       correct: false },
          ],
        },
        {
          id: uid(), text: "How many phases does the standard PMBOK project lifecycle contain?",
          type: "multiple_choice", pts: 2,
          opts: [
            { text: "3", correct: false },
            { text: "4", correct: false },
            { text: "5", correct: true },
            { text: "6", correct: false },
          ],
        },
        {
          id: uid(), text: "In your own words, explain why stakeholder communication planning is critical during project initiation. (2–3 sentences)",
          type: "short_answer", pts: 1,
          // No options — requires manual marking
        },
      ];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await ins("quiz_questions", {
          id: q.id, assessment_id: asmQuiz, question_text: q.text,
          question_type: q.type, points: q.pts, sequence_order: i + 1,
          metadata: q.meta ?? {},
        });
        track("quiz_questions", q.id, `Quiz Q${i+1}: ${q.text.slice(0, 40)}`);

        if (q.opts) {
          for (let j = 0; j < q.opts.length; j++) {
            const optId = uid();
            await ins("quiz_options", {
              id: optId, question_id: q.id,
              option_text: q.opts[j].text,
              is_correct: q.opts[j].correct,
              sequence_order: j + 1,
            });
            track("quiz_options", optId, `Option for Q${i+1}: ${q.opts[j].text.slice(0,30)}`);
          }
        }
      }

      // ── §5  COHORT + STAFF ASSIGNMENTS + ENROLMENTS ─────────────────────────
      step = "cohort";
      const cohortId = uid();
      await ins("cohorts", {
        id: cohortId, programme_id: progId,
        name: "[TEST] PLF_Group_Jun2026",
        status: "active", max_learners: 30,
        start_date: "2026-01-15", end_date: "2026-07-15",
        facilitator_id: fatima.userId, tenant_id: TENANT_ID,
      });
      track("cohorts", cohortId, "Cohort: PLF_Group_Jun2026");

      // Assign facilitator + assessor to cohort
      const csaFatima = uid();
      await ins("cohort_staff_assignments", {
        id: csaFatima, cohort_id: cohortId,
        user_id: fatima.userId, role: "facilitator",
        assigned_by: requestedBy,
      });
      track("cohort_staff_assignments", csaFatima, "Fatima → facilitator of cohort");

      const csaMarcus = uid();
      await ins("cohort_staff_assignments", {
        id: csaMarcus, cohort_id: cohortId,
        user_id: marcus.userId, role: "assessor",
        assigned_by: requestedBy,
      });
      track("cohort_staff_assignments", csaMarcus, "Marcus → assessor of cohort");

      // Enrolments  (Alex 45%, Priya 70%, Sipho 15% at-risk)
      const enrolAlex  = uid();
      const enrolPriya = uid();
      const enrolSipho = uid();

      await ins("enrolments", {
        id: enrolAlex, learner_id: alex.userId, cohort_id: cohortId,
        status: "active", enrolled_at: daysAgo(30), progress_percentage: 45,
        approved_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("enrolments", enrolAlex, "Alex enrolment (45%)");

      await ins("enrolments", {
        id: enrolPriya, learner_id: priya.userId, cohort_id: cohortId,
        status: "active", enrolled_at: daysAgo(30), progress_percentage: 70,
        approved_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("enrolments", enrolPriya, "Priya enrolment (70%)");

      await ins("enrolments", {
        id: enrolSipho, learner_id: sipho.userId, cohort_id: cohortId,
        status: "active", enrolled_at: daysAgo(30), progress_percentage: 15,
        approved_by: requestedBy, tenant_id: TENANT_ID,
      });
      track("enrolments", enrolSipho, "Sipho enrolment (15% — at risk)");

      // ── §6  ASSESSMENT SUBMISSIONS (all status variants) ─────────────────────
      step = "submissions";

      // Alex → RACI assignment (status: submitted) — assessor needs to grade
      const subAlexFormative = uid();
      await ins("assessment_submissions", {
        id: subAlexFormative, assessment_id: asmFormative,
        learner_id: alex.userId, enrolment_id: enrolAlex,
        status: "submitted", submitted_at: daysAgo(1),
        feedback: "I created the RACI matrix based on the hospital IT project scenario. I assigned the PM as Responsible for all deliverables and the sponsors as Accountable.",
      });
      track("assessment_submissions", subAlexFormative, "Alex → RACI assignment (submitted, pending grading)");

      // Priya → Summative (status: graded by Marcus, sent to moderation)
      const subPriyaSummative = uid();
      await ins("assessment_submissions", {
        id: subPriyaSummative, assessment_id: asmSummative,
        learner_id: priya.userId, enrolment_id: enrolPriya,
        status: "under_review", score: 44, submitted_at: daysAgo(5),
        feedback: "Comprehensive stakeholder map with clear communication strategies. Excellent use of the power-interest grid. Recommended for full pass.",
        assessor_id: marcus.userId, assessed_at: daysAgo(2),
        moderation_status: "pending",
      });
      track("assessment_submissions", subPriyaSummative, "Priya → Summative (graded → in moderation)");

      // Sipho → RACI assignment (status: resubmit — assessor rejected)
      const subSiphoFormative = uid();
      await ins("assessment_submissions", {
        id: subSiphoFormative, assessment_id: asmFormative,
        learner_id: sipho.userId, enrolment_id: enrolSipho,
        status: "resubmit", score: 8, submitted_at: daysAgo(4),
        feedback: "The RACI matrix is incomplete — Consulted and Informed roles are missing for 3 key stakeholders. Please revise and resubmit. Review the lecture slides on Chapter 3.",
        assessor_id: marcus.userId, assessed_at: daysAgo(2),
      });
      track("assessment_submissions", subSiphoFormative, "Sipho → RACI assignment (resubmit required)");

      // Priya → Journal (status: graded, all good)
      const subPriyaJournal = uid();
      await ins("assessment_submissions", {
        id: subPriyaJournal, assessment_id: asmJournal,
        learner_id: priya.userId, enrolment_id: enrolPriya,
        status: "competent", score: 9, submitted_at: daysAgo(7),
        feedback: "Excellent reflections — you've clearly internalised the leadership framework. Your connection to real-world project experience is impressive.",
        assessor_id: marcus.userId, assessed_at: daysAgo(5),
        moderation_status: "not_required",
      });
      track("assessment_submissions", subPriyaJournal, "Priya → Journal (graded 9/10)");

      // Alex → Auto-graded quiz (status: graded by system)
      // Simulates what EnhancedQuizTaker does: submit → auto-grade → insert quiz_responses
      const subAlexQuiz = uid();
      await ins("assessment_submissions", {
        id: subAlexQuiz, assessment_id: asmQuiz,
        learner_id: alex.userId, enrolment_id: enrolAlex,
        status: "submitted",   // will be updated after responses below
        submitted_at: daysAgo(3),
      });
      track("assessment_submissions", subAlexQuiz, "Alex → Quiz (auto-graded by system)");

      // §6b  Quiz responses for Alex's quiz attempt
      step = "quiz_responses";

      // Map: question index → (Alex's selected option index, correct option index)
      // Q0: RACI → Alex picks correct (0)
      // Q1: True/False → Alex picks correct (True)
      // Q2: Risk response → Alex picks WRONG (picks 0 = "risk register")
      // Q3: Project charter → Alex picks correct (1)
      // Q4: PMBOK phases → Alex picks WRONG (picks 1 = "4")
      // Q5: Short answer (manual) → text answer

      let earnedPoints = 0;
      let totalPoints  = 0;

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        totalPoints += q.pts;

        if (q.type === "short_answer") {
          const rId = uid();
          await ins("quiz_responses", {
            id: rId, submission_id: subAlexQuiz, question_id: q.id,
            text_answer: "Stakeholder communication planning ensures that key stakeholders receive timely, relevant information throughout the project. Without it, misunderstandings and missed expectations can derail projects. A communication plan aligns expectations from the outset.",
            is_correct: false, // manual review required
            points_earned: 0,
          });
          track("quiz_responses", rId, `Alex quiz response Q${qi+1} (short answer)`);
          continue;
        }

        // Get the correct option id from the DB
        const { data: opts } = await (supa as any)
          .from("quiz_options")
          .select("id, is_correct, sequence_order")
          .eq("question_id", q.id)
          .order("sequence_order");

        const correctOpt = (opts ?? []).find((o: any) => o.is_correct);

        // Alex gets Q0, Q1, Q3 correct; Q2, Q4 wrong
        const alexGetsCorrect = [0, 1, 3].includes(qi);
        const chosenOpt = alexGetsCorrect ? correctOpt : (opts ?? []).find((o: any) => !o.is_correct);
        const isCorrect  = alexGetsCorrect;
        const ptsEarned  = isCorrect ? q.pts : 0;
        earnedPoints += ptsEarned;

        const rId = uid();
        await ins("quiz_responses", {
          id: rId, submission_id: subAlexQuiz, question_id: q.id,
          selected_option_id: chosenOpt?.id ?? null,
          is_correct: isCorrect, points_earned: ptsEarned,
        });
        track("quiz_responses", rId, `Alex quiz response Q${qi+1} (${isCorrect ? "✓ correct" : "✗ wrong"})`);
      }

      // Update quiz submission with auto-graded score
      const quizScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      await (supa as any).from("assessment_submissions").update({
        score: quizScore,
        status: "submitted",  // still submitted because Q6 is a short answer
        feedback: `Auto-graded: ${earnedPoints}/${totalPoints} points (${quizScore}%). 1 short-answer question pending manual review.`,
        assessed_at: daysAgo(3),
      }).eq("id", subAlexQuiz);

      // ── §7  ACTIVITY GRADES (Facilitator-recorded) ─────────────────────────
      step = "activity_grades";
      // allowed activity_type: participation, practical, project, presentation, attendance, peer_review, workshop, reflection, other
      // allowed status: draft, recorded, published, withdrawn
      // allowed moderation_status: not_required, pending, approved, rejected, flagged

      const activityGrades = [
        // Alex
        { learner: alex.userId,  enrol: enrolAlex,  type: "participation",  title: "[TEST] Week 1 Group Discussion",     date: daysAgo(14).slice(0,10), score: 16, max: 20, fb: "Active participation. Good questions raised about stakeholder identification.", status: "published", mod: "not_required" },
        { learner: alex.userId,  enrol: enrolAlex,  type: "workshop",       title: "[TEST] Project Simulation Workshop", date: daysAgo(7).slice(0,10),  score: 14, max: 20, fb: "Good effort in the simulation exercise. Risk identification needs improvement.", status: "published", mod: "not_required" },
        { learner: alex.userId,  enrol: enrolAlex,  type: "attendance",     title: "[TEST] Week 2 Live Session",         date: daysAgo(3).slice(0,10),  score: 10, max: 10, fb: "Attended full session. Engaged throughout.", status: "published", mod: "not_required" },
        // Priya
        { learner: priya.userId, enrol: enrolPriya, type: "participation",  title: "[TEST] Week 1 Group Discussion",     date: daysAgo(14).slice(0,10), score: 20, max: 20, fb: "Excellent leadership during group discussion. Set clear agenda items and kept the team on track.", status: "published", mod: "not_required" },
        { learner: priya.userId, enrol: enrolPriya, type: "presentation",   title: "[TEST] Stakeholder Analysis Presentation", date: daysAgo(7).slice(0,10), score: 19, max: 20, fb: "Outstanding presentation — clear structure, confident delivery, insightful Q&A responses.", status: "published", mod: "approved" },
        { learner: priya.userId, enrol: enrolPriya, type: "workshop",       title: "[TEST] Project Simulation Workshop", date: daysAgo(7).slice(0,10),  score: 18, max: 20, fb: "Led her team effectively through the simulation. Excellent risk register.",  status: "published", mod: "not_required" },
        // Sipho
        { learner: sipho.userId, enrol: enrolSipho, type: "participation",  title: "[TEST] Week 1 Group Discussion",     date: daysAgo(14).slice(0,10), score: 10, max: 20, fb: "Limited participation. Encourage Sipho to contribute more actively in Week 2.", status: "published", mod: "not_required" },
        { learner: sipho.userId, enrol: enrolSipho, type: "attendance",     title: "[TEST] Week 2 Live Session",         date: daysAgo(3).slice(0,10),  score: 5,  max: 10, fb: "Attended but appeared disengaged. Recommend a 1:1 check-in.", status: "published", mod: "not_required" },
      ];

      for (const ag of activityGrades) {
        const agId = uid();
        await ins("activity_grades", {
          id: agId, learner_id: ag.learner, enrolment_id: ag.enrol,
          programme_id: progId, cohort_id: cohortId,
          activity_type: ag.type, activity_title: ag.title,
          activity_date: ag.date, score: ag.score, max_score: ag.max,
          weighting: 10, feedback: ag.fb,
          recorded_by: fatima.userId,
          status: ag.status, moderation_status: ag.mod,
        });
        track("activity_grades", agId, `Activity grade: ${ag.title.slice(0,40)} → ${ag.learner === alex.userId ? "Alex" : ag.learner === priya.userId ? "Priya" : "Sipho"}`);
      }

      // ── §8  MODERATION PIPELINE ─────────────────────────────────────────────
      step = "moderation";
      // Priya's summative is in 'moderation' status → create moderation_item
      const modItemId = uid();
      await ins("moderation_items", {
        id: modItemId,
        submission_id: subPriyaSummative,
        programme_id: progId,
        item_type: "submission",
        content: "Stakeholder Engagement Plan — scored 44/50 by assessor Marcus Webb. Flagged for quality assurance review per standard moderation policy for summative assessments ≥ 80%.",
        reason: "High-scoring summative submission (88%) — standard QA moderation required",
        priority: "normal",
        status: "pending_review",
        submitted_by: marcus.userId,
        flagged_at: daysAgo(2),
      });
      track("moderation_items", modItemId, "Moderation item: Priya's summative (pending QA review)");

      // ── §8b  LEARNER REGISTRATION (Operations pipeline) ────────────────────
      // Thabo has applied — Operations (David) must approve and enrol him.
      // This tests: Ops approves → learner enrolled → Facilitator sees in cohort.
      step = "learner_registrations";
      const thaboRegId = uid();
      await ins("learner_registrations", {
        id: thaboRegId,
        full_name: "[TEST] Thabo Molefe",
        email: thabo.email,
        programme_id: progId,
        programme_name: "[TEST] Project Leadership Fundamentals",
        status: "pending",
        registration_method: "self-registration",
        registered_by: thabo.userId,
        user_id: thabo.userId,
        tenant_id: TENANT_ID,
        gender: "Male",
        country: "South Africa",
        education_level: "diploma",
        notes: "[TEST] Self-registered online. Documents uploaded. Awaiting Operations review and approval.",
        sla_started_at: daysAgo(2),
        sla_deadline_at: daysFromNow(3),
      });
      track("learner_registrations", thaboRegId, "Thabo Molefe — pending registration (awaiting Ops approval)");

      // ── §9  TRAINING SESSIONS ───────────────────────────────────────────────
      step = "training_sessions";
      const sessions = [
        {
          title: "[TEST] Live Session: Introduction to Risk Management",
          type: "live", status: "scheduled",
          start: daysFromNow(3), end: new Date(Date.now() + 3*86400000 + 2*3600000).toISOString(),
          desc: "Interactive live session covering the risk management framework. Come prepared with your draft risk register.",
        },
        {
          title: "[TEST] Workshop: Stakeholder Mapping Exercise",
          type: "workshop", status: "scheduled",
          start: daysFromNow(8), end: new Date(Date.now() + 8*86400000 + 3*3600000).toISOString(),
          desc: "Hands-on workshop where you will build a stakeholder map for a real project scenario.",
        },
        {
          title: "[TEST] Webinar: Agile for Project Leaders",
          type: "webinar", status: "scheduled",
          start: daysFromNow(14), end: new Date(Date.now() + 14*86400000 + 1.5*3600000).toISOString(),
          desc: "Guest speaker from industry shares how agile principles apply to traditional project environments.",
        },
        {
          title: "[TEST] Week 2 Live Session (Completed)",
          type: "live", status: "completed",
          start: daysAgo(3), end: new Date(Date.now() - 3*86400000 + 2*3600000).toISOString(),
          desc: "Completed session — recording available.",
        },
      ];

      for (const s of sessions) {
        const sId = uid();
        await ins("training_sessions", {
          id: sId, cohort_id: cohortId, title: s.title, description: s.desc,
          session_type: s.type, status: s.status,
          scheduled_start: s.start, scheduled_end: s.end,
          facilitator_id: fatima.userId, created_by: fatima.userId,
          tenant_id: TENANT_ID,
        });
        track("training_sessions", sId, `Session: ${s.title.slice(0,40)}`);
      }

      // ── §10  ANNOUNCEMENTS ─────────────────────────────────────────────────
      step = "announcements";
      const announcements = [
        {
          title: "[TEST] 📌 Welcome to Project Leadership Fundamentals",
          body: "Welcome everyone to PLF_Group_Jun2026! Please review the programme outline and ensure you have completed the pre-reading before our first live session. Reach out on the discussion forum if you have any questions. — Dr. Fatima",
          priority: "normal",
        },
        {
          title: "[TEST] ⚠️ Assessment Deadline Extended — RACI Matrix",
          body: "Due to the public holiday next week, the RACI Matrix assignment deadline has been extended by 3 days. New due date is reflected in your assessments dashboard. Use the extra time wisely!",
          priority: "high",
        },
        {
          title: "[TEST] 🎉 Cohort Achievement — Excellent Participation Rate",
          body: "Our cohort has achieved a 94% live session attendance rate this month — one of the highest in the platform! Well done to everyone. Keep up the excellent engagement.",
          priority: "low",
        },
      ];

      for (const a of announcements) {
        const aId = uid();
        await ins("announcements", {
          id: aId, ...a, is_published: true,
          published_at: daysAgo(Math.floor(Math.random()*5)+1),
          scope_type: "cohort", scope_id: cohortId,
          author_id: fatima.userId, tenant_id: TENANT_ID,
        });
        track("announcements", aId, `Announcement: ${a.title.slice(0,40)}`);
      }

      // ── §11  DISCUSSION THREADS + POSTS ─────────────────────────────────────
      step = "discussions";

      // Thread 1: Facilitator pinned welcome
      const thread1 = uid();
      await ins("discussion_threads", {
        id: thread1, scope_type: "cohort", scope_id: cohortId,
        title: "[TEST] 📌 Introduce Yourself — PLF_Group_Jun2026",
        body: "Welcome to our cohort discussion board! Please share a short introduction: your background, your organisation, and what you hope to achieve from this programme. I'll start — I'm Dr. Fatima, your facilitator. I've been in L&D for 12 years and look forward to supporting your learning journey!",
        author_id: fatima.userId, is_pinned: true, reply_count: 3,
        last_activity_at: daysAgo(1),
      });
      track("discussion_threads", thread1, "Discussion: Welcome (pinned by facilitator)");

      const posts1 = [
        { author: alex.userId,  body: "Hi everyone! I'm Alex, a team lead at a fintech company. I'm here to formalise my project management approach and get the NQF 5 qualification. Looking forward to learning with you all!" },
        { author: priya.userId, body: "Hi! I'm Priya, a PMO analyst at a healthcare group. I have 4 years of PM experience and I'm here to sharpen my leadership skills. The risk management module looks particularly relevant to my work." },
        { author: sipho.userId, body: "Hi, I'm Sipho, a junior project coordinator. This is my first formal training programme and I'm a bit nervous but excited. Looking forward to the support from the group!" },
      ];
      for (const p of posts1) {
        const pId = uid();
        await ins("discussion_posts", { id: pId, thread_id: thread1, author_id: p.author, body: p.body });
        track("discussion_posts", pId, `Post in intro thread by ${p.author === alex.userId ? "Alex" : p.author === priya.userId ? "Priya" : "Sipho"}`);
      }

      // Thread 2: Alex asks a question — Marcus provides solution
      const thread2 = uid();
      await ins("discussion_threads", {
        id: thread2, scope_type: "cohort", scope_id: cohortId,
        title: "[TEST] Question: Difference between risk MITIGATION and TRANSFER?",
        body: "I'm preparing my RACI assignment and I want to make sure I understand the risk response strategies correctly. Can someone explain the key difference between risk mitigation and risk transfer? When would you choose one over the other?",
        author_id: alex.userId, is_pinned: false, reply_count: 2,
        last_activity_at: daysAgo(2),
      });
      track("discussion_threads", thread2, "Discussion: Alex's question on risk strategies");

      const postMarcus = uid();
      await ins("discussion_posts", {
        id: postMarcus, thread_id: thread2, author_id: marcus.userId,
        body: "Great question, Alex! Risk MITIGATION means you take action to reduce the probability or impact of the risk (e.g., adding automated testing to reduce the risk of software bugs). Risk TRANSFER shifts the financial impact of a risk to a third party (e.g., buying insurance or outsourcing a high-risk component). You'd choose mitigation when you have control over the risk cause, and transfer when you don't.",
        is_solution: true,
      });
      track("discussion_posts", postMarcus, "Marcus answers Alex's question (marked as solution)");

      const postPriya = uid();
      await ins("discussion_posts", {
        id: postPriya, thread_id: thread2, author_id: priya.userId,
        body: "Adding to Marcus's answer — in practice I've found that transfer is common in construction projects (contractor liability insurance), while mitigation is more common in IT projects. The PMBOK has a great comparison table in Chapter 11 if you want a deeper reference.",
        is_solution: false,
      });
      track("discussion_posts", postPriya, "Priya adds to risk discussion");

      // Thread 3: Sipho asks for help
      const thread3 = uid();
      await ins("discussion_threads", {
        id: thread3, scope_type: "cohort", scope_id: cohortId,
        title: "[TEST] Struggling with the RACI resubmission — any tips?",
        body: "I got feedback that my RACI matrix is missing the Consulted and Informed columns for some stakeholders. I've reviewed the slides but I'm still confused about who should be Consulted vs Informed. Can anyone help?",
        author_id: sipho.userId, is_pinned: false, reply_count: 2,
        last_activity_at: daysAgo(1),
      });
      track("discussion_threads", thread3, "Discussion: Sipho needs help with RACI");

      const postFatimaTips = uid();
      await ins("discussion_posts", {
        id: postFatimaTips, thread_id: thread3, author_id: fatima.userId,
        body: "Hi Sipho — the key distinction is two-way vs one-way communication. CONSULTED means the stakeholder has expertise you need to draw on before making a decision (two-way dialogue). INFORMED means you just keep them updated on decisions already made (one-way). Rule of thumb: legal, compliance, and specialists are usually Consulted; senior executives and external stakeholders are usually Informed. Book a 1:1 session with me if you need more help!",
        is_solution: true,
      });
      track("discussion_posts", postFatimaTips, "Fatima guides Sipho on RACI (solution)");

      // ── §12  NOTIFICATIONS (per role) ──────────────────────────────────────
      step = "notifications";

      const notifs = [
        // Alex
        { user: alex.userId,   title: "[TEST] Quiz Results: Week 1 Knowledge Check",     body: `Your quiz has been auto-graded. You scored ${quizScore}% (${earnedPoints}/${totalPoints} pts). 1 short-answer question is pending manual review.`, cat: "grade",        url: "/learner/grades" },
        { user: alex.userId,   title: "[TEST] Deadline: RACI Matrix due in 10 days",      body: "Your RACI Matrix assignment is due in 10 days. You have not yet submitted.", cat: "deadline",      url: "/learner/assessments" },
        { user: alex.userId,   title: "[TEST] Feedback: Week 1 Group Discussion",         body: "Fatima has recorded an activity grade for you: Week 1 Group Discussion — 16/20.", cat: "grade",      url: "/learner/grades" },
        { user: alex.userId,   title: "[TEST] New Discussion Reply — Risk Strategies",    body: "Marcus Webb has replied to your discussion and marked it as a solution.",  cat: "discussion",    url: "/discussions" },
        // Priya
        { user: priya.userId,  title: "[TEST] Graded: Stakeholder Engagement Plan",       body: "Your Stakeholder Engagement Plan has been graded: 44/50. Sent to moderation for QA review.", cat: "grade",   url: "/learner/grades" },
        { user: priya.userId,  title: "[TEST] Graded: Reflective Journal",                body: "Your Reflective Journal has been graded: 9/10. Excellent work! Feedback available.",  cat: "grade",  url: "/learner/grades" },
        { user: priya.userId,  title: "[TEST] Badge Earned: High Achiever 🏆",            body: "You earned the High Achiever badge for scoring 90%+ on a summative assessment!", cat: "achievement", url: "/achievements" },
        // Sipho
        { user: sipho.userId,  title: "[TEST] ⚠️ Revision Required: RACI Matrix",        body: "Your RACI Matrix submission has been returned for revision. Please review the assessor feedback and resubmit.", cat: "grade", url: "/learner/assessments" },
        { user: sipho.userId,  title: "[TEST] Reminder: You have 2 pending assessments",  body: "You have 2 assessments you haven't submitted yet. Don't fall behind — reach out to your facilitator if you need support.", cat: "deadline", url: "/learner/assessments" },
        // Fatima
        { user: fatima.userId, title: "[TEST] New Submission: Alex Johnson — RACI Matrix",body: "Alex Johnson has submitted the RACI Matrix assignment. Ready for grading.", cat: "submission",    url: "/gradebook" },
        { user: fatima.userId, title: "[TEST] ⚠️ At-Risk Alert: Sipho Dlamini (15%)",     body: "Sipho Dlamini is at 15% progress and has a resubmission pending. Consider a 1:1 check-in.", cat: "alert",  url: "/facilitator/learner-progress" },
        { user: fatima.userId, title: "[TEST] Activity Grades Saved Successfully",        body: "Your 8 activity grade records have been saved and are now visible to learners.", cat: "system",    url: "/gradebook" },
        // Marcus
        { user: marcus.userId, title: "[TEST] New Submission: Alex Johnson — RACI Matrix",body: "Alex Johnson has submitted the RACI Matrix assignment for grading. Due date: in 10 days.", cat: "submission", url: "/assessor/queue" },
        { user: marcus.userId, title: "[TEST] Moderation: Priya Naidoo — Summative",      body: "Priya Naidoo's Stakeholder Engagement Plan (44/50) has been escalated for QA moderation.", cat: "moderation", url: "/assessor" },
        { user: marcus.userId, title: "[TEST] Quiz Auto-Graded: Alex Johnson",            body: "The system has auto-graded Alex Johnson's Week 1 Quiz (70%). 1 short-answer question requires your review.", cat: "grade", url: "/assessor/queue" },
        // Nomsa (Programme Manager) — sees the full programme picture
        { user: nomsa.userId,  title: "[TEST] Cohort Progress Report — PLF_Group_Jun2026", body: "Your cohort has 3 active learners. Average progress: 43%. 1 learner at risk (Sipho — 15%). Fatima has recorded 8 activity grades this week.", cat: "system",     url: "/programme-manager" },
        { user: nomsa.userId,  title: "[TEST] Assessment Queue: 1 Pending Grade",          body: "Alex Johnson's RACI Matrix (formative) is awaiting grading by Marcus Webb. Summative moderation for Priya Naidoo is in progress.", cat: "submission", url: "/programme-manager" },
        { user: nomsa.userId,  title: "[TEST] ⚠️ At-Risk Learner: Sipho Dlamini (15%)",   body: "Sipho Dlamini is at 15% progress and has a resubmission pending. Fatima (Facilitator) has been notified. Consider intervention.", cat: "alert",      url: "/facilitator/learner-progress" },
        { user: nomsa.userId,  title: "[TEST] New Learner Registration — Thabo Molefe",    body: "Thabo Molefe has applied to enrol in Project Leadership Fundamentals. Registration pending Operations approval.", cat: "system",     url: "/learner/onboarding" },
        // David (Operations) — manages learner pipeline
        { user: david.userId,  title: "[TEST] 🆕 Pending Registration: Thabo Molefe",     body: "Thabo Molefe has submitted a registration for Project Leadership Fundamentals. Action required: review documents and approve or reject.", cat: "submission", url: "/learner/onboarding" },
        { user: david.userId,  title: "[TEST] Cohort Capacity: PLF_Group_Jun2026",         body: "PLF_Group_Jun2026 has 3/30 learners enrolled (10% capacity). 1 pending registration (Thabo Molefe) awaiting your approval.", cat: "system",     url: "/learner/onboarding" },
        { user: david.userId,  title: "[TEST] Programme Pipeline Summary",                 body: "Project Leadership Fundamentals: 3 active learners, 43% avg progress, 1 at-risk. 1 pending registration. Facilitator: Dr. Fatima Osei. Assessor: Marcus Webb.", cat: "system", url: "/operations" },
      ];

      for (const n of notifs) {
        const nId = uid();
        await ins("notifications", {
          id: nId, user_id: n.user, title: n.title, body: n.body,
          category: n.cat, is_read: false, action_url: n.url,
        });
        track("notifications", nId, `Notif → ${n.title.slice(0,40)}`);
      }

      // ── §13  BADGES + LEARNER BADGES ────────────────────────────────────────
      step = "badges";

      const badgeFirst = uid();
      await ins("badges", {
        id: badgeFirst, name: "[TEST] First Submission",
        description: "Awarded for completing your first assessment submission.",
        icon: "🎯", color: "#6366f1", category: "achievement",
        criteria_type: "manual", criteria_value: {}, points_value: 25,
        is_active: true, tenant_id: TENANT_ID,
      });
      track("badges", badgeFirst, "Badge: First Submission");

      const badgeHighAchiever = uid();
      await ins("badges", {
        id: badgeHighAchiever, name: "[TEST] High Achiever",
        description: "Awarded for scoring 90% or above on a summative assessment.",
        icon: "🏆", color: "#f59e0b", category: "achievement",
        criteria_type: "manual", criteria_value: {}, points_value: 100,
        is_active: true, tenant_id: TENANT_ID,
      });
      track("badges", badgeHighAchiever, "Badge: High Achiever");

      const badgeStreak = uid();
      await ins("badges", {
        id: badgeStreak, name: "[TEST] Consistent Learner",
        description: "Awarded for maintaining a 5-day study streak.",
        icon: "🔥", color: "#ef4444", category: "engagement",
        criteria_type: "manual", criteria_value: {}, points_value: 50,
        is_active: true, tenant_id: TENANT_ID,
      });
      track("badges", badgeStreak, "Badge: Consistent Learner");

      // Award badges to learners
      const lb1 = uid();
      await ins("learner_badges", {
        id: lb1, learner_id: alex.userId, badge_id: badgeFirst,
        enrolment_id: enrolAlex, earned_at: daysAgo(3), awarded_by: requestedBy,
      });
      track("learner_badges", lb1, "Alex earned: First Submission badge");

      const lb2 = uid();
      await ins("learner_badges", {
        id: lb2, learner_id: priya.userId, badge_id: badgeHighAchiever,
        enrolment_id: enrolPriya, earned_at: daysAgo(2), awarded_by: marcus.userId,
      });
      track("learner_badges", lb2, "Priya earned: High Achiever badge");

      const lb3 = uid();
      await ins("learner_badges", {
        id: lb3, learner_id: priya.userId, badge_id: badgeStreak,
        enrolment_id: enrolPriya, earned_at: daysAgo(1), awarded_by: requestedBy,
      });
      track("learner_badges", lb3, "Priya earned: Consistent Learner badge");

      // ── §14  ISSUED CREDENTIALS ─────────────────────────────────────────────
      step = "credentials";

      const credPriya = uid();
      await ins("issued_credentials", {
        id: credPriya, learner_id: priya.userId, programme_id: progId,
        enrolment_id: enrolPriya,
        title: "[TEST] Project Leadership Fundamentals — Module 1 Completion",
        credential_type: "certificate", status: "active",
        issued_at: daysAgo(1), issued_by: requestedBy,
        blockchain_hash: "0xTEST" + Math.random().toString(16).slice(2, 18),
      });
      track("issued_credentials", credPriya, "Priya's Module 1 completion credential");

      // ── §15  LEARNER STREAKS ─────────────────────────────────────────────────
      step = "streaks";
      const streaks = [
        { user: alex.userId,  current: 4,  longest: 7,  goal: 120, last: today() },
        { user: priya.userId, current: 8,  longest: 12, goal: 90,  last: today() },
        { user: sipho.userId, current: 1,  longest: 3,  goal: 60,  last: today() },
      ];

      for (const s of streaks) {
        const stId = uid();
        await ups("learner_streaks", {
          id: stId, user_id: s.user,
          current_streak: s.current, longest_streak: s.longest,
          last_study_date: s.last, weekly_goal_minutes: s.goal,
          updated_at: new Date().toISOString(),
        }, "user_id");
        track("learner_streaks", stId, `Streak: ${s.user === alex.userId ? "Alex" : s.user === priya.userId ? "Priya" : "Sipho"} (${s.current} days)`);
      }

      // Study log entries (for weekly progress calculation)
      for (const u of [alex.userId, priya.userId, sipho.userId]) {
        const days = u === priya.userId ? 8 : u === alex.userId ? 4 : 1;
        for (let d = 0; d < days; d++) {
          const logId = uid();
          const dt = new Date(); dt.setDate(dt.getDate() - d);
          await ups("learner_study_log", {
            id: logId, user_id: u,
            study_date: dt.toISOString().slice(0,10),
            minutes: u === priya.userId ? 35 : u === alex.userId ? 28 : 20,
            activity: "content",
          }, "user_id,study_date,activity");
          track("learner_study_log", logId, `Study log: ${u === alex.userId ? "Alex" : u === priya.userId ? "Priya" : "Sipho"} day -${d}`);
        }
      }

      // ── §16  REGISTER ALL RECORDS ────────────────────────────────────────────
      await (supa as any).from("test_data_registry").insert(
        reg.map(r => ({ ...r, session_id: session }))
      );

      return ok({
        session_id: session,
        password: PASSWORD,
        records_created: reg.length,
        users: {
          learner_alex:            { email: alex.email,   role: "learner",           name: "[TEST] Alex Johnson",    progress: "45%", note: "Pending RACI + auto-graded quiz" },
          learner_priya:           { email: priya.email,  role: "learner",           name: "[TEST] Priya Naidoo",    progress: "70%", note: "Summative under review + credential + 2 badges" },
          learner_sipho:           { email: sipho.email,  role: "learner",           name: "[TEST] Sipho Dlamini",   progress: "15%", note: "At-risk + resubmission required" },
          learner_thabo:           { email: thabo.email,  role: "learner",           name: "[TEST] Thabo Molefe",    progress: "0%",  note: "Registration PENDING — Operations must approve & enrol" },
          facilitator_fatima:      { email: fatima.email, role: "facilitator",       name: "[TEST] Dr. Fatima Osei", note: "Cohort assigned · 8 activity grades · 3 announcements" },
          assessor_marcus:         { email: marcus.email, role: "assessor",          name: "[TEST] Marcus Webb",     note: "Cohort assigned · graded Priya & Sipho · Alex pending" },
          programme_manager_nomsa: { email: nomsa.email,  role: "programme_manager", name: "[TEST] Nomsa Khumalo",   note: "Owns programme · sees cohort stats · assessor queue · at-risk alerts" },
          operations_david:        { email: david.email,  role: "operations",        name: "[TEST] David Okonkwo",   note: "Manages learner pipeline · Thabo registration pending his approval" },
        },
        programme: "[TEST] Project Leadership Fundamentals",
        cohort:    "[TEST] PLF_Group_Jun2026",
        summary: {
          users:                8,
          assessments:          4,
          quiz_questions:       questions.length,
          submissions:          5,
          activity_grades:      activityGrades.length,
          learner_registrations:1,
          moderation_items:     1,
          training_sessions:    sessions.length,
          announcements:        announcements.length,
          discussion_threads:   3,
          discussion_posts:     7,
          notifications:        notifs.length,
          badges:               3,
          credentials:          1,
          streaks:              3,
        },
        scenarios: [
          "Log in as Alex (Learner)    → pending RACI, auto-graded quiz results, 4-day streak",
          "Log in as Priya (Learner)   → summative under review, credential, 2 badges, 8-day streak",
          "Log in as Sipho (Learner)   → resubmit alert, at-risk (15%), Fatima's guidance in discussions",
          "Log in as Fatima (Facilitator) → 3 learners in cohort, at-risk Sipho, pending grade for Alex",
          "Log in as Marcus (Assessor) → Alex pending in queue, Priya under review, quiz short-answer flagged",
          "Log in as Nomsa (PM)        → programme dashboard: cohort stats, assessor queue, at-risk alert, Thabo registration pending",
          "Log in as David (Ops)       → learner onboarding: Thabo pending approval, cohort at 10% capacity",
          "Cross-role 1  → David approves Thabo → Thabo enrolled → Fatima sees 4th learner in cohort",
          "Cross-role 2  → Marcus grades Alex RACI → Alex + Nomsa (PM) get notified",
          "Cross-role 3  → Moderator reviews Priya → Marcus sees result → Nomsa sees final grade",
          "Cross-role 4  → Fatima records activity grade → Alex sees it → Nomsa sees in programme overview",
        ],
        message: `Seeded ${reg.length} records for 8 test users. Password for all: ${PASSWORD}`,
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("manage-test-data error:", e.message);
    return err(e.message ?? "Unexpected error");
  }
});
