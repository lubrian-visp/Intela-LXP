import { useState } from "react";
import { Plus, Globe, CheckCircle2, XCircle, Clock, Star, Trash2, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  useTenantDomains,
  useAddTenantDomain,
  useVerifyTenantDomain,
  useSetPrimaryDomain,
  useRemoveTenantDomain,
  TenantDomain,
} from "@/hooks/useTenantDomains";
import { toast } from "sonner";

const TARGET_CNAME = "lovable.app";

function StatusBadge({ status }: { status: TenantDomain["status"] }) {
  if (status === "verified") return <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
  if (status === "failed") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
  return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function DnsInstructions({ domain }: { domain: TenantDomain }) {
  const copy = (val: string) => { navigator.clipboard.writeText(val); toast.success("Copied"); };
  return (
    <div className="space-y-3 p-4 bg-muted/40 border rounded-md text-sm">
      <p className="font-medium">Add this DNS record at your registrar:</p>
      {domain.verification_method === "TXT" ? (
        <div className="grid grid-cols-[80px_1fr] gap-y-2 gap-x-3 font-mono text-xs">
          <div className="text-muted-foreground">Type</div><div>TXT</div>
          <div className="text-muted-foreground">Name</div>
          <div className="flex items-center gap-2">_lovable.{domain.hostname}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(`_lovable.${domain.hostname}`)}><Copy className="w-3 h-3" /></Button>
          </div>
          <div className="text-muted-foreground">Value</div>
          <div className="flex items-center gap-2 break-all">{domain.verification_token}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(domain.verification_token)}><Copy className="w-3 h-3" /></Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[80px_1fr] gap-y-2 gap-x-3 font-mono text-xs">
          <div className="text-muted-foreground">Type</div><div>CNAME</div>
          <div className="text-muted-foreground">Name</div>
          <div className="flex items-center gap-2">{domain.hostname}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(domain.hostname)}><Copy className="w-3 h-3" /></Button>
          </div>
          <div className="text-muted-foreground">Value</div>
          <div className="flex items-center gap-2">{TARGET_CNAME}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copy(TARGET_CNAME)}><Copy className="w-3 h-3" /></Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">DNS changes can take up to a few hours to propagate.</p>
    </div>
  );
}

export default function TenantDomainsPanel({ tenantId }: { tenantId: string }) {
  const { data: domains = [], isLoading } = useTenantDomains(tenantId);
  const add = useAddTenantDomain();
  const verify = useVerifyTenantDomain();
  const setPrimary = useSetPrimaryDomain();
  const remove = useRemoveTenantDomain();

  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [method, setMethod] = useState<"TXT" | "CNAME">("CNAME");
  const [showInstructionsFor, setShowInstructionsFor] = useState<string | null>(null);

  const onAdd = async () => {
    if (!hostname.trim()) return;
    const created = await add.mutateAsync({ tenant_id: tenantId, hostname: hostname.trim(), method });
    setOpen(false);
    setHostname("");
    setShowInstructionsFor(created.id);
  };

  const focused = domains.find((d) => d.id === showInstructionsFor);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><Globe className="w-4 h-4" /> Custom Domains</CardTitle>
          <CardDescription>Map your own domains (e.g. <code>learn.acme.com</code>) so members reach the platform under your brand.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add domain</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : domains.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No custom domains yet.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.hostname}</TableCell>
                    <TableCell><Badge variant="outline">{d.verification_method}</Badge></TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>
                      {d.is_primary ? (
                        <Badge className="bg-accent hover:bg-accent"><Star className="w-3 h-3 mr-1" />Primary</Badge>
                      ) : d.status === "verified" ? (
                        <Button size="sm" variant="ghost" onClick={() => setPrimary.mutate({ domain_id: d.id, tenant_id: tenantId })}>Make primary</Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setShowInstructionsFor(d.id === showInstructionsFor ? null : d.id)}>DNS</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={verify.isPending}
                        onClick={() => verify.mutate({ domain_id: d.id, tenant_id: tenantId })}
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${verify.isPending ? "animate-spin" : ""}`} />
                        Verify
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Remove ${d.hostname}?`)) remove.mutate({ domain_id: d.id, tenant_id: tenantId });
                      }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {focused && <DnsInstructions domain={focused} />}
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom domain</DialogTitle>
            <DialogDescription>You'll get DNS instructions to complete verification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hostname</Label>
              <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="learn.acme.com" />
            </div>
            <div className="space-y-2">
              <Label>Verification method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as "TXT" | "CNAME")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CNAME">CNAME (recommended — also routes traffic)</SelectItem>
                  <SelectItem value="TXT">TXT (verification only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onAdd} disabled={add.isPending || !hostname.trim()}>
              {add.isPending ? "Adding…" : "Add domain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
