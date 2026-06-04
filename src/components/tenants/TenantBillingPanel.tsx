import { useMemo } from "react";
import { Loader2, CheckCircle2, Receipt, ArrowUpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useBillingTiers,
  useBillingPrices,
  useTenantSubscription,
  useTenantInvoices,
  useChangeTenantTier,
  formatMinor,
} from "@/hooks/useBillingAdmin";
import TenantPaymentGatewaysPanel from "./TenantPaymentGatewaysPanel";

export default function TenantBillingPanel({ tenantId }: { tenantId: string }) {
  const { data: tiers = [], isLoading: tiersLoading } = useBillingTiers();
  const { data: allPrices = [] } = useBillingPrices();
  const { data: subscription, isLoading: subLoading } = useTenantSubscription(tenantId);
  const { data: invoices = [] } = useTenantInvoices(tenantId);
  const changeTier = useChangeTenantTier();

  const publicTiers = useMemo(() => tiers.filter((t) => t.is_active && t.is_public), [tiers]);

  if (tiersLoading || subLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  const currentTierId = subscription?.tier_id;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription and billing status.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-2xl font-bold">{subscription.tier_name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {subscription.unit_amount_minor != null
                    ? <>{formatMinor(subscription.unit_amount_minor, subscription.currency || "ZAR")} / {subscription.billing_interval}</>
                    : "Free"}
                </div>
                {subscription.current_period_end && (
                  <div className="text-xs text-muted-foreground mt-1">Renews {new Date(subscription.current_period_end).toLocaleDateString("en-GB")}</div>
                )}
              </div>
              <Badge variant={subscription.status === "active" ? "default" : "outline"} className="capitalize">{subscription.status}</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription.</p>
          )}
        </CardContent>
      </Card>

      {/* Available plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowUpCircle className="w-4 h-4" />Available Plans</CardTitle>
          <CardDescription>Switch plans at any time. Changes take effect immediately. Online payment integration is configured separately by the platform admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {publicTiers.map((tier) => {
              const tierPrices = allPrices.filter((p) => p.tier_id === tier.id && p.is_active);
              const monthly = tierPrices.find((p) => p.billing_interval === "monthly");
              const isCurrent = tier.id === currentTierId;
              return (
                <Card key={tier.id} className={`p-4 ${isCurrent ? "border-accent" : ""}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-lg">{tier.display_name}</div>
                    {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                  </div>
                  {tier.description && <p className="text-xs text-muted-foreground mb-3">{tier.description}</p>}
                  <div className="text-2xl font-bold mb-3">
                    {monthly ? formatMinor(monthly.unit_amount_minor, monthly.currency) : "Free"}
                    {monthly && <span className="text-xs font-normal text-muted-foreground"> / month</span>}
                  </div>
                  <ul className="text-xs space-y-1 mb-4 min-h-[80px]">
                    {Object.entries(tier.limits ?? {}).slice(0, 5).map(([k, v]) => (
                      <li key={k} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-accent flex-shrink-0" />
                        <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}: <span className="text-foreground font-medium">{String(v) === "-1" ? "Unlimited" : String(v)}</span></span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || changeTier.isPending}
                    onClick={() => {
                      if (confirm(`Switch to ${tier.display_name}?`)) {
                        changeTier.mutate({ tenant_id: tenantId, tier_id: tier.id, price_id: monthly?.id ?? null });
                      }
                    }}
                  >
                    {isCurrent ? "Current plan" : "Switch to this plan"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoice history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="w-4 h-4" />Invoice History</CardTitle>
          <CardDescription>All invoices issued for this organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoice_number ?? inv.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                    <TableCell className="text-xs">{inv.due_date ?? "—"}</TableCell>
                    <TableCell className="font-medium">{formatMinor(inv.total_minor, inv.currency)}</TableCell>
                    <TableCell><Badge variant={inv.status === "paid" ? "default" : inv.status === "past_due" ? "destructive" : "outline"}>{inv.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment gateways (per-tenant merchant credentials) */}
      <TenantPaymentGatewaysPanel tenantId={tenantId} />
    </div>
  );
}
