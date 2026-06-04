import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, ShieldCheck, ShieldOff, UserPlus, X, Clock, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  useProgrammeEditPermissions,
  useGrantEditPermission,
  useRevokeEditPermission,
} from "@/hooks/useEditPermissions";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface EditPermissionPanelProps {
  programmeId: string;
  programmeTitle?: string;
}

export default function EditPermissionPanel({ programmeId, programmeTitle }: EditPermissionPanelProps) {
  const { user, roles } = useAuth();
  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);

  const { data: permissions = [], isLoading } = useProgrammeEditPermissions(programmeId);
  const grantMutation = useGrantEditPermission();
  const revokeMutation = useRevokeEditPermission();

  // Only super_admin can delegate; ops can also grant for their scope
  const isSuperAdmin = roles?.includes("super_admin");
  const isOpsOrAbove = roles?.includes("super_admin") || roles?.includes("systems_admin") || roles?.includes("operations");

  // Fetch staff profiles for the grant dialog
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["staff-profiles-for-edit-perms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      if (error) return [];
      return data ?? [];
    },
    enabled: grantOpen,
  });

  const handleGrant = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    // Only Super Admin can grant global permissions
    if (isGlobal && !isSuperAdmin) {
      toast.error("Only Super Admin can grant global editing permissions");
      return;
    }

    grantMutation.mutate(
      {
        programmeId: isGlobal ? null : programmeId,
        granteeId: selectedUserId,
        reason: reason || undefined,
        expiresAt: expiresAt || null,
      },
      {
        onSuccess: () => {
          setGrantOpen(false);
          setSelectedUserId("");
          setReason("");
          setExpiresAt("");
          setIsGlobal(false);
        },
      }
    );
  };

  if (!isOpsOrAbove) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Content Editing Permissions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Manage who can edit content for {programmeTitle || "this programme"}.
          Super Admin, Systems Admin, and Ops Control always have full access.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active grants */}
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading permissions…</p>
        ) : permissions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No additional editing grants. Only Super Admin, Systems Admin, and Ops Control can edit.
          </p>
        ) : (
          <div className="space-y-2">
            {(permissions as any[]).map((perm: any) => (
              <PermissionRow
                key={perm.id}
                permission={perm}
                onRevoke={(id) => revokeMutation.mutate({ permissionId: id })}
                isRevoking={revokeMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Grant button */}
        <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <UserPlus className="w-3.5 h-3.5" />
              Grant Edit Permission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Content Editing Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user…" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffProfiles.map((p: any) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
                  <Label className="text-xs flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    Global (all programmes)
                  </Label>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <Textarea
                  placeholder="Why is this permission being granted?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setGrantOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleGrant} disabled={grantMutation.isPending}>
                {grantMutation.isPending ? "Granting…" : "Grant Permission"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ── Permission Row ────────────────────────────────────────────
function PermissionRow({
  permission,
  onRevoke,
  isRevoking,
}: {
  permission: any;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}) {
  const isExpired = permission.expires_at && new Date(permission.expires_at) < new Date();
  const isGlobal = !permission.programme_id;

  // Fetch grantee name
  const { data: grantee } = useQuery({
    queryKey: ["profile-name", permission.grantee_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", permission.grantee_id)
        .maybeSingle();
      return data;
    },
    staleTime: 300_000,
  });

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/30 border border-border">
      <div className="flex items-center gap-2 min-w-0">
        {isExpired ? (
          <ShieldOff className="w-3.5 h-3.5 text-destructive shrink-0" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">
            {grantee?.full_name || grantee?.email || "Loading…"}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isGlobal && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                <Globe className="w-2.5 h-2.5 mr-0.5" />
                Global
              </Badge>
            )}
            {permission.expires_at && (
              <Badge
                variant={isExpired ? "destructive" : "secondary"}
                className="text-[9px] px-1 py-0"
              >
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                {isExpired ? "Expired" : `Until ${format(new Date(permission.expires_at), "dd MMM yyyy")}`}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
        onClick={() => onRevoke(permission.id)}
        disabled={isRevoking}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
