import { Flag, Search, CheckCircle2, XCircle, Clock, ChevronRight, X, AlertTriangle, FileText } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModerationItems, useUpdateSubmission, useRealtimeSync } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const PRIORITY_CFG = {
  high:   { color: "text-destructive", bg: "bg-destructive/10", label: "High"   },
  medium: { color: "text-warning",     bg: "bg-warning/10",     label: "Medium" },
  low:    { color: "text-muted-foreground", bg: "bg-secondary", label: "Low"    },
};

export default function ModeratorQueue() {
  usePageTitle("Moderation Queue", "Moderator Portal");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState<any | null>(null);
  const [decision, setDecision]         = useState<"approve" | "reject" | null>(null);
  const [feedback, setFeedback]         = useState("");
  const [submitting, setSubmitting]     = useState(false);

  const { user }    = useAuth();
  const qc          = useQueryClient();
  const { data: items = [], isLoading } = useModerationItems();
  const updateSub   = useUpdateSubmission();

  useRealtimeSync(["moderation_items", "assessment_submissions", "notifications"]);

  // Self-moderation filter + pending only
  const pending = (items as any[]).filter((i: any) =>
    (i.status === "pending" || i.status === "pending_review" || i.status === "under_review") &&
    i.submitted_by !== user?.id
  );
  const filtered = pending.filter((i: any) =>
    !search || i.content?.toLowerCase().includes(search.toLowerCase()) || i.reason?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDecision = async () => {
    if (!selected || !decision) return;
    setSubmitting(true);
    try {
      // Update moderation_item status
      const newStatus = decision === "approve" ? "approved" : "rejected";
      const { error: modErr } = await (supabase as any)
        .from("moderation_items")
        .update({
          status:              newStatus,
          reviewed_by:         user?.id,
          reviewed_at:         new Date().toISOString(),
          review_notes:        feedback.trim() || null,
          moderation_feedback: decision === "reject" ? feedback.trim() : null,
          rejection_category:  decision === "reject" ? "quality_concern" : null,
        })
        .eq("id", selected.id);
      if (modErr) throw modErr;

      // Update the linked submission
      if (selected.submission_id) {
        await updateSub.mutateAsync({
          id:                selected.submission_id,
          moderation_status: newStatus,
          moderated_at:      new Date().toISOString(),
          moderator_id:      user?.id,
          moderation_notes:  feedback.trim() || null,
          status:            decision === "approve" ? "competent" : "resubmit",
        });
      }

      qc.invalidateQueries({ queryKey: ["moderation_items"] });
      toast.success(decision === "approve" ? "Submission approved ✓" : "Submission rejected — learner notified");
      setSelected(null); setDecision(null); setFeedback("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save decision");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Flag className="w-5 h-5 text-primary" /> Moderation Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} item{pending.length !== 1 ? "s" : ""} pending moderation review.
        </p>
      </FadeIn>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search queue…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search moderation queue"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Flag className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Queue Clear</h3>
          <p className="text-xs text-muted-foreground">No items pending moderation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue list */}
          <div className="space-y-3">
            {filtered.map((i: any) => {
              const priCfg = PRIORITY_CFG[i.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.low;
              const isSelected = selected?.id === i.id;
              return (
                <button
                  key={i.id}
                  className={cn(
                    "w-full text-left bg-card rounded-xl p-5 shadow-card border transition-all group",
                    isSelected
                      ? "border-primary/40 ring-1 ring-primary/20 shadow-card-hover"
                      : "border-border/50 hover:shadow-card-hover hover:border-primary/20"
                  )}
                  onClick={() => { setSelected(i); setDecision(null); setFeedback(""); }}
                  aria-label={`Review moderation item: ${i.item_type}`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-foreground capitalize group-hover:text-primary transition-colors">
                        {i.item_type?.replace(/_/g, " ")}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{i.content}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize", priCfg.bg, priCfg.color)}>
                        {priCfg.label}
                      </span>
                      <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isSelected && "rotate-90")} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {i.flagged_at ? format(new Date(i.flagged_at), "d MMM yyyy HH:mm") : "—"}
                    <span className="ml-auto capitalize">{i.status?.replace(/_/g, " ")}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail / decision panel */}
          {selected ? (
            <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Moderation Review
                </h3>
                <button onClick={() => { setSelected(null); setDecision(null); setFeedback(""); }} className="p-1 hover:bg-secondary rounded transition-colors" aria-label="Close review panel">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Item details */}
                <div className="space-y-2 text-sm">
                  <div className="flex gap-3"><span className="text-muted-foreground w-24 shrink-0">Type</span><span className="font-medium capitalize">{selected.item_type?.replace(/_/g," ")}</span></div>
                  <div className="flex gap-3"><span className="text-muted-foreground w-24 shrink-0">Reason</span><span className="font-medium">{selected.reason}</span></div>
                  <div className="flex gap-3"><span className="text-muted-foreground w-24 shrink-0">Priority</span><span className={cn("font-semibold capitalize", PRIORITY_CFG[selected.priority as keyof typeof PRIORITY_CFG]?.color)}>{selected.priority}</span></div>
                  <div className="flex gap-3"><span className="text-muted-foreground w-24 shrink-0">Flagged</span><span>{selected.flagged_at ? format(new Date(selected.flagged_at), "d MMM yyyy HH:mm") : "—"}</span></div>
                </div>

                {/* Content preview */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</p>
                  <div className="bg-secondary/30 rounded-lg border border-border/50 p-3 text-xs text-foreground leading-relaxed max-h-32 overflow-y-auto">
                    {selected.content}
                  </div>
                </div>

                {/* Decision buttons */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDecision("approve")}
                      className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all",
                        decision === "approve"
                          ? "bg-success/10 border-success text-success ring-1 ring-success"
                          : "border-border hover:bg-success/5 hover:border-success/40 text-muted-foreground"
                      )}
                      aria-pressed={decision === "approve"}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setDecision("reject")}
                      className={cn("flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all",
                        decision === "reject"
                          ? "bg-destructive/10 border-destructive text-destructive ring-1 ring-destructive"
                          : "border-border hover:bg-destructive/5 hover:border-destructive/40 text-muted-foreground"
                      )}
                      aria-pressed={decision === "reject"}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>

                {/* Feedback */}
                {decision && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {decision === "reject" ? "Rejection Reason (required)" : "Approval Notes (optional)"}
                    </label>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder={decision === "reject"
                        ? "Explain what needs to be corrected…"
                        : "Any notes for the assessor…"
                      }
                      className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={3}
                      maxLength={1000}
                      aria-label="Moderation feedback"
                    />
                    {decision === "reject" && !feedback.trim() && (
                      <div className="flex items-center gap-1.5 text-[10px] text-warning">
                        <AlertTriangle className="w-3 h-3" /> Rejection reason is required
                      </div>
                    )}
                  </div>
                )}

                {/* Submit */}
                {decision && (
                  <Button
                    className={cn("w-full gap-1.5", decision === "approve" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90")}
                    onClick={handleDecision}
                    disabled={submitting || (decision === "reject" && !feedback.trim())}
                  >
                    {submitting
                      ? "Saving…"
                      : decision === "approve"
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Approval</>
                        : <><XCircle className="w-3.5 h-3.5" /> Confirm Rejection</>
                    }
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-dashed border-border/50 flex items-center justify-center p-12 text-center">
              <div>
                <Flag className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Select an item to review</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
