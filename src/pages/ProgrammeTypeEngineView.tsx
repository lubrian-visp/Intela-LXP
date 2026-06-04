/**
 * ProgrammeTypeEngineView — Read-only Programme Type Engine
 * Shared by Programme Manager and Operations roles.
 * Data is sourced directly from the same tables used by the Super Admin engine.
 * No create / edit / delete / save actions are available.
 */
import { useState, useMemo } from "react";
import {
  Lock, Globe, ChevronRight, Loader2, Activity,
  Briefcase, Users, Clock, FileCheck, Award, Shield,
  Link, BookOpen, Building2, DollarSign, ShieldCheck,
  GitBranch, UserCog, FlaskConical, ClipboardList, Cog,
  GraduationCap, AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  useProgrammeTypes, useCountries, useCountryOverlay,
} from "@/hooks/useProgrammeTypes";
import { useProgrammes } from "@/hooks/useCoreData";
import { resolveConfig, type OptionValue, type ProgrammeTypeConfig } from "@/types/programmeTypeConfig";
import TypeDNACard from "@/components/programme-types/TypeDNACard";
import TabStepper, { type ConfigTab } from "@/components/programme-types/TabStepper";
import ConfigHealthScore from "@/components/programme-types/ConfigHealthScore";
import ConditionalHints from "@/components/programme-types/ConditionalHints";
import CountryOverlayPanel from "@/components/programme-types/CountryOverlayPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeBanner } from "@/components/dashboard/DashboardShell";

// ── Behaviour flag definitions (mirrors Super Admin) ─────────────────────────
const behaviourFlags = [
  { key: "workplace",   label: "Workplace Requirements",  icon: <Briefcase className="w-4 h-4" />, description: "Controls workplace-based learning and mentor validation.", options: [{ value: "required", label: "Mandatory" }, { value: "optional", label: "Optional" }, { value: "not_allowed", label: "Not Allowed" }] },
  { key: "cohort",      label: "Cohort Model",            icon: <Users className="w-4 h-4" />,    description: "Whether learners must be enrolled in a cohort.", options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional (Self-paced)" }, { value: "not_allowed", label: "Self-paced Only" }] },
  { key: "duration",    label: "Duration Model",          icon: <Clock className="w-4 h-4" />,    description: "How programme timelines are managed.", options: [{ value: "required", label: "Fixed Duration" }, { value: "optional", label: "Rolling Enrolment" }, { value: "not_allowed", label: "Flexible / Open" }] },
  { key: "assessment",  label: "Assessment Model",        icon: <FileCheck className="w-4 h-4" />, description: "Primary method of learner evaluation.", options: [{ value: "required", label: "Competency-Based" }, { value: "optional", label: "Exam-Based" }, { value: "not_allowed", label: "Project-Based" }] },
  { key: "poe",         label: "Portfolio of Evidence",   icon: <BookOpen className="w-4 h-4" />, description: "Whether learners must submit a portfolio.", options: [{ value: "required", label: "Mandatory" }, { value: "optional", label: "Optional" }, { value: "not_allowed", label: "Not Required" }] },
  { key: "credential",  label: "Credential Model",        icon: <Award className="w-4 h-4" />,    description: "Type of credentials issued upon completion.", options: [{ value: "required", label: "Micro-credentials Only" }, { value: "optional", label: "Stackable" }, { value: "not_allowed", label: "Full Qualification" }] },
  { key: "verification",label: "External Verification",   icon: <Shield className="w-4 h-4" />,   description: "Whether external body verification is needed.", options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }, { value: "not_allowed", label: "Not Required" }] },
  { key: "regulatory",  label: "Regulatory Tagging",      icon: <Shield className="w-4 h-4" />,   description: "Link to regulatory framework requirements.", options: [{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }] },
  { key: "blockchain",  label: "Blockchain Issuance",     icon: <Link className="w-4 h-4" />,     description: "Whether credentials are anchored on-chain.", options: [{ value: "required", label: "Required" }, { value: "optional", label: "Optional" }, { value: "disabled", label: "Disabled" }] },
];

const optionStyle: Record<OptionValue, string> = {
  required:    "bg-success/10 text-success border-success/30",
  optional:    "bg-info/10 text-info border-info/30",
  not_allowed: "bg-secondary text-muted-foreground border-border",
  enabled:     "bg-success/10 text-success border-success/30",
  disabled:    "bg-secondary text-muted-foreground border-border",
};

const configTabs: { key: ConfigTab; label: string; icon: React.ReactNode }[] = [
  { key: "behaviour",  label: "Behaviour",  icon: <Cog className="w-3.5 h-3.5" /> },
  { key: "structural", label: "Structural", icon: <Building2 className="w-3.5 h-3.5" /> },
  { key: "financial",  label: "Financial",  icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: "compliance", label: "Compliance", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: "workflow",   label: "Workflow",   icon: <GitBranch className="w-3.5 h-3.5" /> },
  { key: "hr",         label: "HR",         icon: <UserCog className="w-3.5 h-3.5" /> },
  { key: "evaluation", label: "K/P/W",      icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { key: "assessments",label: "Assessments",icon: <ClipboardList className="w-3.5 h-3.5" /> },
];

// ── Read-only field helpers ───────────────────────────────────────────────────

function ROField({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground/50">—</span>}</div>
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

function ROBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
      on ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground/50"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground/30")} />
      {label}
    </span>
  );
}

// ── Read-only tab content ─────────────────────────────────────────────────────

function ReadOnlyBehaviour({ config }: { config: ProgrammeTypeConfig }) {
  return (
    <div className="divide-y divide-border/50 -mx-5 -mt-5">
      {behaviourFlags.map(flag => {
        const value = config[flag.key as keyof typeof config] as OptionValue;
        const activeOption = flag.options.find(o => o.value === value);
        return (
          <div key={flag.key} className="px-5 py-4 flex items-start justify-between gap-6">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-secondary shrink-0 mt-0.5">{flag.icon}</div>
              <div>
                <p className="text-sm font-medium text-foreground">{flag.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{flag.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {flag.options.map(opt => (
                <span
                  key={opt.value}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-medium border",
                    value === opt.value
                      ? optionStyle[opt.value]
                      : "bg-transparent text-muted-foreground/30 border-transparent"
                  )}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReadOnlyStructural({ config }: { config: ProgrammeTypeConfig }) {
  const s = config.structural;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
      <ROField label="Default Duration" value={s.default_duration_months != null ? `${s.default_duration_months} months` : null} hint="Inherited by new programmes" />
      <ROField label="Default Credits" value={s.default_credits} hint="NQF credit value" />
      <ROField label="Default NQF Level" value={s.default_nqf_level != null ? `Level ${s.default_nqf_level}` : null} />
      <ROField label="Min Modules" value={s.min_modules} />
      <ROField label="Max Modules" value={s.max_modules} />
      {s.locked_fields.length > 0 && (
        <div className="col-span-full">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Governance-Locked Fields</p>
          <div className="flex flex-wrap gap-1.5">
            {s.locked_fields.map(f => (
              <span key={f} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                <Lock className="w-2.5 h-2.5" />{f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyFinancial({ config }: { config: ProgrammeTypeConfig }) {
  const f = config.financial;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        <ROField label="Fee Structure" value={f.fee_structure.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
        <ROField label="Default Fee" value={f.default_fee_amount != null ? `${f.currency} ${f.default_fee_amount.toLocaleString()}` : null} />
        <ROField label="Currency" value={f.currency} />
      </div>
      <div className="flex gap-3 flex-wrap">
        <ROBadge on={f.funding_eligible} label="Eligible for government funding" />
        <ROBadge on={f.sponsor_required} label="Sponsor required" />
      </div>
    </div>
  );
}

function ReadOnlyCompliance({ config }: { config: ProgrammeTypeConfig }) {
  const c = config.compliance;
  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <ROBadge on={c.regulatory_body_required} label="Regulatory body oversight" />
        <ROBadge on={c.accreditation_required} label="Accreditation required" />
        <ROBadge on={c.audit_trail_required} label="Full audit trail" />
      </div>
      <ROField
        label="Reporting Frequency"
        value={c.reporting_frequency
          ? c.reporting_frequency.replace(/\b\w/g, x => x.toUpperCase())
          : "Not Required"}
      />
    </div>
  );
}

function ReadOnlyWorkflow({ config }: { config: ProgrammeTypeConfig }) {
  const w = config.workflow;
  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <ROBadge on={w.approval_required} label="Approval gate enabled" />
        <ROBadge on={w.auto_publish} label="Auto-publish after approval" />
      </div>
      <div className={cn("grid grid-cols-2 gap-5", !w.approval_required && "opacity-40")}>
        <ROField label="Approval Stages" value={w.approval_stages} hint="Number of gates required" />
        <ROField label="Review Cycle" value={w.review_cycle_days != null ? `${w.review_cycle_days} days` : null} hint="Days between reviews" />
      </div>
    </div>
  );
}

function ReadOnlyHR({ config }: { config: ProgrammeTypeConfig }) {
  const h = config.hr;
  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <ROBadge on={h.facilitator_required} label="Facilitator required" />
        <ROBadge on={h.mentor_required} label="Mentor required" />
        <ROBadge on={h.assessor_required} label="Assessor required" />
        <ROBadge on={h.moderator_required} label="Moderator required" />
      </div>
      <ROField label="Max Learner-to-Facilitator Ratio" value={h.max_learner_ratio != null ? `${h.max_learner_ratio}:1` : null} hint="Maximum learners per facilitator" />
    </div>
  );
}

function ReadOnlyEvaluation({ config }: { config: ProgrammeTypeConfig }) {
  const e = config.evaluation;
  const total = e.knowledge_weight + e.practical_weight + e.workplace_weight;
  const isBalanced = total === 100;
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Domain Weights</p>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", isBalanced ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {total}% / 100%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["knowledge", "practical", "workplace"] as const).map(domain => {
            const weight = e[`${domain}_weight` as keyof typeof e] as number;
            const pass   = e[`${domain}_pass_mark` as keyof typeof e] as number;
            const colors = { knowledge: "bg-info", practical: "bg-warning", workplace: "bg-success" };
            const labels = { knowledge: "Knowledge (K)", practical: "Practical (P)", workplace: "Workplace (W)" };
            return (
              <div key={domain} className="bg-secondary/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", colors[domain])} />
                  <span className="text-xs font-semibold text-foreground">{labels[domain]}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{weight}%</div>
                <p className="text-[10px] text-muted-foreground">Pass mark: {pass}%</p>
              </div>
            );
          })}
        </div>
        <div className="flex rounded-full overflow-hidden h-2 mt-3">
          <div className="bg-info transition-all"   style={{ width: `${e.knowledge_weight}%` }} />
          <div className="bg-warning transition-all" style={{ width: `${e.practical_weight}%` }} />
          <div className="bg-success transition-all" style={{ width: `${e.workplace_weight}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
          <span>K: {e.knowledge_weight}%</span>
          <span>P: {e.practical_weight}%</span>
          <span>W: {e.workplace_weight}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certification Rules</p>
        <div className="flex gap-3 flex-wrap mb-3">
          <ROBadge on={e.certification_rules.all_domains_must_pass} label="All domains must pass" />
          <ROBadge on={e.certification_rules.portfolio_required} label="Portfolio required for certification" />
        </div>
        <ROField label="Minimum Attendance" value={e.certification_rules.minimum_attendance_percent != null ? `${e.certification_rules.minimum_attendance_percent}%` : null} hint="Leave empty = no requirement" />
      </div>
    </div>
  );
}

function ReadOnlyAssessments({ config }: { config: ProgrammeTypeConfig }) {
  const a = config.assessmentConfig;
  const typeLabels: Record<string, { label: string; desc: string }> = {
    formative:     { label: "Formative",     desc: "Ongoing during learning" },
    summative:     { label: "Summative",     desc: "End-of-module evaluation" },
    homework:      { label: "Homework",      desc: "Take-home assignments" },
    peer_group:    { label: "Peer Group",    desc: "Peer-evaluated activities" },
    group_project: { label: "Group Project", desc: "Collaborative submissions" },
    final_project: { label: "Final Project", desc: "Capstone deliverable" },
    competency:    { label: "Competency",    desc: "Skills-based assessment" },
    workplace:     { label: "Workplace",     desc: "On-the-job evaluation" },
    oral:          { label: "Oral",          desc: "Verbal examination" },
    portfolio:     { label: "Portfolio",     desc: "Evidence collection" },
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-info/5 border border-info/10">
          <span className={cn("w-2 h-2 rounded-full shrink-0", a.formative_required ? "bg-success" : "bg-muted-foreground/30")} />
          <span className="text-[11px] text-foreground">Formative required</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-info/5 border border-info/10">
          <span className={cn("w-2 h-2 rounded-full shrink-0", a.summative_required ? "bg-success" : "bg-muted-foreground/30")} />
          <span className="text-[11px] text-foreground">Summative required</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-warning/5 border border-warning/10">
          <span className={cn("w-2 h-2 rounded-full shrink-0", a.auto_moderate_borderline ? "bg-success" : "bg-muted-foreground/30")} />
          <span className="text-[11px] text-foreground">Auto-moderate borderline</span>
        </div>
        {a.moderation_threshold_percent != null && (
          <div className="px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/30">
            <p className="text-[10px] text-muted-foreground">Moderation threshold</p>
            <p className="text-sm font-bold text-foreground">{a.moderation_threshold_percent}%</p>
          </div>
        )}
      </div>

      <div className="bg-secondary/20 rounded-xl border border-border/30 overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_60px_70px_60px_60px] gap-0 px-4 py-2.5 border-b border-border/30 bg-secondary/40">
          {["Type","Active","Mod.","Weight","Tries","Resub"].map(h => (
            <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center first:text-left">{h}</span>
          ))}
        </div>
        {a.allowed_types.map(rule => {
          const meta = typeLabels[rule.type] || { label: rule.type, desc: "" };
          return (
            <div key={rule.type} className={cn(
              "grid grid-cols-[1fr_60px_60px_70px_60px_60px] gap-0 px-4 py-3 items-center border-b border-border/20",
              rule.enabled ? "bg-card" : "bg-secondary/10 opacity-50"
            )}>
              <div>
                <p className="text-xs font-medium text-foreground">{meta.label}</p>
                <p className="text-[9px] text-muted-foreground">{meta.desc}</p>
              </div>
              <div className="flex justify-center">
                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center", rule.enabled ? "bg-success/20" : "bg-muted/40")}>
                  {rule.enabled ? <CheckCircle2 className="w-3 h-3 text-success" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
                </span>
              </div>
              <div className="flex justify-center">
                <span className={cn("text-[10px]", rule.requires_moderation ? "text-success" : "text-muted-foreground/30")}>
                  {rule.requires_moderation ? "✓" : "—"}
                </span>
              </div>
              <div className="flex justify-center">
                <span className="text-[11px] text-muted-foreground">{rule.default_weighting != null ? `${rule.default_weighting}%` : "—"}</span>
              </div>
              <div className="flex justify-center">
                <span className="text-[11px] text-muted-foreground">{rule.max_attempts}</span>
              </div>
              <div className="flex justify-center">
                <span className={cn("text-[10px]", rule.allow_resubmission ? "text-success" : "text-muted-foreground/30")}>
                  {rule.allow_resubmission ? "✓" : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Role-specific context panels ─────────────────────────────────────────────

function PMContextPanel({ typeId, typeName }: { typeId: string; typeName: string }) {
  const { data: programmes = [] } = useProgrammes();
  const myProgrammes = programmes.filter((p: any) => p.programme_type_id === typeId);
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">My Programmes — {typeName}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Programmes you manage governed by this type</p>
      </div>
      {myProgrammes.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <GraduationCap className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No programmes using this type yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {myProgrammes.slice(0, 8).map((p: any) => (
            <button
              key={p.id}
              onClick={() => navigate(`/programmes/${p.id}/builder`)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors text-left group"
            >
              <div className={cn("w-2 h-2 rounded-full shrink-0", p.status === "active" ? "bg-green-500" : "bg-muted-foreground/30")} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{p.title}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{p.status}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
          {myProgrammes.length > 8 && (
            <p className="px-5 py-2 text-[10px] text-muted-foreground">+{myProgrammes.length - 8} more programmes</p>
          )}
        </div>
      )}
    </div>
  );
}

function OpsContextPanel({ typeId, typeName, config }: { typeId: string; typeName: string; config: ProgrammeTypeConfig }) {
  const { data: programmes = [] } = useProgrammes();
  const typeProgrammes = programmes.filter((p: any) => p.programme_type_id === typeId);
  const active  = typeProgrammes.filter((p: any) => p.status === "active").length;
  const draft   = typeProgrammes.filter((p: any) => p.status === "draft").length;

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Governance Overview — {typeName}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Compliance and usage summary</p>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{typeProgrammes.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Programmes</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{active}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Governance Rules</p>
          {[
            { label: "Workplace",         on: config.workplace === "required",    val: config.workplace.replace(/_/g, " ") },
            { label: "Assessment",        on: config.assessment === "required",   val: config.assessment.replace(/_/g, " ") },
            { label: "Regulatory",        on: config.regulatory === "enabled",    val: config.regulatory },
            { label: "External Verify",   on: config.verification === "required", val: config.verification.replace(/_/g, " ") },
            { label: "Audit Trail",       on: config.compliance.audit_trail_required, val: config.compliance.audit_trail_required ? "Required" : "Not required" },
            { label: "Sponsor Required",  on: config.financial.sponsor_required,  val: config.financial.sponsor_required ? "Yes" : "No" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
              <span className={cn("text-[11px] font-semibold capitalize", item.on ? "text-success" : "text-muted-foreground")}>
                {item.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgrammeTypeEngineView() {
  const { roles } = useAuth();
  const isPM  = roles.includes("programme_manager" as any);
  const isOps = roles.includes("operations" as any);

  const { data: types = [], isLoading } = useProgrammeTypes();
  const { data: countries = [] } = useCountries();

  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState<ConfigTab>("behaviour");
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);

  const effectiveId = selectedId || types[0]?.id || null;
  const selected    = types.find(t => t.id === effectiveId);
  const resolvedConfig = selected ? resolveConfig((selected.config as Record<string, any>) || {}) : null;

  const { data: countryOverlay, isLoading: overlayLoading } = useCountryOverlay(
    selectedCountryId || undefined,
    selected?.name
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <WelcomeBanner
        subtitle={
          isPM
            ? "Browse programme type configurations that govern your programmes. Contact Super Admin to request changes."
            : "Review programme type governance rules for oversight and compliance monitoring."
        }
      />

      {/* Read-only notice */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border/50">
        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">Read-only view.</span>
          {" "}Programme Type configurations are managed exclusively by Super Admins. To request a change, contact your platform administrator.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Type Sidebar ── */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">Programme Types</p>
          <div className="space-y-2">
            {types.map(t => (
              <TypeDNACard
                key={t.id}
                type={t}
                isSelected={effectiveId === t.id}
                onSelect={() => { setSelectedId(t.id); setSelectedCountryId(null); setActiveTab("behaviour"); }}
                canDelete={false}
                // No onEdit / onDelete — read-only
              />
            ))}
          </div>

          {/* Country overlay selector */}
          {countries.length > 0 && selected && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Country Overlay</p>
              <div className="relative">
                <select
                  value={selectedCountryId || ""}
                  onChange={e => setSelectedCountryId(e.target.value || null)}
                  className="w-full px-3 py-2.5 text-sm bg-card rounded-xl border border-border/50 text-foreground appearance-none cursor-pointer focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  <option value="">No country overlay</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.iso_code})</option>
                  ))}
                </select>
                <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* ── Config Panel ── */}
        {selected && resolvedConfig && (
          <div
            className={cn("space-y-4 animate-fade-in")}
            style={{ gridColumn: selectedCountryId ? "span 1" : "span 3" }}
            key={effectiveId}
          >
            {/* Type header */}
            <div className="bg-card rounded-xl border border-border/50 p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: selected.color }} />
              <div className="flex items-center gap-3 mt-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: selected.color }}>
                  {selected.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.description}</p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" /> Read-only
                </span>
              </div>
              {selected.programme_count > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {selected.programme_count} programme{selected.programme_count !== 1 ? "s" : ""} governed by this type
                </p>
              )}
            </div>

            {/* Tabs + read-only content */}
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <TabStepper
                tabs={configTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                config={resolvedConfig}
                compact={!!selectedCountryId}
              />
              <div className="p-5">
                {activeTab === "behaviour"  && <ReadOnlyBehaviour  config={resolvedConfig} />}
                {activeTab === "structural" && <ReadOnlyStructural config={resolvedConfig} />}
                {activeTab === "financial"  && <ReadOnlyFinancial  config={resolvedConfig} />}
                {activeTab === "compliance" && <ReadOnlyCompliance config={resolvedConfig} />}
                {activeTab === "workflow"   && <ReadOnlyWorkflow   config={resolvedConfig} />}
                {activeTab === "hr"         && <ReadOnlyHR         config={resolvedConfig} />}
                {activeTab === "evaluation" && <ReadOnlyEvaluation config={resolvedConfig} />}
                {activeTab === "assessments"&& <ReadOnlyAssessments config={resolvedConfig} />}
              </div>
            </div>

            {/* Hints (informational only) */}
            <ConditionalHints config={resolvedConfig} />

            {/* Bottom row: health + role-specific context */}
            <div className={cn("grid gap-4", selectedCountryId ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
              <ConfigHealthScore config={resolvedConfig} />
              {isPM  && <PMContextPanel  typeId={selected.id} typeName={selected.name} />}
              {isOps && <OpsContextPanel typeId={selected.id} typeName={selected.name} config={resolvedConfig} />}
            </div>
          </div>
        )}

        {/* ── Country Overlay Panel ── */}
        {selectedCountryId && selected && (
          <div className="lg:col-span-2 space-y-4" key={selectedCountryId}>
            {overlayLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </div>
            ) : countryOverlay ? (
              <CountryOverlayPanel
                data={countryOverlay as any}
                countryName={countries.find(c => c.id === selectedCountryId)?.name || ""}
              />
            ) : (
              <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
                <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No country mapping for <span className="font-medium text-foreground">{selected.name}</span> in this country.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
