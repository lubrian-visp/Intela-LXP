import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Settings2, Save } from "lucide-react";

export default function AIWorkflowSettingsPanel() {
  const qc = useQueryClient();

  const { data: featureFlag } = useQuery({
    queryKey: ["feature-flag-ai-workflow"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_flags" as any)
        .select("*")
        .eq("flag_key", "ai_learning_workflow")
        .maybeSingle();
      return data as any;
    },
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["ai-scoring-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_scoring_config" as any)
        .select("*")
        .order("config_key");
      if (error) throw error;
      return data as any[];
    },
  });

  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const toggleFeature = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("feature_flags" as any)
        .update({ is_enabled: enabled })
        .eq("flag_key", "ai_learning_workflow");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature-flag-ai-workflow"] });
      toast.success("AI Learning Workflow " + (featureFlag?.is_enabled ? "disabled" : "enabled"));
    },
    onError: () => toast.error("Failed to toggle feature"),
  });

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("ai_scoring_config" as any)
        .update({ config_value: value })
        .eq("config_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-scoring-config"] });
      toast.success("Configuration updated");
    },
    onError: () => toast.error("Failed to update configuration"),
  });

  const getValue = (key: string) => {
    if (localValues[key] !== undefined) return localValues[key];
    const cfg = configs?.find((c: any) => c.config_key === key);
    if (!cfg) return "";
    try { return JSON.parse(cfg.config_value); } catch { return cfg.config_value; }
  };

  const handleSave = (key: string) => {
    const val = localValues[key];
    if (val === undefined) return;
    const formatted = isNaN(Number(val)) ? JSON.stringify(val) : val;
    updateConfig.mutate({ key, value: formatted });
    setLocalValues((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const CONFIG_LABELS: Record<string, { label: string; type: "number" | "select" | "text"; options?: string[] }> = {
    phase_gate_min_time_seconds: { label: "Minimum Time Before AI Unlock (seconds)", type: "number" },
    phase_gate_min_quality_score: { label: "Minimum Quality Score to Unlock AI (0-100)", type: "number" },
    phase_gate_quality_or_time: { label: "Gate Mode", type: "select", options: ["either", "both", "time_only", "quality_only"] },
    max_ai_interactions: { label: "Maximum AI Interactions Per Attempt", type: "number" },
    min_reflection_score: { label: "Minimum Reflection Score to Complete (0-100)", type: "number" },
    ads_weight: { label: "AI Dependency Score Weight", type: "number" },
    dqs_weight: { label: "Decision Quality Score Weight", type: "number" },
    rds_weight: { label: "Reflection Depth Score Weight", type: "number" },
    token_expiry_minutes: { label: "AI Token Expiry (minutes)", type: "number" },
    token_max_usage: { label: "AI Token Max Usage Count", type: "number" },
    rapid_fire_cooldown_seconds: { label: "Rapid-Fire Cooldown (seconds)", type: "number" },
    ai_model: { label: "AI Model", type: "select", options: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro", "openai/gpt-5-mini", "openai/gpt-5-nano"] },
    quality_word_weight: { label: "Quality: Word Weight (points per word)", type: "number" },
    quality_paragraph_bonus: { label: "Quality: Paragraph Bonus Points", type: "number" },
    quality_structure_bonus: { label: "Quality: Structure Bonus Points", type: "number" },
    quality_structure_min_length: { label: "Quality: Min Length for Structure Bonus", type: "number" },
    reflection_min_word_count: { label: "Reflection Minimum Word Count", type: "number" },
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-primary" />
          AI Learning Workflow Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Kill switch */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="text-sm font-medium">Enable AI Learning Workflow</p>
            <p className="text-xs text-muted-foreground">Toggle the 3-phase AI-controlled learning system globally</p>
          </div>
          <Switch
            checked={featureFlag?.is_enabled ?? true}
            onCheckedChange={(checked) => toggleFeature.mutate(checked)}
          />
        </div>

        <Separator />

        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">Phase Gating & Scoring Configuration</p>
        </div>

        <div className="grid gap-3">
          {Object.entries(CONFIG_LABELS).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="text-xs flex-1 min-w-[200px]">{meta.label}</Label>
              {meta.type === "select" ? (
                <Select
                  value={String(getValue(key))}
                  onValueChange={(v) => {
                    setLocalValues((p) => ({ ...p, [key]: v }));
                  }}
                >
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meta.options?.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  value={String(getValue(key))}
                  onChange={(e) => setLocalValues((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-28 h-8 text-xs"
                />
              )}
              {localValues[key] !== undefined && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleSave(key)}>
                  <Save className="w-3 h-3 mr-1" /> Save
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Note: Score weights (ADS + DQS + RDS) should sum to 1.0 for accurate composite scoring.
        </p>
      </CardContent>
    </Card>
  );
}
