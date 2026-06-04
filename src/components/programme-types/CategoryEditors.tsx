import { cn } from "@/lib/utils";
import { AlertTriangle, Wand2 } from "lucide-react";
import {
  type StructuralAttributes,
  type FinancialAttributes,
  type ComplianceAttributes,
  type WorkflowAttributes,
  type HRAttributes,
  type EvaluationTemplate,
  type FeeStructure,
} from "@/types/programmeTypeConfig";
import FieldLockToggle from "./FieldLockToggle";

// ── Shared helpers ──────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
      placeholder={placeholder ?? "—"}
      className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground"
    />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
    >
      <div className={cn(
        "w-8 h-4.5 rounded-full relative transition-colors flex items-center",
        value ? "bg-success" : "bg-muted-foreground/30"
      )} style={{ width: 32, height: 18 }}>
        <div className={cn(
          "w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-all",
          value ? "left-[15px]" : "left-[2px]"
        )} />
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </button>
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent text-foreground cursor-pointer"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Helper to create lock-aware field ───────────────────────────
interface LockFieldProps {
  fieldName: string;
  lockedFields: string[];
  onToggleLock: (fields: string[]) => void;
  label: string;
  children: React.ReactNode;
  hint?: string;
}

function LockField({ fieldName, lockedFields, onToggleLock, label, children, hint }: LockFieldProps) {
  return (
    <FieldLockToggle
      fieldName={fieldName}
      lockedFields={lockedFields}
      onToggle={onToggleLock}
      label={label}
      hint={hint}
    >
      {children}
    </FieldLockToggle>
  );
}

// ── 1. Structural ───────────────────────────────────────────────
interface CategoryProps<T> {
  data: T;
  onChange: (data: T) => void;
}

export function StructuralEditor({ data, onChange }: CategoryProps<StructuralAttributes>) {
  const update = (key: keyof StructuralAttributes, value: any) => onChange({ ...data, [key]: value });
  const onToggleLock = (fields: string[]) => update("locked_fields", fields);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <LockField fieldName="default_duration_months" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Default Duration (months)" hint="Inherited by new programmes">
        <NumberInput value={data.default_duration_months} onChange={v => update("default_duration_months", v)} placeholder="e.g. 12" />
      </LockField>
      <LockField fieldName="default_credits" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Default Credits" hint="NQF credit value">
        <NumberInput value={data.default_credits} onChange={v => update("default_credits", v)} placeholder="e.g. 120" />
      </LockField>
      <LockField fieldName="default_nqf_level" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Default NQF Level" hint="Qualification level">
        <NumberInput value={data.default_nqf_level} onChange={v => update("default_nqf_level", v)} placeholder="e.g. 5" />
      </LockField>
      <LockField fieldName="min_modules" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Min Modules">
        <NumberInput value={data.min_modules} onChange={v => update("min_modules", v)} placeholder="No minimum" />
      </LockField>
      <LockField fieldName="max_modules" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Max Modules">
        <NumberInput value={data.max_modules} onChange={v => update("max_modules", v)} placeholder="No maximum" />
      </LockField>
    </div>
  );
}

// ── 2. Financial ────────────────────────────────────────────────
export function FinancialEditor({ data, onChange }: CategoryProps<FinancialAttributes>) {
  const update = (key: keyof FinancialAttributes, value: any) => onChange({ ...data, [key]: value });
  const onToggleLock = (fields: string[]) => update("locked_fields", fields);

  const feeAmountSetButFree = data.fee_structure === "free" && (data.default_fee_amount ?? 0) > 0;

  return (
    <div className="space-y-4">
      {feeAmountSetButFree && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-warning/8 border border-warning/20">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-warning">
            Fee structure is set to <strong>Free / Funded</strong> but a fee amount is entered. Clear the amount or change the structure.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LockField fieldName="fee_structure" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Fee Structure">
          <SelectInput
            value={data.fee_structure}
            onChange={v => update("fee_structure", v as FeeStructure)}
            options={[
              { value: "fixed", label: "Fixed Fee" },
              { value: "per_module", label: "Per Module" },
              { value: "subscription", label: "Subscription" },
              { value: "free", label: "Free / Funded" },
            ]}
          />
        </LockField>
        <LockField fieldName="default_fee_amount" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Default Fee Amount">
          <NumberInput value={data.default_fee_amount} onChange={v => update("default_fee_amount", v)} placeholder="0.00" />
        </LockField>
        <LockField fieldName="currency" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Currency">
          <SelectInput
            value={data.currency}
            onChange={v => update("currency", v)}
            options={[
              { value: "ZAR", label: "ZAR (South African Rand)" },
              { value: "USD", label: "USD (US Dollar)" },
              { value: "EUR", label: "EUR (Euro)" },
              { value: "GBP", label: "GBP (British Pound)" },
              { value: "KES", label: "KES (Kenyan Shilling)" },
              { value: "NGN", label: "NGN (Nigerian Naira)" },
            ]}
          />
        </LockField>
      </div>
      <div className="space-y-1">
        <LockField fieldName="funding_eligible" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Funding Eligibility">
          <Toggle value={data.funding_eligible} onChange={v => update("funding_eligible", v)} label="Eligible for government funding" />
        </LockField>
        <LockField fieldName="sponsor_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Sponsor Requirement">
          <Toggle value={data.sponsor_required} onChange={v => update("sponsor_required", v)} label="Sponsor required for enrolment" />
        </LockField>
      </div>
    </div>
  );
}

// ── 3. Compliance ───────────────────────────────────────────────
export function ComplianceEditor({ data, onChange }: CategoryProps<ComplianceAttributes>) {
  const update = (key: keyof ComplianceAttributes, value: any) => onChange({ ...data, [key]: value });
  const onToggleLock = (fields: string[]) => update("locked_fields", fields);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <LockField fieldName="regulatory_body_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Regulatory Oversight">
          <Toggle value={data.regulatory_body_required} onChange={v => update("regulatory_body_required", v)} label="Regulatory body oversight required" />
        </LockField>
        <LockField fieldName="accreditation_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Accreditation">
          <Toggle value={data.accreditation_required} onChange={v => update("accreditation_required", v)} label="Programme accreditation required" />
        </LockField>
        <LockField fieldName="audit_trail_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Audit Trail">
          <Toggle value={data.audit_trail_required} onChange={v => update("audit_trail_required", v)} label="Full audit trail required" />
        </LockField>
      </div>
      <LockField fieldName="reporting_frequency" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Reporting Frequency" hint="How often compliance reports must be submitted">
        <SelectInput
          value={data.reporting_frequency ?? "none"}
          onChange={v => update("reporting_frequency", v === "none" ? null : v)}
          options={[
            { value: "none", label: "Not Required" },
            { value: "monthly", label: "Monthly" },
            { value: "quarterly", label: "Quarterly" },
            { value: "biannually", label: "Bi-annually" },
            { value: "annually", label: "Annually" },
          ]}
        />
      </LockField>
    </div>
  );
}

// ── 4. Workflow ─────────────────────────────────────────────────
export function WorkflowEditor({ data, onChange }: CategoryProps<WorkflowAttributes>) {
  const update = (key: keyof WorkflowAttributes, value: any) => onChange({ ...data, [key]: value });
  const onToggleLock = (fields: string[]) => update("locked_fields", fields);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <LockField fieldName="approval_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Approval Gate">
          <Toggle value={data.approval_required} onChange={v => update("approval_required", v)} label="Programme creation requires approval" />
        </LockField>
        {/* Auto-publish and stages only make sense when approval is enabled */}
        <div className={cn("transition-opacity", !data.approval_required && "opacity-40 pointer-events-none")}>
          <LockField fieldName="auto_publish" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Auto-publish">
            <Toggle value={data.auto_publish} onChange={v => update("auto_publish", v)} label="Auto-publish after all approvals complete" />
          </LockField>
        </div>
      </div>
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity", !data.approval_required && "opacity-40 pointer-events-none")}>
        <LockField fieldName="approval_stages" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Approval Stages" hint="Number of approval gates required">
          <NumberInput value={data.approval_stages} onChange={v => update("approval_stages", v ?? 1)} placeholder="1" />
        </LockField>
        <LockField fieldName="review_cycle_days" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Review Cycle (days)" hint="Days between mandatory programme reviews">
          <NumberInput value={data.review_cycle_days} onChange={v => update("review_cycle_days", v)} placeholder="No cycle" />
        </LockField>
      </div>
      {!data.approval_required && (
        <p className="text-[10px] text-muted-foreground px-1">
          Enable the approval gate above to configure stages and auto-publish rules.
        </p>
      )}
    </div>
  );
}

// ── 5. HR ───────────────────────────────────────────────────────
export function HREditor({ data, onChange }: CategoryProps<HRAttributes>) {
  const update = (key: keyof HRAttributes, value: any) => onChange({ ...data, [key]: value });
  const onToggleLock = (fields: string[]) => update("locked_fields", fields);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <LockField fieldName="facilitator_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Facilitator">
          <Toggle value={data.facilitator_required} onChange={v => update("facilitator_required", v)} label="Facilitator required" />
        </LockField>
        <LockField fieldName="mentor_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Mentor">
          <Toggle value={data.mentor_required} onChange={v => update("mentor_required", v)} label="Mentor required" />
        </LockField>
        <LockField fieldName="assessor_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Assessor">
          <Toggle value={data.assessor_required} onChange={v => update("assessor_required", v)} label="Assessor required" />
        </LockField>
        <LockField fieldName="moderator_required" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Moderator">
          <Toggle value={data.moderator_required} onChange={v => update("moderator_required", v)} label="Moderator required" />
        </LockField>
      </div>
      <LockField fieldName="max_learner_ratio" lockedFields={data.locked_fields} onToggleLock={onToggleLock} label="Max Learner-to-Facilitator Ratio" hint="e.g. 25 means 25:1">
        <NumberInput value={data.max_learner_ratio} onChange={v => update("max_learner_ratio", v)} placeholder="No limit" />
      </LockField>
    </div>
  );
}

// ── K/P/W Evaluation ────────────────────────────────────────────
export function EvaluationEditor({ data, onChange }: CategoryProps<EvaluationTemplate>) {
  const update = (key: string, value: any) => {
    if (key.startsWith("certification_rules.")) {
      const ruleKey = key.replace("certification_rules.", "");
      onChange({
        ...data,
        certification_rules: { ...data.certification_rules, [ruleKey]: value },
      });
    } else {
      onChange({ ...data, [key]: value });
    }
  };

  const totalWeight = data.knowledge_weight + data.practical_weight + data.workplace_weight;
  const isBalanced = totalWeight === 100;
  const remainder = 100 - totalWeight;

  // Auto-normalize: distribute remainder proportionally across non-zero domains
  const handleAutoNormalize = () => {
    const k = data.knowledge_weight;
    const p = data.practical_weight;
    const w = data.workplace_weight;
    const sum = k + p + w;
    if (sum === 0) {
      // Equal split
      onChange({ ...data, knowledge_weight: 34, practical_weight: 33, workplace_weight: 33 });
    } else {
      // Proportional round-to-integer with remainder on largest
      const newK = Math.round((k / sum) * 100);
      const newP = Math.round((p / sum) * 100);
      const newW = 100 - newK - newP;
      onChange({ ...data, knowledge_weight: newK, practical_weight: newP, workplace_weight: Math.max(0, newW) });
    }
  };

  return (
    <div className="space-y-5">
      {/* Domain Weights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Domain Weights</p>
          <div className="flex items-center gap-2">
            {!isBalanced && (
              <button
                type="button"
                onClick={handleAutoNormalize}
                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Wand2 className="w-2.5 h-2.5" />
                Auto-normalize
              </button>
            )}
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              isBalanced ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {totalWeight}% / 100%
            </span>
          </div>
        </div>

        {/* Blocking error banner */}
        {!isBalanced && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/8 border border-destructive/20 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
            <p className="text-[11px] text-destructive">
              Weights total <strong>{totalWeight}%</strong> — must equal exactly 100% before saving.
              {remainder > 0 ? ` ${remainder}% unallocated.` : ` ${Math.abs(remainder)}% over-allocated.`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {(["knowledge", "practical", "workplace"] as const).map(domain => {
            const weightKey = `${domain}_weight` as keyof EvaluationTemplate;
            const passKey = `${domain}_pass_mark` as keyof EvaluationTemplate;
            const colors = { knowledge: "bg-info", practical: "bg-warning", workplace: "bg-success" };
            const labels = { knowledge: "Knowledge (K)", practical: "Practical (P)", workplace: "Workplace (W)" };

            return (
              <div key={domain} className="bg-secondary/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", colors[domain])} />
                  <span className="text-xs font-semibold text-foreground">{labels[domain]}</span>
                </div>
                <Field label="Weight %">
                  <NumberInput
                    value={data[weightKey] as number}
                    onChange={v => update(weightKey, v ?? 0)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Pass Mark %">
                  <NumberInput
                    value={data[passKey] as number}
                    onChange={v => update(passKey, v ?? 50)}
                    placeholder="50"
                  />
                </Field>
              </div>
            );
          })}
        </div>
        {/* Visual weight bar */}
        <div className="flex rounded-full overflow-hidden h-2 mt-3">
          <div className="bg-info transition-all" style={{ width: `${data.knowledge_weight}%` }} />
          <div className="bg-warning transition-all" style={{ width: `${data.practical_weight}%` }} />
          <div className="bg-success transition-all" style={{ width: `${data.workplace_weight}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
          <span>K: {data.knowledge_weight}%</span>
          <span>P: {data.practical_weight}%</span>
          <span>W: {data.workplace_weight}%</span>
        </div>
      </div>

      {/* Certification Rules */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certification Rules</p>
        <div className="space-y-1">
          <Toggle
            value={data.certification_rules.all_domains_must_pass}
            onChange={v => update("certification_rules.all_domains_must_pass", v)}
            label="All domains must be passed individually"
          />
          <Toggle
            value={data.certification_rules.portfolio_required}
            onChange={v => update("certification_rules.portfolio_required", v)}
            label="Portfolio of Evidence required for certification"
          />
        </div>
        <div className="mt-3">
          <Field label="Minimum Attendance %" hint="Leave empty for no requirement">
            <NumberInput
              value={data.certification_rules.minimum_attendance_percent}
              onChange={v => update("certification_rules.minimum_attendance_percent", v)}
              placeholder="e.g. 80"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
