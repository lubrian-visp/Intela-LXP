import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  accentColor?: string;
}

export default function StatCard({ label, value, change, changeType = "neutral", icon, accentColor }: StatCardProps) {
  const borderColor = accentColor || (
    changeType === "positive" ? "border-l-success" :
    changeType === "negative" ? "border-l-destructive" :
    "border-l-primary"
  );

  return (
    <div className={cn(
      "bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300 border border-border/50 border-l-4",
      borderColor
    )}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {change && (
        <p className={cn(
          "mt-1 text-[11px] font-medium",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground",
        )}>
          {change}
        </p>
      )}
    </div>
  );
}
