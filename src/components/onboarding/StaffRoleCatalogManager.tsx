import { useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, GripVertical, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useStaffRoleCatalog, useCreateStaffRole, useUpdateStaffRole, useDeleteStaffRole,
  StaffRoleCatalogEntry, CATEGORY_LABELS,
} from "@/hooks/useStaffRoleCatalog";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const BLANK: Omit<StaffRoleCatalogEntry, "id" | "created_at" | "updated_at"> = {
  display_name: "",
  user_type_key: "",
  app_role_key: "facilitator",
  category: "ld_delivery",
  is_active: true,
  sort_order: 999,
};

const APP_ROLES = [
  "super_admin", "systems_admin", "programme_manager", "operations",
  "talent_manager", "facilitator", "assessor", "moderator", "mentor",
  "learner", "ld_support_officer",
];

export default function StaffRoleCatalogManager({ open, onOpenChange }: Props) {
  const { data: roles = [], isLoading } = useStaffRoleCatalog(false); // show all incl inactive
  const createRole = useCreateStaffRole();
  const updateRole = useUpdateStaffRole();
  const deleteRole = useDeleteStaffRole();

  const [adding, setAdding]           = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draft, setDraft]             = useState<typeof BLANK>(BLANK);
  const [confirmDelete, setConfirmDelete] = useState<StaffRoleCatalogEntry | null>(null);

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat,
    label,
    items: roles.filter(r => r.category === cat).sort((a, b) => a.sort_order - b.sort_order),
  }));

  // Auto-generate user_type_key from display_name
  const autoKey = (name: string) =>
    "staff_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const handleSaveNew = async () => {
    if (!draft.display_name.trim()) return;
    const key = draft.user_type_key.trim() || autoKey(draft.display_name);
    await createRole.mutateAsync({ ...draft, user_type_key: key });
    setAdding(false);
    setDraft(BLANK);
  };

  const handleSaveEdit = async (id: string) => {
    await updateRole.mutateAsync({ id, ...draft });
    setEditingId(null);
  };

  const startEdit = (r: StaffRoleCatalogEntry) => {
    setDraft({ display_name: r.display_name, user_type_key: r.user_type_key, app_role_key: r.app_role_key, category: r.category, is_active: r.is_active, sort_order: r.sort_order });
    setEditingId(r.id);
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Manage Staff Roles Catalog</DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Add, edit, or deactivate roles available in the Staff Onboarding form. Changes take effect immediately.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (
            grouped.map(({ category, label, items }) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground">{items.filter(i => i.is_active).length} active</span>
                </div>

                <div className="space-y-1.5">
                  {items.length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-2">No roles in this category yet.</p>
                  )}
                  {items.map(r => {
                    const isEditing = editingId === r.id;
                    return (
                      <div key={r.id} className={cn(
                        "rounded-xl border px-4 py-3 transition-colors",
                        isEditing ? "border-primary/30 bg-primary/5" : !r.is_active ? "border-border/30 bg-secondary/20 opacity-60" : "border-border/50 bg-card hover:bg-secondary/20"
                      )}>
                        {isEditing ? (
                          // Edit form
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Display Name</Label>
                                <Input value={draft.display_name} onChange={e => setDraft(p => ({ ...p, display_name: e.target.value }))} className="h-7 text-xs" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Key (auto-generated)</Label>
                                <Input value={draft.user_type_key} onChange={e => setDraft(p => ({ ...p, user_type_key: e.target.value }))} className="h-7 text-xs font-mono" placeholder="staff_role_name" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Auth Role</Label>
                                <Select value={draft.app_role_key} onValueChange={v => setDraft(p => ({ ...p, app_role_key: v }))}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{APP_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Category</Label>
                                <Select value={draft.category} onValueChange={v => setDraft(p => ({ ...p, category: v as any }))}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Switch checked={draft.is_active} onCheckedChange={v => setDraft(p => ({ ...p, is_active: v }))} />
                                <Label className="text-xs cursor-pointer">Active</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditingId(null)}>
                                  <X className="w-3 h-3" /> Cancel
                                </Button>
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSaveEdit(r.id)} disabled={updateRole.isPending}>
                                  <Save className="w-3 h-3" /> {updateRole.isPending ? "Saving…" : "Save"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Display row
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-foreground">{r.display_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{r.user_type_key} → {r.app_role_key}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                checked={r.is_active}
                                onCheckedChange={v => updateRole.mutate({ id: r.id, is_active: v })}
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(r)}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDelete(r)}>
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Add new role form */}
          {adding && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">New Role</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Display Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={draft.display_name}
                    onChange={e => setDraft(p => ({ ...p, display_name: e.target.value, user_type_key: autoKey(e.target.value) }))}
                    placeholder="e.g. Content Producer"
                    className="h-7 text-xs"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Key (auto)</Label>
                  <Input
                    value={draft.user_type_key}
                    onChange={e => setDraft(p => ({ ...p, user_type_key: e.target.value }))}
                    className="h-7 text-xs font-mono"
                    placeholder="staff_content_producer"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Auth Role</Label>
                  <Select value={draft.app_role_key} onValueChange={v => setDraft(p => ({ ...p, app_role_key: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{APP_ROLES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Category</Label>
                  <Select value={draft.category} onValueChange={v => setDraft(p => ({ ...p, category: v as any }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                <strong>Auth Role</strong> determines the portal access level. <strong>Key</strong> is used internally by the provisioning system.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setAdding(false); setDraft(BLANK); }}>
                  <X className="w-3 h-3" /> Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveNew}
                  disabled={!draft.display_name.trim() || createRole.isPending}>
                  <Plus className="w-3 h-3" /> {createRole.isPending ? "Adding…" : "Add Role"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
            onClick={() => { setAdding(true); setEditingId(null); setDraft(BLANK); }}>
            <Plus className="w-3.5 h-3.5" /> Add New Role
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">Done</Button>
        </div>
      </DialogContent>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={v => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Remove Role
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <strong className="text-foreground">{confirmDelete?.display_name}</strong> from the catalog?
            It won't appear in new onboarding forms. Existing staff with this role are unaffected.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={() => { deleteRole.mutate(confirmDelete!.id); setConfirmDelete(null); }}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
