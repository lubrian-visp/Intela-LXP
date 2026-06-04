import { useState, useMemo } from "react";
import {
  FileText, Filter, CheckCircle2, Clock, XCircle, Send,
  Users, DollarSign, AlertTriangle, MessageSquare, ArrowRight,
} from "lucide-react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useSponsorQuotes, useUpdateQuote } from "@/hooks/useSponsorQuotes";
import { useAuth } from "@/hooks/useAuth";
import { useCountries } from "@/hooks/useProgrammeTypes";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Draft", icon: FileText, color: "bg-muted text-muted-foreground" },
  sent: { label: "Pending Review", icon: Send, color: "bg-info/10 text-info" },
  revision_requested: { label: "Revision Requested", icon: MessageSquare, color: "bg-warning/10 text-warning" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-success/10 text-success" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive/10 text-destructive" },
  invoiced: { label: "Invoiced", icon: DollarSign, color: "bg-primary/10 text-primary" },
};

export default function SponsorQuotes() {
  const { user } = useAuth();
  const { data: quotes = [], isLoading } = useSponsorQuotes();
  const { data: countries = [] } = useCountries();
  const updateQuote = useUpdateQuote();
  const [filter, setFilter] = useState("all");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState<any>(null);
  const [revisionNotes, setRevisionNotes] = useState("");

  // Only show quotes sent to this sponsor (not drafts being prepared by provider)
  const sponsorQuotes = quotes.filter((q: any) => q.sponsor_id === user?.id && q.status !== "draft");

  const filtered = filter === "all" ? sponsorQuotes : sponsorQuotes.filter((q: any) => q.status === filter);

  const stats = useMemo(() => {
    const totalValue = sponsorQuotes.reduce((s: number, q: any) => s + Number(q.total_amount ?? 0), 0);
    const accepted = sponsorQuotes.filter((q: any) => q.status === "accepted" || q.status === "invoiced")
      .reduce((s: number, q: any) => s + Number(q.total_amount ?? 0), 0);
    const pending = sponsorQuotes.filter((q: any) => q.status === "sent").length;
    return { totalValue, accepted, pending, count: sponsorQuotes.length };
  }, [sponsorQuotes]);

  const handleAccept = (q: any) => {
    updateQuote.mutate({
      id: q.id, status: "accepted",
      accepted_at: new Date().toISOString(), accepted_by: user?.id,
    }, {
      onSuccess: () => toast.success("Quote accepted — invoice is being generated automatically"),
    });
  };

  const handleReject = (q: any) => {
    updateQuote.mutate({ id: q.id, status: "rejected", rejected_at: new Date().toISOString() }, {
      onSuccess: () => toast.success("Quote rejected"),
    });
  };

  const openRevisionDialog = (q: any) => {
    setRevisionTarget(q);
    setRevisionNotes("");
    setRevisionOpen(true);
  };

  const handleRequestRevision = () => {
    if (!revisionNotes.trim()) {
      toast.error("Please provide details on what needs to change");
      return;
    }
    updateQuote.mutate({
      id: revisionTarget.id,
      status: "revision_requested",
      revision_notes: revisionNotes.trim(),
    }, {
      onSuccess: () => {
        toast.success("Revision request sent to the provider");
        setRevisionOpen(false);
        setRevisionTarget(null);
      },
    });
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Quotes & Agreements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review quotes from your Skills Provider, accept or request changes, and track linked invoices.
          </p>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Quoted", value: `R${stats.totalValue.toLocaleString()}`, color: "text-foreground" },
          { label: "Accepted Value", value: `R${stats.accepted.toLocaleString()}`, color: "text-success" },
          { label: "Awaiting Your Review", value: String(stats.pending), color: "text-warning" },
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
        {["all", "sent", "revision_requested", "accepted", "rejected", "invoiced"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-[11px] px-3 py-1 rounded-full font-medium transition-colors capitalize",
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {f === "revision_requested" ? "Revision" : f === "sent" ? "Pending" : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No quotes received yet.</p>
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
                  const sc = statusConfig[q.status] ?? statusConfig.sent;
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
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {q.valid_until ? format(new Date(q.valid_until), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {q.status === "sent" && !isExpired && (
                          <>
                            <button onClick={() => handleAccept(q)} className="text-[10px] font-medium text-success hover:text-success/80">
                              Accept
                            </button>
                            <button onClick={() => openRevisionDialog(q)} className="text-[10px] font-medium text-warning hover:text-warning/80">
                              Revise
                            </button>
                            <button onClick={() => handleReject(q)} className="text-[10px] font-medium text-destructive hover:text-destructive/80">
                              Reject
                            </button>
                          </>
                        )}
                        {q.status === "invoiced" && (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                            <ArrowRight className="w-3 h-3" /> Invoice Linked
                          </span>
                        )}
                        {q.status === "revision_requested" && (
                          <span className="text-[10px] text-muted-foreground">Awaiting provider</span>
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

      {/* Revision Notes (read-only display below table for accepted/revision quotes) */}
      {filtered.some((q: any) => q.revision_notes) && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5 space-y-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-warning" /> Revision History
          </h3>
          {filtered.filter((q: any) => q.revision_notes).map((q: any) => (
            <div key={q.id} className="text-xs border-l-2 border-warning/50 pl-3 py-1">
              <span className="font-medium text-foreground">{q.quote_number}:</span>{" "}
              <span className="text-muted-foreground">{q.revision_notes}</span>
            </div>
          ))}
        </div>
      )}

      {/* Revision Request Dialog */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote Revision</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Describe what changes you'd like the provider to make to quote <span className="font-medium text-foreground">{revisionTarget?.quote_number}</span>.
          </p>
          <Textarea
            placeholder="e.g. Please adjust the cost per learner to R12,000 or reduce the learner count to 15..."
            rows={4}
            value={revisionNotes}
            onChange={e => setRevisionNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestRevision} disabled={updateQuote.isPending}>
              Send Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
