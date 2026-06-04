/**
 * Per-role smoke-test credentials + landing paths.
 *
 * Credentials are read from env vars so they never live in the repo.
 * Set in CI as e.g. SMOKE_SUPER_ADMIN_EMAIL / SMOKE_SUPER_ADMIN_PASSWORD.
 * If a role's credentials are missing, its spec will test.skip() — keeping
 * the suite green when an account is rotated mid-cycle.
 */
export interface RoleFixture {
  key: string;
  label: string;
  email: string | undefined;
  password: string | undefined;
  /** Path the user should land on after sign-in. */
  landing: string;
  /** Up to 5 high-value pages to hit per role. */
  pages: { path: string; expect: RegExp | string }[];
}

const env = (k: string) => process.env[k];

export const ROLES: RoleFixture[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    email: env("SMOKE_SUPER_ADMIN_EMAIL"),
    password: env("SMOKE_SUPER_ADMIN_PASSWORD"),
    landing: "/",
    pages: [
      { path: "/", expect: /dashboard|overview|admin/i },
      { path: "/user-directory", expect: /user|directory/i },
      { path: "/tenants", expect: /tenant/i },
      { path: "/admin/platform-analytics", expect: /analytic/i },
      { path: "/audit-logs", expect: /audit/i },
    ],
  },
  {
    key: "systems_admin",
    label: "Systems Admin",
    email: env("SMOKE_SYSTEMS_ADMIN_EMAIL"),
    password: env("SMOKE_SYSTEMS_ADMIN_PASSWORD"),
    landing: "/systems-admin",
    pages: [
      { path: "/systems-admin", expect: /system|admin/i },
      { path: "/system-health", expect: /health/i },
      { path: "/roles-permissions", expect: /role|permission/i },
      { path: "/integrations", expect: /integration/i },
      { path: "/unified-audit-log", expect: /audit/i },
    ],
  },
  {
    key: "programme_manager",
    label: "Programme Manager",
    email: env("SMOKE_PM_EMAIL"),
    password: env("SMOKE_PM_PASSWORD"),
    landing: "/programme-manager",
    pages: [
      { path: "/programme-manager", expect: /programme/i },
      { path: "/programmes", expect: /programme/i },
      { path: "/cohorts", expect: /cohort/i },
      { path: "/approvals", expect: /approval/i },
      { path: "/gradebook", expect: /grade/i },
    ],
  },
  {
    key: "operations",
    label: "Operations Manager",
    email: env("SMOKE_OPS_EMAIL"),
    password: env("SMOKE_OPS_PASSWORD"),
    landing: "/operations",
    pages: [
      { path: "/operations", expect: /operation/i },
      { path: "/cohorts", expect: /cohort/i },
      { path: "/training-sessions", expect: /session/i },
      { path: "/approvals", expect: /approval/i },
      { path: "/calendar", expect: /calendar/i },
    ],
  },
  {
    key: "assessor",
    label: "Assessor",
    email: env("SMOKE_ASSESSOR_EMAIL"),
    password: env("SMOKE_ASSESSOR_PASSWORD"),
    landing: "/assessor",
    pages: [
      { path: "/assessor", expect: /assessor/i },
      { path: "/assessor/queue", expect: /queue|grading/i },
      { path: "/assessor/history", expect: /history/i },
      { path: "/assessor/reports", expect: /report/i },
      { path: "/gradebook", expect: /grade/i },
    ],
  },
  {
    key: "moderator",
    label: "Moderator",
    email: env("SMOKE_MOD_EMAIL"),
    password: env("SMOKE_MOD_PASSWORD"),
    landing: "/moderator",
    pages: [
      { path: "/moderator", expect: /moderat/i },
      { path: "/moderator/queue", expect: /queue/i },
      { path: "/moderator/reports", expect: /report/i },
      { path: "/moderator/qa-report", expect: /qa|quality/i },
      { path: "/approvals", expect: /approval/i },
    ],
  },
  {
    key: "facilitator",
    label: "Facilitator",
    email: env("SMOKE_FAC_EMAIL"),
    password: env("SMOKE_FAC_PASSWORD"),
    landing: "/facilitator",
    pages: [
      { path: "/facilitator", expect: /facilitator|dashboard/i },
      { path: "/training-sessions", expect: /session/i },
      { path: "/facilitator/engagement", expect: /engagement/i },
      { path: "/facilitator/learner-progress", expect: /learner|progress/i },
      { path: "/calendar", expect: /calendar/i },
    ],
  },
  {
    key: "mentor",
    label: "Mentor",
    email: env("SMOKE_MENTOR_EMAIL"),
    password: env("SMOKE_MENTOR_PASSWORD"),
    landing: "/mentor",
    pages: [
      { path: "/mentor", expect: /mentor/i },
      { path: "/mentor/mentees", expect: /mentee/i },
      { path: "/mentor/goals", expect: /goal/i },
      { path: "/mentor/sessions", expect: /session/i },
      { path: "/mentor/feedback", expect: /feedback/i },
    ],
  },
  {
    key: "learner",
    label: "Learner",
    email: env("SMOKE_LEARNER_EMAIL"),
    password: env("SMOKE_LEARNER_PASSWORD"),
    landing: "/learner",
    pages: [
      { path: "/learner", expect: /learn|dashboard/i },
      { path: "/learner/programmes", expect: /programme/i },
      { path: "/learner/assessments", expect: /assessment/i },
      { path: "/learner/grades", expect: /grade/i },
      { path: "/transcript", expect: /transcript/i },
    ],
  },
  {
    key: "sponsor",
    label: "Sponsor",
    email: env("SMOKE_SPONSOR_EMAIL"),
    password: env("SMOKE_SPONSOR_PASSWORD"),
    landing: "/sponsor-portal",
    pages: [
      { path: "/sponsor-portal", expect: /sponsor/i },
      { path: "/sponsor/learners", expect: /learner/i },
      { path: "/sponsor/quotes", expect: /quote/i },
      { path: "/sponsor/invoices", expect: /invoice/i },
      { path: "/sponsor/reports", expect: /report/i },
    ],
  },
  {
    key: "talent_manager",
    label: "Talent Manager",
    email: env("SMOKE_TALENT_EMAIL"),
    password: env("SMOKE_TALENT_PASSWORD"),
    landing: "/talent-manager",
    pages: [
      { path: "/talent-manager", expect: /talent/i },
      { path: "/talent-management", expect: /talent/i },
      { path: "/programmes", expect: /programme/i },
      { path: "/cohorts", expect: /cohort/i },
      { path: "/calendar", expect: /calendar/i },
    ],
  },
];
