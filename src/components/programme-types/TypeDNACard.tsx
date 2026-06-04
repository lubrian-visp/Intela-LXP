import { cn } from "@/lib/utils";
import { ChevronRight, Trash2, Check, X, Zap, Pencil } from "lucide-react";
import { resolveConfig, type ProgrammeTypeConfig, type OptionValue } from "@/types/programmeTypeConfig";
import type { ProgrammeType } from "@/hooks/useProgrammeTypes";
import { useState } from "react";

interface TypeDNACardProps {
  type: ProgrammeType;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  canDelete: boolean;
}

const flagLabels: Record<string, string> = {
  workplace: "WPL",
  cohort: "COH",
  duration: "DUR",
  assessment: "ASS",
  poe: "POE",
  credential: "CRD",
  verification: "VER",
};

const statusDot: Record<string, string> = {
  required: "bg-success",
  enabled: "bg-success",
  optional: "bg-info",
  not_allowed: "bg-muted-foreground/30",
  disabled: "bg-muted-foreground/30",
};

export default function TypeDNACard({ type, isSelected, onSelect, onDelete, onEdit, canDelete }: TypeDNACardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const config = resolveConfig((type.config as Record<string, any>) || {});

  const flagKeys = ["workplace", "cohort", "assessment", "poe", "credential", "verification"];
  const activeFlags = flagKeys.filter(k => {
    const v = config[k as keyof ProgrammeTypeConfig] as OptionValue;
    return v === "required" || v === "enabled" || v === "optional";
  });

  const kWeight = config.evaluation.knowledge_weight;
  const pWeight = config.evaluation.practical_weight;
  const wWeight = config.evaluation.workplace_weight;

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left rounded-xl p-4 border transition-all duration-200 overflow-hidden",
          isSelected
            ? "bg-card shadow-card-hover border-accent/30 ring-1 ring-accent/20"
            : "bg-card shadow-card border-border/50 hover:border-accent/20"
        )}
      >
        {/* Color accent bar */}
        <div
          className="absolute top-0 left-0 w-full h-1 transition-all"
          style={{ backgroundColor: type.color }}
        />

        <div className="flex items-start gap-3 mt-1">
          <div
            className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: type.color }}
          >
            {type.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground truncate">{type.name}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {type.programme_count} programme{type.programme_count !== 1 ? "s" : ""}
            </p>
          </div>
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-1",
            isSelected && "rotate-90 text-accent"
          )} />
        </div>

        {/* DNA Preview */}
        <div className="mt-3 space-y-2">
          {/* Behaviour dots */}
          <div className="flex items-center gap-1 flex-wrap">
            {flagKeys.map(key => {
              const value = config[key as keyof ProgrammeTypeConfig] as OptionValue;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider",
                    value === "required" || value === "enabled"
                      ? "bg-success/10 text-success"
                      : value === "optional"
                        ? "bg-info/10 text-info"
                        : "bg-muted/50 text-muted-foreground/50"
                  )}
                >
                  <div className={cn("w-1 h-1 rounded-full", statusDot[value])} />
                  {flagLabels[key] || key.substring(0, 3).toUpperCase()}
                </div>
              );
            })}
          </div>

          {/* K/P/W mini bar */}
          <div className="space-y-1">
            <div className="flex rounded-full overflow-hidden h-1.5">
              <div className="bg-info transition-all" style={{ width: `${kWeight}%` }} />
              <div className="bg-warning transition-all" style={{ width: `${pWeight}%` }} />
              <div className="bg-success transition-all" style={{ width: `${wWeight}%` }} />
            </div>
            <div className="flex justify-between text-[8px] text-muted-foreground font-medium">
              <span>K:{kWeight}%</span>
              <span>P:{pWeight}%</span>
              <span>W:{wWeight}%</span>
            </div>
          </div>
        </div>
      </button>

      {/* Action buttons */}
      {!showDeleteConfirm && (
        <div className="absolute -right-1 top-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg bg-card border border-border shadow-sm text-muted-foreground hover:text-accent transition-colors"
              title="Edit type"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (canDelete) setShowDeleteConfirm(true); }}
            disabled={!canDelete}
            className={cn(
              "p-1.5 rounded-lg bg-card border border-border shadow-sm transition-colors",
              canDelete
                ? "text-muted-foreground hover:text-destructive cursor-pointer"
                : "text-muted-foreground/30 cursor-not-allowed opacity-50"
            )}
            title={canDelete ? "Delete type" : `Cannot delete — ${type.programme_count} active programme(s)`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="absolute -right-1 top-3 flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-lg z-10 animate-fade-in">
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className="p-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }} className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
