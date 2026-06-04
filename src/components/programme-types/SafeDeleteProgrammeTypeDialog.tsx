import { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, BookOpen } from "lucide-react";
import { getProgrammeTypeDeletionImpact, type ProgrammeTypeDeletionImpact } from "@/hooks/useCoreData";
import { useDeleteProgrammeType } from "@/hooks/useProgrammeTypes";
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
  programmeType: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SafeDeleteProgrammeTypeDialog({ programmeType, open, onOpenChange }: Props) {
  const [impact, setImpact] = useState<ProgrammeTypeDeletionImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const deleteMutation = useDeleteProgrammeType();
  const { hasRole } = useAuth();

  const canHardDelete = hasRole("super_admin") || hasRole("operations");

  useEffect(() => {
    if (open && programmeType) {
      setLoading(true);
      setImpact(null);
      getProgrammeTypeDeletionImpact(programmeType.id)
        .then(setImpact)
        .finally(() => setLoading(false));
    }
  }, [open, programmeType?.id]);

  const handleDelete = async () => {
    if (!programmeType) return;
    try {
      await deleteMutation.mutateAsync(programmeType.id);
      toast.success(`"${programmeType.name}" permanently deleted`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete programme type");
    }
  };

  const isPending = deleteMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Delete Programme Type
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to delete{" "}
                <span className="font-semibold text-foreground">"{programmeType?.name}"</span>.
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  Analysing linked data…
                </div>
              )}

              {impact && !loading && (
                <>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 text-xs">
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span><strong className="text-foreground">{impact.programmeCount}</strong> Programme(s) using this type</span>
                  </div>

                  {!impact.canHardDelete && (
                    <div className="flex gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-warning">Deletion blocked</p>
                        <p className="text-muted-foreground">
                          This programme type is referenced by {impact.programmeCount} programme(s). Reassign or remove all programmes before deleting this type.
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
                          Only Super Admin or Operations Control may permanently delete programme types.
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
                          No programmes reference this type. This action <strong className="text-foreground">cannot be undone</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          {impact?.canHardDelete && canHardDelete && !loading && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
