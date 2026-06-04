import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Lock, ArrowRight, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useCreateProgramme, useUpdateProgramme } from "@/hooks/useCoreData";
import { useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import { useScaffoldProgramme } from "@/hooks/useScaffoldProgramme";
import { useAuth } from "@/hooks/useAuth";
import { getInheritedDefaults } from "@/lib/programmeTypeTemplates";
import { resolveConfig, type OptionValue, type ProgrammeTypeConfig } from "@/types/programmeTypeConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Programme = Tables<"programmes">;

interface Props {
  programme?: Programme | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

// ── DNA flag helpers (mirrors TypeDNACard) ────────────────────────────────────
const FLAG_KEYS   = ["workplace", "cohort", "assessment", "poe", "credential", "verification"] as const;
const FLAG_LABELS: Record<string, string> = {
  workplace: "WPL", cohort: "COH", assessment: "ASS",
  poe: "POE", credential: "CRD", verification: "VER",
};

function FlagDot({ value, label }: { value: OptionValue; label: string }) {
  const active = value === "required" || value === "enabled";
  const partial = value === "optional";
  return (
    <span className={cn(
      "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider",
      active  ? "bg-success/10 text-success" :
      partial ? "bg-info/10 text-info" :
                "bg-muted/50 text-muted-foreground/40"
    )}>
      <span className={cn("w-1 h-1 rounded-full",
        active ? "bg-success" : partial ? "bg-info" : "bg-muted-foreground/25"
      )} />
      {label}
    </span>
  );
}

// ── Visual type card ───────────────────────────────────────────────────────────
function TypeCard({
  type, isSelected, onSelect,
}: {
  type: any;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = resolveConfig((type.config as Record<string, any>) || {});
  const kW = config.evaluation.knowledge_weight;
  const pW = config.evaluation.practical_weight;
  const wW = config.evaluation.workplace_weight;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-xl border p-4 transition-all duration-200 overflow-hidden group",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
          : "border-border/60 bg-card hover:border-primary/30 hover:shadow-sm"
      )}
    >
      {/* Colour accent bar */}
      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: type.color }} />

      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3 mt-1">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: type.color }}
        >
          {type.name.substring(0, 2).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1 pr-5">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">{type.name}</p>
          {type.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight">{type.description}</p>
          )}
          <p className="text-[9px] text-muted-foreground/60 mt-1">
            {type.programme_count} programme{type.programme_count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* DNA flags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {FLAG_KEYS.map(key => (
          <FlagDot
            key={key}
            value={config[key as keyof ProgrammeTypeConfig] as OptionValue}
            label={FLAG_LABELS[key]}
          />
        ))}
      </div>

      {/* K/P/W bar */}
      <div className="mt-2 space-y-0.5">
        <div className="flex rounded-full overflow-hidden h-1.5">
          <div className="bg-info"    style={{ width: `${kW}%` }} />
          <div className="bg-warning" style={{ width: `${pW}%` }} />
          <div className="bg-success" style={{ width: `${wW}%` }} />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground font-medium">
          <span>K:{kW}%</span><span>P:{pW}%</span><span>W:{wW}%</span>
        </div>
      </div>
    </button>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function CreateProgrammeDialog({ programme, open, onOpenChange, trigger }: Props) {
  const isEdit = !!programme;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen    = open    ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const { user }          = useAuth();
  const createProgramme   = useCreateProgramme();
  const updateProgramme   = useUpdateProgramme();
  const scaffoldProgramme = useScaffoldProgramme();
  const { data: programmeTypes = [], isLoading: typesLoading } = useProgrammeTypes();

  const [title, setTitle]                   = useState("");
  const [description, setDescription]       = useState("");
  const [programmeTypeId, setProgrammeTypeId] = useState("");
  const [showAllTypes, setShowAllTypes]     = useState(false);

  useEffect(() => {
    if (programme) {
      setTitle(programme.title ?? "");
      setDescription(programme.description ?? "");
      setProgrammeTypeId(programme.programme_type_id ?? "");
    } else {
      setTitle("");
      setDescription("");
      setProgrammeTypeId("");
      setShowAllTypes(false);
    }
  }, [programme, isOpen]);

  const activeTypes    = programmeTypes.filter((t: any) => t.is_active);
  const visibleTypes   = showAllTypes ? activeTypes : activeTypes.slice(0, 6);
  const hasMore        = activeTypes.length > 6;

  const selectedType      = programmeTypes.find((t: any) => t.id === programmeTypeId);
  const inheritedDefaults = selectedType ? getInheritedDefaults(selectedType.config as Record<string, any>) : null;
  const resolvedCfg       = selectedType ? resolveConfig(selectedType.config as Record<string, any>) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Programme name is required"); return; }
    if (trimmedTitle.length > 200) { toast.error("Programme name must be under 200 characters"); return; }
    if (!isEdit && !programmeTypeId) {
      toast.error("Please select a Programme Type — it defines the governance rules for this programme.");
      return;
    }

    try {
      if (isEdit && programme) {
        await updateProgramme.mutateAsync({ id: programme.id, title: trimmedTitle, description: description.trim() || null } as any);
        toast.success("Programme updated");
      } else {
        const payload: any = {
          title: trimmedTitle,
          description: description.trim() || null,
          programme_type_id: programmeTypeId,
          status: "draft",
          created_by: user?.id,
          ...(inheritedDefaults ?? {}),
        };
        const result = await createProgramme.mutateAsync(payload);
        if (selectedType) {
          await scaffoldProgramme.mutateAsync({
            programmeId: result.id,
            typeConfig: selectedType.config as Record<string, any>,
          });
        }
        toast.success("Programme registered and structure scaffolded from template");
      }
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const isPending = createProgramme.isPending || updateProgramme.isPending || scaffoldProgramme.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? "Edit Programme" : "Register New Programme"}
          </DialogTitle>
          {!isEdit && (
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Choose a Programme Type first — it defines the governance rules, structure, and assessment framework.
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* Programme Name */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium">
                Programme Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Data Science Professional Certificate"
                maxLength={200}
                className="text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief overview of the programme..."
                rows={2}
                maxLength={2000}
                className="text-sm resize-none"
              />
            </div>

            {/* Programme Type selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Programme Type <span className="text-destructive">*</span>
                  <span className="text-[10px] text-muted-foreground ml-2 font-normal">
                    Locked after creation
                  </span>
                </Label>
                {!isEdit && (
                  <span className="flex items-center gap-1 text-[10px] text-warning">
                    <Lock className="w-3 h-3" /> Cannot be changed after saving
                  </span>
                )}
              </div>

              {/* Edit mode — locked display */}
              {isEdit && programme?.programme_type_id ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedType?.color ?? "hsl(var(--muted))" }} />
                  <span className="text-sm font-semibold text-foreground">{selectedType?.name ?? "Unknown"}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked after creation
                  </span>
                </div>
              ) : typesLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-28 rounded-xl bg-secondary/40 animate-pulse" />
                  ))}
                </div>
              ) : activeTypes.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-[12px] text-muted-foreground">
                    No programme types configured yet. Ask your Super Admin to create types in the Programme Type Engine.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleTypes.map((t: any) => (
                      <TypeCard
                        key={t.id}
                        type={t}
                        isSelected={programmeTypeId === t.id}
                        onSelect={() => setProgrammeTypeId(t.id)}
                      />
                    ))}
                  </div>

                  {/* Show more / less */}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setShowAllTypes(p => !p)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAllTypes ? (
                        <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" /> Show {activeTypes.length - 6} more types</>
                      )}
                    </button>
                  )}

                  {/* No type selected warning */}
                  {!programmeTypeId && (
                    <p className="text-[11px] text-muted-foreground text-center pt-1">
                      Select a type above to see what will be inherited
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Inherited defaults preview */}
            {!isEdit && selectedType && inheritedDefaults && resolvedCfg && (
              <div className="rounded-xl border border-primary/20 bg-primary/3 p-4 space-y-3">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  Inherited from <span style={{ color: selectedType.color }}>{selectedType.name}</span>
                </p>

                {/* Structural defaults */}
                <div className="grid grid-cols-3 gap-2">
                  {inheritedDefaults.duration_months != null && (
                    <div className="text-center p-2.5 rounded-lg bg-card border border-border/50">
                      <p className="text-sm font-bold text-foreground">{inheritedDefaults.duration_months}</p>
                      <p className="text-[9px] text-muted-foreground">Months</p>
                    </div>
                  )}
                  {inheritedDefaults.credits != null && (
                    <div className="text-center p-2.5 rounded-lg bg-card border border-border/50">
                      <p className="text-sm font-bold text-foreground">{inheritedDefaults.credits}</p>
                      <p className="text-[9px] text-muted-foreground">Credits</p>
                    </div>
                  )}
                  {inheritedDefaults.nqf_level != null && (
                    <div className="text-center p-2.5 rounded-lg bg-card border border-border/50">
                      <p className="text-sm font-bold text-foreground">L{inheritedDefaults.nqf_level}</p>
                      <p className="text-[9px] text-muted-foreground">NQF Level</p>
                    </div>
                  )}
                </div>

                {/* K/P/W + role requirements */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20 font-medium">
                    K: {resolvedCfg.evaluation.knowledge_weight}%
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 font-medium">
                    P: {resolvedCfg.evaluation.practical_weight}%
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-medium">
                    W: {resolvedCfg.evaluation.workplace_weight}%
                  </span>
                  {resolvedCfg.hr.mentor_required && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                      Mentor Required
                    </span>
                  )}
                  {resolvedCfg.hr.assessor_required && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20">
                      Assessor Required
                    </span>
                  )}
                  {resolvedCfg.compliance.audit_trail_required && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                      Audit Trail
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Structure will be auto-scaffolded from the <strong>{selectedType.name}</strong> template upon saving.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || (!isEdit && !programmeTypeId)} className="gap-2 min-w-[140px]">
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {scaffoldProgramme.isPending ? "Scaffolding…" : "Saving…"}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Register & Scaffold"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
