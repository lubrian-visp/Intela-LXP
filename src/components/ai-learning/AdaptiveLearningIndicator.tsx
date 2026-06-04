import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Brain, Lock, TrendingUp, RotateCcw } from "lucide-react";

const ACTION_ICONS: Record<string, typeof Brain> = {
  restrict_ai: AlertTriangle,
  lock_ai: Lock,
  enhance_reflection: RotateCcw,
  escalate_difficulty: TrendingUp,
  retry_reflection: RotateCcw,
};

const ACTION_COLOURS: Record<string, string> = {
  restrict_ai: "bg-warning/15 text-warning border-warning/30",
  lock_ai: "bg-destructive/15 text-destructive border-destructive/30",
  enhance_reflection: "bg-info/15 text-info border-info/30",
  escalate_difficulty: "bg-primary/15 text-primary border-primary/30",
  retry_reflection: "bg-warning/15 text-warning border-warning/30",
};

interface AdaptiveLearningIndicatorProps {
  contentBlockId?: string;
  assessmentId?: string;
}

export default function AdaptiveLearningIndicator({ contentBlockId, assessmentId }: AdaptiveLearningIndicatorProps) {
  const { user } = useAuth();

  const { data: adaptations } = useQuery({
    queryKey: ["adaptive-evaluation", user?.id],
    enabled: !!user,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-adaptive-engine", {
        body: { action: "evaluate", learner_id: user!.id },
      });
      if (error) throw error;
      return data;
    },
  });

  const actions = adaptations?.actions || [];

  if (actions.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action: any, i: number) => {
          const Icon = ACTION_ICONS[action.action_type] || Brain;
          const colourClass = ACTION_COLOURS[action.action_type] || "bg-muted text-muted-foreground border-border";

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 gap-1 cursor-help border ${colourClass}`}
                >
                  <Icon className="w-3 h-3" />
                  {action.action_type === "restrict_ai" && "AI Restricted"}
                  {action.action_type === "lock_ai" && "AI Locked"}
                  {action.action_type === "enhance_reflection" && "Extra Reflection"}
                  {action.action_type === "escalate_difficulty" && "Difficulty ↑"}
                  {action.action_type === "retry_reflection" && "Reflection Retry"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                <p className="font-medium">{action.rule_name}</p>
                <p className="mt-1 text-muted-foreground">{action.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {action.triggered_metric}: {action.triggered_value}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
