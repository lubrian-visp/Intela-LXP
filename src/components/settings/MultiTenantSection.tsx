import { useState } from "react";
import {
  Globe, Shield, Users, Building2, Lock, Loader2, ExternalLink,
  Plus, Trash2, Settings2, Eye, UserPlus, ToggleLeft, Search, Edit2
} from "lucide-react";
import { usePlatformSettings, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant, useTenantUsers, useAddTenantUser, useRemoveTenantUser, useTenantFeatureFlags, TenantRow } from "@/hooks/useTenantManagement";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function MultiTenantSection() {
  const { data: mtSettings, isLoading: settingsLoading } = usePlatformSettings("multi-tenant");
  const update = useUpdatePlatformSetting();
  const { data: tenants = [], isLoading: tenantsLoading } = useTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
  const [detailTenant, setDetailTenant] = useState<TenantRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState({ name: "", slug: "", domain: "", contact_email: "", country: "", subscription_tier: "standard" });

  const subdomainSetting = mtSettings?.find((s) => s.setting_key === "subdomain_routing");
  const orgContextSetting = mtSettings?.find((s) => s.setting_key === "enforce_org_context");

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const inactiveTenants = tenants.filter((t) => t.status !== "active").length;

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }
    createTenant.mutate(form, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: "", slug: "", domain: "", contact_email: "", country: "", subscription_tier: "standard" });
      },
    });
  };

  const handleUpdate = () => {
    if (!editTenant) return;
    updateTenant.mutate({ id: editTenant.id, name: editTenant.name, slug: editTenant.slug, domain: editTenant.domain, contact_email: editTenant.contact_email, country: editTenant.country, subscription_tier: editTenant.subscription_tier, status: editTenant.status });
    setEditTenant(null);
  };

  if (settingsLoading || tenantsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="TOTAL TENANTS" value={String(tenants.length)} icon={Building2} color="text-foreground" />
        <StatCard label="ACTIVE" value={String(activeTenants)} icon={Building2} color="text-success" />
        <StatCard label="INACTIVE" value={String(inactiveTenants)} icon={Building2} color="text-muted-foreground" />
        <StatCard label="RLS ENABLED" value="100%" icon={Shield} color="text-accent" />
      </div>

      {/* Global Switches */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-accent" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Isolation Controls</h3>
              <p className="text-[11px] text-muted-foreground">Global multi-tenant configuration</p>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Subdomain Routing</p>
                <p className="text-[10px] text-muted-foreground">Access via {"{slug}"}.yourdomain.com</p>
              </div>
            </div>
            <Switch
              checked={subdomainSetting?.setting_value === "true"}
              onCheckedChange={(checked) => {
                if (subdomainSetting) update.mutate({ id: subdomainSetting.id, setting_value: String(checked) });
              }}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Enforce Org Context</p>
                <p className="text-[10px] text-muted-foreground">Restrict all queries to tenant scope</p>
              </div>
            </div>
            <Switch
              checked={orgContextSetting?.setting_value === "true"}
              onCheckedChange={(checked) => {
                if (orgContextSetting) update.mutate({ id: orgContextSetting.id, setting_value: String(checked) });
              }}
            />
          </div>
        </div>
      </div>

      {/* Tenant Management Table */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-accent" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Organisations</h3>
              <p className="text-[11px] text-muted-foreground">{tenants.length} tenant(s) configured</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search tenants..." className="pl-8 h-9 text-xs w-full sm:w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" /> New Tenant
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border/50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No organisations found</p>
              <button className="text-xs text-accent hover:underline mt-1" onClick={() => setShowCreate(true)}>Create your first tenant</button>
            </div>
          ) : (
            filtered.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: t.primary_color + "22", color: t.primary_color }}>
                    {t.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.slug}.yourdomain.com • {t.subscription_tier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${t.status === "active" ? "bg-success/10 text-success border-success/20" : t.status === "suspended" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground"}`}>
                    {t.status}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailTenant(t)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditTenant({ ...t })}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Security & Isolation</h3>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureItem icon={Shield} color="text-accent" label="Row-Level Security" desc="Database-enforced data isolation per tenant" />
          <FeatureItem icon={Globe} color="text-success" label="Subdomain Routing" desc="Custom URLs per organisation" />
          <FeatureItem icon={Users} color="text-info" label="User Scoping" desc="Users mapped to tenants with role-based access" />
          <FeatureItem icon={Lock} color="text-warning" label="Feature Flags" desc="Per-tenant feature toggles and limits" />
          <FeatureItem icon={ToggleLeft} color="text-accent" label="Cross-Tenant Admin" desc="Platform admins can access all tenant data" />
          <FeatureItem icon={Settings2} color="text-muted-foreground" label="Tenant Branding" desc="Custom logos, colors, and settings per org" />
        </div>
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>Set up a new organisation with isolated data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Organisation Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") })} placeholder="Acme Corporation" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL) *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="acme" />
              <p className="text-[10px] text-muted-foreground">{form.slug || "slug"}.yourdomain.com</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custom Domain (optional)</Label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="learn.acme.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Contact Email</Label>
                <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="admin@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="South Africa" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subscription Tier</Label>
              <Select value={form.subscription_tier} onValueChange={(v) => setForm({ ...form, subscription_tier: v })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={createTenant.isPending}>
              {createTenant.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={!!editTenant} onOpenChange={(o) => !o && setEditTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update organisation settings</DialogDescription>
          </DialogHeader>
          {editTenant && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Organisation Name</Label>
                <Input value={editTenant.name} onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug</Label>
                <Input value={editTenant.slug} onChange={(e) => setEditTenant({ ...editTenant, slug: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Custom Domain</Label>
                <Input value={editTenant.domain || ""} onChange={(e) => setEditTenant({ ...editTenant, domain: e.target.value || null })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={editTenant.status} onValueChange={(v) => setEditTenant({ ...editTenant, status: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tier</Label>
                  <Select value={editTenant.subscription_tier} onValueChange={(v) => setEditTenant({ ...editTenant, subscription_tier: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTenant(null)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      {detailTenant && (
        <TenantDetailDialog tenant={detailTenant} onClose={() => setDetailTenant(null)} />
      )}

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this tenant and all associated user mappings, feature flags, and audit logs. Data linked via tenant_id on programmes, cohorts, etc. will be unlinked (set to NULL). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingId) deleteTenant.mutate(deletingId); setDeletingId(null); }}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── TENANT DETAIL DIALOG ─── */
function TenantDetailDialog({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  const { data: users = [], isLoading: usersLoading } = useTenantUsers(tenant.id);
  const { data: flags = [], isLoading: flagsLoading } = useTenantFeatureFlags(tenant.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: tenant.primary_color + "22", color: tenant.primary_color }}>
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
            {tenant.name}
          </DialogTitle>
          <DialogDescription>{tenant.slug}.yourdomain.com{tenant.domain ? ` • ${tenant.domain}` : ""}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="text-xs flex-1">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-xs flex-1">Users</TabsTrigger>
            <TabsTrigger value="features" className="text-xs flex-1">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Detail label="Status" value={tenant.status} />
              <Detail label="Tier" value={tenant.subscription_tier} />
              <Detail label="Country" value={tenant.country || "—"} />
              <Detail label="Contact" value={tenant.contact_email || "—"} />
              <Detail label="Max Users" value={tenant.max_users ? String(tenant.max_users) : "Unlimited"} />
              <Detail label="Max Programmes" value={tenant.max_programmes ? String(tenant.max_programmes) : "Unlimited"} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-5 h-5 rounded" style={{ backgroundColor: tenant.primary_color }} />
              <span className="text-xs text-muted-foreground">Primary: {tenant.primary_color}</span>
              <div className="w-5 h-5 rounded" style={{ backgroundColor: tenant.secondary_color }} />
              <span className="text-xs text-muted-foreground">Secondary: {tenant.secondary_color}</span>
            </div>
          </TabsContent>

          <TabsContent value="users" className="pt-3">
            {usersLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div>
            ) : users.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No users assigned to this tenant</p>
            ) : (
              <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                {users.map((u: any) => (
                  <div key={u.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">{u.profiles?.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{u.role}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{u.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="features" className="pt-3">
            {flagsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div>
            ) : flags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No feature flags configured</p>
            ) : (
              <div className="space-y-2">
                {flags.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded border border-border/50">
                    <span className="text-xs font-medium">{f.flag_key}</span>
                    <Badge variant={f.is_enabled ? "default" : "outline"} className="text-[10px]">{f.is_enabled ? "ON" : "OFF"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ─── HELPERS ─── */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-foreground capitalize">{value}</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function FeatureItem({ icon: Icon, color, label, desc }: { icon: React.ElementType; color: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
