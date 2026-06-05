import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RubricBreakdownProps {
  submissionId: string;
}

function useRubricScoresForSubmission(submissionId: string) {
  return useQuery({
    queryKey: ["rubric_scores_submission", submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("rubric_scores")
        .select(`
          score, feedback,
          criterion:rubric_criteria(id, criterion_name, description, max_points, performance_levels),
          rubric:rubrics(id, name)
        `)
        .eq("submission_id", submissionId)
        .order("criterion(sequence_order)");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export default function RubricBreakdown({ submissionId }: RubricBreakdownProps) {
  const { data: scores = [], isLoading } = useRubricScoresForSubmission(submissionId);

  if (isLoading) return (
    <div className="space-y-2 mt-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
    </div>
  );

  if (scores.length === 0) return null;

  const rubricName = scores[0]?.rubric?.name;
  const total      = scores.reduce((s: number, r: any) => s + (r.score ?? 0), 0);
  const maxTotal   = scores.reduce((s: number, r: any) => s + (r.criterion?.max_points ?? 0), 0);
  const pct        = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  return (
    <div className="mt-3 rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">
            Rubric: {rubricName}
          </span>
        </div>
        <span className={cn(
          "text-[11px] font-bold",
          pct >= 75 ? "text-green-600" : pct >= 50 ? "text-orange-500" : "text-rose-500"
        )}>
          {total}/{maxTotal} ({pct}%)
        </span>
      </div>
      <div className="divide-y divide-border/20">
        {scores.map((rs: any, i: number) => {
          const crit    = rs.criterion;
          const score   = rs.score ?? 0;
          const max     = crit?.max_points ?? 0;
          const cpct    = max > 0 ? Math.round((score / max) * 100) : 0;
          return (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <p className="text-[12px] font-medium text-foreground">{crit?.criterion_name}</p>
                  {crit?.description && (
                    <p className="text-[10px] text-muted-foreground">{crit.description}</p>
                  )}
                </div>
                <span className={cn(
                  "text-[11px] font-bold shrink-0",
                  cpct >= 75 ? "text-green-600" : cpct >= 50 ? "text-orange-500" : "text-rose-500"
                )}>
                  {score}/{max}
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full",
                    cpct >= 75 ? "bg-green-500" : cpct >= 50 ? "bg-orange-400" : "bg-rose-500"
                  )}
                  style={{ width: `${cpct}%` }}
                />
              </div>
              {rs.feedback && (
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">"{rs.feedback}"</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
