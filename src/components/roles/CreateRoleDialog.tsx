import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateRole, RoleDefinition } from "@/hooks/useRoleDefinitions";

const domainMeta = {
  technical: { label: "Technical", color: "hsl(0, 84%, 60%)", hint: "SSO + MFA required" },
  business: { label: "Business / Operational", color: "hsl(38, 92%, 50%)", hint: "RBAC + ABAC scoped" },
  learning_development: { label: "Learning & Development", color: "hsl(210, 80%, 55%)", hint: "Delivery roles" },
} as const;

type DomainKey = keyof typeof domainMeta;

const permissionGroups = [
  { group: "Programmes", permissions: ["View programmes", "Create programmes", "Edit programmes", "Delete programmes", "Publish programmes"] },
  { group: "Onboarding", permissions: ["View registrations", "Approve registrations", "Reject registrations", "Configure enrollment", "Manage cohort assignment"] },
  { group: "Cohorts", permissions: ["View cohorts", "Create cohorts", "Manage enrollment", "Assign facilitators"] },
  { group: "Assessments", permissions: ["View assessments", "Grade submissions", "Moderate grades", "Configure rubrics"] },
  { group: "Credentials", permissions: ["View credentials", "Issue credentials", "Revoke credentials", "Verify on-chain"] },
  { group: "Users & Roles", permissions: ["View users", "Manage users", "Assign roles", "Create custom roles"] },
  { group: "Talent & HR", permissions: ["View employees", "Manage records", "Performance tracking", "Task assignment"] },
  { group: "Analytics", permissions: ["View reports", "Export data", "Configure dashboards"] },
  { group: "System", permissions: ["Manage tenants", "System settings", "Audit logs", "API access", "Manage integrations", "Backup & recovery"] },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRoles: RoleDefinition[];
}

export default function CreateRoleDialog({ open, onOpenChange, existingRoles }: Props) {
  const createRole = useCreateRole();
  const [mode, setMode] = useState<"freeform" | "template">("freeform");
  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<DomainKey>("learning_development");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const resetForm = () => {
    setMode("freeform");
    setTemplateId("");
    setName("");
    setDescription("");
    setDomain("learning_development");
    setSelectedPerms(new Set());
  };

  const handleCloneTemplate = (roleId: string) => {
    const source = existingRoles.find((r) => r.id === roleId);
    if (!source) return;
    setTemplateId(roleId);
    setName(`${source.display_name} (Copy)`);
    setDescription(source.description || "");
    setDomain(source.domain);
    // Clone permissions from the source's permission matrix
    const perms = source.permissions || {};
    const permSet = new Set<string>();
    Object.entries(perms).forEach(([resource, action]) => {
      // Map stored permissions to UI permission labels
      permissionGroups.forEach((g) => {
        g.permissions.forEach((p) => {
          const pLower = p.toLowerCase();
          if (pLower.includes(resource) || pLower.includes(action as string)) {
            permSet.add(p);
          }
        });
      });
    });
    setSelectedPerms(permSet);
  };

  const togglePerm = (p: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const toggleGroup = (perms: string[]) => {
    const allSelected = perms.every((p) => selectedPerms.has(p));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (allSelected ? next.delete(p) : next.add(p)));
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const roleKey = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const permEntries = Array.from(selectedPerms).map((p) => {
      const parts = p.split(" ");
      const action = parts[0].toLowerCase();
      const resource = parts.slice(1).join("_").toLowerCase();
      return { resource, action };
    });

    const permObj: Record<string, string> = {};
    permEntries.forEach((e) => {
      permObj[e.resource] = e.action;
    });

    createRole.mutate(
      {
        role_key: roleKey,
        display_name: name.trim(),
        description: description.trim(),
        domain,
        template_source_id: templateId || undefined,
        permissions: permObj,
        permission_entries: permEntries,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">Create New Role</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Mode selector */}
          <div className="flex gap-3">
            <button
              onClick={() => { setMode("freeform"); setTemplateId(""); }}
              className={cn(
                "flex-1 rounded-lg border-2 p-3 text-left transition-all",
                mode === "freeform" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">Freeform</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Create from scratch with blank permissions</p>
            </button>
            <button
              onClick={() => setMode("template")}
              className={cn(
                "flex-1 rounded-lg border-2 p-3 text-left transition-all",
                mode === "template" ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Copy className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-foreground">Clone Template</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Start from an existing role and customise</p>
            </button>
          </div>

          {/* Template selector */}
          {mode === "template" && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Clone from existing role</Label>
              <Select value={templateId} onValueChange={(v) => handleCloneTemplate(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role to clone..." />
                </SelectTrigger>
                <SelectContent>
                  {existingRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: domainMeta[r.domain]?.color }} />
                        {r.display_name}
                        {r.is_predefined && <Badge variant="secondary" className="text-[9px] ml-1">Built-in</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Role Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Assessor" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={2} />
          </div>

          {/* Domain */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Domain Classification *</Label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(domainMeta) as DomainKey[]).map((d) => {
                const meta = domainMeta[d];
                return (
                  <button
                    key={d}
                    onClick={() => setDomain(d)}
                    className={cn(
                      "relative rounded-lg border-2 p-3 text-left transition-all",
                      domain === d ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
                    )}
                  >
                    {domain === d && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-accent-foreground" />
                      </div>
                    )}
                    <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: meta.color }} />
                    <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{meta.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">
              Permissions <span className="text-muted-foreground font-normal">({selectedPerms.size} selected)</span>
            </Label>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {permissionGroups.map((g) => {
                const allSelected = g.permissions.every((p) => selectedPerms.has(p));
                const someSelected = g.permissions.some((p) => selectedPerms.has(p));
                return (
                  <div key={g.group} className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleGroup(g.permissions)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center text-[9px] font-bold shrink-0",
                        allSelected ? "bg-accent border-accent text-accent-foreground" :
                        someSelected ? "bg-accent/30 border-accent text-accent-foreground" :
                        "border-border"
                      )}>
                        {allSelected ? "✓" : someSelected ? "–" : ""}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{g.group}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {g.permissions.filter((p) => selectedPerms.has(p)).length}/{g.permissions.length}
                      </span>
                    </button>
                    <div className="px-3 py-1.5 space-y-1">
                      {g.permissions.map((p) => (
                        <label key={p} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-secondary/20 rounded px-1 -mx-1">
                          <div className={cn(
                            "w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-bold shrink-0",
                            selectedPerms.has(p) ? "bg-accent border-accent text-accent-foreground" : "border-border"
                          )}>
                            {selectedPerms.has(p) && "✓"}
                          </div>
                          <span className="text-xs text-muted-foreground">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || createRole.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              {createRole.isPending ? "Creating..." : "Create Role"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
