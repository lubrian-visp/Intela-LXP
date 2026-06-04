import { useState, useEffect, useMemo } from "react";
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Star, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useAvailableGateways,
  useTenantGatewayRow,
  useUpsertTenantGateway,
  useDeleteTenantGateway,
  type AvailableGateway,
  type CredentialField,
} from "@/hooks/useTenantPaymentGateways";

function CredentialForm({
  schema,
  values,
  onChange,
}: {
  schema: CredentialField[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  if (!schema?.length) {
    return <p className="text-sm text-muted-foreground">No credentials required for this gateway.</p>;
  }
  return (
    <div className="space-y-3">
      {schema.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs">
            {f.label}
            {f.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            type={f.type === "password" ? "password" : "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            placeholder={f.help}
            autoComplete="off"
          />
          {f.help && <p className="text-[11px] text-muted-foreground">{f.help}</p>}
        </div>
      ))}
    </div>
  );
}

function GatewayConfigDialog({
  tenantId,
  gateway,
  open,
  onClose,
}: {
  tenantId: string;
  gateway: AvailableGateway;
  open: boolean;
  onClose: () => void;
}) {
  const { data: existing, isLoading } = useTenantGatewayRow(tenantId, gateway.provider_key);
  const upsert = useUpsertTenantGateway();
  const del = useDeleteTenantGateway();

  const [mode, setMode] = useState<"test" | "live">("test");
  const [label, setLabel] = useState("");
  const [credsTest, setCredsTest] = useState<Record<string, string>>({});
  const [credsLive, setCredsLive] = useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (existing) {
      setMode(existing.mode);
      setLabel(existing.display_label ?? "");
      setCredsTest((existing.credentials_test as any) ?? {});
      setCredsLive((existing.credentials_live as any) ?? {});
      setIsDefault(existing.is_default);
    } else {
      setMode("test");
      setLabel("");
      setCredsTest({});
      setCredsLive({});
      setIsDefault(false);
    }
  }, [existing?.id, open]);

  const missingRequired = useMemo(() => {
    const target = mode === "test" ? credsTest : credsLive;
    return gateway.credential_schema
      .filter((f) => f.required && !(target[f.key] ?? "").trim())
      .map((f) => f.label);
  }, [gateway.credential_schema, mode, credsTest, credsLive]);

  const onSave = (enable: boolean) => {
    if (enable && missingRequired.length > 0) return;
    upsert.mutate(
      {
        tenant_id: tenantId,
        provider_key: gateway.provider_key,
        is_enabled: enable,
        is_default: isDefault,
        mode,
        credentials_test: credsTest,
        credentials_live: credsLive,
        display_label: label || null,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Configure {gateway.display_name}
          </DialogTitle>
          <DialogDescription>
            {gateway.setup_instructions ?? "Enter your merchant credentials. They are stored encrypted and only accessible to your organisation's owners and admins."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Display label (optional)</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. ${gateway.display_name} – Main account`} />
              </div>
              <div className="flex items-end gap-2">
                <Switch id={`default-${gateway.provider_key}`} checked={isDefault} onCheckedChange={setIsDefault} />
                <Label htmlFor={`default-${gateway.provider_key}`} className="text-xs">Set as default gateway</Label>
              </div>
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as "test" | "live")}>
              <TabsList className="w-full">
                <TabsTrigger value="test" className="flex-1">Test mode</TabsTrigger>
                <TabsTrigger value="live" className="flex-1">Live mode</TabsTrigger>
              </TabsList>
              <TabsContent value="test" className="pt-3">
                <CredentialForm schema={gateway.credential_schema} values={credsTest} onChange={setCredsTest} />
              </TabsContent>
              <TabsContent value="live" className="pt-3">
                <CredentialForm schema={gateway.credential_schema} values={credsLive} onChange={setCredsLive} />
              </TabsContent>
            </Tabs>

            <div className="text-xs text-muted-foreground space-y-1">
              <div>Active mode for processing: <strong className="capitalize">{mode}</strong></div>
              <div>Supports: {gateway.supported_currencies.slice(0, 6).join(", ")}{gateway.supported_currencies.length > 6 ? "…" : ""}</div>
            </div>

            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Required for {mode} mode: {missingRequired.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {existing && (
            <Button
              variant="ghost"
              className="text-destructive mr-auto"
              onClick={() => del.mutate({ tenant_id: tenantId, provider_key: gateway.provider_key }, { onSuccess: onClose })}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Disconnect
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => onSave(false)} disabled={upsert.isPending}>
            Save as disabled
          </Button>
          <Button onClick={() => onSave(true)} disabled={upsert.isPending || missingRequired.length > 0}>
            {upsert.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
            Save & Enable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantPaymentGatewaysPanel({ tenantId }: { tenantId: string }) {
  const { data: gateways = [], isLoading } = useAvailableGateways(tenantId);
  const [configuring, setConfiguring] = useState<AvailableGateway | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Payment Methods
        </CardTitle>
        <CardDescription>
          Choose which payment gateways your organisation accepts. You supply your own merchant credentials —
          payments go directly to your account. The platform shows you only the gateways approved by the operator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : gateways.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No payment gateways are currently available. Contact platform operations to enable gateways for your country.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gateways.map((g) => (
              <div key={g.provider_key} className="border p-4 flex flex-col gap-2 hover:border-accent transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {g.display_name}
                      {g.is_default && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Star className="w-3 h-3 fill-current" />Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{g.provider_key}</div>
                  </div>
                  {g.is_enabled_for_tenant ? (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />Enabled · {g.mode}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  {g.supported_currencies.slice(0, 5).join(", ")}
                  {g.supported_currencies.length > 5 && "…"}
                </div>

                <div className="flex gap-2 mt-auto pt-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfiguring(g)}>
                    <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                    {g.is_enabled_for_tenant ? "Manage" : "Connect"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {configuring && (
          <GatewayConfigDialog
            tenantId={tenantId}
            gateway={configuring}
            open={!!configuring}
            onClose={() => setConfiguring(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
