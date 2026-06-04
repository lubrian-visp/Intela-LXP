import { cn } from "@/lib/utils";
import { Lock, Unlock, ShieldCheck, ShieldOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldLockToggleProps {
  fieldName: string;
  lockedFields: string[];
  onToggle: (lockedFields: string[]) => void;
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export default function FieldLockToggle({ fieldName, lockedFields, onToggle, label, children, hint }: FieldLockToggleProps) {
  const isLocked = lockedFields.includes(fieldName);

  const toggle = () => {
    if (isLocked) {
      onToggle(lockedFields.filter(f => f !== fieldName));
    } else {
      onToggle([...lockedFields, fieldName]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggle}
                className={cn(
                  "group flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all border",
                  isLocked
                    ? "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25 shadow-sm shadow-warning/10"
                    : "bg-secondary/60 text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-secondary hover:border-border"
                )}
              >
                {isLocked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Enforced</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>Flexible</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              {isLocked ? (
                <p className="text-xs">
                  <strong className="text-warning">Enforced</strong> — programmes cannot override this value. Click to make flexible.
                </p>
              ) : (
                <p className="text-xs">
                  <strong>Flexible</strong> — programmes can adjust this value. Click to enforce globally.
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className={cn(
        "rounded-lg transition-all",
        isLocked && "ring-1 ring-warning/30 bg-warning/[0.03]"
      )}>
        {children}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
