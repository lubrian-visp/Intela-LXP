import { useState, useMemo } from "react";
import {
  FileText, Plus, Filter, CheckCircle2, XCircle, Send,
  ArrowRight, Users, DollarSign, AlertTriangle, MessageSquare, Clock,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useSponsorQuotes, useCreateQuote, useUpdateQuote, useConvertQuoteToInvoice } from "@/hooks/useSponsorQuotes";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammes } from "@/hooks/useCoreData";
import { useCountries, useProgrammeTypes } from "@/hooks/useProgrammeTypes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Draft", icon: FileText, color: "bg-muted text-muted-foreground" },
  sent: { label: "Sent to Sponsor", icon: Send, color: "bg-info/10 text-info" },
  revision_requested: { label: "Revision Requested", icon: MessageSquare, color: "bg-warning/10 text-warning" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-success/10 text-success" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive/10 text-destructive" },
  invoiced: { label: "Invoiced", icon: DollarSign, color: "bg-primary/10 text-primary" },
};

export default function ProviderQuoteManagement() {
  const { user, hasRole } = useAuth();
  const { data: quotes = [], isLoading } = useSponsorQuotes();
  const { data: programmes = [] } = useProgrammes();
  const { data: countries = [] } = useCountries();
  const { data: programmeTypes = [] } = useProgrammeTypes();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const convertToInvoice = useConvertQuoteToInvoice();
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Permission check: Ops/PM always can, others need quote.create permission
  const isOpsOrPM = hasRole("operations" as any) || hasRole("programme_manager" as any) || hasRole("super_admin" as any);
  const { data: hasQuotePermission = false } = useQuery({
    queryKey: ["permission_quote_create", user?.id],
    enabled: !!user && !isOpsOrPM,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_permission", {
        _user_id: user!.id,
        _resource: "quote",
        _action: "create",
      });
      return !!data;
    },
  });
  const canCreateQuote = isOpsOrPM || hasQuotePermission;

  const defaultForm = {
    quote_number: "", programme_id: "", programme_type_id: "", country_id: "",
    sponsor_id: "", cost_per_learner: "", learner_count: "1", currency: "ZAR",
    valid_until: "", notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  const handleProgrammeChange = (progId: string) => {
    const prog = programmes.find((p: any) => p.id === progId) as any;
    setForm(p => ({
      ...p,
      programme_id: progId,
      programme_type_id: prog?.programme_type_id ?? p.programme_type_id,
      cost_per_learner: prog?.cost_per_learner ? String(prog.cost_per_learner) : p.cost_per_learner,
    }));
  };

  const handleCountryChange = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    setForm(p => ({ ...p, country_id: countryId, currency: country?.currency_code ?? p.currency }));
  };

  const filtered = filter === "all" ? quotes : quotes.filter((q: any) => q.status === filter);

  const stats = useMemo(() => {
    const totalValue = quotes.reduce((s: number, q: any) => s + Number(q.total_amount ?? 0), 0);
    const accepted = quotes.filter((q: any) => q.status === "accepted" || q.status === "invoiced")
      .reduce((s: number, q: any) => s + Number(q.total_amount ?? 0), 0);
    const pending = quotes.filter((q: any) => q.status === "sent").length;
    const revisions = quotes.filter((q: any) => q.status === "revision_requested").length;
    return { totalValue, accepted, pending, revisions, count: quotes.length };
  }, [quotes]);

  const computedTotal = (Number(form.cost_per_learner) || 0) * (Number(form.learner_count) || 1);

  const handleCreate = () => {
    if (!form.quote_number || !form.cost_per_learner) {
      toast.error("Quote number and cost per learner are required");
      return;
    }
    createQuote.mutate(
      {
        sponsor_id: form.sponsor_id || null,
        quote_number: form.quote_number,
        programme_id: form.programme_id || null,
        programme_type_id: form.programme_type_id || null,
        country_id: form.country_id || null,
        cost_per_learner: parseFloat(form.cost_per_learner),
        learner_count: parseInt(form.learner_count) || 1,
        currency: form.currency || "ZAR",
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        created_by: user?.id,
        status: "draft",
      },
      {
        onSuccess: () => {
          toast.success("Quote created as draft");
          setCreateOpen(false);
          setForm(defaultForm);
        },
        onError: () => toast.error("Failed to create quote"),
      }
    );
  };

  const handleSendToSponsor = (q: any) => {
    updateQuote.mutate({ id: q.id, status: "sent" }, {
      onSuccess: () => toast.success("Quote sent to sponsor"),
    });
  };

  const handleConvert = (q: any) => {
    convertToInvoice.mutate(q, {
      onSuccess: () => {
        updateQuote.mutate({ id: q.id, status: "invoiced" });
        toast.success("Invoice created from accepted quote");
      },
      onError: () => toast.error("Failed to create invoice"),
    });
  };

  const handleResend = (q: any) => {
    updateQuote.mutate({ id: q.id, status: "sent", revision_notes: null }, {
      onSuccess: () => toast.success("Revised quote re-sent to sponsor"),
    });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Quote Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Raise quotes for sponsors, track negotiations, and convert accepted quotes to invoices.
            </p>
          </div>
          {canCreateQuote && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Raise Quote
            </Button>
          )}
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Quoted", value: `R${stats.totalValue.toLocaleString()}`, color: "text-foreground" },
          { label: "Accepted Value", value: `R${stats.accepted.toLocaleString()}`, color: "text-success" },
          { label: "Pending Review", value: String(stats.pending), color: "text-info" },
          { label: "Revisions Needed", value: String(stats.revisions), color: "text-warning" },
          { label: "Total Quotes", value: String(stats.count), color: "text-primary" },
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
        {["all", "draft", "sent", "revision_requested", "accepted", "rejected", "invoiced"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-[11px] px-3 py-1 rounded-full font-medium transition-colors capitalize",
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {f === "revision_requested" ? "Revision" : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No quotes found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Quote #</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Programme</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Country</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Cost/Learner</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Learners</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Valid Until</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((q: any) => {
                  const sc = statusConfig[q.status] ?? statusConfig.draft;
                  const Icon = sc.icon;
                  const country = countries.find(c => c.id === q.country_id);
                  const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status === "sent";
                  return (
                    <tr key={q.id} className={cn("hover:bg-secondary/20 transition-colors", isExpired && "opacity-60")}>
                      <td className="px-5 py-3 font-medium text-foreground">{q.quote_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{q.programmes?.title ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{country?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {q.currency} {Number(q.cost_per_learner).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Users className="w-3 h-3 text-muted-foreground" /> {q.learner_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {q.currency} {Number(q.total_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", sc.color)}>
                          <Icon className="w-3 h-3" /> {sc.label}
                        </span>
                        {isExpired && (
                          <span className="block text-[9px] text-destructive mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 inline" /> Expired
                          </span>
                        )}
                        {q.status === "revision_requested" && q.revision_notes && (
                          <p className="text-[9px] text-warning mt-0.5 max-w-[140px] truncate" title={q.revision_notes}>
                            "{q.revision_notes}"
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {q.valid_until ? format(new Date(q.valid_until), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {q.status === "draft" && (
                          <button onClick={() => handleSendToSponsor(q)} className="text-[10px] font-medium text-info hover:text-info/80">
                            Send to Sponsor
                          </button>
                        )}
                        {q.status === "revision_requested" && (
                          <button onClick={() => handleResend(q)} className="text-[10px] font-medium text-info hover:text-info/80">
                            Re-send
                          </button>
                        )}
                        {q.status === "accepted" && (
                          <button onClick={() => handleConvert(q)} className="text-[10px] font-medium text-primary hover:text-primary/80 inline-flex items-center gap-0.5">
                            <ArrowRight className="w-3 h-3" /> Convert to Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raise a Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Quote Number (e.g. QTE-001)"
              value={form.quote_number}
              onChange={e => setForm(p => ({ ...p, quote_number: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select value={form.programme_id} onValueChange={handleProgrammeChange}>
                <SelectTrigger><SelectValue placeholder="Programme" /></SelectTrigger>
                <SelectContent>
                  {programmes.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.country_id} onValueChange={handleCountryChange}>
                <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>
                  {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Select value={form.programme_type_id} onValueChange={v => setForm(p => ({ ...p, programme_type_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Programme Type (optional)" /></SelectTrigger>
              <SelectContent>
                {programmeTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Per-learner costing */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Per-Learner Costing</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Cost per Learner ({form.currency})</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.cost_per_learner}
                    onChange={e => setForm(p => ({ ...p, cost_per_learner: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Number of Learners</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.learner_count}
                    onChange={e => setForm(p => ({ ...p, learner_count: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Total Quote Value</span>
                <span className="text-lg font-bold text-foreground">
                  {form.currency} {computedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Valid Until (optional)</label>
              <Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <Textarea placeholder="Notes / terms (optional)" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createQuote.isPending}>Raise Quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
