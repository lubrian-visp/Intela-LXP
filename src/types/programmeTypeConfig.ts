/**
 * Programme Type Config Schema
 * ─────────────────────────────
 * The `config` JSONB column on `programme_types` stores ALL
 * governance attributes that programmes inherit.
 *
 * Five attribute categories + K/P/W evaluation template.
 */

// ── Behaviour flags (existing) ──────────────────────────────────
export type OptionValue = "required" | "optional" | "not_allowed" | "enabled" | "disabled";

export interface BehaviourFlags {
  workplace: OptionValue;
  cohort: OptionValue;
  duration: OptionValue;
  assessment: OptionValue;
  poe: OptionValue;
  credential: OptionValue;
  verification: OptionValue;
  regulatory: OptionValue;
  blockchain: OptionValue;
}

// ── 1. Structural Attributes ────────────────────────────────────
export interface StructuralAttributes {
  default_duration_months: number | null;
  default_credits: number | null;
  default_nqf_level: number | null;
  min_modules: number | null;
  max_modules: number | null;
  locked_fields: string[];
}

// ── 2. Financial Attributes ─────────────────────────────────────
export type FeeStructure = "fixed" | "per_module" | "subscription" | "free";

export interface FinancialAttributes {
  fee_structure: FeeStructure;
  default_fee_amount: number | null;
  currency: string;
  funding_eligible: boolean;
  sponsor_required: boolean;
  locked_fields: string[];
}

// ── 3. Compliance Attributes ────────────────────────────────────
export interface ComplianceAttributes {
  regulatory_body_required: boolean;
  accreditation_required: boolean;
  reporting_frequency: string | null;
  audit_trail_required: boolean;
  locked_fields: string[];
}

// ── 4. Workflow Attributes ──────────────────────────────────────
export interface WorkflowAttributes {
  approval_required: boolean;
  approval_stages: number;
  auto_publish: boolean;
  review_cycle_days: number | null;
  locked_fields: string[];
}

// ── 5. HR Attributes ────────────────────────────────────────────
export interface HRAttributes {
  facilitator_required: boolean;
  mentor_required: boolean;
  assessor_required: boolean;
  moderator_required: boolean;
  max_learner_ratio: number | null;
  locked_fields: string[];
}

// ── 6. Assessment Attributes ────────────────────────────────────
export type AssessmentTypeName =
  | "formative"
  | "summative"
  | "homework"
  | "peer_group"
  | "group_project"
  | "final_project"
  | "competency"
  | "workplace"
  | "oral"
  | "portfolio";

export interface AssessmentTypeRule {
  type: AssessmentTypeName;
  enabled: boolean;
  requires_moderation: boolean;
  default_weighting: number | null;
  max_attempts: number;
  allow_resubmission: boolean;
}

export interface AssessmentAttributes {
  allowed_types: AssessmentTypeRule[];
  formative_required: boolean;
  summative_required: boolean;
  moderation_threshold_percent: number | null;
  auto_moderate_borderline: boolean;
  borderline_range_percent: number;
  locked_fields: string[];
}

// ── K/P/W Evaluation Template ───────────────────────────────────
export interface CertificationRules {
  all_domains_must_pass: boolean;
  minimum_attendance_percent: number | null;
  portfolio_required: boolean;
}

export interface EvaluationTemplate {
  knowledge_weight: number;
  practical_weight: number;
  workplace_weight: number;
  knowledge_pass_mark: number;
  practical_pass_mark: number;
  workplace_pass_mark: number;
  certification_rules: CertificationRules;
}

// ── Full Config ─────────────────────────────────────────────────
export interface ProgrammeTypeConfig extends BehaviourFlags {
  structural: StructuralAttributes;
  financial: FinancialAttributes;
  compliance: ComplianceAttributes;
  workflow: WorkflowAttributes;
  hr: HRAttributes;
  assessmentConfig: AssessmentAttributes;
  evaluation: EvaluationTemplate;
}

// ── Defaults ────────────────────────────────────────────────────
export const defaultStructural: StructuralAttributes = {
  default_duration_months: null,
  default_credits: null,
  default_nqf_level: null,
  min_modules: null,
  max_modules: null,
  locked_fields: [],
};

export const defaultFinancial: FinancialAttributes = {
  fee_structure: "fixed",
  default_fee_amount: null,
  currency: "ZAR",
  funding_eligible: false,
  sponsor_required: false,
  locked_fields: [],
};

export const defaultCompliance: ComplianceAttributes = {
  regulatory_body_required: false,
  accreditation_required: false,
  reporting_frequency: null,
  audit_trail_required: false,
  locked_fields: [],
};

export const defaultWorkflow: WorkflowAttributes = {
  approval_required: true,
  approval_stages: 1,
  auto_publish: false,
  review_cycle_days: null,
  locked_fields: [],
};

export const defaultHR: HRAttributes = {
  facilitator_required: true,
  mentor_required: false,
  assessor_required: true,
  moderator_required: false,
  max_learner_ratio: null,
  locked_fields: [],
};

export const defaultAssessmentTypes: AssessmentTypeRule[] = [
  { type: "formative", enabled: true, requires_moderation: false, default_weighting: null, max_attempts: 3, allow_resubmission: true },
  { type: "summative", enabled: true, requires_moderation: true, default_weighting: null, max_attempts: 1, allow_resubmission: false },
  { type: "homework", enabled: true, requires_moderation: false, default_weighting: null, max_attempts: 2, allow_resubmission: true },
  { type: "peer_group", enabled: false, requires_moderation: false, default_weighting: null, max_attempts: 1, allow_resubmission: false },
  { type: "group_project", enabled: false, requires_moderation: true, default_weighting: null, max_attempts: 1, allow_resubmission: false },
  { type: "final_project", enabled: false, requires_moderation: true, default_weighting: null, max_attempts: 1, allow_resubmission: false },
  { type: "competency", enabled: false, requires_moderation: true, default_weighting: null, max_attempts: 2, allow_resubmission: true },
  { type: "workplace", enabled: false, requires_moderation: false, default_weighting: null, max_attempts: 1, allow_resubmission: true },
  { type: "oral", enabled: false, requires_moderation: false, default_weighting: null, max_attempts: 1, allow_resubmission: false },
  { type: "portfolio", enabled: false, requires_moderation: true, default_weighting: null, max_attempts: 1, allow_resubmission: true },
];

export const defaultAssessmentConfig: AssessmentAttributes = {
  allowed_types: defaultAssessmentTypes,
  formative_required: true,
  summative_required: true,
  moderation_threshold_percent: 10,
  auto_moderate_borderline: true,
  borderline_range_percent: 5,
  locked_fields: [],
};

export const defaultEvaluation: EvaluationTemplate = {
  knowledge_weight: 40,
  practical_weight: 40,
  workplace_weight: 20,
  knowledge_pass_mark: 50,
  practical_pass_mark: 50,
  workplace_pass_mark: 50,
  certification_rules: {
    all_domains_must_pass: true,
    minimum_attendance_percent: null,
    portfolio_required: false,
  },
};

export const defaultCategories = {
  structural: defaultStructural,
  financial: defaultFinancial,
  compliance: defaultCompliance,
  workflow: defaultWorkflow,
  hr: defaultHR,
  assessmentConfig: defaultAssessmentConfig,
  evaluation: defaultEvaluation,
};

/**
 * Merge an existing config (which may be legacy/flat) with defaults
 * to produce a fully typed ProgrammeTypeConfig.
 */
export function resolveConfig(raw: Record<string, any>): ProgrammeTypeConfig {
  return {
    // Behaviour flags
    workplace: raw.workplace ?? "optional",
    cohort: raw.cohort ?? "optional",
    duration: raw.duration ?? "optional",
    assessment: raw.assessment ?? "required",
    poe: raw.poe ?? "optional",
    credential: raw.credential ?? "optional",
    verification: raw.verification ?? "not_allowed",
    regulatory: raw.regulatory ?? "disabled",
    blockchain: raw.blockchain ?? "disabled",
    // Categories — deep merge with defaults
    structural: { ...defaultStructural, ...(raw.structural || {}) },
    financial: { ...defaultFinancial, ...(raw.financial || {}) },
    compliance: { ...defaultCompliance, ...(raw.compliance || {}) },
    workflow: { ...defaultWorkflow, ...(raw.workflow || {}) },
    hr: { ...defaultHR, ...(raw.hr || {}) },
    assessmentConfig: {
      ...defaultAssessmentConfig,
      ...(raw.assessmentConfig || {}),
      allowed_types: raw.assessmentConfig?.allowed_types?.length
        ? raw.assessmentConfig.allowed_types
        : defaultAssessmentTypes,
    },
    evaluation: {
      ...defaultEvaluation,
      ...(raw.evaluation || {}),
      certification_rules: {
        ...defaultEvaluation.certification_rules,
        ...(raw.evaluation?.certification_rules || {}),
      },
    },
  };
}
