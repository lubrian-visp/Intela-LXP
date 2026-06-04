import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import WhySeeingThis from "@/components/ai/WhySeeingThis";

interface Recommendation {
  project_id: string;
  reason: string;
  project: {
    id: string;
    title: string;
    description: string | null;
    required_skills: string[];
    agile_framework: string;
    payment_model: string;
    project_model: string;
  };
}

export default function WbtRecommendationsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRecommendations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wbt-recommendations", {
        body: { learner_id: user.id },
      });
      if (error) throw error;
      setRecommendations(data?.recommendations || []);
      setFetched(true);
      if ((data?.recommendations || []).length === 0) {
        toast({ title: "No recommendations", description: data?.message || "No matching projects found." });
      }
    } catch (err: any) {
      toast({ title: "Failed to fetch recommendations", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          AI Project Recommendations
        </CardTitle>
        <Button size="sm" variant="outline" onClick={fetchRecommendations} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {fetched ? "Refresh" : "Get Recommendations"}
        </Button>
      </CardHeader>
      <CardContent>
        {!fetched && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click the button above to get AI-powered project recommendations based on your profile.
          </p>
        )}
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analysing your profile...</span>
          </div>
        )}
        {fetched && recommendations.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">No recommendations available right now.</p>
        )}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={rec.project_id}
                className="p-3 rounded-lg border border-border hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/wbt/project/${rec.project_id}`)}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-medium text-foreground text-sm">{rec.project?.title}</h4>
                  <Badge variant="secondary" className="text-xs">#{i + 1}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
                <div className="flex gap-1 flex-wrap items-center">
                  {rec.project?.required_skills?.slice(0, 4).map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                  <Badge variant="secondary" className="text-xs">{rec.project?.agile_framework}</Badge>
                  <span onClick={(e) => e.stopPropagation()} className="ml-auto">
                    <WhySeeingThis
                      model="Gemini 2.5 Flash · WBT matcher v1"
                      rationale={rec.reason || "Matched against your declared skills and agile framework preferences."}
                      signals={[
                        { label: "Framework", value: rec.project?.agile_framework || "—" },
                        { label: "Skills matched", value: (rec.project?.required_skills || []).slice(0, 3).join(", ") || "—" },
                        { label: "Payment model", value: rec.project?.payment_model || "—" },
                      ]}
                    />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
