import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContentRatings, useUpsertRating, useContentComments, useCreateComment } from "@/hooks/useLxpData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Send, ThumbsUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ContentSocialPanelProps {
  contentBlockId?: string;
  ugcId?: string;
  className?: string;
}

export default function ContentSocialPanel({ contentBlockId, ugcId, className }: ContentSocialPanelProps) {
  const { user } = useAuth();
  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [commentText, setCommentText] = useState("");

  const { data: ratings = [] } = useContentRatings(contentBlockId ? { contentBlockId } : ugcId ? { ugcId } : {});
  const { data: comments = [] } = useContentComments(contentBlockId ? { contentBlockId } : ugcId ? { ugcId } : {});
  const upsertRating = useUpsertRating();
  const createComment = useCreateComment();

  const avgRating = ratings.length > 0
    ? (ratings.reduce((a: number, r: any) => a + r.rating, 0) / ratings.length).toFixed(1)
    : "—";

  const userRating = ratings.find((r: any) => r.user_id === user?.id);

  const handleRate = async () => {
    if (!user?.id || selectedRating === 0) return;
    try {
      await upsertRating.mutateAsync({
        user_id: user.id,
        rating: selectedRating,
        review_text: reviewText || undefined,
        ...(contentBlockId ? { content_block_id: contentBlockId } : {}),
        ...(ugcId ? { ugc_id: ugcId } : {}),
      });
      toast({ title: "Rating saved" });
      setShowReview(false);
      setReviewText("");
      setSelectedRating(0);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleComment = async () => {
    if (!user?.id || !commentText.trim()) return;
    try {
      await createComment.mutateAsync({
        user_id: user.id,
        body: commentText,
        ...(contentBlockId ? { content_block_id: contentBlockId } : {}),
        ...(ugcId ? { ugc_id: ugcId } : {}),
      });
      setCommentText("");
      toast({ title: "Comment posted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Ratings Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Ratings & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{avgRating}</div>
              <div className="flex gap-0.5 justify-center">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("w-3 h-3", Number(avgRating) >= s ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{ratings.length} rating{ratings.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1">
              {!showReview ? (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                  setShowReview(true);
                  if (userRating) {
                    setSelectedRating(userRating.rating);
                    setReviewText(userRating.review_text || "");
                  }
                }}>
                  {userRating ? "Update Rating" : "Rate This Content"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1 justify-center">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setSelectedRating(s)} className="p-1">
                        <Star className={cn("w-5 h-5 transition-colors", selectedRating >= s ? "text-warning fill-warning" : "text-muted-foreground/30 hover:text-warning/50")} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Write a review (optional)..." className="text-xs min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowReview(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1 text-xs" onClick={handleRate} disabled={selectedRating === 0}>Submit</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Reviews */}
          {ratings.filter((r: any) => r.review_text).slice(0, 3).map((r: any) => (
            <div key={r.id} className="p-2 rounded border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn("w-3 h-3", r.rating >= s ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(r.created_at), "MMM dd")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{r.review_text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Comments
            <Badge variant="outline" className="text-[10px] ml-auto">{comments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="text-xs min-h-[50px] flex-1"
            />
            <Button size="sm" className="self-end" onClick={handleComment} disabled={!commentText.trim() || createComment.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {comments.map((c: any) => (
                <div key={c.id} className="p-2 rounded border border-border bg-secondary/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-foreground">User</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "MMM dd, HH:mm")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
