import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useCreateProgramme, useUpdateProgramme } from "@/hooks/useCoreData";
import { useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import { useScaffoldProgramme } from "@/hooks/useScaffoldProgramme";
import { useAuth } from "@/hooks/useAuth";
import { getInheritedDefaults } from "@/lib/programmeTypeTemplates";
import { resolveConfig } from "@/types/programmeTypeConfig";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Programme = Tables<"programmes">;

interface Props {
  programme?: Programme | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export default function CreateProgrammeDialog({ programme, open, onOpenChange, trigger }: Props) {
  const isEdit = !!programme;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const { user } = useAuth();
  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();
  const scaffoldProgramme = useScaffoldProgramme();
  const { data: programmeTypes = [], isLoading: typesLoading } = useProgrammeTypes();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [programmeTypeId, setProgrammeTypeId] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (programme) {
      setTitle(programme.title ?? "");
      setDescription(programme.description ?? "");
      setProgrammeTypeId(programme.programme_type_id ?? "");
      setStatus(programme.status ?? "draft");
    } else {
      setTitle("");
      setDescription("");
      setProgrammeTypeId("");
      setStatus("draft");
    }
  }, [programme, isOpen]);

  const selectedType = programmeTypes.find((t: any) => t.id === programmeTypeId);
  const inheritedDefaults = selectedType
    ? getInheritedDefaults(selectedType.config as Record<string, any>)
    : null;
  const resolvedCfg = selectedType
    ? resolveConfig(selectedType.config as Record<string, any>)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Programme name is required"); return; }
    if (trimmedTitle.length > 200) { toast.error("Programme name must be under 200 characters"); return; }
    if (!programmeTypeId) { toast.error("Programme Type is required. It defines the governance template for the Builder."); return; }

    try {
      if (isEdit && programme) {
        const updatePayload: any = {
          id: programme.id,
          title: trimmedTitle,
          description: description.trim() || null,
        };
        await updateProgramme.mutateAsync(updatePayload);
        toast.success("Programme updated");
      } else {
        // Inherit defaults from Programme Type
        const payload: any = {
          title: trimmedTitle,
          description: description.trim() || null,
          programme_type_id: programmeTypeId,
          status: "draft",
          created_by: user?.id,
          ...(inheritedDefaults ?? {}),
        };
        const result = await createProgramme.mutateAsync(payload);

        // Auto-scaffold structure from template
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
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Programme" : "Register New Programme"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Programme Name *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Science Professional Certificate" maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief overview of the programme..." rows={3} maxLength={2000} />
          </div>

          {/* Programme Type */}
          <div className="space-y-2">
            <Label>
              Programme Type *
              <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">Defines governance rules for the Builder</span>
            </Label>
            {isEdit && programme?.programme_type_id ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedType?.color ?? "hsl(var(--muted))" }} />
                <span className="text-sm text-foreground font-medium">{selectedType?.name ?? "Unknown"}</span>
                <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked after creation
                </span>
              </div>
            ) : (
              <Select value={programmeTypeId} onValueChange={setProgrammeTypeId}>
                <SelectTrigger><SelectValue placeholder={typesLoading ? "Loading types..." : "Select Programme Type"} /></SelectTrigger>
                <SelectContent>
                  {programmeTypes.filter((t: any) => t.is_active).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Inherited Defaults Preview */}
          {!isEdit && selectedType && inheritedDefaults && resolvedCfg && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" /> Inherited from {selectedType.name} Template
              </p>
              <div className="grid grid-cols-3 gap-2">
                {inheritedDefaults.duration_months && (
                  <div className="text-center p-2 rounded bg-card border border-border/50">
                    <p className="text-sm font-bold text-foreground">{inheritedDefaults.duration_months}</p>
                    <p className="text-[9px] text-muted-foreground">Months</p>
                  </div>
                )}
                {inheritedDefaults.credits && (
                  <div className="text-center p-2 rounded bg-card border border-border/50">
                    <p className="text-sm font-bold text-foreground">{inheritedDefaults.credits}</p>
                    <p className="text-[9px] text-muted-foreground">Credits</p>
                  </div>
                )}
                {inheritedDefaults.nqf_level && (
                  <div className="text-center p-2 rounded bg-card border border-border/50">
                    <p className="text-sm font-bold text-foreground">{inheritedDefaults.nqf_level}</p>
                    <p className="text-[9px] text-muted-foreground">NQF Level</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-card border border-border/50 text-muted-foreground">
                  K: {resolvedCfg.evaluation.knowledge_weight}%
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-card border border-border/50 text-muted-foreground">
                  P: {resolvedCfg.evaluation.practical_weight}%
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-card border border-border/50 text-muted-foreground">
                  W: {resolvedCfg.evaluation.workplace_weight}%
                </span>
                {resolvedCfg.hr.mentor_required && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">Mentor Required</span>
                )}
                {resolvedCfg.hr.assessor_required && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20">Assessor Required</span>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                Structure will be auto-scaffolded from the {selectedType.name} template
              </p>
            </div>
          )}

          {/* Status is managed via Builder lifecycle, not editable here */}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {scaffoldProgramme.isPending ? "Scaffolding..." : "Saving..."}</span>
              ) : (
                isEdit ? "Save Changes" : "Register & Scaffold"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
