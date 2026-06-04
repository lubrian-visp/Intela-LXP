import { cn } from "@/lib/utils";
import { Sparkles, GraduationCap, BookOpen, Award, Briefcase, Zap } from "lucide-react";
import type { OptionValue } from "@/types/programmeTypeConfig";
import { defaultCategories } from "@/types/programmeTypeConfig";

export interface PresetTemplate {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  config: Record<string, any>;
}

export const presetTemplates: PresetTemplate[] = [
  {
    name: "Learnership",
    description: "Structured workplace-based learning with mentor validation, cohort model, and competency assessments.",
    icon: Briefcase,
    color: "hsl(222, 60%, 18%)",
    config: {
      workplace: "required", cohort: "required", duration: "required", assessment: "required",
      poe: "required", credential: "not_allowed", verification: "required", regulatory: "enabled", blockchain: "disabled",
      structural: { ...defaultCategories.structural, default_duration_months: 12, default_credits: 120, default_nqf_level: 4, min_modules: 3 },
      financial: { ...defaultCategories.financial, fee_structure: "fixed", funding_eligible: true, sponsor_required: true },
      compliance: { ...defaultCategories.compliance, regulatory_body_required: true, accreditation_required: true, audit_trail_required: true, reporting_frequency: "quarterly" },
      workflow: { ...defaultCategories.workflow, approval_required: true, approval_stages: 2 },
      hr: { ...defaultCategories.hr, facilitator_required: true, mentor_required: true, assessor_required: true, moderator_required: true, max_learner_ratio: 25 },
      evaluation: { knowledge_weight: 30, practical_weight: 30, workplace_weight: 40, knowledge_pass_mark: 50, practical_pass_mark: 50, workplace_pass_mark: 50, certification_rules: { all_domains_must_pass: true, minimum_attendance_percent: 80, portfolio_required: true } },
      assessmentConfig: defaultCategories.assessmentConfig,
    },
  },
  {
    name: "Short Course",
    description: "Flexible, self-paced learning with optional assessments. Ideal for upskilling and micro-credentials.",
    icon: Zap,
    color: "hsl(38, 92%, 50%)",
    config: {
      workplace: "not_allowed", cohort: "optional", duration: "optional", assessment: "optional",
      poe: "not_allowed", credential: "required", verification: "not_allowed", regulatory: "disabled", blockchain: "optional",
      structural: { ...defaultCategories.structural, default_duration_months: 3, default_credits: 20 },
      financial: { ...defaultCategories.financial, fee_structure: "fixed" },
      compliance: { ...defaultCategories.compliance },
      workflow: { ...defaultCategories.workflow, approval_required: false, auto_publish: true },
      hr: { ...defaultCategories.hr, facilitator_required: false, assessor_required: false },
      evaluation: { knowledge_weight: 60, practical_weight: 40, workplace_weight: 0, knowledge_pass_mark: 50, practical_pass_mark: 50, workplace_pass_mark: 0, certification_rules: { all_domains_must_pass: false, minimum_attendance_percent: null, portfolio_required: false } },
      assessmentConfig: defaultCategories.assessmentConfig,
    },
  },
  {
    name: "Full Qualification",
    description: "Accredited programme with multi-stage approval, external verification, and comprehensive assessment.",
    icon: GraduationCap,
    color: "hsl(280, 60%, 50%)",
    config: {
      workplace: "optional", cohort: "required", duration: "required", assessment: "required",
      poe: "required", credential: "not_allowed", verification: "required", regulatory: "enabled", blockchain: "required",
      structural: { ...defaultCategories.structural, default_duration_months: 36, default_credits: 360, default_nqf_level: 6, min_modules: 8 },
      financial: { ...defaultCategories.financial, fee_structure: "per_module", funding_eligible: true },
      compliance: { ...defaultCategories.compliance, regulatory_body_required: true, accreditation_required: true, audit_trail_required: true, reporting_frequency: "biannually" },
      workflow: { ...defaultCategories.workflow, approval_required: true, approval_stages: 3, review_cycle_days: 90 },
      hr: { ...defaultCategories.hr, facilitator_required: true, assessor_required: true, moderator_required: true, max_learner_ratio: 30 },
      evaluation: { knowledge_weight: 40, practical_weight: 40, workplace_weight: 20, knowledge_pass_mark: 50, practical_pass_mark: 50, workplace_pass_mark: 50, certification_rules: { all_domains_must_pass: true, minimum_attendance_percent: 75, portfolio_required: true } },
      assessmentConfig: defaultCategories.assessmentConfig,
    },
  },
  {
    name: "Micro-credential",
    description: "Bite-sized stackable credentials with project-based assessment and blockchain-verified badges.",
    icon: Award,
    color: "hsl(190, 70%, 45%)",
    config: {
      workplace: "not_allowed", cohort: "not_allowed", duration: "not_allowed", assessment: "not_allowed",
      poe: "not_allowed", credential: "required", verification: "not_allowed", regulatory: "disabled", blockchain: "required",
      structural: { ...defaultCategories.structural, default_duration_months: 1, default_credits: 5 },
      financial: { ...defaultCategories.financial, fee_structure: "fixed" },
      compliance: { ...defaultCategories.compliance },
      workflow: { ...defaultCategories.workflow, approval_required: false, auto_publish: true },
      hr: { ...defaultCategories.hr, facilitator_required: false, assessor_required: false },
      evaluation: { knowledge_weight: 50, practical_weight: 50, workplace_weight: 0, knowledge_pass_mark: 60, practical_pass_mark: 60, workplace_pass_mark: 0, certification_rules: { all_domains_must_pass: false, minimum_attendance_percent: null, portfolio_required: false } },
      assessmentConfig: defaultCategories.assessmentConfig,
    },
  },
];

interface TemplatePresetsProps {
  onSelect: (preset: PresetTemplate) => void;
}

export default function TemplatePresets({ onSelect }: TemplatePresetsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Starter Templates</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {presetTemplates.map(preset => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.name}
              onClick={() => onSelect(preset)}
              className="text-left p-3 rounded-xl border border-border/50 bg-card hover:border-accent/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${preset.color}20` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: preset.color }} />
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">{preset.name}</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">{preset.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
