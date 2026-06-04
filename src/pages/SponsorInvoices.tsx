import { useState, useMemo } from "react";
import {
  DollarSign, FileText, Plus, Filter, Globe, Layers,
  CheckCircle2, Clock, AlertTriangle, XCircle, Info
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useSponsorInvoices, useCreateInvoice, useUpdateInvoice } from "@/hooks/useSponsorData";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammes } from "@/hooks/useCoreData";
import { useCountries, useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { InvoicePdfExport } from "@/components/sponsor/InvoicePdfExport";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Draft", icon: FileText, color: "bg-muted text-muted-foreground" },
  issued: { label: "Issued", icon: Clock, color: "bg-info/10 text-info" },
  paid: { label: "Paid", icon: CheckCircle2, color: "bg-success/10 text-success" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-muted text-muted-foreground" },
};

// Country-specific claim label mapping
const claimLabelByCountry: Record<string, string> = {
  ZA: "SETA Claim Reference",
  KE: "NITA Levy Reference",
  NG: "ITF Contribution Reference",
};

function useFrameworksByCountry(countryId?: string) {
  return useQuery({
    queryKey: ["country_frameworks", countryId],
    enabled: !!countryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("country_regulatory_frameworks")
        .select("*")
        .eq("country_id", countryId!)
        .eq("status", "active")
        .order("effective_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function useFundingRules(frameworkId?: string) {
  return useQuery({
    queryKey: ["funding_rules", frameworkId],
    enabled: !!frameworkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rules")
        .select("*")
        .eq("framework_id", frameworkId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}

export default function SponsorInvoices() {
  const { user } = useAuth();
  const { data: invoices = [], isLoading } = useSponsorInvoices();
  const { data: programmes = [] } = useProgrammes();
  const { data: countries = [] } = useCountries();
  const { data: programmeTypes = [] } = useProgrammeTypes();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const defaultForm = {
    invoice_number: "", description: "", amount: "", currency: "",
    programme_id: "", programme_type_id: "", country_id: "", framework_id: "",
    funding_type: "", claim_reference: "",
    status: "draft", issued_date: "", due_date: "", notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  // Dynamic data based on form selections
  const selectedCountry = countries.find(c => c.id === form.country_id);
  const { data: frameworks = [] } = useFrameworksByCountry(form.country_id || undefined);
  const { data: fundingRules = [] } = useFundingRules(form.framework_id || undefined);
  const claimLabel = selectedCountry ? (claimLabelByCountry[selectedCountry.iso_code] ?? "Claim Reference") : "Claim Reference";

  // Auto-set currency when country changes
  const handleCountryChange = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    setForm(p => ({
      ...p,
      country_id: countryId,
      currency: country?.currency_code ?? p.currency,
      framework_id: "",
      funding_type: "",
    }));
  };

  // Auto-set programme type when programme changes
  const handleProgrammeChange = (progId: string) => {
    const prog = programmes.find((p: any) => p.id === progId);
    setForm(p => ({
      ...p,
      programme_id: progId,
      programme_type_id: (prog as any)?.programme_type_id ?? p.programme_type_id,
    }));
  };

  const filtered = filter === "all" ? invoices : invoices.filter((i: any) => i.status === filter);

  const stats = useMemo(() => {
    const total = invoices.reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
    const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
    const outstanding = invoices.filter((i: any) => ["issued", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.amount ?? 0), 0);
    const overdue = invoices.filter((i: any) => i.status === "overdue").length;
    return { total, paid, outstanding, overdue };
  }, [invoices]);

  const handleCreate = () => {
    if (!form.invoice_number || !form.amount) {
      toast.error("Invoice number and amount required");
      return;
    }
    createInvoice.mutate(
      {
        sponsor_id: user?.id,
        invoice_number: form.invoice_number,
        description: form.description || null,
        amount: parseFloat(form.amount),
        currency: form.currency || "ZAR",
        programme_id: form.programme_id || null,
        programme_type_id: form.programme_type_id || null,
        country_id: form.country_id || null,
        framework_id: form.framework_id || null,
        funding_type: form.funding_type || null,
        claim_reference: form.claim_reference || null,
        status: form.status,
        issued_date: form.issued_date || null,
        due_date: form.due_date || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Invoice created");
          setCreateOpen(false);
          setForm(defaultForm);
        },
        onError: () => toast.error("Failed to create invoice"),
      }
    );
  };

  // Payment receipt dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
  const [paymentRef, setPaymentRef] = useState("");

  const openPaymentDialog = (inv: any) => {
    setPaymentTarget(inv);
    setPaymentRef(inv.payment_reference ?? "");
    setPaymentOpen(true);
  };

  const confirmPayment = () => {
    if (!paymentRef.trim()) {
      toast.error("Please enter a payment reference");
      return;
    }
    updateInvoice.mutate(
      {
        id: paymentTarget.id,
        status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
        payment_reference: paymentRef.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Payment confirmed with reference: " + paymentRef.trim());
          setPaymentOpen(false);
          setPaymentTarget(null);
          setPaymentRef("");
        },
      }
    );
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Funding & Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track payments, invoices, and sponsorship expenditure by country and programme type.</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Value", value: `${stats.total.toLocaleString()}`, color: "text-foreground" },
          { label: "Paid", value: `${stats.paid.toLocaleString()}`, color: "text-success" },
          { label: "Outstanding", value: `${stats.outstanding.toLocaleString()}`, color: "text-warning" },
          { label: "Overdue", value: String(stats.overdue), color: "text-destructive" },
        ].map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {["all", "draft", "issued", "paid", "overdue", "cancelled"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-[11px] px-3 py-1 rounded-full font-medium transition-colors capitalize",
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No invoices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Invoice #</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Country</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Programme</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Due Date</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((inv: any) => {
                  const sc = statusConfig[inv.status] ?? statusConfig.draft;
                  const Icon = sc.icon;
                  const country = countries.find(c => c.id === inv.country_id);
                  const pType = programmeTypes.find(t => t.id === inv.programme_type_id);
                  return (
                    <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{country?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.programmes?.title ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{pType?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {inv.currency} {Number(inv.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", sc.color)}>
                          <Icon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <InvoicePdfExport invoice={inv} />
                          {(inv.status === "issued" || inv.status === "overdue") && (
                            <button onClick={() => openPaymentDialog(inv)} className="text-[10px] font-medium text-success hover:text-success/80 transition-colors">
                              Record Payment
                            </button>
                          )}
                          {inv.payment_reference && (
                            <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded" title="Payment Reference">
                              Ref: {inv.payment_reference}
                            </span>
                          )}
                          {inv.quote_id && (
                            <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              Auto
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog - country-aware */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Country & Currency */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Country & Currency</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.country_id} onValueChange={handleCountryChange}>
                  <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                  <SelectContent>
                    {/* Dynamic unique currencies from countries */}
                    {[...new Set(countries.map(c => c.currency_code))].sort().map(cc => (
                      <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Regulatory Framework & Funding */}
            {form.country_id && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Regulatory & Funding</span>
                </div>
                <div className="space-y-3">
                  <Select value={form.framework_id} onValueChange={v => setForm(p => ({ ...p, framework_id: v, funding_type: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Regulatory framework (optional)" /></SelectTrigger>
                    <SelectContent>
                      {frameworks.map((fw: any) => (
                        <SelectItem key={fw.id} value={fw.id}>v{fw.version} — {format(new Date(fw.effective_date), "yyyy")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fundingRules.length > 0 && (
                    <Select value={form.funding_type} onValueChange={v => setForm(p => ({ ...p, funding_type: v }))}>
                      <SelectTrigger><SelectValue placeholder="Funding type (optional)" /></SelectTrigger>
                      <SelectContent>
                        {fundingRules.map((fr: any) => (
                          <SelectItem key={fr.id} value={fr.funding_type}>
                            {fr.name} ({fr.funding_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {fundingRules.length > 0 && form.funding_type && (
                    <div className="flex items-start gap-2 p-2 rounded bg-info/5 border border-info/20">
                      <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                      <p className="text-[10px] text-info">
                        {fundingRules.find((fr: any) => fr.funding_type === form.funding_type)?.claim_process ?? "Follow the standard claim process for this funding type."}
                      </p>
                    </div>
                  )}
                  <Input
                    placeholder={claimLabel}
                    value={form.claim_reference}
                    onChange={e => setForm(p => ({ ...p, claim_reference: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Programme & Type */}
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.programme_id} onValueChange={handleProgrammeChange}>
                <SelectTrigger><SelectValue placeholder="Programme (optional)" /></SelectTrigger>
                <SelectContent>
                  {programmes.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.programme_type_id} onValueChange={v => setForm(p => ({ ...p, programme_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Programme type" /></SelectTrigger>
                <SelectContent>
                  {programmeTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice details */}
            <Input placeholder="Invoice Number (e.g. INV-001)" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
            <Input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Issue Date</label>
                <Input type="date" value={form.issued_date} onChange={e => setForm(p => ({ ...p, issued_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Due Date</label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <Textarea placeholder="Notes (optional)" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInvoice.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Receipt Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Record Payment
            </DialogTitle>
          </DialogHeader>
          {paymentTarget && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium text-foreground">{paymentTarget.invoice_number}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{paymentTarget.currency} {Number(paymentTarget.amount).toLocaleString()}</span>
                </div>
                {paymentTarget.due_date && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Due Date</span>
                    <span className={cn("font-medium", paymentTarget.status === "overdue" ? "text-destructive" : "text-foreground")}>
                      {format(new Date(paymentTarget.due_date), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wider font-semibold">Payment Reference / Transaction ID</label>
                <Input
                  placeholder="e.g. TXN-20260308-ABC, EFT Ref 12345"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={confirmPayment} disabled={updateInvoice.isPending} className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
