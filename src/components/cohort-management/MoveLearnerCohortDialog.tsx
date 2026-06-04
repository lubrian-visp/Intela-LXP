import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCohorts, useUpdateEnrolment } from "@/hooks/useCoreData";
import { toast } from "sonner";

interface Props {
  enrolmentId: string;
  learnerName: string;
  currentCohortId: string;
  programmeId: string;
  open: boolean;
  onClose: () => void;
}

export default function MoveLearnerCohortDialog({ enrolmentId, learnerName, currentCohortId, programmeId, open, onClose }: Props) {
  const [targetCohortId, setTargetCohortId] = useState("");
  const { data: cohorts } = useCohorts(programmeId);
  const updateEnrolment = useUpdateEnrolment();

  const availableCohorts = (cohorts ?? []).filter(c => c.id !== currentCohortId && c.status !== "completed");

  const handleMove = () => {
    if (!targetCohortId) return;
    updateEnrolment.mutate(
      { id: enrolmentId, cohort_id: targetCohortId },
      {
        onSuccess: () => {
          const targetName = availableCohorts.find(c => c.id === targetCohortId)?.name ?? "new cohort";
          toast.success(`${learnerName} moved to ${targetName}`);
          setTargetCohortId("");
          onClose();
        },
        onError: (err: any) => toast.error(err?.message ?? "Failed to move learner."),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setTargetCohortId(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-info" />
            Move Learner to Another Cohort
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Move <strong className="text-foreground">{learnerName}</strong> to a different cohort within the same programme.
        </p>

        {availableCohorts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No other cohorts available for this programme.</p>
        ) : (
          <Select value={targetCohortId} onValueChange={setTargetCohortId}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Select target cohort..." />
            </SelectTrigger>
            <SelectContent>
              {availableCohorts.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => { setTargetCohortId(""); onClose(); }}>Cancel</Button>
          <Button onClick={handleMove} disabled={!targetCohortId || updateEnrolment.isPending}>
            {updateEnrolment.isPending ? "Moving…" : "Move Learner"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
