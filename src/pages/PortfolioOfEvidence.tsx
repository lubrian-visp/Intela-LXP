import {
  FileCheck, Upload, Eye, CheckCircle2, AlertCircle, Clock, XCircle,
  ChevronRight, User, Award, Briefcase, Download, Printer, Search,
  ShieldAlert, FileSpreadsheet, CheckSquare, Square,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";
import {
  usePortfolioEvidence, useReviewPoeItem, useBulkReviewPoeItems, useSendToModeration, PoeItem,
} from "@/hooks/usePortfolioEvidence";

const STAFF_ROLES = ["programme_manager", "assessor", "moderator", "mentor", "operations", "super_admin", "systems_admin"];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  pending: { label: "Pending", color: "text-muted-foreground", bg: "bg-secondary", icon: <Clock className="w-3.5 h-3.5" />, tone: "neutral" },
  submitted: { label: "Submitted", color: "text-info", bg: "bg-info/10", icon: <Upload className="w-3.5 h-3.5" />, tone: "info" },
  under_review: { label: "Under Review", color: "text-info", bg: "bg-info/10", icon: <Eye className="w-3.5 h-3.5" />, tone: "info" },
  assessed: { label: "Assessed", color: "text-success", bg: "bg-success/10", icon: <CheckCircle2 className="w-3.5 h-3.5" />, tone: "success" },
  competent: { label: "Competent", color: "text-success", bg: "bg-success/10", icon: <CheckCircle2 className="w-3.5 h-3.5" />, tone: "success" },
  approved: { label: "Approved", color: "text-success", bg: "bg-success/10", icon: <CheckCircle2 className="w-3.5 h-3.5" />, tone: "success" },
  not_yet_competent: { label: "Not Yet Competent", color: "text-destructive", bg: "bg-destructive/10", icon: <XCircle className="w-3.5 h-3.5" />, tone: "danger" },
  rejected: { label: "Rejected", color: "text-destructive", bg: "bg-destructive/10", icon: <XCircle className="w-3.5 h-3.5" />, tone: "danger" },
  resubmit: { label: "Revision Needed", color: "text-warning", bg: "bg-warning/10", icon: <AlertCircle className="w-3.5 h-3.5" />, tone: "warning" },
  revision_requested: { label: "Revision Needed", color: "text-warning", bg: "bg-warning/10", icon: <AlertCircle className="w-3.5 h-3.5" />, tone: "warning" },
};

const statusOf = (s: string) => statusConfig[s] ?? statusConfig.pending;

export default function PortfolioOfEvidence() {
  const { user, roles } = useAuth();
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
  const isLearner = !isStaff;

  const { data: items = [], isLoading } = usePortfolioEvidence(isLearner ? { learnerId: user?.id } : undefined);
  const review = useReviewPoeItem();
  const bulkReview = useBulkReviewPoeItems();
  const sendToMod = useSendToModeration();

  const [sourceFilter, setSourceFilter] = useState<"all" | "submission" | "evidence">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedLearner, setExpandedLearner] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ item: PoeItem; decision: "approve" | "revise" | "reject" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [printLearnerId, setPrintLearnerId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<null | "approve" | "revise" | "reject">(null);
  const [bulkNotes, setBulkNotes] = useState("");
  const [modDialog, setModDialog] = useState<PoeItem | null>(null);
  const [modReason, setModReason] = useState("");
  const [modPriority, setModPriority] = useState<"low" | "medium" | "high">("medium");

  const outcomeOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.outcomes.forEach((o) => set.add(o)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (sourceFilter !== "all" && i.source !== sourceFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (outcomeFilter !== "all" && !i.outcomes.includes(outcomeFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !i.title.toLowerCase().includes(q) &&
          !(i.learner_name ?? "").toLowerCase().includes(q) &&
          !(i.description ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, sourceFilter, statusFilter, outcomeFilter, search]);

  const learnerGroups = useMemo(() => {
    const map = new Map<string, { learner_id: string; learner_name: string; items: PoeItem[] }>();
    filtered.forEach((i) => {
      const key = i.learner_id;
      if (!map.has(key)) map.set(key, { learner_id: key, learner_name: i.learner_name ?? "Learner", items: [] });
      map.get(key)!.items.push(i);
    });
    return Array.from(map.values()).sort((a, b) => a.learner_name.localeCompare(b.learner_name));
  }, [filtered]);

  const selected = items.find((i) => i.id === selectedId);
  const printLearner = printLearnerId ? items.filter((i) => i.learner_id === printLearnerId) : [];
  const printLearnerName = printLearner[0]?.learner_name ?? "Learner";

  const stats = {
    all: items.length,
    pending: items.filter((i) => ["pending", "submitted", "under_review"].includes(i.status)).length,
    approved: items.filter((i) => ["approved", "competent", "assessed"].includes(i.status)).length,
    revision: items.filter((i) => ["resubmit", "revision_requested"].includes(i.status)).length,
  };

  const submitReview = () => {
    if (!reviewing) return;
    review.mutate(
      { item: reviewing.item, decision: reviewing.decision, notes: reviewNotes },
      { onSuccess: () => { setReviewing(null); setReviewNotes(""); } },
    );
  };

  const openPrint = (learnerId: string) => {
    setPrintLearnerId(learnerId);
    setTimeout(() => window.print(), 50);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((i) => i.id)));
  };

  const selectedItems = useMemo(() => items.filter((i) => selectedIds.has(i.id)), [items, selectedIds]);

  const exportCsv = (rows: PoeItem[], filename: string) => {
    const data = rows.map((r) => ({
      learner: r.learner_name ?? "",
      source: r.source === "submission" ? "Assessment" : "Workplace",
      title: r.title,
      status: statusOf(r.status).label,
      score: r.score != null ? `${r.score}/${r.max_score ?? 100}` : "",
      outcomes: r.outcomes.join("; "),
      submitted: r.submitted_at ? format(new Date(r.submitted_at), "yyyy-MM-dd") : "",
      reviewed: r.reviewed_at ? format(new Date(r.reviewed_at), "yyyy-MM-dd") : "",
      feedback: r.feedback ?? "",
      moderation: r.moderation_status ?? "",
    }));
    exportToCSV(data, filename, [
      { key: "learner", label: "Learner" },
      { key: "source", label: "Source" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "score", label: "Score" },
      { key: "outcomes", label: "Learning Outcomes" },
      { key: "submitted", label: "Submitted" },
      { key: "reviewed", label: "Reviewed" },
      { key: "moderation", label: "Moderation" },
      { key: "feedback", label: "Feedback" },
    ]);
  };

  const submitBulk = () => {
    if (!bulkDialog) return;
    bulkReview.mutate(
      { items: selectedItems, decision: bulkDialog, notes: bulkNotes },
      { onSuccess: () => { setBulkDialog(null); setBulkNotes(""); setSelectedIds(new Set()); } },
    );
  };

  const submitModeration = () => {
    if (!modDialog) return;
    sendToMod.mutate(
      { item: modDialog, reason: modReason, priority: modPriority },
      { onSuccess: () => { setModDialog(null); setModReason(""); setModPriority("medium"); } },
    );
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-slide-up print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio of Evidence</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLearner
                ? "Your assessment submissions and workplace evidence."
                : "Unified view of assessment submissions and workplace evidence — grouped by learner."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCsv(filtered, `portfolio-${format(new Date(), "yyyy-MM-dd")}`)}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            {isLearner && user?.id && (
              <Button variant="outline" size="sm" onClick={() => openPrint(user.id)}>
                <Printer className="w-4 h-4 mr-2" /> Export Portfolio
              </Button>
            )}
          </div>
        </div>

        {/* Bulk action bar (staff only) */}
        {isStaff && selectedIds.size > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground mr-2">{selectedIds.size} selected</span>
            <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => { setBulkDialog("approve"); setBulkNotes(""); }}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve all
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setBulkDialog("revise"); setBulkNotes(""); }}>
              <Clock className="w-3.5 h-3.5 mr-1" /> Request revision
            </Button>
            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => { setBulkDialog("reject"); setBulkNotes(""); }}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => exportCsv(selectedItems, `portfolio-selected-${format(new Date(), "yyyy-MM-dd")}`)}>
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export selection
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Items", value: stats.all, icon: <FileCheck className="w-4 h-4 text-info" /> },
            { label: "Pending Review", value: stats.pending, icon: <Clock className="w-4 h-4 text-warning" /> },
            { label: "Approved / Competent", value: stats.approved, icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
            { label: "Needs Revision", value: stats.revision, icon: <AlertCircle className="w-4 h-4 text-warning" /> },
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

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border/50 p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search learner, title…" className="pl-8 h-9 text-xs" />
          </div>
          <div className="flex gap-1">
            {(["all", "submission", "evidence"] as const).map((s) => (
              <button key={s} onClick={() => setSourceFilter(s)} className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                sourceFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}>
                {s === "all" ? "All Sources" : s === "submission" ? "Assessments" : "Workplace"}
              </button>
            ))}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
            <option value="all">All Statuses</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {outcomeOptions.length > 0 && (
            <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs max-w-[220px]">
              <option value="all">All Outcomes</option>
              {outcomeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {isStaff && filtered.length > 0 && (
            <Button size="sm" variant="ghost" className="h-9 text-xs ml-auto" onClick={selectAllFiltered}>
              {selectedIds.size === filtered.length ? <CheckSquare className="w-3.5 h-3.5 mr-1" /> : <Square className="w-3.5 h-3.5 mr-1" />}
              {selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
                <FileCheck className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No portfolio items found.</p>
              </div>
            ) : isLearner ? (
              filtered.map((i) => <PoeRow key={i.id} item={i} selected={selectedId === i.id} onSelect={() => setSelectedId(i.id)} checked={selectedIds.has(i.id)} onToggle={isStaff ? () => toggleSelect(i.id) : undefined} />)
            ) : (
              learnerGroups.map((g) => {
                const open = expandedLearner === g.learner_id;
                const groupApproved = g.items.filter((i) => ["approved", "competent", "assessed"].includes(i.status)).length;
                return (
                  <div key={g.learner_id} className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
                    <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/5" onClick={() => setExpandedLearner(open ? null : g.learner_id)}>
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{g.learner_name}</p>
                        <p className="text-[10px] text-muted-foreground">{g.items.length} items · {groupApproved} approved</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); openPrint(g.learner_id); }}>
                        <Download className="w-3 h-3 mr-1" /> Export
                      </Button>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-90")} />
                    </div>
                    {open && (
                      <div className="border-t border-border/50 p-3 space-y-2 bg-secondary/20">
                        {g.items.map((i) => <PoeRow key={i.id} item={i} compact selected={selectedId === i.id} onSelect={() => setSelectedId(i.id)} checked={selectedIds.has(i.id)} onToggle={() => toggleSelect(i.id)} />)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selected ? (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-5 sticky top-24" key={selected.id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mb-2", statusOf(selected.status).bg, statusOf(selected.status).color)}>
                      {statusOf(selected.status).icon}{statusOf(selected.status).label}
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{selected.title}</h3>
                    {!isLearner && <p className="text-[11px] text-muted-foreground">{selected.learner_name}</p>}
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                    selected.source === "submission" ? "bg-info/10 text-info" : "bg-accent/10 text-accent-foreground",
                  )}>
                    {selected.source === "submission" ? <><Award className="w-3 h-3 inline mr-1" />Assessment</> : <><Briefcase className="w-3 h-3 inline mr-1" />Workplace</>}
                  </span>
                </div>

                {selected.description && <p className="text-xs text-muted-foreground mb-3">{selected.description}</p>}

                {selected.outcomes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Learning Outcomes</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.outcomes.map((o, idx) => (
                        <span key={idx} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{o}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-4 text-xs">
                  {selected.score != null && (
                    <Row label="Score" value={`${selected.score}/${selected.max_score ?? 100}${selected.pass_mark ? ` (pass ${selected.pass_mark})` : ""}`} />
                  )}
                  {selected.evidence_type && <Row label="Evidence Type" value={selected.evidence_type} />}
                  <Row label="Submitted" value={selected.submitted_at ? format(new Date(selected.submitted_at), "MMM dd, yyyy") : "—"} />
                  {selected.reviewed_at && <Row label="Reviewed" value={format(new Date(selected.reviewed_at), "MMM dd, yyyy")} />}
                  {selected.moderation_status && <Row label="Moderation" value={selected.moderation_status.replace("_", " ")} />}
                </div>

                {selected.file_url && (
                  <a href={selected.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline block mb-3">View attachment</a>
                )}

                {selected.feedback && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Feedback</p>
                    <div className="p-3 rounded-lg bg-secondary/50 text-xs text-foreground leading-relaxed">"{selected.feedback}"</div>
                  </div>
                )}

                {selected.moderation_notes && (
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Moderation Notes</p>
                    <div className="p-3 rounded-lg bg-secondary/50 text-xs text-foreground leading-relaxed">"{selected.moderation_notes}"</div>
                  </div>
                )}

                {isStaff && (
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Review Action</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button size="sm" variant="default" className="h-8 text-[11px]" onClick={() => { setReviewing({ item: selected, decision: "approve" }); setReviewNotes(selected.feedback ?? ""); }}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => { setReviewing({ item: selected, decision: "revise" }); setReviewNotes(selected.feedback ?? ""); }}>
                        <Clock className="w-3 h-3 mr-1" />Revise
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 text-[11px]" onClick={() => { setReviewing({ item: selected, decision: "reject" }); setReviewNotes(selected.feedback ?? ""); }}>
                        <XCircle className="w-3 h-3 mr-1" />Reject
                      </Button>
                    </div>
                    {selected.source === "submission" && (
                      <Button size="sm" variant="outline" className="h-8 text-[11px] w-full mt-2" onClick={() => { setModDialog(selected); setModReason(""); setModPriority("medium"); }}>
                        <ShieldAlert className="w-3 h-3 mr-1" /> Send to Moderation
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-card border border-border/50 p-8 text-center">
                <FileCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Select an item to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewing?.decision === "approve" && "Approve evidence"}
              {reviewing?.decision === "revise" && "Request revision"}
              {reviewing?.decision === "reject" && "Reject evidence"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{reviewing?.item.title}</p>
            <Textarea
              rows={4}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={reviewing?.decision === "approve" ? "Feedback (optional)" : "Reason / required changes…"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button
              onClick={submitReview}
              disabled={review.isPending || (reviewing?.decision !== "approve" && !reviewNotes.trim())}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk review dialog */}
      <Dialog open={!!bulkDialog} onOpenChange={(o) => !o && setBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkDialog === "approve" && `Approve ${selectedIds.size} items`}
              {bulkDialog === "revise" && `Request revision on ${selectedIds.size} items`}
              {bulkDialog === "reject" && `Reject ${selectedIds.size} items`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This will apply the same decision and notes to every selected item. Per-item feedback already entered will be overwritten.
            </p>
            <Textarea
              rows={4}
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder={bulkDialog === "approve" ? "Feedback (optional)" : "Reason / required changes…"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button
              onClick={submitBulk}
              disabled={bulkReview.isPending || (bulkDialog !== "approve" && !bulkNotes.trim())}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send-to-moderation dialog */}
      <Dialog open={!!modDialog} onOpenChange={(o) => !o && setModDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Moderation Queue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{modDialog?.title} — {modDialog?.learner_name}</p>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Priority</label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setModPriority(p)} className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium capitalize",
                    modPriority === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}>{p}</button>
                ))}
              </div>
            </div>
            <Textarea
              rows={4}
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder="Reason for moderation (required)…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModDialog(null)}>Cancel</Button>
            <Button onClick={submitModeration} disabled={sendToMod.isPending || !modReason.trim()}>
              <ShieldAlert className="w-4 h-4 mr-1" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable view */}
      {printLearnerId && (
        <div className="hidden print:block p-8">
          <div className="border-b pb-4 mb-4">
            <h1 className="text-2xl font-bold">Portfolio of Evidence</h1>
            <p className="text-sm text-muted-foreground">Learner: {printLearnerName}</p>
            <p className="text-xs text-muted-foreground">Generated: {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
          </div>
          {printLearner.map((i) => (
            <div key={i.id} className="mb-4 pb-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{i.source === "submission" ? "Assessment" : "Workplace Evidence"}</p>
                  <h3 className="text-base font-semibold">{i.title}</h3>
                </div>
                <span className="text-xs font-medium">{statusOf(i.status).label}</span>
              </div>
              {i.description && <p className="text-xs mt-1">{i.description}</p>}
              {i.outcomes.length > 0 && <p className="text-xs mt-1"><strong>Outcomes:</strong> {i.outcomes.join(", ")}</p>}
              {i.score != null && <p className="text-xs"><strong>Score:</strong> {i.score}/{i.max_score ?? 100}</p>}
              {i.submitted_at && <p className="text-xs"><strong>Submitted:</strong> {format(new Date(i.submitted_at), "dd MMM yyyy")}</p>}
              {i.feedback && <p className="text-xs mt-1"><strong>Feedback:</strong> {i.feedback}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground capitalize">{value}</span>
    </div>
  );
}

function PoeRow({ item, selected, onSelect, compact, checked, onToggle }: { item: PoeItem; selected: boolean; onSelect: () => void; compact?: boolean; checked?: boolean; onToggle?: () => void }) {
  const sc = statusOf(item.status);
  return (
    <div
      onClick={onSelect}
      className={cn(
        "bg-card rounded-xl p-4 shadow-card border transition-all cursor-pointer flex gap-3",
        selected ? "border-accent/40 ring-1 ring-accent/20" : "border-border/50 hover:border-accent/20",
        compact && "p-3 shadow-none",
      )}
    >
      {onToggle && (
        <div onClick={(e) => { e.stopPropagation(); onToggle(); }} className="pt-1">
          <Checkbox checked={!!checked} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1.5 gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", sc.bg, sc.color)}>
                {sc.icon}{sc.label}
              </span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                item.source === "submission" ? "bg-info/10 text-info" : "bg-accent/10 text-accent-foreground",
              )}>
                {item.source === "submission" ? "Assessment" : "Workplace"}
              </span>
              {item.outcomes.slice(0, 2).map((o, idx) => (
                <span key={idx} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full truncate max-w-[120px]">{o}</span>
              ))}
              {item.outcomes.length > 2 && <span className="text-[9px] text-muted-foreground">+{item.outcomes.length - 2}</span>}
            </div>
            <h4 className="text-sm font-semibold text-foreground truncate">{item.title}</h4>
            {item.learner_name && <p className="text-[10px] text-muted-foreground truncate">{item.learner_name}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          {item.score != null && <span className="font-medium">{item.score}/{item.max_score ?? 100}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.submitted_at ? format(new Date(item.submitted_at), "MMM dd, yyyy") : "—"}</span>
        </div>
      </div>
    </div>
  );
}
