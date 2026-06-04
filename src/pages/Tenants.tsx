import { Building2, Plus, Globe, Palette, Users, Shield, ChevronRight, CheckCircle2, Loader2, Settings, Trash2, Edit2 } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant, useTenantUsers, useTenantFeatureFlags, TenantRow } from "@/hooks/useTenantManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import TenantInvitationsPanel from "@/components/tenants/TenantInvitationsPanel";
import TenantFeatureFlagsPanel from "@/components/tenants/TenantFeatureFlagsPanel";
import TenantQuotaPanel from "@/components/tenants/TenantQuotaPanel";

const db = supabase as any;

const allProgrammeTypes = ["Qualification", "Short Course", "Micro-credential", "Apprenticeship", "Compliance"];

const statusStyle: Record<string, { badge: string }> = {
  active: { badge: "bg-success/10 text-success border-success/20" },
  trial: { badge: "bg-info/10 text-info border-info/20" },
  pending: { badge: "bg-warning/10 text-warning border-warning/20" },
  suspended: { badge: "bg-destructive/10 text-destructive border-destructive/20" },
  inactive: { badge: "bg-muted text-muted-foreground border-border" },
};

const planStyle: Record<string, string> = {
  enterprise: "bg-accent/10 text-accent",
  professional: "bg-info/10 text-info",
  standard: "bg-secondary text-muted-foreground",
  free: "bg-secondary text-muted-foreground",
};

export default function Tenants() {
  const { data: tenants = [], isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", domain: "", contact_email: "", country: "", subscription_tier: "standard" });

  // Auto-select first tenant
  const selected = selectedId ?? (tenants.length > 0 ? tenants[0].id : null);
  const tenant = tenants.find((t) => t.id === selected) ?? null;

  // Fetch tenant-specific stats
  const { data: tenantStats } = useQuery({
    queryKey: ["tenant-stats", selected],
    enabled: !!selected,
    queryFn: async () => {
      const [programmesRes, enrolmentsRes] = await Promise.all([
        db.from("programmes").select("id", { count: "exact", head: true }).eq("tenant_id", selected),
        db.from("enrolments").select("id", { count: "exact", head: true }).eq("tenant_id", selected),
      ]);
      return {
        programmes: programmesRes.count ?? 0,
        learners: enrolmentsRes.count ?? 0,
      };
    },
  });

  const { data: tenantUsers = [] } = useTenantUsers(selected);
  const { data: tenantFlags = [] } = useTenantFeatureFlags(selected);

  // Get enabled programme types from feature flags
  const enabledTypes = useMemo(() => {
    const flags = tenantFlags as any[];
    return allProgrammeTypes.filter((pt) => {
      const flag = flags.find((f: any) => f.flag_key === `programme_type_${pt.toLowerCase().replace(/[^a-z]/g, "_")}`);
      return flag ? flag.is_enabled : true; // Default enabled if no flag
    });
  }, [tenantFlags]);

  // Aggregate stats
  const totalLearners = tenants.reduce((acc, t) => acc, 0); // Will aggregate from enrolments
  const regions = new Set(tenants.map((t) => t.country).filter(Boolean));

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
    updateTenant.mutate({
      id: editTenant.id,
      name: editTenant.name,
      slug: editTenant.slug,
      domain: editTenant.domain,
      contact_email: editTenant.contact_email,
      country: editTenant.country,
      subscription_tier: editTenant.subscription_tier,
      status: editTenant.status,
      primary_color: editTenant.primary_color,
      secondary_color: editTenant.secondary_color,
    });
    setEditTenant(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-tenant branding, domains, and programme type restrictions.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Add Tenant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tenants", value: tenants.length, icon: <Building2 className="w-4 h-4 text-accent" /> },
          { label: "Active", value: tenants.filter((t) => t.status === "active").length, icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
          { label: "Total Users", value: tenantUsers.length, icon: <Users className="w-4 h-4 text-info" /> },
          { label: "Regions", value: regions.size, icon: <Globe className="w-4 h-4 text-primary" /> },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Tenants Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first organisation to get started with multi-tenancy.</p>
          <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Create Tenant</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant List */}
          <div className="lg:col-span-1 space-y-2">
            {tenants.map((t) => {
              const ss = statusStyle[t.status] ?? statusStyle.inactive;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full text-left bg-card rounded-xl p-4 border transition-all duration-200",
                    selected === t.id ? "border-accent/40 shadow-card-hover ring-1 ring-accent/20" : "border-border/50 shadow-card hover:border-accent/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0" style={{ backgroundColor: t.primary_color }}>
                      {t.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{t.name}</h4>
                        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border", ss.badge)}>{t.status}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{t.domain || `${t.slug}.yourdomain.com`}</p>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", selected === t.id && "rotate-90")} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          {tenant && (
            <div className="lg:col-span-2 space-y-4 animate-fade-in">
              {/* Header */}
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-primary-foreground" style={{ backgroundColor: tenant.primary_color }}>
                    {tenant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-foreground">{tenant.name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5"><Globe className="w-3 h-3" />{tenant.domain || `${tenant.slug}.yourdomain.com`}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", planStyle[tenant.subscription_tier] ?? planStyle.standard)}>{tenant.subscription_tier}</span>
                      {tenant.country && <span className="text-[10px] text-muted-foreground">Region: {tenant.country}</span>}
                      <span className="text-[10px] text-muted-foreground">Since {new Date(tenant.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditTenant({ ...tenant })}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(tenant.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-xl font-bold text-foreground">{tenantStats?.learners ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Learners</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-xl font-bold text-foreground">{tenantStats?.programmes ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Programmes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-xl font-bold text-foreground">{enabledTypes.length}</p>
                    <p className="text-[10px] text-muted-foreground">Types Enabled</p>
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4 text-accent" />Branding</h3>
                  <button className="text-[10px] text-accent font-medium hover:underline" onClick={() => setEditTenant({ ...tenant })}>Edit</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Primary Color</p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: tenant.primary_color }} />
                      <span className="text-xs font-mono text-muted-foreground">{tenant.primary_color}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Custom Domain</p>
                    <p className="text-xs font-medium text-foreground">{tenant.domain || `${tenant.slug}.yourdomain.com`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Logo</p>
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt={`${tenant.name} logo`} className="w-8 h-8 rounded-lg object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: tenant.primary_color }}>
                        {tenant.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Region</p>
                    <p className="text-xs font-medium text-foreground">{tenant.country || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Programme Type Restrictions */}
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-info" />Programme Type Restrictions</h3>
                  <span className="text-[10px] text-muted-foreground">Configure via feature flags</span>
                </div>
                <div className="space-y-2">
                  {allProgrammeTypes.map((pt) => {
                    const enabled = enabledTypes.includes(pt);
                    return (
                      <div key={pt} className={cn("flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors", enabled ? "bg-success/5" : "bg-secondary/30")}>
                        <span className={cn("text-xs font-medium", enabled ? "text-foreground" : "text-muted-foreground")}>{pt}</span>
                        <Switch checked={enabled} disabled className="scale-90" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Users */}
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-info" />Tenant Users</h3>
                  <Badge variant="outline" className="text-[10px]">{tenantUsers.length} member(s)</Badge>
                </div>
                {tenantUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No users assigned to this tenant yet</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {(tenantUsers as any[]).map((u: any) => (
                      <div key={u.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                            {(u.profiles?.full_name || "?").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">{u.profiles?.full_name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{u.role}</p>
                          </div>
                        </div>
                        <Badge variant={u.is_active ? "default" : "outline"} className="text-[10px]">{u.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quota usage meters */}
              <TenantQuotaPanel tenantId={selected!} />

              {/* Feature flags */}
              <TenantFeatureFlagsPanel tenantId={selected!} tenantTier={tenant?.subscription_tier} />

              {/* Invitations */}
              <TenantInvitationsPanel tenantId={selected!} />
            </div>
          )}
        </div>
      )}

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
            <DialogDescription>Update organisation details and branding</DialogDescription>
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
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editTenant.primary_color} onChange={(e) => setEditTenant({ ...editTenant, primary_color: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
                    <Input value={editTenant.primary_color} onChange={(e) => setEditTenant({ ...editTenant, primary_color: e.target.value })} className="flex-1 h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editTenant.secondary_color} onChange={(e) => setEditTenant({ ...editTenant, secondary_color: e.target.value })} className="w-8 h-8 rounded border-0 cursor-pointer" />
                    <Input value={editTenant.secondary_color} onChange={(e) => setEditTenant({ ...editTenant, secondary_color: e.target.value })} className="flex-1 h-8 text-xs" />
                  </div>
                </div>
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
                  <Label className="text-xs">Subscription Tier</Label>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Email</Label>
                  <Input value={editTenant.contact_email || ""} onChange={(e) => setEditTenant({ ...editTenant, contact_email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country / Region</Label>
                  <Input value={editTenant.country || ""} onChange={(e) => setEditTenant({ ...editTenant, country: e.target.value })} />
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

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this tenant and all associated user mappings, feature flags, and audit logs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingId) { deleteTenant.mutate(deletingId); setDeletingId(null); setSelectedId(null); } }}>
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
