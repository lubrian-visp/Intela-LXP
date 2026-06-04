import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── SLA & Escalation Checks ──

export interface OverdueStep {
  stepInstanceId: string;
  instanceId: string;
  stepName: string;
  stepType: string;
  assignedRole: string | null;
  assignedTo: string | null;
  startedAt: string;
  timeoutHours: number;
  hoursElapsed: number;
  onTimeoutAction: string;
  entityType: string;
  entityId: string;
  templateName: string;
}

export function useOverdueSteps() {
  return useQuery({
    queryKey: ["workflow_overdue_steps"],
    refetchInterval: 60_000, // check every minute
    queryFn: async () => {
      // Get all in-progress step instances
      const { data: activeSteps, error } = await supabase
        .from("workflow_step_instances")
        .select("*, workflow_steps(step_name, step_type, config, step_order)")
        .eq("status", "in_progress")
        .not("started_at", "is", null);

      if (error) throw error;
      if (!activeSteps?.length) return [];

      const overdueSteps: OverdueStep[] = [];
      const now = Date.now();

      for (const si of activeSteps) {
        const config = ((si.workflow_steps as any)?.config || {}) as any;
        const timeoutHours = config.timeout_hours;
        if (!timeoutHours || !si.started_at) continue;

        const startedAt = new Date(si.started_at).getTime();
        const hoursElapsed = (now - startedAt) / (1000 * 60 * 60);

        if (hoursElapsed >= timeoutHours) {
          // Get instance info
          const { data: inst } = await supabase
            .from("workflow_instances")
            .select("entity_type, entity_id, workflow_templates(name)")
            .eq("id", si.instance_id)
            .maybeSingle();

          overdueSteps.push({
            stepInstanceId: si.id,
            instanceId: si.instance_id,
            stepName: (si.workflow_steps as any)?.step_name || "Unknown",
            stepType: (si.workflow_steps as any)?.step_type || "unknown",
            assignedRole: si.assigned_role,
            assignedTo: si.assigned_to,
            startedAt: si.started_at,
            timeoutHours,
            hoursElapsed: Math.round(hoursElapsed * 10) / 10,
            onTimeoutAction: config.on_timeout_action || "escalate",
            entityType: inst?.entity_type || "",
            entityId: inst?.entity_id || "",
            templateName: (inst?.workflow_templates as any)?.name || "Workflow",
          });
        }
      }

      return overdueSteps;
    },
  });
}

export function useEscalateStep() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ stepInstanceId, action }: {
      stepInstanceId: string;
      action: "escalate" | "skip" | "fail";
    }) => {
      // Get step instance details
      const { data: si } = await supabase
        .from("workflow_step_instances")
        .select("*, workflow_steps(step_name)")
        .eq("id", stepInstanceId)
        .single();

      if (!si) throw new Error("Step instance not found");

      if (action === "skip") {
        // Mark as skipped and advance
        await supabase
          .from("workflow_step_instances")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by: user?.id || null,
            outcome: "skipped",
            result_data: { reason: "SLA timeout - skipped" },
          })
          .eq("id", stepInstanceId);
      } else if (action === "fail") {
        await supabase
          .from("workflow_step_instances")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            result_data: { reason: "SLA timeout - failed" },
          })
          .eq("id", stepInstanceId);

        // Also fail the instance
        await supabase
          .from("workflow_instances")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", si.instance_id);
      } else {
        // Escalate: reassign to super_admin and notify delegator if applicable
        const previousRole = si.assigned_role;

        await supabase
          .from("workflow_step_instances")
          .update({
            assigned_role: "super_admin",
            result_data: {
              escalated: true,
              previous_role: previousRole,
              escalation_reason: "SLA timeout",
            },
          })
          .eq("id", stepInstanceId);

        // If the original assignee was delegated, notify the delegator
        if (si.assigned_to) {
          const { data: delegation } = await supabase
            .from("delegated_approvers")
            .select("assigned_by")
            .eq("delegated_user_id", si.assigned_to)
            .eq("is_active", true)
            .maybeSingle();

          if (delegation?.assigned_by) {
            await supabase.from("notifications" as any).insert({
              user_id: delegation.assigned_by,
              title: `Delegation Escalation: ${(si.workflow_steps as any)?.step_name}`,
              body: `A step assigned to your delegate has exceeded its SLA and been escalated to Super Admin.`,
              category: "approval",
            });
          }
        }

        // General escalation notification
        await supabase.from("notifications" as any).insert({
          user_id: user?.id,
          title: `Workflow Escalated: ${(si.workflow_steps as any)?.step_name}`,
          body: `Step has exceeded its SLA timeout and has been escalated to Super Admin.`,
          category: "approval",
        });
      }

      // Audit log
      await supabase.from("workflow_audit_log").insert({
        instance_id: si.instance_id,
        step_instance_id: stepInstanceId,
        action: `sla_${action}`,
        performed_by: user?.id || null,
        details: { action, step_name: (si.workflow_steps as any)?.step_name },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_overdue_steps"] });
      qc.invalidateQueries({ queryKey: ["workflow_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_step_instances"] });
    },
  });
}

// ── Workflow Analytics Queries ──

export function useWorkflowAnalytics() {
  return useQuery({
    queryKey: ["workflow_analytics"],
    queryFn: async () => {
      // Get all instances
      const { data: instances } = await supabase
        .from("workflow_instances")
        .select("id, status, entity_type, created_at, completed_at, started_at, template_id, workflow_templates(name)")
        .order("created_at", { ascending: false })
        .limit(500);

      // Get all step instances for completion time analysis
      const { data: stepInstances } = await supabase
        .from("workflow_step_instances")
        .select("id, status, started_at, completed_at, assigned_role, outcome, step_id, instance_id, workflow_steps(step_name, step_type)")
        .limit(1000);

      const allInst = instances || [];
      const allSteps = stepInstances || [];

      // Status counts
      const statusCounts: Record<string, number> = {};
      allInst.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });

      // Entity type counts
      const entityCounts: Record<string, number> = {};
      allInst.forEach(i => { entityCounts[i.entity_type] = (entityCounts[i.entity_type] || 0) + 1; });

      // Average completion time (hours) for completed instances
      const completedInstances = allInst.filter(i => i.status === "completed" && i.completed_at && i.started_at);
      const avgCompletionHours = completedInstances.length
        ? completedInstances.reduce((sum, i) => {
            const hrs = (new Date(i.completed_at!).getTime() - new Date(i.started_at).getTime()) / (1000 * 60 * 60);
            return sum + hrs;
          }, 0) / completedInstances.length
        : 0;

      // Step outcome distribution
      const outcomeCounts: Record<string, number> = {};
      allSteps.filter(s => s.outcome).forEach(s => {
        outcomeCounts[s.outcome!] = (outcomeCounts[s.outcome!] || 0) + 1;
      });

      // Monthly trend (last 6 months)
      const monthlyTrend: { month: string; started: number; completed: number; failed: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
        const started = allInst.filter(inst => inst.created_at.startsWith(monthKey)).length;
        const completed = allInst.filter(inst => inst.status === "completed" && inst.completed_at?.startsWith(monthKey)).length;
        const failed = allInst.filter(inst => inst.status === "failed" && inst.completed_at?.startsWith(monthKey)).length;
        monthlyTrend.push({ month: label, started, completed, failed });
      }

      // Top bottleneck steps (longest average time)
      const stepTimes: Record<string, { total: number; count: number; name: string }> = {};
      allSteps.filter(s => s.started_at && s.completed_at).forEach(s => {
        const name = (s.workflow_steps as any)?.step_name || s.step_id;
        const hrs = (new Date(s.completed_at!).getTime() - new Date(s.started_at!).getTime()) / (1000 * 60 * 60);
        if (!stepTimes[name]) stepTimes[name] = { total: 0, count: 0, name };
        stepTimes[name].total += hrs;
        stepTimes[name].count += 1;
      });
      const bottlenecks = Object.values(stepTimes)
        .map(s => ({ name: s.name, avgHours: Math.round((s.total / s.count) * 10) / 10, count: s.count }))
        .sort((a, b) => b.avgHours - a.avgHours)
        .slice(0, 5);

      return {
        totalInstances: allInst.length,
        statusCounts,
        entityCounts,
        avgCompletionHours: Math.round(avgCompletionHours * 10) / 10,
        outcomeCounts,
        monthlyTrend,
        bottlenecks,
        completionRate: allInst.length ? Math.round((completedInstances.length / allInst.length) * 100) : 0,
      };
    },
  });
}
