import { useState, useEffect } from "react";
import { ShieldAlert, AlertTriangle, ArrowRightLeft, Unlink, UserMinus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammes, getProgrammeDeletionImpact, useForceDeleteProgramme, type DeletionImpact, type ForceDeleteProgrammeEnrolmentAction } from "@/hooks/useCoreData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  programme: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForceDeleteProgrammeDialog({ programme, open, onOpenChange }: Props) {
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<ForceDeleteProgrammeEnrolmentAction>("nullify");
  const [targetProgrammeId, setTargetProgrammeId] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const forceDeleteMutation = useForceDeleteProgramme();
  const { user, hasRole } = useAuth();
  const { data: programmes } = useProgrammes();

  const canForce = hasRole("super_admin") || hasRole("operations");
  const otherProgrammes = (programmes ?? []).filter(p => p.id !== programme?.id && p.status !== "archived");

  useEffect(() => {
    if (open && programme) {
      setLoading(true);
      setImpact(null);
      setConfirmed(false);
      setAction("nullify");
      setTargetProgrammeId("");
      getProgrammeDeletionImpact(programme.id)
        .then(setImpact)
        .finally(() => setLoading(false));
    }
  }, [open, programme?.id]);

  const handleForceDelete = async () => {
    if (!programme || !user) return;
    try {
      await forceDeleteMutation.mutateAsync({
        programmeId: programme.id,
        programmeName: programme.title,
        userId: user.id,
        enrolmentAction: action,
        targetProgrammeId: action === "reassign" ? targetProgrammeId : undefined,
      });
      toast.success(`"${programme.title}" force-deleted with all dependencies cleaned up`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Force deletion failed");
    }
  };

  if (!canForce) return null;

  const actionOptions = [
    { value: "nullify" as const, label: "Nullify Links", desc: "Preserve enrolment records but remove cohort references", icon: Unlink },
    { value: "withdraw" as const, label: "Withdraw All", desc: "Mark all enrolments as withdrawn and detach", icon: UserMinus },
    { value: "reassign" as const, label: "Reassign", desc: "Move enrolments to another programme's cohort", icon: ArrowRightLeft },
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Force Delete Programme
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Force-deleting{" "}
                <span className="font-semibold text-foreground">"{programme?.title}"</span>{" "}
                will remove it and all its structural data permanently.
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-destructive border-t-transparent rounded-full" />
                  Analysing dependencies…
                </div>
              )}

              {impact && !loading && (
                <>
                  <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-destructive">Dependency Summary</p>
                      <p className="text-muted-foreground">
                        {impact.cohortCount} cohort(s), {impact.enrolmentCount} enrolment(s),{" "}
                        {impact.moduleCount} module(s), {impact.assessmentCount} assessment(s),{" "}
                        {impact.submissionCount} submission(s), {impact.learnerCount} registration(s)
                      </p>
                    </div>
                  </div>

                  {impact.enrolmentCount > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground">How should enrolments be handled?</p>
                      <div className="space-y-2">
                        {actionOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setAction(opt.value)}
                            className={cn(
                              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all text-xs",
                              action === opt.value
                                ? "border-destructive/40 bg-destructive/5"
                                : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                            )}
                          >
                            <opt.icon className={cn("w-4 h-4 mt-0.5 shrink-0", action === opt.value ? "text-destructive" : "text-muted-foreground")} />
                            <div>
                              <p className={cn("font-semibold", action === opt.value ? "text-destructive" : "text-foreground")}>{opt.label}</p>
                              <p className="text-muted-foreground">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {action === "reassign" && (
                        <select
                          value={targetProgrammeId}
                          onChange={e => setTargetProgrammeId(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-card rounded-lg border border-border text-foreground"
                        >
                          <option value="">Select target programme…</option>
                          {otherProgrammes.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-destructive"
                    />
                    <span className="text-muted-foreground">
                      I understand this action is <strong className="text-destructive">permanent and irreversible</strong>. All structural data, sessions, and assessments will be destroyed. Learner records will be preserved.
                    </span>
                  </label>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={forceDeleteMutation.isPending}>Cancel</AlertDialogCancel>
          {impact && !loading && (
            <button
              onClick={handleForceDelete}
              disabled={
                forceDeleteMutation.isPending ||
                !confirmed ||
                (action === "reassign" && !targetProgrammeId)
              }
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                confirmed
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <ShieldAlert className="w-4 h-4" />
              {forceDeleteMutation.isPending ? "Deleting…" : "Force Delete"}
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
