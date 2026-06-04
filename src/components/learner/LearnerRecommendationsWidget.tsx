import { useAuth } from "@/hooks/useAuth";
import { useLearningRecommendations, useDismissRecommendation } from "@/hooks/useLxpData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, X, ExternalLink, BookOpen, Upload, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import WhySeeingThis from "@/components/ai/WhySeeingThis";

const TYPE_ICONS: Record<string, any> = {
  programme: BookOpen,
  ugc: Upload,
  external: ExternalLink,
  skill_focus: Target,
};

interface LearnerRecommendationsWidgetProps {
  className?: string;
}

export default function LearnerRecommendationsWidget({ className }: LearnerRecommendationsWidgetProps) {
  const { user } = useAuth();
  const { data: recommendations = [], isLoading } = useLearningRecommendations(user?.id);
  const dismissMutation = useDismissRecommendation();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRecommendations = async () => {
    if (!user?.id) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-learning-recommendations", {
        body: { learner_id: user.id },
      });
      if (error) throw error;
      toast({ title: "Recommendations updated", description: `${data?.count || 0} new suggestions generated.` });
    } catch (e: any) {
      toast({ title: "Error generating recommendations", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDismiss = (id: string) => {
    if (!user?.id) return;
    dismissMutation.mutate({ id, learnerId: user.id });
  };

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Recommended for You
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={generateRecommendations}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 animate-pulse" /> Generating...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Refresh
              </span>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="text-center py-4">
            <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">No recommendations yet.</p>
            <Button size="sm" variant="outline" className="text-xs" onClick={generateRecommendations} disabled={isGenerating}>
              Generate Recommendations
            </Button>
          </div>
        ) : (
          recommendations.slice(0, 5).map((rec: any) => {
            const Icon = TYPE_ICONS[rec.recommendation_type] || Sparkles;
            const [title, ...reasonParts] = (rec.reason || "").split(": ");
            const reason = reasonParts.join(": ");

            return (
              <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1">{title}</h4>
                  {reason && <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{reason}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{rec.recommendation_type?.replace(/_/g, " ")}</Badge>
                    <span className="text-[10px] text-muted-foreground">{Math.round(rec.relevance_score)}% match</span>
                    <WhySeeingThis
                      model="Gemini 2.5 Flash · LXP recommender v1"
                      rationale={reason || "Matched against your recent activity, enrolled programmes and skill gaps."}
                      signals={[
                        { label: "Type", value: String(rec.recommendation_type || "—").replace(/_/g, " ") },
                        { label: "Source", value: rec.source || "Learning history + profile" },
                      ]}
                      score={rec.relevance_score}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(rec.id)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
