import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { useRevokeLdAllocation, LdAllocation } from "@/hooks/useLdPool";

interface Props {
  allocation: LdAllocation;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function LdRevokeDialog({ allocation, open, onOpenChange }: Props) {
  const [reason, setReason] = useState("");
  const revoke = useRevokeLdAllocation();

  const memberName = (allocation.member as any)?.profile?.full_name ?? "this practitioner";

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await revoke.mutateAsync({ id: allocation.id, reason: reason.trim() });
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setReason(""); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Revoke Allocation
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Revoking <strong className="text-foreground">{memberName}</strong>'s allocation to{" "}
          <strong className="text-foreground">{allocation.scope_type} "{allocation.scope_label}"</strong>.
          This is logged and cannot be undone.
        </p>
        <Textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Reason for revoking this allocation…"
          rows={3} className="text-sm resize-none"
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" size="sm"
            disabled={!reason.trim() || revoke.isPending}
            onClick={handleSubmit}>
            {revoke.isPending ? "Revoking…" : "Confirm Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
