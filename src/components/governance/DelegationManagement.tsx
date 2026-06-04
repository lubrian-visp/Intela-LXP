import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { UserPlus, Trash2, Clock, Shield, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function useDelegatedApprovers() {
  return useQuery({
    queryKey: ["delegated-approvers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delegated_approvers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

export default function DelegationManagement() {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: delegations = [], isLoading } = useDelegatedApprovers();
  const { data: profiles = [] } = useProfiles();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [scopeType, setScopeType] = useState("global");
  const [expiryDate, setExpiryDate] = useState("");

  const canManage = hasRole("super_admin") || hasRole("operations");

  const createDelegation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedUserId) throw new Error("Missing data");
      const { error } = await supabase.from("delegated_approvers").insert({
        delegated_user_id: selectedUserId,
        assigned_by: user.id,
        scope_type: scopeType,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delegated-approvers"] });
      toast.success("Delegated approver assigned");
      setOpen(false);
      setSelectedUserId("");
      setExpiryDate("");
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeDelegation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("delegated_approvers")
        .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delegated-approvers"] });
      toast.success("Delegation revoked");
    },
    onError: (err) => toast.error(err.message),
  });

  const getProfileName = (userId: string) =>
    profiles.find((p) => p.user_id === userId)?.full_name || userId.slice(0, 8) + "…";

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">You do not have permission to manage delegated approvers.</p>
        </CardContent>
      </Card>
    );
  }

  const activeDelegations = delegations.filter((d: any) => d.is_active);
  const revokedDelegations = delegations.filter((d: any) => !d.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Delegated Approvers</CardTitle>
            <CardDescription>Assign users who can approve programmes on behalf of Ops Control.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Assign Approver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Delegated Approver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name || p.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select value={scopeType} onValueChange={setScopeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (all programmes)</SelectItem>
                      <SelectItem value="programme">Specific Programme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date (optional)</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Delegated approvers cannot approve their own programmes (Four-Eyes principle enforced).</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createDelegation.mutate()} disabled={!selectedUserId || createDelegation.isPending}>
                  {createDelegation.isPending ? "Assigning…" : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : activeDelegations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No active delegated approvers.</div>
          ) : (
            <div className="space-y-2">
              {activeDelegations.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{getProfileName(d.delegated_user_id)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Scope: {d.scope_type} · Assigned by {getProfileName(d.assigned_by)}
                        {d.expires_at && ` · Expires ${format(new Date(d.expires_at), "MMM dd, yyyy")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.expires_at && new Date(d.expires_at) < new Date() && (
                      <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => revokeDelegation.mutate(d.id)}
                            disabled={revokeDelegation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Revoke delegation</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}

          {revokedDelegations.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Revoked</p>
              <div className="space-y-1">
                {revokedDelegations.slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex items-center gap-3 p-2 rounded text-xs text-muted-foreground opacity-60">
                    <Clock className="w-3 h-3" />
                    <span>{getProfileName(d.delegated_user_id)} — revoked {d.revoked_at ? format(new Date(d.revoked_at), "MMM dd") : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
