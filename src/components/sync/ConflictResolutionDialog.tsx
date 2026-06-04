import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Copy } from "lucide-react";

interface ConflictField {
  field: string;
  label: string;
  localValue: string;
  serverValue: string;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string;
  conflictFields: ConflictField[];
  onReload: () => void;
  onForceOverwrite: () => void;
}

export default function ConflictResolutionDialog({
  open,
  onOpenChange,
  entityType,
  conflictFields,
  onReload,
  onForceOverwrite,
}: ConflictResolutionDialogProps) {
  const [selected, setSelected] = useState<"reload" | "overwrite" | null>(null);

  const handleConfirm = () => {
    if (selected === "reload") {
      onReload();
    } else if (selected === "overwrite") {
      onForceOverwrite();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Edit Conflict Detected
          </DialogTitle>
          <DialogDescription>
            This {entityType} was modified by another user while you were editing.
            Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        {conflictFields.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            <p className="text-sm font-medium text-muted-foreground">Changed fields:</p>
            {conflictFields.map((cf) => (
              <div key={cf.field} className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-sm font-semibold text-foreground">{cf.label}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Badge variant="outline" className="mb-1">Your version</Badge>
                    <p className="text-muted-foreground truncate">{cf.localValue || "—"}</p>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-1">Server version</Badge>
                    <p className="text-muted-foreground truncate">{cf.serverValue || "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => setSelected("reload")}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              selected === "reload"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <RefreshCw className="h-5 w-5 mb-2 text-primary" />
            <p className="text-sm font-semibold text-foreground">Reload & Re-edit</p>
            <p className="text-xs text-muted-foreground mt-1">
              Load the latest version and reapply your changes manually.
            </p>
          </button>
          <button
            onClick={() => setSelected("overwrite")}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              selected === "overwrite"
                ? "border-destructive bg-destructive/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <Copy className="h-5 w-5 mb-2 text-destructive" />
            <p className="text-sm font-semibold text-foreground">Force Overwrite</p>
            <p className="text-xs text-muted-foreground mt-1">
              Replace the server version with your changes. The other user's edits will be lost.
            </p>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
