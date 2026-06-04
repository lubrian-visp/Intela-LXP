import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import type { ProgrammeTypeConfig } from "@/types/programmeTypeConfig";

interface ConfigHealthScoreProps {
  config: ProgrammeTypeConfig;
}

interface HealthCheck {
  label: string;
  passed: boolean;
  warning?: boolean;
  detail: string;
}

function computeHealth(config: ProgrammeTypeConfig): { score: number; checks: HealthCheck[] } {
  const checks: HealthCheck[] = [];

  // K/P/W weights sum to 100
  const totalWeight = config.evaluation.knowledge_weight + config.evaluation.practical_weight + config.evaluation.workplace_weight;
  checks.push({
    label: "K/P/W weights balanced",
    passed: totalWeight === 100,
    detail: totalWeight === 100 ? "Weights sum to 100%" : `Weights sum to ${totalWeight}%`,
  });

  // Workplace weight > 0 if workplace is required
  if (config.workplace === "required") {
    checks.push({
      label: "Workplace weight set",
      passed: config.evaluation.workplace_weight > 0,
      detail: config.evaluation.workplace_weight > 0 ? `${config.evaluation.workplace_weight}% allocated` : "Workplace required but weight is 0%",
    });
  }

  // HR: mentor required if workplace required
  if (config.workplace === "required") {
    checks.push({
      label: "Mentor for workplace",
      passed: config.hr.mentor_required,
      warning: !config.hr.mentor_required,
      detail: config.hr.mentor_required ? "Mentor assigned" : "Workplace required but no mentor",
    });
  }

  // Structural: has credits or duration
  const hasStructure = config.structural.default_credits !== null || config.structural.default_duration_months !== null;
  checks.push({
    label: "Structure defined",
    passed: hasStructure,
    warning: !hasStructure,
    detail: hasStructure ? "Credits or duration set" : "No credits or duration defined",
  });

  // Assessment: at least one type enabled
  const enabledTypes = config.assessmentConfig.allowed_types.filter(t => t.enabled);
  checks.push({
    label: "Assessment types configured",
    passed: enabledTypes.length > 0,
    detail: enabledTypes.length > 0 ? `${enabledTypes.length} types enabled` : "No assessment types enabled",
  });

  // Financial: fee structure set
  checks.push({
    label: "Fee structure set",
    passed: true,
    detail: config.financial.fee_structure.replace("_", " "),
  });

  // Workflow: approval configured
  checks.push({
    label: "Workflow configured",
    passed: true,
    detail: config.workflow.approval_required ? `${config.workflow.approval_stages} approval stage(s)` : "Auto-publish enabled",
  });

  const passed = checks.filter(c => c.passed && !c.warning).length;
  const score = Math.round((passed / checks.length) * 100);

  return { score, checks };
}

export default function ConfigHealthScore({ config }: ConfigHealthScoreProps) {
  const { score, checks } = computeHealth(config);

  const scoreColor = score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const scoreBg = score >= 80 ? "bg-success/10" : score >= 50 ? "bg-warning/10" : "bg-destructive/10";
  const scoreRing = score >= 80 ? "stroke-success" : score >= 50 ? "stroke-warning" : "stroke-destructive";

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <Activity className={cn("w-4 h-4", scoreColor)} />
        <h3 className="text-sm font-semibold text-foreground">Config Health</h3>
        <div className={cn("ml-auto px-2.5 py-1 rounded-full text-xs font-bold", scoreBg, scoreColor)}>
          {score}%
        </div>
      </div>

      {/* Progress ring */}
      <div className="flex justify-center mb-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-muted/30" />
            <circle
              cx="40" cy="40" r="34" fill="none" strokeWidth="6"
              className={cn(scoreRing, "transition-all duration-700")}
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-lg font-bold", scoreColor)}>{score}</span>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div className="space-y-1.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/30 transition-colors">
            {check.passed && !check.warning ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            ) : check.warning ? (
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground">{check.label}</p>
              <p className="text-[9px] text-muted-foreground">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
