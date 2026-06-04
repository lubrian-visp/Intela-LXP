import { useState } from "react";
import { ShieldAlert, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ROLE_LABELS,
  getOversightTargetRoles,
  useOversightSettings,
  useToggleOversight,
  OversightSetting,
} from "@/hooks/useUserDirectory";
import { useAuth } from "@/hooks/useAuth";

const OVERSIGHT_FEATURES = [
  { key: "directory_access", label: "User Directory Access" },
  { key: "user_editing", label: "Edit User Profiles" },
  { key: "role_assignment", label: "Assign Roles" },
  { key: "export", label: "Export User Data" },
];

export default function OversightControls() {
  const { roles } = useAuth();
  const targetRoles = getOversightTargetRoles(roles);
  const { data: settings = [] } = useOversightSettings();
  const toggleMutation = useToggleOversight();

  const [confirmDialog, setConfirmDialog] = useState<{
    targetRole: string;
    featureKey: string;
    disable: boolean;
  } | null>(null);
  const [reason, setReason] = useState("");

  if (targetRoles.length === 0) return null;

  const isDisabled = (targetRole: string, featureKey: string) =>
    settings.some((s) => s.target_role === targetRole && s.feature_key === featureKey && s.is_disabled);

  const handleToggle = (targetRole: string, featureKey: string) => {
    const currentlyDisabled = isDisabled(targetRole, featureKey);
    setConfirmDialog({ targetRole, featureKey, disable: !currentlyDisabled });
    setReason("");
  };

  const confirmToggle = () => {
    if (!confirmDialog) return;
    toggleMutation.mutate(
      {
        targetRole: confirmDialog.targetRole,
        featureKey: confirmDialog.featureKey,
        disable: confirmDialog.disable,
        reason,
      },
      { onSuccess: () => setConfirmDialog(null) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-destructive" />
        <h3 className="text-sm font-semibold text-foreground">Oversight Controls</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Disable or enable specific directory features for roles below your authority level.
      </p>

      {targetRoles.map((role) => (
        <div key={role} className="border border-border rounded-lg p-3 space-y-2">
          <Badge variant="outline" className="text-xs">
            {ROLE_LABELS[role] ?? role}
          </Badge>
          <div className="space-y-1.5">
            {OVERSIGHT_FEATURES.map((feature) => {
              const disabled = isDisabled(role, feature.key);
              return (
                <button
                  key={feature.key}
                  onClick={() => handleToggle(role, feature.key)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/30 transition-colors"
                >
                  <span className="text-xs text-foreground">{feature.label}</span>
                  {disabled ? (
                    <ToggleLeft className="w-5 h-5 text-destructive" />
                  ) : (
                    <ToggleRight className="w-5 h-5 text-green-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.disable ? "Disable" : "Enable"} Feature
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDialog?.disable ? "Disable" : "Enable"}{" "}
            <strong>{OVERSIGHT_FEATURES.find((f) => f.key === confirmDialog?.featureKey)?.label}</strong>{" "}
            for <strong>{ROLE_LABELS[confirmDialog?.targetRole ?? ""] ?? confirmDialog?.targetRole}</strong>?
          </p>
          <Textarea
            placeholder="Reason (optional but recommended for audit trail)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-sm"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={confirmDialog?.disable ? "destructive" : "default"}
              onClick={confirmToggle}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
