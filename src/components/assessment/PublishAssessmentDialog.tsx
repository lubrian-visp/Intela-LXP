import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Plus, X, ShieldCheck } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useUpdateAssessment } from "@/hooks/useCoreData";
import { toast } from "sonner";

type Assessment = Tables<"assessments"> & { programme_modules?: { title: string } | null };

interface LearningOutcome {
  code: string;
  description: string;
  bloom_level?: string;
}

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];
const HIGH_STAKES = ["summative", "integrated", "portfolio", "workplace"];

interface Props {
  assessment: Assessment | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Publish dialog enforcing international best-practice "constructive alignment":
 * - Programme + Module link
 * - At least one Learning Outcome (Bloom-tagged)
 * - Pass mark + max score
 * - Moderation enabled for high-stakes types (4-Eyes principle)
 */
export default function PublishAssessmentDialog({ assessment, onOpenChange }: Props) {
  const update = useUpdateAssessment();
  const existingOutcomes = useMemo<LearningOutcome[]>(() => {
    const raw = (assessment as any)?.learning_outcomes;
    if (Array.isArray(raw)) return raw as LearningOutcome[];
    return [];
  }, [assessment]);

  const [outcomes, setOutcomes] = useState<LearningOutcome[]>(existingOutcomes);
  const [requiresModeration, setRequiresModeration] = useState<boolean>(
    Boolean((assessment as any)?.requires_moderation) ||
      HIGH_STAKES.includes(assessment?.assessment_type ?? "")
  );

  if (!assessment) return null;

  const isHighStakes = HIGH_STAKES.includes(assessment.assessment_type);
  const hasProgramme = !!assessment.programme_id;
  const hasModule = !!assessment.module_id;
  const hasMarks = assessment.max_score != null && assessment.pass_mark != null;
  const hasOutcomes = outcomes.length > 0 && outcomes.every(o => o.code.trim() && o.description.trim());
  const moderationOk = !isHighStakes || requiresModeration;

  const ready = hasProgramme && hasModule && hasMarks && hasOutcomes && moderationOk;

  const addOutcome = () =>
    setOutcomes([...outcomes, { code: `LO${outcomes.length + 1}`, description: "", bloom_level: "Apply" }]);

  const removeOutcome = (i: number) => setOutcomes(outcomes.filter((_, idx) => idx !== i));

  const updateOutcome = (i: number, patch: Partial<LearningOutcome>) =>
    setOutcomes(outcomes.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  const handlePublish = async () => {
    try {
      await update.mutateAsync({
        id: assessment.id,
        learning_outcomes: outcomes as any,
        requires_moderation: requiresModeration,
        status: "published",
      } as any);
      toast.success("Assessment published");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to publish — integrity check failed");
    }
  };

  const handleSaveDraft = async () => {
    try {
      await update.mutateAsync({
        id: assessment.id,
        learning_outcomes: outcomes as any,
        requires_moderation: requiresModeration,
      } as any);
      toast.success("Draft saved");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-success" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-warning" />
      )}
      <span className={ok ? "text-foreground" : "text-warning"}>{label}</span>
    </div>
  );

  return (
    <Dialog open={!!assessment} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Publish Assessment — Integrity Check
          </DialogTitle>
          <DialogDescription>
            Aligns with international best practice (constructive alignment, Bloom's taxonomy, 4-Eyes moderation).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-secondary/40 p-3 rounded-md space-y-1.5">
            <Check ok={hasProgramme} label="Programme is linked" />
            <Check ok={hasModule} label="Module is linked" />
            <Check ok={hasMarks} label="Pass mark and max score are set" />
            <Check ok={hasOutcomes} label="At least one Learning Outcome is mapped" />
            <Check
              ok={moderationOk}
              label={
                isHighStakes
                  ? "Moderation enabled (required for high-stakes assessments)"
                  : "Moderation flag set"
              }
            />
          </div>

          {/* Learning outcomes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Learning Outcomes (Constructive Alignment)</Label>
              <Button size="sm" variant="outline" onClick={addOutcome}>
                <Plus className="w-3 h-3 mr-1" /> Add Outcome
              </Button>
            </div>
            <div className="space-y-2">
              {outcomes.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No outcomes mapped yet. Add at least one outcome to align with international best practice.
                </p>
              )}
              {outcomes.map((o, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-card border border-border/60 p-2 rounded">
                  <Input
                    className="col-span-2"
                    placeholder="LO1"
                    value={o.code}
                    onChange={(e) => updateOutcome(i, { code: e.target.value })}
                  />
                  <Textarea
                    className="col-span-7 min-h-[40px] text-xs"
                    placeholder="On completion, learner will be able to…"
                    value={o.description}
                    onChange={(e) => updateOutcome(i, { description: e.target.value })}
                  />
                  <select
                    className="col-span-2 text-xs border border-input bg-background rounded px-2 py-2"
                    value={o.bloom_level || "Apply"}
                    onChange={(e) => updateOutcome(i, { bloom_level: e.target.value })}
                  >
                    {BLOOM_LEVELS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="col-span-1"
                    onClick={() => removeOutcome(i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Moderation */}
          <div className="flex items-center justify-between bg-card border border-border/60 p-3 rounded">
            <div>
              <Label className="text-sm">Require Moderation (4-Eyes)</Label>
              <p className="text-[11px] text-muted-foreground">
                {isHighStakes
                  ? "Required for high-stakes assessments — cannot be disabled."
                  : "Recommended for fairness and quality assurance."}
              </p>
            </div>
            <Switch
              checked={requiresModeration}
              onCheckedChange={setRequiresModeration}
              disabled={isHighStakes}
            />
          </div>

          {/* Linkage summary */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            <Badge variant="outline" className="mr-2">Programme: {hasProgramme ? "✓" : "—"}</Badge>
            <Badge variant="outline" className="mr-2">Module: {assessment.programme_modules?.title ?? "—"}</Badge>
            <Badge variant="outline">Type: {assessment.assessment_type}</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSaveDraft} disabled={update.isPending}>
            Save as Draft
          </Button>
          <Button onClick={handlePublish} disabled={!ready || update.isPending}>
            {ready ? "Publish Assessment" : "Complete checks to publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
