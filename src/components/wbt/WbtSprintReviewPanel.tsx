import { useState } from "react";
import { useWbtSprintReviews, useCreateSprintReview, useSecondReviewSprint } from "@/hooks/useWbtSprintReviews";
import { useWbtSprints } from "@/hooks/useWbtBacklog";
import { useWbtProject } from "@/hooks/useWbtProjects";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Clock, Shield, AlertTriangle } from "lucide-react";

interface Props {
  projectId: string;
}

const decisionColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  accepted: "bg-green-500/10 text-green-600",
  approved: "bg-green-500/10 text-green-600",
  rejected: "bg-red-500/10 text-red-600",
  revision_requested: "bg-blue-500/10 text-blue-600",
};

const decisionIcons: Record<string, any> = {
  pending: Clock,
  accepted: CheckCircle2,
  approved: CheckCircle2,
  rejected: XCircle,
};

export default function WbtSprintReviewPanel({ projectId }: Props) {
  const { data: project } = useWbtProject(projectId);
  const { data: sprints } = useWbtSprints(projectId);
  const { data: reviews } = useWbtSprintReviews(projectId);
  const createReview = useCreateSprintReview();
  const secondReview = useSecondReviewSprint();
  const { user, hasRole } = useAuth();

  const [showReview, setShowReview] = useState(false);
  const [showSecondReview, setShowSecondReview] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({
    sprint_id: "",
    decision: "accepted",
    stories_accepted: 0,
    stories_rejected: 0,
    feedback: "",
  });
  const [secondReviewData, setSecondReviewData] = useState({ decision: "approved", notes: "" });

  const isClient = project?.client_id === user?.id;
  const isMentor = project?.mentor_id === user?.id;
  const isAdmin = hasRole("super_admin") || hasRole("operations");
  const canReview = isClient || isMentor || isAdmin;
  const canSecondReview = isAdmin && !isMentor;
  const requiresSecondReview = project?.project_model === "mentor_led" && project?.payment_model === "paid";

  const handleSubmitReview = () => {
    if (!reviewData.sprint_id) return;
    createReview.mutate({
      sprint_id: reviewData.sprint_id,
      project_id: projectId,
      reviewer_role: isClient ? "client" : isMentor ? "mentor" : "admin",
      decision: reviewData.decision,
      stories_accepted: reviewData.stories_accepted,
      stories_rejected: reviewData.stories_rejected,
      feedback: reviewData.feedback || null,
    } as any, {
      onSuccess: () => {
        setShowReview(false);
        setReviewData({ sprint_id: "", decision: "accepted", stories_accepted: 0, stories_rejected: 0, feedback: "" });
      },
    });
  };

  const handleSecondReview = () => {
    if (!showSecondReview) return;
    secondReview.mutate({
      reviewId: showSecondReview,
      decision: secondReviewData.decision,
      notes: secondReviewData.notes || undefined,
    }, {
      onSuccess: () => {
        setShowSecondReview(null);
        setSecondReviewData({ decision: "approved", notes: "" });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sprint Reviews</h2>
        {canReview && sprints && sprints.length > 0 && (
          <Button size="sm" onClick={() => setShowReview(true)}>Review Sprint</Button>
        )}
      </div>

      {requiresSecondReview && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-400">
              This is a mentor-led paid project. Sprint acceptances require a second reviewer before payment release.
            </span>
          </CardContent>
        </Card>
      )}

      {reviews?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No sprint reviews yet.</Card>
      ) : (
        <div className="space-y-3">
          {reviews?.map(review => {
            const DecisionIcon = decisionIcons[review.decision] ?? Clock;
            const needsSecondReview = review.second_review_decision === "pending";
            return (
              <Card key={review.id} className={needsSecondReview ? "border-amber-500/50" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <DecisionIcon className="h-4 w-4" />
                      <span className="font-medium text-foreground">Sprint Review</span>
                      <Badge className={decisionColors[review.decision] ?? ""}>{review.decision}</Badge>
                      <Badge variant="outline" className="text-xs">{review.reviewer_role}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {review.reviewed_at ? new Date(review.reviewed_at).toLocaleDateString() : "Pending"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Accepted:</span> <span className="font-medium text-green-600">{review.stories_accepted}</span></div>
                    <div><span className="text-muted-foreground">Rejected:</span> <span className="font-medium text-red-600">{review.stories_rejected}</span></div>
                  </div>

                  {review.feedback && <p className="text-sm text-muted-foreground">{review.feedback}</p>}

                  {/* Second Review Section */}
                  {needsSecondReview && (
                    <div className="border-t border-border/50 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Second Review Required</span>
                        </div>
                        {canSecondReview && (
                          <Button size="sm" variant="outline" onClick={() => setShowSecondReview(review.id)}>
                            Perform Second Review
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {review.second_review_decision && review.second_review_decision !== "pending" && (
                    <div className="border-t border-border/50 pt-3 mt-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Second Review: </span>
                        <Badge className={decisionColors[review.second_review_decision] ?? ""}>{review.second_review_decision}</Badge>
                        {review.payment_release_approved && <Badge className="bg-green-500/10 text-green-600">Payment Approved</Badge>}
                      </div>
                      {review.second_review_notes && <p className="text-sm text-muted-foreground mt-1">{review.second_review_notes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Submit Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Sprint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sprint</Label>
              <Select value={reviewData.sprint_id} onValueChange={v => setReviewData(d => ({ ...d, sprint_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select sprint" /></SelectTrigger>
                <SelectContent>
                  {sprints?.map(s => <SelectItem key={s.id} value={s.id}>Sprint {s.sprint_number}{s.title ? ` — ${s.title}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Decision</Label>
              <Select value={reviewData.decision} onValueChange={v => setReviewData(d => ({ ...d, decision: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">Accept</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                  <SelectItem value="revision_requested">Request Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Stories Accepted</Label><Input type="number" min={0} value={reviewData.stories_accepted} onChange={e => setReviewData(d => ({ ...d, stories_accepted: +e.target.value }))} /></div>
              <div><Label>Stories Rejected</Label><Input type="number" min={0} value={reviewData.stories_rejected} onChange={e => setReviewData(d => ({ ...d, stories_rejected: +e.target.value }))} /></div>
            </div>
            <div><Label>Feedback</Label><Textarea value={reviewData.feedback} onChange={e => setReviewData(d => ({ ...d, feedback: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={!reviewData.sprint_id || createReview.isPending}>
              {createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Second Review Dialog */}
      <Dialog open={!!showSecondReview} onOpenChange={() => setShowSecondReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Second Review — Payment Governance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Decision</Label>
              <Select value={secondReviewData.decision} onValueChange={v => setSecondReviewData(d => ({ ...d, decision: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve Payment Release</SelectItem>
                  <SelectItem value="rejected">Reject Payment Release</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={secondReviewData.notes} onChange={e => setSecondReviewData(d => ({ ...d, notes: e.target.value }))} placeholder="Reason for your decision..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecondReview(null)}>Cancel</Button>
            <Button onClick={handleSecondReview} disabled={secondReview.isPending}>
              {secondReview.isPending ? "Submitting..." : "Submit Second Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
