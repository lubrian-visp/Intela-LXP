import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/usePlatformSettings";
import { Switch } from "@/components/ui/switch";

const labelMap: Record<string, string> = {
  compliance_gdpr: "GDPR Data Controls",
  compliance_iso19796: "ISO/IEC 19796 Alignment",
  compliance_data_retention: "Data Retention Policy",
  compliance_consent: "Consent Management",
  compliance_erasure: "Right to Erasure",
  compliance_dpia: "Data Protection Impact Assessment",
};

export default function ComplianceSection() {
  const { data: flags, isLoading } = useFeatureFlags("compliance_");
  const toggle = useToggleFeatureFlag();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Compliance Status</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Regulatory and data protection compliance controls.</p>
      </div>
      <div className="divide-y divide-border/50">
        {flags?.map((f) => (
          <div key={f.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {f.is_enabled ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {labelMap[f.flag_key] ?? f.flag_key.replace(/^compliance_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
                <p className="text-[11px] text-muted-foreground">{f.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                f.is_enabled ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}>
                {f.is_enabled ? "compliant" : "needs review"}
              </span>
              <Switch
                checked={f.is_enabled}
                onCheckedChange={(checked) => toggle.mutate({ id: f.id, is_enabled: checked })}
                disabled={toggle.isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
