import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Archive, Users, CalendarCheck, UserCog } from "lucide-react";
import ForceDeleteCohortDialog from "@/components/cohort-management/ForceDeleteCohortDialog";
import { cn } from "@/lib/utils";
import { getCohortDeletionImpact, useDeleteCohort, useArchiveCohort, type CohortDeletionImpact } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  cohort: { id: string; name: string; status: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SafeDeleteCohortDialog({ cohort, open, onOpenChange }: Props) {
  const [impact, setImpact] = useState<CohortDeletionImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForceDelete, setShowForceDelete] = useState(false);
  const deleteMutation = useDeleteCohort();
  const archiveMutation = useArchiveCohort();
  const { hasRole } = useAuth();

  const canHardDelete = hasRole("super_admin") || hasRole("operations");

  useEffect(() => {
    if (open && cohort) {
      setLoading(true);
      setImpact(null);
      getCohortDeletionImpact(cohort.id)
        .then(setImpact)
        .finally(() => setLoading(false));
    }
  }, [open, cohort?.id]);

  const handleDelete = async () => {
    if (!cohort) return;
    try {
      await deleteMutation.mutateAsync(cohort.id);
      toast.success(`"${cohort.name}" permanently deleted`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete cohort");
    }
  };

  const handleArchive = async () => {
    if (!cohort) return;
    try {
      await archiveMutation.mutateAsync(cohort.id);
      toast.success(`"${cohort.name}" archived successfully`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive cohort");
    }
  };

  const isPending = deleteMutation.isPending || archiveMutation.isPending;

  return (
    <>
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Remove Cohort
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to remove{" "}
                <span className="font-semibold text-foreground">"{cohort?.name}"</span>.
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  Analysing linked data…
                </div>
              )}

              {impact && !loading && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.enrolmentCount}</strong> Enrolments</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <CalendarCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.sessionCount}</strong> Sessions</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                      <UserCog className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span><strong className="text-foreground">{impact.staffCount}</strong> Staff</span>
                    </div>
                  </div>

                  {!impact.canHardDelete && (
                    <div className="flex gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-warning">Permanent deletion blocked</p>
                        <p className="text-muted-foreground">
                          This cohort has linked enrolments. Learner records cannot be cascade-deleted.
                          <strong className="text-foreground"> Archive instead</strong> to preserve all records.
                        </p>
                      </div>
                    </div>
                  )}

                  {impact.canHardDelete && !canHardDelete && (
                    <div className="flex gap-3 p-3 rounded-lg bg-info/10 border border-info/20">
                      <ShieldCheck className="w-5 h-5 text-info shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-info">Insufficient authority</p>
                        <p className="text-muted-foreground">
                          Only Super Admin or Operations Control may permanently delete cohorts. You may <strong className="text-foreground">archive</strong> this cohort instead.
                        </p>
                      </div>
                    </div>
                  )}

                  {impact.canHardDelete && canHardDelete && (
                    <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-destructive">Permanent deletion available</p>
                        <p className="text-muted-foreground">
                          No enrolments are linked. You may permanently delete this cohort and all its session data. This action <strong className="text-foreground">cannot be undone</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

          {impact && !loading && (
            <button
              onClick={handleArchive}
              disabled={isPending || cohort?.status === "archived"}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                cohort?.status === "archived"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20"
              )}
            >
              <Archive className="w-4 h-4" />
              {archiveMutation.isPending ? "Archiving…" : cohort?.status === "archived" ? "Already Archived" : "Archive"}
            </button>
          )}

          {impact?.canHardDelete && canHardDelete && !loading && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          )}

          {/* Force Delete — only when blocked AND user has authority */}
          {impact && !impact.canHardDelete && canHardDelete && !loading && (
            <button
              onClick={() => {
                onOpenChange(false);
                setShowForceDelete(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              Force Delete…
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <ForceDeleteCohortDialog
      cohort={cohort ? { id: cohort.id, name: cohort.name, programme_id: undefined } : null}
      open={showForceDelete}
      onOpenChange={setShowForceDelete}
    />
    </>
  );
}
