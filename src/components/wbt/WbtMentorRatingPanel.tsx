import { useState } from "react";
import { useWbtProjectRatings, useRateMentor, useMentorReputation } from "@/hooks/useWbtMentorRatings";
import { useWbtProject } from "@/hooks/useWbtProjects";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Star, User } from "lucide-react";

interface Props {
  projectId: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)} className="focus:outline-none">
            <Star className={`h-6 w-6 transition-colors ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReputationBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value.toFixed(1)}/5</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

export default function WbtMentorRatingPanel({ projectId }: Props) {
  const { data: project } = useWbtProject(projectId);
  const { data: ratings } = useWbtProjectRatings(projectId);
  const { data: reputation } = useMentorReputation(project?.mentor_id ?? undefined);
  const rateMentor = useRateMentor();
  const { user } = useAuth();

  const [showRate, setShowRate] = useState(false);
  const [ratingData, setRatingData] = useState({
    communication_score: 0,
    technical_score: 0,
    mentorship_score: 0,
    overall_score: 0,
    feedback: "",
    is_anonymous: false,
  });

  const hasRated = ratings?.some(r => r.rated_by === user?.id);
  const isLearnerOrClient = project?.client_id === user?.id ||
    true; // Simplified — RLS handles actual permission

  const handleSubmitRating = () => {
    if (!project?.mentor_id || ratingData.overall_score === 0) return;
    rateMentor.mutate({
      project_id: projectId,
      mentor_id: project.mentor_id,
      rater_role: project.client_id === user?.id ? "client" : "learner",
      ...ratingData,
    } as any, {
      onSuccess: () => {
        setShowRate(false);
        setRatingData({ communication_score: 0, technical_score: 0, mentorship_score: 0, overall_score: 0, feedback: "", is_anonymous: false });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Mentor Ratings</h2>
        {project?.status === "completed" && !hasRated && isLearnerOrClient && (
          <Button size="sm" onClick={() => setShowRate(true)} className="gap-1">
            <Star className="h-4 w-4" /> Rate Mentor
          </Button>
        )}
      </div>

      {/* Reputation Summary */}
      {reputation && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Mentor Reputation
              <Badge variant="outline" className="ml-auto">{reputation.total_ratings} rating{reputation.total_ratings !== 1 ? "s" : ""}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReputationBar label="Communication" value={reputation.avg_communication} />
            <ReputationBar label="Technical Skill" value={reputation.avg_technical} />
            <ReputationBar label="Mentorship Quality" value={reputation.avg_mentorship} />
            <ReputationBar label="Overall" value={reputation.avg_overall} />
          </CardContent>
        </Card>
      )}

      {/* Individual Ratings */}
      {ratings?.length === 0 && !reputation ? (
        <Card className="p-8 text-center text-muted-foreground">No ratings yet. Ratings can be submitted once the project is completed.</Card>
      ) : (
        <div className="space-y-2">
          {ratings?.map(rating => (
            <Card key={rating.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= rating.overall_score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <Badge variant="outline" className="text-xs">{rating.rater_role}</Badge>
                      {rating.is_anonymous && <Badge variant="secondary" className="text-xs">Anonymous</Badge>}
                    </div>
                    {rating.feedback && <p className="text-sm text-muted-foreground">{rating.feedback}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(rating.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={showRate} onOpenChange={setShowRate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rate Your Mentor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <StarRating label="Communication" value={ratingData.communication_score} onChange={v => setRatingData(d => ({ ...d, communication_score: v }))} />
            <StarRating label="Technical Expertise" value={ratingData.technical_score} onChange={v => setRatingData(d => ({ ...d, technical_score: v }))} />
            <StarRating label="Mentorship Quality" value={ratingData.mentorship_score} onChange={v => setRatingData(d => ({ ...d, mentorship_score: v }))} />
            <StarRating label="Overall Experience" value={ratingData.overall_score} onChange={v => setRatingData(d => ({ ...d, overall_score: v }))} />
            <div><Label>Written Feedback (optional)</Label><Textarea value={ratingData.feedback} onChange={e => setRatingData(d => ({ ...d, feedback: e.target.value }))} placeholder="Share your experience..." /></div>
            <div className="flex items-center gap-2">
              <Switch checked={ratingData.is_anonymous} onCheckedChange={v => setRatingData(d => ({ ...d, is_anonymous: v }))} />
              <Label className="text-sm">Submit anonymously</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRate(false)}>Cancel</Button>
            <Button onClick={handleSubmitRating} disabled={ratingData.overall_score === 0 || rateMentor.isPending}>
              {rateMentor.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
