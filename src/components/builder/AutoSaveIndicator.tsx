import { Check, Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import type { AutoSaveStatus } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  errorMessage?: string | null;
  className?: string;
}

const statusConfig: Record<AutoSaveStatus, { icon: any; label: string; color: string }> = {
  idle: { icon: Cloud, label: "All changes saved", color: "text-muted-foreground" },
  pending: { icon: Cloud, label: "Unsaved changes", color: "text-warning" },
  saving: { icon: Loader2, label: "Saving...", color: "text-primary" },
  saved: { icon: Check, label: "Saved", color: "text-success" },
  error: { icon: AlertCircle, label: "Save failed", color: "text-destructive" },
};

export function AutoSaveIndicator({ status, lastSavedAt, errorMessage, className }: AutoSaveIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const tooltipText = errorMessage
    ? `Error: ${errorMessage}`
    : lastSavedAt
    ? `Last saved at ${lastSavedAt.toLocaleTimeString()}`
    : config.label;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium transition-colors",
              config.color,
              className
            )}
            role="status"
            aria-live="polite"
            aria-label={config.label}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5",
                status === "saving" && "animate-spin"
              )}
            />
            <span className="hidden sm:inline">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
