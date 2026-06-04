import { cn } from "@/lib/utils";
import { AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";
import type { ProgrammeTypeConfig } from "@/types/programmeTypeConfig";
import type { ConfigTab } from "./TabStepper";

interface Hint {
  message: string;
  type: "warning" | "suggestion";
  tab: ConfigTab;
  action: string; // short label for the button
}

function computeHints(config: ProgrammeTypeConfig): Hint[] {
  const hints: Hint[] = [];

  if (config.workplace === "required" && !config.hr.mentor_required) {
    hints.push({
      message: "Workplace is mandatory — enable a Mentor in HR.",
      type: "warning", tab: "hr", action: "Fix in HR",
    });
  }

  if (config.workplace === "required" && config.evaluation.workplace_weight === 0) {
    hints.push({
      message: "Workplace is required but has 0% weight in K/P/W.",
      type: "warning", tab: "evaluation", action: "Fix in K/P/W",
    });
  }

  if (config.workplace === "not_allowed" && config.evaluation.workplace_weight > 0) {
    hints.push({
      message: `Workplace is disabled but has ${config.evaluation.workplace_weight}% weight allocated.`,
      type: "suggestion", tab: "evaluation", action: "Fix in K/P/W",
    });
  }

  if (config.verification === "required" && !config.compliance.regulatory_body_required) {
    hints.push({
      message: "External verification requires a regulatory body — enable it in Compliance.",
      type: "warning", tab: "compliance", action: "Fix in Compliance",
    });
  }

  if (config.poe === "required" && !config.evaluation.certification_rules.portfolio_required) {
    hints.push({
      message: "PoE is mandatory but portfolio is not required for certification.",
      type: "suggestion", tab: "evaluation", action: "Fix in K/P/W",
    });
  }

  if (config.cohort === "not_allowed" && config.hr.facilitator_required) {
    hints.push({
      message: "Self-paced mode is set — a facilitator is typically not needed.",
      type: "suggestion", tab: "hr", action: "Review HR",
    });
  }

  const total = config.evaluation.knowledge_weight + config.evaluation.practical_weight + config.evaluation.workplace_weight;
  if (total !== 100) {
    hints.push({
      message: `K/P/W weights total ${total}% — must equal 100% before saving.`,
      type: "warning", tab: "evaluation", action: "Fix in K/P/W",
    });
  }

  return hints;
}

interface ConditionalHintsProps {
  config: ProgrammeTypeConfig;
  onNavigate: (tab: ConfigTab) => void;
}

export default function ConditionalHints({ config, onNavigate }: ConditionalHintsProps) {
  const hints = computeHints(config);
  if (hints.length === 0) return null;

  const warnings    = hints.filter(h => h.type === "warning");
  const suggestions = hints.filter(h => h.type === "suggestion");

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="text-xs font-semibold text-foreground">Smart Suggestions</h3>
        {warnings.length > 0 && (
          <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
            {warnings.length} issue{warnings.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {hints.map((hint, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            hint.type === "warning"
              ? "bg-warning/5 border border-warning/15"
              : "bg-info/5 border border-info/10"
          )}
        >
          {hint.type === "warning"
            ? <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
            : <ArrowRight className="w-3 h-3 text-info shrink-0" />
          }
          <span className={cn(
            "text-[11px] flex-1",
            hint.type === "warning" ? "text-foreground" : "text-muted-foreground"
          )}>
            {hint.message}
          </span>
          <button
            onClick={() => onNavigate(hint.tab)}
            className={cn(
              "text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full transition-colors whitespace-nowrap",
              hint.type === "warning"
                ? "text-warning hover:bg-warning/10"
                : "text-info hover:bg-info/10"
            )}
          >
            {hint.action} →
          </button>
        </div>
      ))}
    </div>
  );
}
