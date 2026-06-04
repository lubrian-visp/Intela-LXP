import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ProgrammeTypeConfig } from "@/types/programmeTypeConfig";

export type ConfigTab = "behaviour" | "structural" | "financial" | "compliance" | "workflow" | "hr" | "evaluation" | "assessments";

interface TabStepperProps {
  tabs: { key: ConfigTab; label: string; icon: React.ReactNode }[];
  activeTab: ConfigTab;
  onTabChange: (tab: ConfigTab) => void;
  config: ProgrammeTypeConfig;
  compact?: boolean;
}

function getTabStatus(tab: ConfigTab, config: ProgrammeTypeConfig): "complete" | "warning" | "default" {
  switch (tab) {
    case "behaviour":
      return "complete"; // Always has values
    case "structural":
      return (config.structural.default_credits !== null || config.structural.default_duration_months !== null)
        ? "complete" : "default";
    case "financial":
      return "complete"; // Fee structure always set
    case "compliance":
      return config.compliance.regulatory_body_required || config.compliance.accreditation_required
        ? "complete" : "default";
    case "workflow":
      return "complete";
    case "hr":
      return config.hr.facilitator_required || config.hr.assessor_required
        ? "complete" : "default";
    case "evaluation": {
      const total = config.evaluation.knowledge_weight + config.evaluation.practical_weight + config.evaluation.workplace_weight;
      if (total !== 100) return "warning";
      return "complete";
    }
    case "assessments": {
      const enabled = config.assessmentConfig.allowed_types.filter(t => t.enabled);
      return enabled.length > 0 ? "complete" : "warning";
    }
    default:
      return "default";
  }
}

export default function TabStepper({ tabs, activeTab, onTabChange, config, compact }: TabStepperProps) {
  return (
    <div className="px-4 pt-3 pb-0 border-b border-border flex items-center gap-0.5 overflow-x-auto">
      {tabs.map((tab, idx) => {
        const status = getTabStatus(tab.key, config);
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap relative",
              isActive
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {tab.icon}
            {!compact && tab.label}
            {/* Status indicator */}
            {status === "complete" && !isActive && (
              <CheckCircle2 className="w-3 h-3 text-success/60" />
            )}
            {status === "warning" && (
              <AlertCircle className="w-3 h-3 text-warning" />
            )}
            {/* Step number */}
            {!compact && (
              <span className={cn(
                "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center",
                isActive ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
              )}>
                {idx + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
