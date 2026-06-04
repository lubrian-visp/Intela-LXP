import { Shield, Plus, Users, Lock, ChevronRight, Search, Edit2, Upload, Archive, Copy, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRoleDefinitions, useUserRoleScopes, useDeactivateRole, useDeleteRole, RoleDefinition } from "@/hooks/useRoleDefinitions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CreateRoleDialog from "@/components/roles/CreateRoleDialog";
import BulkImportDialog from "@/components/roles/BulkImportDialog";

type DomainKey = "technical" | "business" | "learning_development";

const domainMeta: Record<DomainKey, { label: string; color: string; description: string }> = {
  technical: { label: "Technical", color: "hsl(0, 84%, 60%)", description: "Infrastructure layer. System-wide RBAC with mandatory SSO and MFA." },
  business: { label: "Business / Operational", color: "hsl(38, 92%, 50%)", description: "Business layer. RBAC + ABAC, scoped to programme, department, or region." },
  learning_development: { label: "Learning & Development", color: "hsl(210, 80%, 55%)", description: "L&D layer. Functional delivery roles and the largest user population." },
};

const permissionGroups = [
  { group: "Programmes", permissions: ["View programmes", "Create programmes", "Edit programmes", "Delete programmes", "Publish programmes"] },
  { group: "Onboarding & Registration", permissions: ["View registrations", "Approve registrations", "Reject registrations", "Configure enrollment settings", "Manage cohort assignment"] },
  { group: "Cohorts", permissions: ["View cohorts", "Create cohorts", "Manage enrollment", "Assign facilitators"] },
  { group: "Assessments", permissions: ["View assessments", "Grade submissions", "Moderate grades", "Configure rubrics"] },
  { group: "Credentials", permissions: ["View credentials", "Issue credentials", "Revoke credentials", "Verify on-chain"] },
  { group: "Users & Roles", permissions: ["View users", "Manage users", "Assign roles", "Create custom roles"] },
  { group: "Talent & HR", permissions: ["View employees", "Manage records", "Performance tracking", "Task assignment"] },
  { group: "Analytics", permissions: ["View reports", "Export data", "Configure dashboards"] },
  { group: "System & Infrastructure", permissions: ["Manage tenants", "System settings", "Audit logs", "API access", "Manage integrations", "Backup & recovery"] },
];

// Build permission set from a role's stored permissions JSON
function buildPermissionSet(permissions: Record<string, string> | null): Set<string> {
  if (!permissions) return new Set();
  const set = new Set<string>();
  Object.entries(permissions).forEach(([resource, action]) => {
    if (action === "manage") {
      permissionGroups.forEach((g) => {
        g.permissions.forEach((p) => {
          if (p.toLowerCase().includes(resource.replace(/_/g, " "))) set.add(p);
        });
      });
    } else {
      permissionGroups.forEach((g) => {
        g.permissions.forEach((p) => {
          const pLower = p.toLowerCase();
          if (pLower.includes(resource.replace(/_/g, " ")) && pLower.includes(action)) set.add(p);
        });
      });
    }
  });
  return set;
}

export default function RolesPermissions() {
  const { data: roles = [], isLoading } = useRoleDefinitions();
  const { data: scopes = [] } = useUserRoleScopes();
  const deactivateRole = useDeactivateRole();
  const deleteRole = useDeleteRole();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [tab, setTab] = useState<"roles" | "matrix" | "users" | "audit">("roles");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null);
  const [userSearch, setUserSearch] = useState("");

  // Fetch real user data for the Users tab — use profiles_safe view (RLS-aware, PoPIA-safe).
  // Direct queries on `profiles` are blocked by RLS for non-owners, which is why this tab appeared empty.
  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles-roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles_safe")
        .select("id, user_id, full_name, email, avatar_url, job_title, department, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: allUserRoles = [] } = useQuery({
    queryKey: ["all-user-roles-page"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["role-audit-logs"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("role_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: tab === "audit",
  });

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || roles[0], [roles, selectedRoleId]);
  const selectedPermSet = useMemo(() => buildPermissionSet(selectedRole?.permissions), [selectedRole]);

  // Count users per role from user_roles table
  const roleUserCount = useMemo(() => {
    const counts: Record<string, number> = {};
    allUserRoles.forEach((ur: any) => {
      const roleDef = roles.find((r) => r.base_role === ur.role);
      if (roleDef) counts[roleDef.id] = (counts[roleDef.id] || 0) + 1;
    });
    // Also count scopes for custom roles
    scopes.forEach((s) => {
      counts[s.role_definition_id] = (counts[s.role_definition_id] || 0) + 1;
    });
    return counts;
  }, [allUserRoles, roles, scopes]);

  const filteredProfiles = useMemo(() => {
    if (!userSearch) return profiles;
    const q = userSearch.toLowerCase();
    return profiles.filter((p: any) =>
      p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  }, [profiles, userSearch]);

  const getRoles = (userId: string) =>
    allUserRoles.filter((r: any) => r.user_id === userId).map((r: any) => r.role);

  if (isLoading) return <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {roles.length} roles configured • {roles.filter((r) => !r.is_predefined).length} custom
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)}>
            <Upload className="w-4 h-4 mr-1" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Role
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(["roles", "matrix", "users", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-medium capitalize transition-colors",
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "roles" ? "Roles" : t === "matrix" ? "Permission Matrix" : t === "users" ? "User Assignments" : "Audit Log"}
          </button>
        ))}
      </div>

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="space-y-8">
          {(["technical", "business", "learning_development"] as DomainKey[]).map((domain) => {
            const meta = domainMeta[domain];
            const domainRoles = roles.filter((r) => r.domain === domain && r.is_active);
            if (domainRoles.length === 0) return null;
            return (
              <div key={domain}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  <h2 className="text-sm font-bold text-foreground">{meta.label}</h2>
                  <span className="text-[10px] text-muted-foreground">{meta.description}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domainRoles.map((role) => (
                    <div
                      key={role.id}
                      onClick={() => { setSelectedRoleId(role.id); setTab("matrix"); }}
                      className="group bg-card rounded-xl p-5 shadow-card border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}15` }}>
                            <Shield className="w-4 h-4" style={{ color: meta.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{role.display_name}</h3>
                              {!role.is_predefined && <Badge variant="secondary" className="text-[9px]">Custom</Badge>}
                            </div>
                            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{role.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{roleUserCount[role.id] || 0}</span> users
                        </div>
                        {!role.is_predefined && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); deactivateRole.mutate(role.id); }}
                              className="text-[10px] text-muted-foreground hover:text-warning transition-colors flex items-center gap-1"
                              title="Archive (soft delete – can be reactivated)"
                            >
                              <Archive className="w-3 h-3" /> Archive
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRoleToDelete(role); }}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Matrix Tab */}
      {tab === "matrix" && selectedRole && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">Permission Matrix</h3>
              <Badge variant="outline" className="text-[10px]">{selectedRole.display_name}</Badge>
              {!selectedRole.is_predefined && <Badge variant="secondary" className="text-[9px]">Custom</Badge>}
            </div>
            <select
              value={selectedRole.id}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="text-xs bg-secondary rounded-lg px-3 py-1.5 border-0 outline-none text-foreground"
            >
              {roles.filter((r) => r.is_active).map((r) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-48">Group</th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Permission</th>
                  <th className="text-center px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Granted</th>
                </tr>
              </thead>
              <tbody>
                {permissionGroups.map((g) =>
                  g.permissions.map((p, i) => (
                    <tr key={p} className="border-b border-border/30 hover:bg-secondary/10 transition-colors">
                      {i === 0 && (
                        <td className="px-5 py-2.5 text-xs font-semibold text-foreground align-top" rowSpan={g.permissions.length}>
                          <div className="flex items-center gap-2">
                            <Lock className="w-3 h-3 text-muted-foreground" />
                            {g.group}
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-2.5 text-xs text-muted-foreground">{p}</td>
                      <td className="px-5 py-2.5 text-center">
                        <div className={cn(
                          "w-5 h-5 rounded-md mx-auto flex items-center justify-center text-[10px] font-bold transition-colors",
                          selectedPermSet.has(p) ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground/30"
                        )}>
                          {selectedPermSet.has(p) ? "✓" : "—"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">User Role Assignments</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-xs bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent w-52 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowBulkDialog(true)}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Bulk Import
              </Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Roles</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Domain</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p: any) => {
                const userRoles = getRoles(p.user_id);
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                          {(p.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.full_name || "—"}</p>
                          {p.email && <p className="text-[10px] text-muted-foreground">{p.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {userRoles.length > 0 ? userRoles.map((r: string) => (
                          <Badge key={r} variant="secondary" className="text-[10px] capitalize">
                            {r.replace(/_/g, " ")}
                          </Badge>
                        )) : (
                          <span className="text-[10px] text-muted-foreground">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {userRoles.length > 0 && (
                        <div className="flex gap-1">
                          {[...new Set(userRoles.map((r: string) => {
                            const def = roles.find((d) => d.base_role === r);
                            return def?.domain;
                          }).filter(Boolean))].map((d: string) => (
                            <div key={d} className="w-2 h-2 rounded-full" style={{ backgroundColor: domainMeta[d as DomainKey]?.color }} />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProfiles.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === "audit" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Role Audit Log</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Tracks all role creation, assignment, and permission changes</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Action</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Entity</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Details</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log: any) => (
                <tr key={log.id} className="border-b border-border/30 hover:bg-secondary/10">
                  <td className="px-5 py-2.5">
                    <Badge variant={log.action.includes("created") ? "default" : log.action.includes("deactivated") ? "destructive" : "secondary"} className="text-[10px]">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground capitalize">{log.entity_type.replace(/_/g, " ")}</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">
                    {log.details?.display_name || log.details?.email || log.entity_id?.slice(0, 8)}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <CreateRoleDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} existingRoles={roles} />
      <BulkImportDialog open={showBulkDialog} onOpenChange={setShowBulkDialog} roles={roles} />

      <AlertDialog open={!!roleToDelete} onOpenChange={(o) => !o && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{roleToDelete?.display_name}</strong> and remove it from all
              {" "}{roleUserCount[roleToDelete?.id || ""] || 0} assigned user(s). The auto-generated portal will also be removed.
              This action cannot be undone. Consider <em>Archive</em> instead if you may need to restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (roleToDelete) {
                  deleteRole.mutate(roleToDelete.id, { onSettled: () => setRoleToDelete(null) });
                }
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
