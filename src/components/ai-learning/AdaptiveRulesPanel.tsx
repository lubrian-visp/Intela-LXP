import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Save, TrendingUp, AlertTriangle, Lock, RotateCcw } from "lucide-react";

const METRIC_LABELS: Record<string, string> = {
  ai_dependency_score: "AI Dependency Score (ADS)",
  decision_quality_score: "Decision Quality Score (DQS)",
  reflection_depth_score: "Reflection Depth Score (RDS)",
  composite_score: "Composite Score",
  attempt_quality_score: "Attempt Quality Score",
};

const OPERATOR_LABELS: Record<string, string> = {
  gte: "≥ (greater or equal)",
  gt: "> (greater than)",
  lte: "≤ (less or equal)",
  lt: "< (less than)",
  eq: "= (equal)",
};

const ACTION_LABELS: Record<string, { label: string; icon: typeof Brain }> = {
  restrict_ai: { label: "Restrict AI Access", icon: AlertTriangle },
  lock_ai: { label: "Lock AI Entirely", icon: Lock },
  enhance_reflection: { label: "Enhance Reflection Requirements", icon: RotateCcw },
  escalate_difficulty: { label: "Escalate Difficulty", icon: TrendingUp },
  retry_reflection: { label: "Require Reflection Retry", icon: RotateCcw },
};

export default function AdaptiveRulesPanel() {
  const qc = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["adaptive-rules-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_adaptive_rules" as any)
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const [editValues, setEditValues] = useState<Record<string, Record<string, any>>>({});

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("ai_adaptive_rules" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive-rules-admin"] });
      toast.success("Rule updated");
    },
    onError: () => toast.error("Failed to update rule"),
  });

  const toggleActive = (id: string, currentActive: boolean) => {
    updateRule.mutate({ id, updates: { is_active: !currentActive } });
  };

  const getEditValue = (ruleId: string, field: string, fallback: any) => {
    return editValues[ruleId]?.[field] ?? fallback;
  };

  const setEditValue = (ruleId: string, field: string, value: any) => {
    setEditValues((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value },
    }));
  };

  const saveRuleEdits = (rule: any) => {
    const edits = editValues[rule.id];
    if (!edits) return;

    const updates: Record<string, any> = {};
    if (edits.condition_threshold != null) updates.condition_threshold = Number(edits.condition_threshold);
    if (edits.condition_operator != null) updates.condition_operator = edits.condition_operator;
    if (edits.priority != null) updates.priority = Number(edits.priority);

    updateRule.mutate({ id: rule.id, updates });
    setEditValues((prev) => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-primary" />
          Adaptive Learning Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Configure rules that automatically adapt the learning experience based on learner performance metrics.
          Rules are evaluated against the average of a learner's last 5 completed attempts.
        </p>

        <div className="space-y-3">
          {rules.map((rule: any) => {
            const actionMeta = ACTION_LABELS[rule.action_type] || { label: rule.action_type, icon: Brain };
            const ActionIcon = actionMeta.icon;
            const hasEdits = !!editValues[rule.id];

            return (
              <div key={rule.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ActionIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{rule.rule_name}</span>
                    <Badge variant="outline" className="text-[10px]">{actionMeta.label}</Badge>
                  </div>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => toggleActive(rule.id, rule.is_active)}
                  />
                </div>

                {rule.description && (
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Metric</Label>
                    <p className="text-xs font-medium">{METRIC_LABELS[rule.condition_metric] || rule.condition_metric}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Operator</Label>
                    <Select
                      value={getEditValue(rule.id, "condition_operator", rule.condition_operator)}
                      onValueChange={(v) => setEditValue(rule.id, "condition_operator", v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      <Label className="text-[10px] text-muted-foreground">Threshold</Label>
                      <Input
                        type="number"
                        value={getEditValue(rule.id, "condition_threshold", rule.condition_threshold)}
                        onChange={(e) => setEditValue(rule.id, "condition_threshold", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    {hasEdits && (
                      <Button size="sm" variant="outline" className="h-7 text-xs mt-3.5" onClick={() => saveRuleEdits(rule)}>
                        <Save className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <p className="text-[10px] text-muted-foreground">
          Rules are evaluated in priority order (lowest number first). When multiple rules trigger,
          their actions are merged. More restrictive actions take precedence.
        </p>
      </CardContent>
    </Card>
  );
}
