import { cn } from "@/lib/utils";
import { type AssessmentAttributes, type AssessmentTypeRule } from "@/types/programmeTypeConfig";
import { CheckCircle2, XCircle, RotateCcw, Shield, Scale } from "lucide-react";

interface AssessmentMatrixEditorProps {
  data: AssessmentAttributes;
  onChange: (data: AssessmentAttributes) => void;
}

const typeLabels: Record<string, { label: string; desc: string }> = {
  formative: { label: "Formative", desc: "Ongoing assessment during learning" },
  summative: { label: "Summative", desc: "End-of-module evaluation" },
  homework: { label: "Homework", desc: "Take-home assignments" },
  peer_group: { label: "Peer Group", desc: "Peer-evaluated activities" },
  group_project: { label: "Group Project", desc: "Collaborative submissions" },
  final_project: { label: "Final Project", desc: "Capstone deliverable" },
  competency: { label: "Competency", desc: "Skills-based assessment" },
  workplace: { label: "Workplace", desc: "On-the-job evaluation" },
  oral: { label: "Oral", desc: "Verbal examination" },
  portfolio: { label: "Portfolio", desc: "Evidence collection" },
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "w-8 h-4 rounded-full relative transition-colors shrink-0",
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

export default function AssessmentMatrixEditor({ data, onChange }: AssessmentMatrixEditorProps) {
  const updateType = (index: number, updates: Partial<AssessmentTypeRule>) => {
    const newTypes = [...data.allowed_types];
    newTypes[index] = { ...newTypes[index], ...updates };
    onChange({ ...data, allowed_types: newTypes });
  };

  const updateGlobal = (key: keyof AssessmentAttributes, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const enabledCount = data.allowed_types.filter(t => t.enabled).length;

  return (
    <div className="space-y-5">
      {/* Global settings bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-info/5 border border-info/10">
          <Toggle value={data.formative_required} onChange={v => updateGlobal("formative_required", v)} />
          <span className="text-[11px] font-medium text-foreground">Formative required</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-info/5 border border-info/10">
          <Toggle value={data.summative_required} onChange={v => updateGlobal("summative_required", v)} />
          <span className="text-[11px] font-medium text-foreground">Summative required</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-warning/5 border border-warning/10">
          <Toggle value={data.auto_moderate_borderline} onChange={v => updateGlobal("auto_moderate_borderline", v)} />
          <span className="text-[11px] font-medium text-foreground">Auto-moderate borderline</span>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-secondary/50 border border-border/30">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Moderation threshold</span>
          </div>
          <input
            type="number"
            value={data.moderation_threshold_percent ?? ""}
            onChange={e => updateGlobal("moderation_threshold_percent", e.target.value === "" ? null : Number(e.target.value))}
            className="w-full mt-1 px-2 py-1 text-xs bg-card rounded border border-border/30 outline-none focus:ring-1 focus:ring-accent text-foreground"
            placeholder="%"
          />
        </div>
      </div>

      {/* Matrix grid */}
      <div className="bg-secondary/20 rounded-xl border border-border/30 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_60px_60px_70px_60px_60px] gap-0 px-4 py-2.5 border-b border-border/30 bg-secondary/40">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Active</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Mod.</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Weight</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Tries</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Resub</span>
        </div>

        {/* Rows */}
        {data.allowed_types.map((rule, idx) => {
          const meta = typeLabels[rule.type] || { label: rule.type, desc: "" };
          return (
            <div
              key={rule.type}
              className={cn(
                "grid grid-cols-[1fr_60px_60px_70px_60px_60px] gap-0 px-4 py-3 items-center border-b border-border/20 transition-colors",
                rule.enabled ? "bg-card" : "bg-secondary/10 opacity-60"
              )}
            >
              <div>
                <p className="text-xs font-medium text-foreground">{meta.label}</p>
                <p className="text-[9px] text-muted-foreground">{meta.desc}</p>
              </div>
              <div className="flex justify-center">
                <Toggle value={rule.enabled} onChange={v => updateType(idx, { enabled: v })} />
              </div>
              <div className="flex justify-center">
                <Toggle value={rule.requires_moderation} onChange={v => updateType(idx, { requires_moderation: v })} />
              </div>
              <div className="flex justify-center">
                <input
                  type="number"
                  value={rule.default_weighting ?? ""}
                  onChange={e => updateType(idx, { default_weighting: e.target.value === "" ? null : Number(e.target.value) })}
                  className="w-12 px-1.5 py-1 text-[11px] text-center bg-secondary/50 rounded border border-border/30 outline-none focus:ring-1 focus:ring-accent text-foreground"
                  placeholder="—"
                  disabled={!rule.enabled}
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="number"
                  value={rule.max_attempts}
                  onChange={e => updateType(idx, { max_attempts: Number(e.target.value) || 1 })}
                  className="w-10 px-1 py-1 text-[11px] text-center bg-secondary/50 rounded border border-border/30 outline-none focus:ring-1 focus:ring-accent text-foreground"
                  min={1}
                  max={10}
                  disabled={!rule.enabled}
                />
              </div>
              <div className="flex justify-center">
                <Toggle value={rule.allow_resubmission} onChange={v => updateType(idx, { allow_resubmission: v })} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Scale className="w-3 h-3" />
        <span>{enabledCount} of {data.allowed_types.length} assessment types enabled</span>
      </div>
    </div>
  );
}
