import { useState } from "react";
import { UserCheck, CheckCircle2, XCircle, Clock, FileCheck, Eye } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkplaceEvidence, useReviewEvidence } from "@/hooks/useMentorData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  revision_requested: "bg-info/10 text-info",
};

export default function MentorEvidence() {
  const { user } = useAuth();
  const { data: evidence = [], isLoading } = useWorkplaceEvidence();
  const reviewEvidence = useReviewEvidence();
  const [reviewing, setReviewing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const handleReview = (status: string) => {
    if (!reviewing || !user) return;
    reviewEvidence.mutate({ id: reviewing.id, status, review_notes: notes, reviewed_by: user.id }, {
      onSuccess: () => { setReviewing(null); setNotes(""); },
    });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Evidence Validation</h1>
        <p className="text-sm text-muted-foreground">Review and validate workplace evidence submitted by your mentees.</p>
      </FadeIn>

      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : evidence.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <UserCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Pending Evidence</h3>
          <p className="text-xs text-muted-foreground">Workplace evidence submissions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(evidence as any[]).map(e => (
            <div key={e.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold text-foreground">{e.title}</h4>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", statusStyles[e.status] || "bg-muted text-muted-foreground")}>{e.status.replace("_", " ")}</span>
                  </div>
                  {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Type: {e.evidence_type}</span>
                    <span>Submitted: {new Date(e.submitted_at).toLocaleDateString()}</span>
                  </div>
                  {e.review_notes && (
                    <div className="bg-secondary/30 rounded px-2 py-1 text-xs text-muted-foreground mt-1">
                      <strong>Review notes:</strong> {e.review_notes}
                    </div>
                  )}
                </div>
                {e.status === "pending" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setReviewing(e); setNotes(""); }}>
                    <Eye className="w-3 h-3 mr-1" />Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={() => setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Evidence: {reviewing?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-secondary/30 rounded-lg p-3 text-sm">
              <p><strong>Type:</strong> {reviewing?.evidence_type}</p>
              {reviewing?.description && <p className="mt-1">{reviewing.description}</p>}
              {reviewing?.file_url && (
                <a href={reviewing.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs mt-1 block">View Attachment</a>
              )}
            </div>
            <Textarea placeholder="Review notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => handleReview("approved")} disabled={reviewEvidence.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-1" />Approve
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleReview("revision_requested")} disabled={reviewEvidence.isPending}>
                <Clock className="w-4 h-4 mr-1" />Request Revision
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleReview("rejected")} disabled={reviewEvidence.isPending}>
                <XCircle className="w-4 h-4 mr-1" />Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
