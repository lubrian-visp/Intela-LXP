import { cn } from "@/lib/utils";
import { Lightbulb, ArrowRight } from "lucide-react";
import type { ProgrammeTypeConfig } from "@/types/programmeTypeConfig";

interface Hint {
  message: string;
  type: "suggestion" | "warning";
}

function computeHints(config: ProgrammeTypeConfig): Hint[] {
  const hints: Hint[] = [];

  if (config.workplace === "required" && !config.hr.mentor_required) {
    hints.push({ message: "Workplace is mandatory but no mentor is required. Consider enabling mentors in the HR tab.", type: "warning" });
  }

  if (config.workplace === "required" && config.evaluation.workplace_weight === 0) {
    hints.push({ message: "Workplace is required but has 0% weight in K/P/W. Allocate weight in the Evaluation tab.", type: "warning" });
  }

  if (config.workplace === "not_allowed" && config.evaluation.workplace_weight > 0) {
    hints.push({ message: "Workplace is disabled but has weight allocated. Consider setting workplace weight to 0%.", type: "suggestion" });
  }

  if (config.verification === "required" && !config.compliance.regulatory_body_required) {
    hints.push({ message: "External verification requires a regulatory body. Enable this in the Compliance tab.", type: "warning" });
  }

  if (config.poe === "required" && !config.evaluation.certification_rules.portfolio_required) {
    hints.push({ message: "PoE is mandatory but portfolio is not required for certification. Update Evaluation rules.", type: "suggestion" });
  }

  if (config.cohort === "not_allowed" && config.hr.facilitator_required) {
    hints.push({ message: "Self-paced mode is set but facilitator is required. Self-paced typically doesn't need a facilitator.", type: "suggestion" });
  }

  const total = config.evaluation.knowledge_weight + config.evaluation.practical_weight + config.evaluation.workplace_weight;
  if (total !== 100) {
    hints.push({ message: `K/P/W weights total ${total}% instead of 100%. Adjust in the Evaluation tab.`, type: "warning" });
  }

  return hints;
}

interface ConditionalHintsProps {
  config: ProgrammeTypeConfig;
}

export default function ConditionalHints({ config }: ConditionalHintsProps) {
  const hints = computeHints(config);
  if (hints.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-warning" />
        <h3 className="text-xs font-semibold text-foreground">Smart Suggestions</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{hints.length} hint{hints.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-2">
        {hints.map((hint, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 px-3 py-2.5 rounded-lg text-[11px]",
              hint.type === "warning"
                ? "bg-warning/5 border border-warning/15 text-warning"
                : "bg-info/5 border border-info/15 text-info"
            )}
          >
            <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="text-foreground">{hint.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
