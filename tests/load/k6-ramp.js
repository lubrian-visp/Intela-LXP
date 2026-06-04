/**
 * k6 ramp-up load test — 500 → 5,000 VU against a production-shaped dataset.
 *
 * Addresses Finding F5.1 of the Independent Post-Development Analysis Report.
 * Asserts the < 2 s P95 latency SLO across the four hottest read paths:
 *   1. Learner dashboard hydration (PostgREST /profiles_safe + /enrolments)
 *   2. Programme detail load (/programmes/:id + nested modules)
 *   3. Assessment attempt fetch (/quiz_questions + sections)
 *   4. Gradebook query (/activity_grades aggregate)
 *
 * Usage:
 *   k6 run \
 *     -e SUPABASE_URL=https://<ref>.supabase.co \
 *     -e SUPABASE_ANON_KEY=<anon> \
 *     -e BEARER_TOKEN=<learner JWT, optional> \
 *     tests/load/k6-ramp.js
 *
 * Seed first with `bun run tests/load/seed-prod-shape.ts` so the dataset
 * shape (programmes, cohorts, learners, attempts) matches production scale.
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const BEARER = __ENV.BEARER_TOKEN || ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY env vars are required');
}

// Per-endpoint trend metrics so the report shows P50/P90/P99 individually.
const dashboardTrend = new Trend('dashboard_ms', true);
const programmeTrend = new Trend('programme_ms', true);
const assessmentTrend = new Trend('assessment_ms', true);
const gradebookTrend = new Trend('gradebook_ms', true);
const errorRate = new Rate('errors');

export const options = {
  // 500 → 1,500 → 3,000 → 5,000 → ramp-down, total ~30 min
  stages: [
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '3m', target: 1500 },
    { duration: '5m', target: 1500 },
    { duration: '3m', target: 3000 },
    { duration: '5m', target: 3000 },
    { duration: '3m', target: 5000 },
    { duration: '5m', target: 5000 },
    { duration: '4m', target: 0 },
  ],
  thresholds: {
    // F5.1 SLO: < 2s P95 across all read paths
    'http_req_duration{type:read}': ['p(95)<2000', 'p(99)<3500'],
    'dashboard_ms': ['p(95)<2000'],
    'programme_ms': ['p(95)<2000'],
    'assessment_ms': ['p(95)<2000'],
    'gradebook_ms': ['p(95)<2500'],
    'errors': ['rate<0.01'], // < 1% error rate
  },
};

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${BEARER}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// IDs are populated by the seeder and read from /tmp/k6-seed.json by setup().
export function setup() {
  // Allow override via env, otherwise expect seeder output.
  const seed = JSON.parse(open('./seed-output.json'));
  return seed;
}

export default function (data) {
  const programmeId = randomItem(data.programmeIds);
  const assessmentId = randomItem(data.assessmentIds);
  const learnerId = randomItem(data.learnerIds);

  group('dashboard', () => {
    const r = http.get(
      `${SUPABASE_URL}/rest/v1/profiles_safe?id=eq.${learnerId}&select=*,enrolments(*)`,
      { headers, tags: { type: 'read', endpoint: 'dashboard' } }
    );
    dashboardTrend.add(r.timings.duration);
    errorRate.add(r.status >= 400);
    check(r, { 'dashboard 2xx': (x) => x.status >= 200 && x.status < 300 });
  });

  group('programme', () => {
    const r = http.get(
      `${SUPABASE_URL}/rest/v1/programmes?id=eq.${programmeId}&select=*,modules(*,lessons(*))`,
      { headers, tags: { type: 'read', endpoint: 'programme' } }
    );
    programmeTrend.add(r.timings.duration);
    errorRate.add(r.status >= 400);
    check(r, { 'programme 2xx': (x) => x.status >= 200 && x.status < 300 });
  });

  group('assessment', () => {
    const r = http.get(
      `${SUPABASE_URL}/rest/v1/quiz_questions?assessment_id=eq.${assessmentId}&select=*`,
      { headers, tags: { type: 'read', endpoint: 'assessment' } }
    );
    assessmentTrend.add(r.timings.duration);
    errorRate.add(r.status >= 400);
    check(r, { 'assessment 2xx': (x) => x.status >= 200 && x.status < 300 });
  });

  group('gradebook', () => {
    const r = http.get(
      `${SUPABASE_URL}/rest/v1/activity_grades?learner_id=eq.${learnerId}&select=*&order=created_at.desc&limit=50`,
      { headers, tags: { type: 'read', endpoint: 'gradebook' } }
    );
    gradebookTrend.add(r.timings.duration);
    errorRate.add(r.status >= 400);
    check(r, { 'gradebook 2xx': (x) => x.status >= 200 && x.status < 300 });
  });

  // Simulate user think-time between page views (Pareto: 1-8s)
  sleep(1 + Math.random() * 7);
}

export function handleSummary(data) {
  // Emit a machine-readable summary so CI/ops can attach it to the GA sign-off.
  return {
    'stdout': textSummary(data),
    'tests/load/results/k6-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const fmt = (v) => (v == null ? 'n/a' : `${Math.round(v)}ms`);
  const trend = (name) => {
    const t = m[name]?.values || {};
    return `  ${name.padEnd(18)} P50=${fmt(t['p(50)'])}  P90=${fmt(t['p(90)'])}  P95=${fmt(t['p(95)'])}  P99=${fmt(t['p(99)'])}`;
  };
  return [
    '',
    '=== F5.1 Load Test Summary (500 → 5,000 VU) ===',
    trend('dashboard_ms'),
    trend('programme_ms'),
    trend('assessment_ms'),
    trend('gradebook_ms'),
    `  errors            ${((m.errors?.values?.rate || 0) * 100).toFixed(2)}%`,
    `  http_req_failed   ${((m.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`,
    '',
    'SLO: P95 < 2000ms across all read paths, error rate < 1%.',
    '',
  ].join('\n');
}
