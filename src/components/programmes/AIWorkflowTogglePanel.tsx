import { useState, useEffect } from "react";
import { Brain, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AIWorkflowTogglePanelProps {
  programmeId: string;
}

export default function AIWorkflowTogglePanel({ programmeId }: AIWorkflowTogglePanelProps) {
  const { user, roles } = useAuth();
  const qc = useQueryClient();

  // Restrict to operations, super_admin, systems_admin
  const allowedRoles = ["super_admin", "operations", "systems_admin"];
  const hasAccess = roles?.some((r: string) => allowedRoles.includes(r));

  // Get current programme setting
  const { data: programme, isLoading } = useQuery({
    queryKey: ["programme-ai-workflow", programmeId],
    enabled: !!programmeId && !!hasAccess,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("programmes")
        .select("id, title, ai_workflow_enabled")
        .eq("id", programmeId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; title: string; ai_workflow_enabled: boolean | null } | null;
    },
  });

  // Get global setting
  const { data: globalEnabled } = useQuery({
    queryKey: ["ai-workflow-global-flag"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("feature_flags")
        .select("is_enabled")
        .eq("flag_key", "ai_learning_workflow")
        .maybeSingle();
      return (data as any)?.is_enabled ?? true;
    },
  });

  const [localValue, setLocalValue] = useState<string>("inherit");

  useEffect(() => {
    if (programme) {
      setLocalValue(
        programme.ai_workflow_enabled === null ? "inherit" :
        programme.ai_workflow_enabled ? "enabled" : "disabled"
      );
    }
  }, [programme]);

  const updateSetting = useMutation({
    mutationFn: async (value: string) => {
      const dbValue = value === "inherit" ? null : value === "enabled";
      const { error } = await (supabase as any)
        .from("programmes")
        .update({ ai_workflow_enabled: dbValue })
        .eq("id", programmeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-ai-workflow", programmeId] });
      qc.invalidateQueries({ queryKey: ["ai-workflow-enabled"] });
      toast.success("AI workflow setting updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update setting"),
  });

  if (!hasAccess) return null;
  if (isLoading) return null;

  const effectiveState = localValue === "inherit"
    ? (globalEnabled ? "Enabled (global)" : "Disabled (global)")
    : localValue === "enabled" ? "Enabled (override)" : "Disabled (override)";

  const isDirty = programme && (
    (programme.ai_workflow_enabled === null ? "inherit" :
     programme.ai_workflow_enabled ? "enabled" : "disabled") !== localValue
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-4 h-4 text-primary" />
          AI Learning Workflow
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">Controls the 3-phase AI-controlled learning workflow for this programme. "Inherit" uses the global platform setting.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs min-w-[80px]">AI Workflow</Label>
          <Select value={localValue} onValueChange={setLocalValue}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit" className="text-xs">Inherit Global</SelectItem>
              <SelectItem value="enabled" className="text-xs">Enabled</SelectItem>
              <SelectItem value="disabled" className="text-xs">Disabled</SelectItem>
            </SelectContent>
          </Select>
          {isDirty && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => updateSetting.mutate(localValue)}
              disabled={updateSetting.isPending}
            >
              Save
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={effectiveState.includes("Enabled") ? "default" : "secondary"} className="text-xs">
            {effectiveState}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
