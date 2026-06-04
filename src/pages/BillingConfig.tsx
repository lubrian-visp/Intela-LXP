import { useState } from "react";
import { Loader2, Plus, Trash2, CreditCard, Tag, Globe2, Receipt, FileText, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  useBillingTiers, useUpsertBillingTier, useDeleteBillingTier,
  useBillingPrices, useUpsertPrice, useDeletePrice,
  useBillingProviders, useUpdateProvider,
  useRoutingRules, useUpsertRoutingRule, useDeleteRoutingRule,
  useAllInvoices, useIssueManualInvoice, useMarkInvoicePaid, useVoidInvoice,
  formatMinor,
  type BillingTier,
} from "@/hooks/useBillingAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// ─── Tiers Panel ────────────────────────────────────────────
function TiersPanel() {
  const { data: tiers = [], isLoading } = useBillingTiers();
  const upsert = useUpsertBillingTier();
  const del = useDeleteBillingTier();
  const [editing, setEditing] = useState<Partial<BillingTier> | null>(null);

  const openNew = () =>
    setEditing({ tier_key: "", display_name: "", description: "", trial_days: 0, sort_order: 100, is_active: true, is_public: true, is_default: false, limits: {} });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Tag className="w-4 h-4" />Subscription Tiers</CardTitle>
          <CardDescription>Define plan tiers with limits. Users can switch between any active public tier.</CardDescription>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-3.5 h-3.5 mr-1.5" />New Tier</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.tier_key}</TableCell>
                  <TableCell className="font-medium">{t.display_name} {t.is_default && <Badge className="ml-2" variant="secondary">default</Badge>}</TableCell>
                  <TableCell>{t.trial_days}d</TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? "default" : "outline"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                    {t.is_public && <Badge variant="outline" className="ml-1">public</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">{JSON.stringify(t.limits)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm(`Delete tier "${t.display_name}"?`) && del.mutate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit Tier" : "New Tier"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Tier key (slug)</Label><Input value={editing.tier_key ?? ""} onChange={(e) => setEditing({ ...editing, tier_key: e.target.value })} placeholder="growth" /></div>
                  <div><Label>Display name</Label><Input value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
                </div>
                <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Trial days</Label><Input type="number" value={editing.trial_days ?? 0} onChange={(e) => setEditing({ ...editing, trial_days: parseInt(e.target.value) || 0 })} /></div>
                  <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 100 })} /></div>
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label className="text-xs">Active</Label></div>
                    <div className="flex items-center gap-2"><Switch checked={editing.is_public ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_public: v })} /><Label className="text-xs">Public</Label></div>
                  </div>
                </div>
                <div>
                  <Label>Limits (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(editing.limits ?? {}, null, 2)}
                    onChange={(e) => { try { setEditing({ ...editing, limits: JSON.parse(e.target.value) }); } catch {} }}
                    rows={6} className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Common keys: max_users, max_programmes, storage_gb, ai_calls_per_month, sso, custom_domain. Use -1 for unlimited.</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => editing && upsert.mutate(editing as any, { onSuccess: () => setEditing(null) })}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Prices Panel ───────────────────────────────────────────
function PricesPanel() {
  const { data: tiers = [] } = useBillingTiers();
  const { data: prices = [], isLoading } = useBillingPrices();
  const upsert = useUpsertPrice();
  const del = useDeletePrice();
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Coins className="w-4 h-4" />Tier Prices</CardTitle>
          <CardDescription>Per-currency pricing for each tier. Add multiple currencies (ZAR, USD, NGN, KES, GBP, EUR…) and intervals.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing({ tier_id: tiers[0]?.id ?? "", currency: "ZAR", billing_interval: "monthly", unit_amount_minor: 0, is_active: true, provider_price_refs: {} })}><Plus className="w-3.5 h-3.5 mr-1.5" />New Price</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Tier</TableHead><TableHead>Currency</TableHead><TableHead>Interval</TableHead><TableHead>Amount</TableHead><TableHead>Provider Refs</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {prices.map((p) => {
                const tier = tiers.find((t) => t.id === p.tier_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{tier?.display_name ?? "?"}</TableCell>
                    <TableCell className="font-mono">{p.currency}</TableCell>
                    <TableCell className="capitalize">{p.billing_interval}</TableCell>
                    <TableCell className="font-medium">{formatMinor(p.unit_amount_minor, p.currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{Object.keys(p.provider_price_refs).join(", ") || "—"}</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm("Delete price?") && del.mutate(p.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit Price" : "New Price"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div><Label>Tier</Label>
                  <Select value={editing.tier_id} onValueChange={(v) => setEditing({ ...editing, tier_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tiers.map((t) => <SelectItem key={t.id} value={t.id}>{t.display_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Currency</Label><Input value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase() })} maxLength={3} /></div>
                  <div><Label>Interval</Label>
                    <Select value={editing.billing_interval} onValueChange={(v) => setEditing({ ...editing, billing_interval: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount (minor units)</Label><Input type="number" value={editing.unit_amount_minor} onChange={(e) => setEditing({ ...editing, unit_amount_minor: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Amount in smallest currency unit (cents/kobo). E.g. R299.00 = 29900.</p>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(editing, { onSuccess: () => setEditing(null) })}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Providers Panel ────────────────────────────────────────
function ProvidersPanel() {
  const { data: providers = [], isLoading } = useBillingProviders();
  const update = useUpdateProvider();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment Gateway Catalog</CardTitle>
        <CardDescription>
          Curate which gateways tenants can connect to. Toggle <strong>Available to tenants</strong> to expose a gateway in
          every tenant's <em>Payment Methods</em> section. Tenants supply their own merchant credentials — funds go directly to them.
          The platform-wide <strong>Enabled</strong> flag controls subscription routing for your own billing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Currencies</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead className="text-center">Available to tenants</TableHead>
                <TableHead className="text-right">Platform-enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => (
                <TableRow key={p.provider_key}>
                  <TableCell>
                    <div className="font-medium">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.provider_key}</div>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{p.gateway_type ?? "both"}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate" title={(p.supported_currencies ?? []).join(", ")}>
                    {(p.supported_currencies ?? []).slice(0, 4).join(", ") || "any"}
                    {(p.supported_currencies ?? []).length > 4 && "…"}
                  </TableCell>
                  <TableCell className="text-xs max-w-[140px] truncate" title={(p.supported_countries ?? []).join(", ")}>
                    {(p.supported_countries ?? []).slice(0, 4).join(", ") || "any"}
                    {(p.supported_countries ?? []).length > 4 && "…"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!!p.is_available_to_tenants}
                      onCheckedChange={(v) => update.mutate({ provider_key: p.provider_key, is_available_to_tenants: v } as any)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch checked={p.is_enabled} onCheckedChange={(v) => update.mutate({ provider_key: p.provider_key, is_enabled: v })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Routing Rules Panel ────────────────────────────────────
function RoutingPanel() {
  const { data: rules = [], isLoading } = useRoutingRules();
  const { data: providers = [] } = useBillingProviders();
  const upsert = useUpsertRoutingRule();
  const del = useDeleteRoutingRule();
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Globe2 className="w-4 h-4" />Provider Routing Rules</CardTitle>
          <CardDescription>Rules that pick the best provider per country/currency. Lowest priority wins. Leave a field blank to match any.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing({ match_country: "", match_currency: "", preferred_provider: providers[0]?.provider_key ?? "stripe", priority: 100, is_active: true })}><Plus className="w-3.5 h-3.5 mr-1.5" />New Rule</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Country</TableHead><TableHead>Currency</TableHead><TableHead>Provider</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.match_country || "*"}</TableCell>
                  <TableCell className="font-mono">{r.match_currency || "*"}</TableCell>
                  <TableCell>{r.preferred_provider}</TableCell>
                  <TableCell>{r.priority}</TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm("Delete rule?") && del.mutate(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Edit Rule" : "New Rule"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Country (ISO 3166-1 alpha-2, blank = any)</Label><Input value={editing.match_country ?? ""} onChange={(e) => setEditing({ ...editing, match_country: e.target.value.toUpperCase() || null })} maxLength={2} placeholder="ZA" /></div>
                  <div><Label>Currency (blank = any)</Label><Input value={editing.match_currency ?? ""} onChange={(e) => setEditing({ ...editing, match_currency: e.target.value.toUpperCase() || null })} maxLength={3} placeholder="ZAR" /></div>
                </div>
                <div><Label>Preferred provider</Label>
                  <Select value={editing.preferred_provider} onValueChange={(v) => setEditing({ ...editing, preferred_provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{providers.map((p) => <SelectItem key={p.provider_key} value={p.provider_key}>{p.display_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priority (lower = preferred)</Label><Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value) || 100 })} /></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(editing, { onSuccess: () => setEditing(null) })}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Invoices Panel ─────────────────────────────────────────
function InvoicesPanel() {
  const { data: invoices = [], isLoading } = useAllInvoices();
  const issue = useIssueManualInvoice();
  const markPaid = useMarkInvoicePaid();
  const voidInv = useVoidInvoice();
  const [creating, setCreating] = useState<any | null>(null);

  // Tenants list for the issue dialog
  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants-list-billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id,name,slug").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Receipt className="w-4 h-4" />Invoices</CardTitle>
          <CardDescription>All tenant invoices. Issue a manual invoice for offline EFT/bank transfer.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreating({ tenant_id: tenants[0]?.id ?? "", currency: "ZAR", subtotal_minor: 0, tax_minor: 0, due_days: 30, notes: "" })}>
          <FileText className="w-3.5 h-3.5 mr-1.5" />Issue Invoice
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Tenant</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.invoice_number ?? inv.id.slice(0, 8)}</TableCell>
                  <TableCell>{inv.tenants?.name ?? "—"}</TableCell>
                  <TableCell className="font-medium">{formatMinor(inv.total_minor, inv.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "paid" ? "default" : inv.status === "past_due" ? "destructive" : "outline"}>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{inv.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {inv.status !== "paid" && inv.status !== "void" && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        const ref = prompt("Payment reference (optional):") ?? undefined;
                        markPaid.mutate({ invoice_id: inv.id, payment_reference: ref });
                      }}>Mark paid</Button>
                    )}
                    {inv.status !== "void" && inv.status !== "paid" && (
                      <Button size="sm" variant="ghost" onClick={() => {
                        const reason = prompt("Reason for voiding?") ?? undefined;
                        if (reason !== undefined) voidInv.mutate({ invoice_id: inv.id, reason });
                      }}>Void</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={!!creating} onOpenChange={(v) => !v && setCreating(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue Manual Invoice</DialogTitle></DialogHeader>
            {creating && (
              <div className="space-y-3">
                <div><Label>Tenant</Label>
                  <Select value={creating.tenant_id} onValueChange={(v) => setCreating({ ...creating, tenant_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Currency</Label><Input value={creating.currency} onChange={(e) => setCreating({ ...creating, currency: e.target.value.toUpperCase() })} maxLength={3} /></div>
                  <div><Label>Due in (days)</Label><Input type="number" value={creating.due_days} onChange={(e) => setCreating({ ...creating, due_days: parseInt(e.target.value) || 30 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Subtotal (minor units)</Label><Input type="number" value={creating.subtotal_minor} onChange={(e) => setCreating({ ...creating, subtotal_minor: parseInt(e.target.value) || 0 })} /></div>
                  <div><Label>Tax (minor units)</Label><Input type="number" value={creating.tax_minor} onChange={(e) => setCreating({ ...creating, tax_minor: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <p className="text-xs text-muted-foreground">Total: <strong>{formatMinor((creating.subtotal_minor || 0) + (creating.tax_minor || 0), creating.currency)}</strong></p>
                <div><Label>Notes (internal)</Label><Textarea value={creating.notes} onChange={(e) => setCreating({ ...creating, notes: e.target.value })} rows={2} /></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreating(null)}>Cancel</Button>
              <Button onClick={() => issue.mutate(creating, { onSuccess: () => setCreating(null) })}>Issue Invoice</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Page ───────────────────────────────────────────────────
export default function BillingConfig() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-accent" />Billing Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage tiers, pricing, payment providers, routing, and invoices. All values are dynamic — no code changes needed to add new plans, currencies, or providers.</p>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers"><Tag className="w-3.5 h-3.5 mr-1.5" />Tiers</TabsTrigger>
          <TabsTrigger value="prices"><Coins className="w-3.5 h-3.5 mr-1.5" />Prices</TabsTrigger>
          <TabsTrigger value="providers"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Providers</TabsTrigger>
          <TabsTrigger value="routing"><Globe2 className="w-3.5 h-3.5 mr-1.5" />Routing</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="w-3.5 h-3.5 mr-1.5" />Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="tiers"><TiersPanel /></TabsContent>
        <TabsContent value="prices"><PricesPanel /></TabsContent>
        <TabsContent value="providers"><ProvidersPanel /></TabsContent>
        <TabsContent value="routing"><RoutingPanel /></TabsContent>
        <TabsContent value="invoices"><InvoicesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
