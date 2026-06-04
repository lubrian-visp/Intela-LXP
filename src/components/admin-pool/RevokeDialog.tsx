import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useRevokeAllocation, AdminAllocation } from "@/hooks/useAdminPool";

interface Props {
  allocation: AdminAllocation;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function RevokeDialog({ allocation, open, onOpenChange }: Props) {
  const [reason, setReason] = useState("");
  const revoke = useRevokeAllocation();

  const memberName  = (allocation.member as any)?.profile?.full_name ?? "this member";
  const scopeLabel  = allocation.scope_label;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await revoke.mutateAsync({ id: allocation.id, reason: reason.trim() });
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Revoke Allocation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are about to revoke the allocation of <strong className="text-foreground">{memberName}</strong> from{" "}
            <strong className="text-foreground">{allocation.scope_type} "{scopeLabel}"</strong>.
            This action is logged and cannot be undone.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reason for revocation <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Provide a clear reason for revoking this allocation…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={revoke.isPending || !reason.trim()}
          >
            {revoke.isPending ? "Revoking…" : "Revoke Allocation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
