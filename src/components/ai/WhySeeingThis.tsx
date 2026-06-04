import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Signal {
  label: string;
  value: string | number;
}

interface WhySeeingThisProps {
  /** Plain-language model/source identifier, e.g. "Gemini 2.5 Flash · LXP recommender v1" */
  model?: string;
  /** Short rationale shown at the top */
  rationale?: string;
  /** Input signals the model used to produce this card */
  signals?: Signal[];
  /** Optional relevance / confidence score (0-100) */
  score?: number;
  /** Compliance tag — defaults to IEEE P7003 §6.4 */
  standardRef?: string;
  className?: string;
}

/**
 * "Why am I seeing this?" transparency drawer for algorithmic recommendation
 * cards. Satisfies IEEE P7003 §6.4 (explainability for algorithmic decisions)
 * and POPIA §71 (automated decision-making transparency).
 */
export default function WhySeeingThis({
  model = "AI recommender",
  rationale,
  signals = [],
  score,
  standardRef = "IEEE P7003 §6.4",
  className,
}: WhySeeingThisProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Why am I seeing this recommendation?"
          className={
            "inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors " +
            (className ?? "")
          }
        >
          <Info className="w-3 h-3" aria-hidden="true" />
          Why am I seeing this?
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-xs space-y-2" role="dialog" aria-label="Recommendation explanation">
        <div>
          <p className="font-semibold text-foreground">Why this was recommended</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {rationale ||
              "This card was produced by an automated recommender that scored your activity, profile and learning history against available content."}
          </p>
        </div>

        {signals.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Signals used</p>
            <ul className="mt-1 space-y-0.5">
              {signals.map((s) => (
                <li key={s.label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="text-foreground font-medium truncate max-w-[10rem] text-right">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {typeof score === "number" && (
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="text-muted-foreground">Relevance score</span>
            <span className="text-foreground font-medium">{Math.round(score)}%</span>
          </div>
        )}

        <div className="border-t border-border pt-1.5 space-y-0.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model</span>
            <span className="text-foreground font-medium truncate max-w-[10rem] text-right">{model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Standard</span>
            <span className="text-foreground font-medium">{standardRef}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground border-t border-border pt-1.5">
          You can dismiss any recommendation. Decisions are advisory only — a human facilitator reviews progression and grading.
        </p>
      </PopoverContent>
    </Popover>
  );
}
