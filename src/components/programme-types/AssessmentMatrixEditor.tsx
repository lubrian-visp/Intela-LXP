import { cn } from "@/lib/utils";
import { type AssessmentAttributes, type AssessmentTypeRule } from "@/types/programmeTypeConfig";
import { Shield, Scale, Info } from "lucide-react";

interface AssessmentMatrixEditorProps {
  data: AssessmentAttributes;
  onChange: (data: AssessmentAttributes) => void;
}

const typeLabels: Record<string, { label: string; desc: string }> = {
  formative:     { label: "Formative",     desc: "Continuous assessment during learning — quizzes, check-ins" },
  summative:     { label: "Summative",     desc: "End-of-unit evaluation measuring overall achievement" },
  homework:      { label: "Homework",      desc: "Take-home assignments completed outside session hours" },
  peer_group:    { label: "Peer Group",    desc: "Learners evaluate each other's work" },
  group_project: { label: "Group Project", desc: "Collaborative deliverable submitted by a team" },
  final_project: { label: "Final Project", desc: "Capstone deliverable at programme conclusion" },
  competency:    { label: "Competency",    desc: "Practical skills-based evaluation against a rubric" },
  workplace:     { label: "Workplace",     desc: "On-the-job observation and sign-off by a supervisor" },
  oral:          { label: "Oral",          desc: "Verbal examination or viva voce" },
  portfolio:     { label: "Portfolio",     desc: "Curated collection of evidence across the programme" },
};

// Group assessment types for visual clarity
const GROUPS: { label: string; color: string; types: string[] }[] = [
  { label: "Core",          color: "bg-blue-500/5 border-blue-500/10",   types: ["formative", "summative"] },
  { label: "Written",       color: "bg-amber-500/5 border-amber-500/10", types: ["homework"] },
  { label: "Collaborative", color: "bg-green-500/5 border-green-500/10", types: ["peer_group", "group_project"] },
  { label: "Project-Based", color: "bg-purple-500/5 border-purple-500/10", types: ["final_project", "competency"] },
  { label: "Workplace",     color: "bg-orange-500/5 border-orange-500/10", types: ["workplace"] },
  { label: "Verbal / Evidence", color: "bg-sky-500/5 border-sky-500/10", types: ["oral", "portfolio"] },
];

const COLUMN_TOOLTIPS: Record<string, string> = {
  active:  "Enable this assessment type for programmes using this config",
  mod:     "Require a moderator to validate marks before finalising",
  weight:  "Default percentage weighting in the overall score (leave blank for unweighted)",
  tries:   "Maximum number of attempts a learner is allowed",
  resub:   "Allow learner to resubmit after a failed attempt",
};

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        "w-8 h-4 rounded-full relative transition-colors shrink-0",
        disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
        value ? "bg-success" : "bg-muted-foreground/20"
      )}
    >
      <div className={cn(
        "w-3 h-3 rounded-full bg-white shadow-sm absolute top-0.5 transition-all",
        value ? "left-[17px]" : "left-[2px]"
      )} />
    </button>
  );
}

function ColHeader({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center justify-center gap-1 group relative">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <Info className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-help" />
      {/* Tooltip */}
      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 w-44 px-2.5 py-1.5 bg-foreground text-background text-[10px] rounded-lg shadow-lg pointer-events-none text-center leading-tight">
        {tooltip}
      </div>
    </div>
  );
}

export default function AssessmentMatrixEditor({ data, onChange }: AssessmentMatrixEditorProps) {
  const updateType = (index: number, updates: Partial<AssessmentTypeRule>) => {
    const newTypes = [...data.allowed_types];
    newTypes[index] = { ...newTypes[index], ...updates };
    onChange({ ...data, allowed_types: newTypes });
  };

  const updateGlobal = (key: keyof AssessmentAttributes, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const enabledCount  = data.allowed_types.filter(t => t.enabled).length;
  const totalWeighting = data.allowed_types
    .filter(t => t.enabled && t.default_weighting != null)
    .reduce((sum, t) => sum + (t.default_weighting ?? 0), 0);
  const hasWeighting  = data.allowed_types.some(t => t.enabled && t.default_weighting != null);

  return (
    <div className="space-y-5">
      {/* Global settings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <Toggle value={data.formative_required} onChange={v => updateGlobal("formative_required", v)} />
          <span className="text-[11px] font-medium text-foreground">Formative required</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <Toggle value={data.summative_required} onChange={v => updateGlobal("summative_required", v)} />
          <span className="text-[11px] font-medium text-foreground">Summative required</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-warning/5 border border-warning/10">
          <Toggle value={data.auto_moderate_borderline} onChange={v => updateGlobal("auto_moderate_borderline", v)} />
          <span className="text-[11px] font-medium text-foreground">Auto-moderate borderline</span>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/30">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Moderation threshold %</span>
          </div>
          <input
            type="number"
            value={data.moderation_threshold_percent ?? ""}
            onChange={e => updateGlobal("moderation_threshold_percent", e.target.value === "" ? null : Number(e.target.value))}
            className="w-full px-2 py-1 text-xs bg-card rounded border border-border/30 outline-none focus:ring-1 focus:ring-primary text-foreground"
            placeholder="%"
            min={0} max={100}
          />
        </div>
      </div>

      {/* Grouped matrix */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_64px_64px_72px_60px_64px] gap-0 px-4 py-2.5 bg-secondary/50 border-b border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
          <ColHeader label="Active" tooltip={COLUMN_TOOLTIPS.active} />
          <ColHeader label="Mod."   tooltip={COLUMN_TOOLTIPS.mod} />
          <ColHeader label="Weight" tooltip={COLUMN_TOOLTIPS.weight} />
          <ColHeader label="Tries"  tooltip={COLUMN_TOOLTIPS.tries} />
          <ColHeader label="Resub"  tooltip={COLUMN_TOOLTIPS.resub} />
        </div>

        {GROUPS.map(group => {
          const groupRules = group.types
            .map(t => ({ rule: data.allowed_types.find(r => r.type === t), type: t }))
            .filter(x => x.rule !== undefined) as { rule: AssessmentTypeRule; type: string }[];

          if (groupRules.length === 0) return null;

          return (
            <div key={group.label} className={cn("border-b border-border/20 last:border-0", group.color)}>
              {/* Group label */}
              <div className="px-4 py-1.5 border-b border-border/10">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{group.label}</span>
              </div>

              {groupRules.map(({ rule, type }) => {
                const idx  = data.allowed_types.findIndex(r => r.type === type);
                const meta = typeLabels[type] || { label: type, desc: "" };

                return (
                  <div
                    key={type}
                    className={cn(
                      "grid grid-cols-[1fr_64px_64px_72px_60px_64px] gap-0 px-4 py-3 items-center border-b border-border/10 last:border-0 transition-colors",
                      rule.enabled ? "bg-card/60 hover:bg-card" : "opacity-50"
                    )}
                  >
                    {/* Type info */}
                    <div>
                      <p className="text-xs font-medium text-foreground">{meta.label}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{meta.desc}</p>
                    </div>

                    {/* Active */}
                    <div className="flex justify-center">
                      <Toggle value={rule.enabled} onChange={v => updateType(idx, { enabled: v })} />
                    </div>

                    {/* Moderation */}
                    <div className="flex justify-center">
                      <Toggle value={rule.requires_moderation} onChange={v => updateType(idx, { requires_moderation: v })} disabled={!rule.enabled} />
                    </div>

                    {/* Weight */}
                    <div className="flex justify-center">
                      <input
                        type="number"
                        value={rule.default_weighting ?? ""}
                        onChange={e => updateType(idx, { default_weighting: e.target.value === "" ? null : Number(e.target.value) })}
                        className="w-12 px-1.5 py-1 text-[11px] text-center bg-secondary/50 rounded border border-border/30 outline-none focus:ring-1 focus:ring-primary text-foreground disabled:opacity-30"
                        placeholder="—"
                        disabled={!rule.enabled}
                        min={0} max={100}
                      />
                    </div>

                    {/* Max attempts */}
                    <div className="flex justify-center">
                      <input
                        type="number"
                        value={rule.max_attempts}
                        onChange={e => updateType(idx, { max_attempts: Number(e.target.value) || 1 })}
                        className="w-10 px-1 py-1 text-[11px] text-center bg-secondary/50 rounded border border-border/30 outline-none focus:ring-1 focus:ring-primary text-foreground disabled:opacity-30"
                        min={1} max={10}
                        disabled={!rule.enabled}
                      />
                    </div>

                    {/* Resubmission */}
                    <div className="flex justify-center">
                      <Toggle value={rule.allow_resubmission} onChange={v => updateType(idx, { allow_resubmission: v })} disabled={!rule.enabled} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Weight total footer */}
        {hasWeighting && (
          <div className="grid grid-cols-[1fr_64px_64px_72px_60px_64px] gap-0 px-4 py-2 bg-secondary/40 border-t border-border/30">
            <span className="text-[10px] font-semibold text-muted-foreground">Total weight (enabled)</span>
            <span /><span />
            <div className="flex justify-center">
              <span className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded",
                totalWeighting === 100 ? "text-green-600" : totalWeighting > 100 ? "text-destructive" : "text-orange-500"
              )}>
                {totalWeighting}%
              </span>
            </div>
            <span /><span />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Scale className="w-3 h-3" />
        <span>{enabledCount} of {data.allowed_types.length} assessment types enabled</span>
        {hasWeighting && totalWeighting !== 100 && (
          <span className="text-orange-500 font-medium ml-1">
            · weights total {totalWeighting}% (should be 100%)
          </span>
        )}
      </div>
    </div>
  );
}
