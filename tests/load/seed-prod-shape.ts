/**
 * Production-shape seeder for F5.1 load testing.
 *
 * Generates a dataset whose cardinality matches our production target:
 *   - 10 tenants
 *   - 200 programmes (20/tenant)
 *   - 1,000 cohorts (5/programme)
 *   - 50,000 learners
 *   - 200,000 enrolments (~4 per learner)
 *   - 100 assessments with 30 questions each
 *   - 500,000 historical activity_grades rows
 *
 * Run:
 *   bun run tests/load/seed-prod-shape.ts
 *
 * Requires SERVICE_ROLE_KEY in env (writes bypass RLS). Output is written to
 * tests/load/seed-output.json for the k6 script to consume.
 *
 * SAFETY: refuses to run unless SEED_CONFIRM=YES and the target URL contains
 * "staging" or "load-test". Never run against production.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = process.env.SEED_CONFIRM;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}
if (CONFIRM !== "YES") {
  throw new Error("Refusing to seed without SEED_CONFIRM=YES");
}
if (!/staging|load-test|localhost|127\.0\.0\.1/i.test(SUPABASE_URL)) {
  throw new Error(`Refusing to seed against ${SUPABASE_URL} — must target staging/load-test only`);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const TENANTS = 10;
const PROGRAMMES_PER_TENANT = 20;
const COHORTS_PER_PROGRAMME = 5;
const LEARNERS = 50_000;
const ENROLMENTS_PER_LEARNER = 4;
const ASSESSMENTS = 100;
const QUESTIONS_PER_ASSESSMENT = 30;
const HISTORICAL_GRADES = 500_000;
const BATCH = 1_000;

async function insertBatched<T>(table: string, rows: T[]) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await sb.from(table).insert(slice as any);
    if (error) throw new Error(`${table}[${i}]: ${error.message}`);
    process.stdout.write(`\r  ${table}: ${i + slice.length}/${rows.length}`);
  }
  process.stdout.write("\n");
}

async function main() {
  console.log(`Seeding load-test dataset → ${SUPABASE_URL}`);
  const t0 = Date.now();

  // 1. Tenants
  const tenants = Array.from({ length: TENANTS }, (_, i) => ({
    id: randomUUID(),
    name: `Load Test Tenant ${i + 1}`,
    slug: `load-tenant-${i + 1}`,
  }));
  await insertBatched("tenants", tenants);

  // 2. Programmes
  const programmes = tenants.flatMap((t) =>
    Array.from({ length: PROGRAMMES_PER_TENANT }, (_, i) => ({
      id: randomUUID(),
      tenant_id: t.id,
      title: `${t.name} · Programme ${i + 1}`,
      status: "active",
    }))
  );
  await insertBatched("programmes", programmes);

  // 3. Cohorts
  const cohorts = programmes.flatMap((p) =>
    Array.from({ length: COHORTS_PER_PROGRAMME }, (_, i) => ({
      id: randomUUID(),
      programme_id: p.id,
      tenant_id: p.tenant_id,
      title: `Cohort ${i + 1}`,
      start_date: "2026-01-15",
    }))
  );
  await insertBatched("cohorts", cohorts);

  // 4. Learners (profiles only — no auth.users; k6 uses anon JWT)
  const learners = Array.from({ length: LEARNERS }, (_, i) => ({
    id: randomUUID(),
    user_id: randomUUID(),
    full_name: `Load Learner ${i + 1}`,
    email: `load-${i + 1}@load-test.invalid`,
    tenant_id: tenants[i % TENANTS].id,
  }));
  await insertBatched("profiles", learners);

  // 5. Enrolments
  const enrolments = learners.flatMap((l) =>
    Array.from({ length: ENROLMENTS_PER_LEARNER }, () => {
      const c = cohorts[Math.floor(Math.random() * cohorts.length)];
      return {
        id: randomUUID(),
        learner_id: l.id,
        cohort_id: c.id,
        programme_id: c.programme_id,
        status: "active",
      };
    })
  );
  await insertBatched("enrolments", enrolments);

  // 6. Assessments + questions
  const assessments = Array.from({ length: ASSESSMENTS }, (_, i) => ({
    id: randomUUID(),
    programme_id: programmes[i % programmes.length].id,
    title: `Load Assessment ${i + 1}`,
    status: "published",
  }));
  await insertBatched("assessments", assessments);

  const questions = assessments.flatMap((a) =>
    Array.from({ length: QUESTIONS_PER_ASSESSMENT }, (_, i) => ({
      id: randomUUID(),
      assessment_id: a.id,
      question_text: `Question ${i + 1} for ${a.title}`,
      question_type: "multiple_choice",
      points: 1,
      order_index: i,
    }))
  );
  await insertBatched("quiz_questions", questions);

  // 7. Historical activity grades (for gradebook query weight)
  const grades = Array.from({ length: HISTORICAL_GRADES }, () => {
    const l = learners[Math.floor(Math.random() * learners.length)];
    return {
      id: randomUUID(),
      learner_id: l.id,
      score: Math.floor(Math.random() * 100),
      max_score: 100,
      activity_type: "quiz",
    };
  });
  await insertBatched("activity_grades", grades);

  // 8. Write k6 seed manifest
  mkdirSync("tests/load/results", { recursive: true });
  const manifest = {
    seededAt: new Date().toISOString(),
    tenantIds: tenants.map((t) => t.id),
    programmeIds: programmes.map((p) => p.id),
    cohortIds: cohorts.map((c) => c.id),
    learnerIds: learners.map((l) => l.id),
    assessmentIds: assessments.map((a) => a.id),
    counts: {
      tenants: tenants.length,
      programmes: programmes.length,
      cohorts: cohorts.length,
      learners: learners.length,
      enrolments: enrolments.length,
      assessments: assessments.length,
      questions: questions.length,
      grades: grades.length,
    },
  };
  writeFileSync("tests/load/seed-output.json", JSON.stringify(manifest, null, 2));

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log("Manifest → tests/load/seed-output.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
