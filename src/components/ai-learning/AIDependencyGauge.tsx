import { useMemo } from "react";

interface AIDependencyGaugeProps {
  /** 0–100 score; lower = less dependent (better) */
  score: number | null | undefined;
  /** Number of AI interactions used */
  interactionCount?: number;
  /** Max allowed interactions */
  maxInteractions?: number;
  /** Compact mode for inline display */
  compact?: boolean;
}

export default function AIDependencyGauge({
  score,
  interactionCount = 0,
  maxInteractions = 10,
  compact = false,
}: AIDependencyGaugeProps) {
  const displayScore = score ?? 0;

  const { colour, label, bgColour } = useMemo(() => {
    if (displayScore <= 30) return { colour: "hsl(var(--success))", label: "Low", bgColour: "hsl(var(--success) / 0.12)" };
    if (displayScore <= 60) return { colour: "hsl(var(--warning))", label: "Moderate", bgColour: "hsl(var(--warning) / 0.12)" };
    return { colour: "hsl(var(--destructive))", label: "High", bgColour: "hsl(var(--destructive) / 0.12)" };
  }, [displayScore]);

  const radius = compact ? 22 : 34;
  const strokeWidth = compact ? 4 : 5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (displayScore / 100) * circumference;
  const size = (radius + strokeWidth) * 2;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <svg width={size} height={size} className="shrink-0 -rotate-90">
          <circle cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
          <circle
            cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius}
            fill="none" stroke={colour} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round" className="transition-all duration-500"
          />
        </svg>
        <div className="text-xs">
          <span className="font-semibold" style={{ color: colour }}>{displayScore.toFixed(0)}%</span>
          <span className="text-muted-foreground ml-1">AI dep.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: bgColour }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <circle
          cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius}
          fill="none" stroke={colour} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      <div className="text-center">
        <p className="text-lg font-bold" style={{ color: colour }}>{displayScore.toFixed(0)}%</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label} Dependency</p>
      </div>
      <div className="text-xs text-muted-foreground">
        {interactionCount}/{maxInteractions} interactions used
      </div>
    </div>
  );
}
