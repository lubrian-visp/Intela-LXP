import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Ban, RotateCcw, AlertTriangle } from "lucide-react";
import { useLogLifecycleAction } from "@/hooks/useProgrammeLifecycle";
import { cn } from "@/lib/utils";

interface OverrideControlsProps {
  programmeId: string;
  programmeTitle: string;
  currentStatus: string;
}

export default function OverrideControls({ programmeId, programmeTitle, currentStatus }: OverrideControlsProps) {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const logAction = useLogLifecycleAction();
  const isSuperAdmin = hasRole("super_admin");
  const [dialogType, setDialogType] = useState<"suspend" | "reverse_approval" | null>(null);
  const [reason, setReason] = useState("");

  const overrideMutation = useMutation({
    mutationFn: async ({ newStatus, action }: { newStatus: string; action: string }) => {
      if (!reason.trim()) throw new Error("A reason is required for all override actions.");
      
      const { error } = await supabase
        .from("programmes")
        .update({ status: newStatus })
        .eq("id", programmeId);
      if (error) throw error;

      // Log the override action
      if (user?.id) {
        await logAction.mutateAsync({
          programme_id: programmeId,
          action,
          previous_status: currentStatus,
          new_status: newStatus,
          reason: reason.trim(),
          role_at_action: "super_admin",
          metadata: { override: true },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programmes"] });
      toast.success("Override action completed. Logged to audit trail.");
      setDialogType(null);
      setReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isSuperAdmin) return null;

  const canSuspend = ["published", "approved"].includes(currentStatus);
  const canReverseApproval = currentStatus === "approved";

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-destructive" />
          <CardTitle className="text-sm">Super Admin Override</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Emergency controls. All actions are permanently logged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {canSuspend && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 w-full justify-start text-xs"
            onClick={() => setDialogType("suspend")}
          >
            <Ban className="w-3.5 h-3.5" /> Suspend Programme
          </Button>
        )}
        {canReverseApproval && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 w-full justify-start text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() => setDialogType("reverse_approval")}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reverse Approval
          </Button>
        )}
        {!canSuspend && !canReverseApproval && (
          <p className="text-xs text-muted-foreground">No override actions available for this status.</p>
        )}

        {/* Override Confirmation Dialog */}
        <Dialog open={!!dialogType} onOpenChange={(o) => { if (!o) { setDialogType(null); setReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                {dialogType === "suspend" ? "Suspend Programme" : "Reverse Approval"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                You are about to {dialogType === "suspend" ? "suspend" : "reverse the approval of"}{" "}
                <span className="font-medium text-foreground">"{programmeTitle}"</span>.
                This action is permanent in the audit trail.
              </p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  placeholder="Enter a mandatory reason for this override action…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>This action will be logged with your identity, timestamp, and the reason provided. It cannot be deleted from the audit trail.</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogType(null); setReason(""); }}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={!reason.trim() || overrideMutation.isPending}
                onClick={() => {
                  if (dialogType === "suspend") {
                    overrideMutation.mutate({ newStatus: "suspended", action: "override_suspend" });
                  } else if (dialogType === "reverse_approval") {
                    overrideMutation.mutate({ newStatus: "draft", action: "override_reverse_approval" });
                  }
                }}
              >
                {overrideMutation.isPending ? "Processing…" : "Confirm Override"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
