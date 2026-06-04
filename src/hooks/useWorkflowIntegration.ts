import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { EntityType, TriggerEvent } from "@/hooks/useWorkflowEngine";

/**
 * Resolves the best-matching workflow template for an entity event.
 * Priority: programme/cohort-scoped override → global default → any active global template.
 */
export function useResolveWorkflowTemplate(entityType?: EntityType, scopeId?: string) {
  return useQuery({
    queryKey: ["workflow_template_resolved", entityType, scopeId],
    enabled: !!entityType,
    queryFn: async () => {
      // Try scoped override first
      if (scopeId) {
        const { data: scoped } = await supabase
          .from("workflow_templates")
          .select("*")
          .eq("entity_type", entityType!)
          .eq("is_active", true)
          .eq("scope_id", scopeId)
          .limit(1)
          .maybeSingle();
        if (scoped) return scoped;
      }

      // Fall back to default global template
      const { data: defaultTemplate } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("entity_type", entityType!)
        .eq("is_active", true)
        .eq("scope_type", "global")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      if (defaultTemplate) return defaultTemplate;

      // Fall back to any active global template
      const { data: anyGlobal } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("entity_type", entityType!)
        .eq("is_active", true)
        .eq("scope_type", "global")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return anyGlobal || null;
    },
    staleTime: 60_000,
  });
}

/**
 * Gets the active workflow instance for a specific entity.
 */
export function useEntityWorkflowInstance(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ["workflow_instance_for_entity", entityType, entityId],
    enabled: !!entityType && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_instances")
        .select("*, workflow_templates(name, entity_type), workflow_step_instances(*, workflow_steps(step_name, step_type, step_order, config))")
        .eq("entity_type", entityType!)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Auto-starts a workflow for an entity when triggered by a lifecycle event.
 * Resolves the correct template, creates instance + step instances.
 */
export function useAutoStartWorkflow() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      triggerEvent,
      scopeId,
      metadata,
    }: {
      entityType: EntityType;
      entityId: string;
      triggerEvent: TriggerEvent;
      scopeId?: string;
      metadata?: Record<string, any>;
    }) => {
      // Check if there's already an active workflow for this entity
      const { data: existing } = await supabase
        .from("workflow_instances")
        .select("id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "active")
        .limit(1);

      if (existing?.length) {
        // Already has an active workflow, skip
        return null;
      }

      // Resolve template
      let template: any = null;

      if (scopeId) {
        const { data: scoped } = await supabase
          .from("workflow_templates")
          .select("*")
          .eq("entity_type", entityType)
          .eq("is_active", true)
          .eq("trigger_event", triggerEvent)
          .eq("scope_id", scopeId)
          .limit(1)
          .maybeSingle();
        template = scoped;
      }

      if (!template) {
        const { data: global } = await supabase
          .from("workflow_templates")
          .select("*")
          .eq("entity_type", entityType)
          .eq("is_active", true)
          .eq("trigger_event", triggerEvent)
          .eq("scope_type", "global")
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();
        template = global;
      }

      if (!template) return null; // No matching template

      // Get steps
      const { data: steps } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("template_id", template.id)
        .order("step_order");

      if (!steps?.length) return null; // Template has no steps

      // Create instance
      const { data: instance, error: instErr } = await supabase
        .from("workflow_instances")
        .insert({
          template_id: template.id,
          entity_type: entityType,
          entity_id: entityId,
          current_step_id: steps[0].id,
          status: "active",
          started_by: user?.id || null,
          metadata: metadata || {},
        })
        .select()
        .single();
      if (instErr) throw instErr;

      // Create step instances
      const stepInstances = steps.map((s: any, i: number) => ({
        instance_id: instance.id,
        step_id: s.id,
        status: i === 0 ? "in_progress" : "pending",
        assigned_to: (s.config as any)?.assignee_user_id || null,
        assigned_role: (s.config as any)?.assignee_role || null,
        started_at: i === 0 ? new Date().toISOString() : null,
      }));

      await supabase.from("workflow_step_instances").insert(stepInstances);

      // Audit
      await supabase.from("workflow_audit_log").insert({
        instance_id: instance.id,
        action: "auto_started",
        performed_by: user?.id || null,
        details: {
          template_id: template.id,
          template_name: template.name,
          entity_type: entityType,
          entity_id: entityId,
          trigger_event: triggerEvent,
        },
      });

      return instance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_step_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_instance_for_entity"] });
    },
  });
}

/**
 * Cancels an active workflow instance.
 */
export function useCancelWorkflow() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ instanceId, reason }: { instanceId: string; reason?: string }) => {
      const { error } = await supabase
        .from("workflow_instances")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", instanceId);
      if (error) throw error;

      // Cancel all pending step instances
      await supabase
        .from("workflow_step_instances")
        .update({ status: "skipped" })
        .eq("instance_id", instanceId)
        .in("status", ["pending", "in_progress"]);

      // Audit
      await supabase.from("workflow_audit_log").insert({
        instance_id: instanceId,
        action: "workflow_cancelled",
        performed_by: user?.id || null,
        details: { reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_step_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_instance_for_entity"] });
    },
  });
}
