import { useState, useEffect, useMemo } from "react";
import { Loader2, Building2, Palette, Users, Mail, Sliders, Gauge, ShieldCheck, Globe, CreditCard } from "lucide-react";
import TenantDomainsPanel from "@/components/tenants/TenantDomainsPanel";
import TenantBillingPanel from "@/components/tenants/TenantBillingPanel";
import { useMyAdminTenants, useUpdateTenantBranding, useSetTenantMemberRole, AdminTenant } from "@/hooks/useTenantAdmin";
import { useTenantUsers } from "@/hooks/useTenantManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TenantInvitationsPanel from "@/components/tenants/TenantInvitationsPanel";
import TenantFeatureFlagsPanel from "@/components/tenants/TenantFeatureFlagsPanel";
import TenantQuotaPanel from "@/components/tenants/TenantQuotaPanel";
import { useAuth } from "@/hooks/useAuth";

const ROLE_OPTIONS = ["owner", "admin", "member", "viewer"];

function BrandingForm({ tenant }: { tenant: AdminTenant }) {
  const updateBranding = useUpdateTenantBranding();
  const [name, setName] = useState(tenant.name);
  const [primary, setPrimary] = useState(tenant.primary_color || "#0E2F4F");
  const [secondary, setSecondary] = useState(tenant.secondary_color || "#F37913");
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || "");
  const [faviconUrl, setFaviconUrl] = useState(tenant.favicon_url || "");
  const [email, setEmail] = useState(tenant.contact_email || "");

  useEffect(() => {
    setName(tenant.name);
    setPrimary(tenant.primary_color || "#0E2F4F");
    setSecondary(tenant.secondary_color || "#F37913");
    setLogoUrl(tenant.logo_url || "");
    setFaviconUrl(tenant.favicon_url || "");
    setEmail(tenant.contact_email || "");
  }, [tenant.id]);

  const onSave = () => {
    updateBranding.mutate({
      tenant_id: tenant.id,
      name,
      primary_color: primary,
      secondary_color: secondary,
      logo_url: logoUrl || undefined,
      favicon_url: faviconUrl || undefined,
      contact_email: email || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Palette className="w-4 h-4" /> Organisation Branding</CardTitle>
        <CardDescription>Display name, brand colours, logo and favicon shown to your members.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Organisation name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourorg.com" />
          </div>
          <div className="space-y-2">
            <Label>Primary colour</Label>
            <div className="flex gap-2">
              <Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-16 p-1" />
              <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary colour</Label>
            <div className="flex gap-2">
              <Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-16 p-1" />
              <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
          </div>
          <div className="space-y-2">
            <Label>Favicon URL</Label>
            <Input value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://…/favicon.ico" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={updateBranding.isPending}>
            {updateBranding.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MembersPanel({ tenant }: { tenant: AdminTenant }) {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useTenantUsers(tenant.id);
  const setRole = useSetTenantMemberRole();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Members</CardTitle>
        <CardDescription>Manage roles and access for everyone in {tenant.name}.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No members yet — send your first invitation below.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members as any[]).map((m: any) => {
                const isSelf = m.user_id === user?.id;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                          {(m.profiles?.full_name || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{m.profiles?.full_name || "Unknown"}{isSelf && <span className="text-xs text-muted-foreground ml-1">(you)</span>}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(role) => setRole.mutate({ tenant_id: tenant.id, user_id: m.user_id, role })}
                      >
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "outline"}>{m.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSelf}
                        onClick={() => setRole.mutate({ tenant_id: tenant.id, user_id: m.user_id, role: m.role, is_active: !m.is_active })}
                      >
                        {m.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function TenantAdmin() {
  const { data: tenants = [], isLoading } = useMyAdminTenants();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => tenants.find((t) => t.id === selectedId) ?? tenants[0] ?? null,
    [tenants, selectedId]
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  }

  if (tenants.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-xl font-bold">No tenant admin access</h1>
        <p className="text-sm text-muted-foreground">
          You're not currently an owner or admin of any tenant. Ask a platform admin to grant you the role.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" /> Tenant Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your organisation's branding, members, features and quotas.</p>
        </div>
        {tenants.length > 1 && (
          <Select value={selected?.id} onValueChange={setSelectedId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-muted-foreground ml-1">({t.role})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selected && (
        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding"><Palette className="w-3.5 h-3.5 mr-1.5" />Branding</TabsTrigger>
            <TabsTrigger value="domains"><Globe className="w-3.5 h-3.5 mr-1.5" />Domains</TabsTrigger>
            <TabsTrigger value="members"><Users className="w-3.5 h-3.5 mr-1.5" />Members</TabsTrigger>
            <TabsTrigger value="invitations"><Mail className="w-3.5 h-3.5 mr-1.5" />Invitations</TabsTrigger>
            <TabsTrigger value="features"><Sliders className="w-3.5 h-3.5 mr-1.5" />Features</TabsTrigger>
            <TabsTrigger value="quotas"><Gauge className="w-3.5 h-3.5 mr-1.5" />Quotas</TabsTrigger>
            <TabsTrigger value="billing"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="branding"><BrandingForm tenant={selected} /></TabsContent>
          <TabsContent value="domains"><TenantDomainsPanel tenantId={selected.id} /></TabsContent>
          <TabsContent value="members"><MembersPanel tenant={selected} /></TabsContent>
          <TabsContent value="invitations"><TenantInvitationsPanel tenantId={selected.id} /></TabsContent>
          <TabsContent value="features"><TenantFeatureFlagsPanel tenantId={selected.id} tenantTier={selected.subscription_tier} /></TabsContent>
          <TabsContent value="quotas"><TenantQuotaPanel tenantId={selected.id} /></TabsContent>
          <TabsContent value="billing"><TenantBillingPanel tenantId={selected.id} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
