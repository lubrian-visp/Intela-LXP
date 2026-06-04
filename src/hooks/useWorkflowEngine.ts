import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──
export interface WorkflowStepConfig {
  assignee_role?: string;
  assignee_user_id?: string;
  action?: string; // update_status, send_notification, assign_cohort, generate_credential
  target_status?: string;
  condition_field?: string;
  condition_operator?: string; // equals, not_equals, greater_than, less_than, contains
  condition_value?: string;
  timeout_hours?: number;
  on_timeout_action?: string; // escalate, skip, fail
  notification_template?: string;
  required_reason?: boolean;
}

export type StepType = "approval" | "notification" | "auto_action" | "condition" | "manual_task";
export type EntityType = "learner_registration" | "programme" | "assessment_submission" | "staff_registration";
export type TriggerEvent = "on_create" | "on_status_change" | "manual";

// ── Workflow Templates ──
export function useWorkflowTemplates(entityType?: EntityType) {
  return useQuery({
    queryKey: ["workflow_templates", entityType],
    queryFn: async () => {
      let q = supabase
        .from("workflow_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (entityType) q = q.eq("entity_type", entityType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkflowTemplate(id?: string) {
  return useQuery({
    queryKey: ["workflow_template", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWorkflowTemplate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      entity_type: string;
      trigger_event: string;
      scope_type?: string;
      scope_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .insert({ ...input, created_by: user?.id || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_templates"] }),
  });
}

export function useUpdateWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_templates"] }),
  });
}

export function useDeleteWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_templates"] }),
  });
}

// ── Workflow Steps ──
export function useWorkflowSteps(templateId?: string) {
  return useQuery({
    queryKey: ["workflow_steps", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("template_id", templateId!)
        .order("step_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      template_id: string;
      step_name: string;
      step_type: string;
      step_order: number;
      config?: WorkflowStepConfig;
      is_required?: boolean;
    }) => {
      const row: any = { ...input, config: input.config || {} };
      const { data, error } = await supabase
        .from("workflow_steps")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["workflow_steps", vars.template_id] }),
  });
}

export function useUpdateWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; template_id?: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("workflow_steps")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow_steps"] }),
  });
}

export function useDeleteWorkflowStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase.from("workflow_steps").delete().eq("id", id);
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => qc.invalidateQueries({ queryKey: ["workflow_steps", templateId] }),
  });
}

// ── Workflow Instances ──
export function useWorkflowInstances(filters?: { entity_type?: string; status?: string }) {
  return useQuery({
    queryKey: ["workflow_instances", filters],
    queryFn: async () => {
      let q = supabase
        .from("workflow_instances")
        .select("*, workflow_templates(name, entity_type)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filters?.entity_type) q = q.eq("entity_type", filters.entity_type);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkflowStepInstances(instanceId?: string) {
  return useQuery({
    queryKey: ["workflow_step_instances", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_step_instances")
        .select("*, workflow_steps(step_name, step_type, step_order, config)")
        .eq("instance_id", instanceId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

// ── Start a workflow ──
export function useStartWorkflow() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ templateId, entityType, entityId, metadata }: {
      templateId: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
    }) => {
      // Get first step
      const { data: steps } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("template_id", templateId)
        .order("step_order")
        .limit(1);

      const firstStep = steps?.[0];

      // Create instance
      const { data: instance, error: instErr } = await supabase
        .from("workflow_instances")
        .insert({
          template_id: templateId,
          entity_type: entityType,
          entity_id: entityId,
          current_step_id: firstStep?.id || null,
          status: "active",
          started_by: user?.id || null,
          metadata: metadata || {},
        })
        .select()
        .single();
      if (instErr) throw instErr;

      // Create step instances for all steps
      const { data: allSteps } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("template_id", templateId)
        .order("step_order");

      if (allSteps?.length) {
        const stepInstances = allSteps.map((s, i) => ({
          instance_id: instance.id,
          step_id: s.id,
          status: i === 0 ? "in_progress" : "pending",
          assigned_to: (s.config as any)?.assignee_user_id || null,
          assigned_role: (s.config as any)?.assignee_role || null,
          started_at: i === 0 ? new Date().toISOString() : null,
        }));

        await supabase.from("workflow_step_instances").insert(stepInstances);
      }

      // Audit
      await supabase.from("workflow_audit_log").insert({
        instance_id: instance.id,
        action: "workflow_started",
        performed_by: user?.id || null,
        details: { template_id: templateId, entity_type: entityType, entity_id: entityId },
      });

      return instance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_step_instances"] });
    },
  });
}

// ── Auto-execute engine for non-human steps ──
async function autoExecuteStep(
  instanceId: string,
  stepInstanceId: string,
  stepDef: any,
  entityType: string,
  entityId: string,
  userId: string | null
): Promise<void> {
  const config = (stepDef.config || {}) as WorkflowStepConfig;
  const stepType = stepDef.step_type;

  try {
    let outcome: string = "auto_completed";
    let resultData: Record<string, any> = {};

    if (stepType === "auto_action") {
      if (config.action === "update_status" && config.target_status) {
        // Determine table from entity type
        const tableMap: Record<string, string> = {
          learner_registration: "learner_registrations",
          programme: "programmes",
          assessment_submission: "assessment_submissions",
          staff_registration: "staff_registrations",
        };
        const table = tableMap[entityType];
        if (table) {
          const { error } = await supabase
            .from(table as any)
            .update({ status: config.target_status })
            .eq("id", entityId);
          resultData = { action: "update_status", target_status: config.target_status, success: !error };
        }
      } else if (config.action === "send_notification") {
        // Insert notification for relevant users
        await supabase.from("notifications" as any).insert({
          user_id: userId,
          title: `Workflow: ${stepDef.step_name}`,
          body: config.notification_template || "A workflow step has been completed.",
          category: "general",
          reference_table: entityType,
          reference_id: entityId,
        });
        resultData = { action: "send_notification" };
      } else if (config.action === "assign_cohort") {
        resultData = { action: "assign_cohort", note: "Cohort assignment triggered" };
      } else if (config.action === "generate_credential") {
        resultData = { action: "generate_credential", note: "Credential generation triggered" };
      }
    } else if (stepType === "notification") {
      // Fire notification and advance
      await supabase.from("notifications" as any).insert({
        user_id: userId,
        title: `Workflow Notification: ${stepDef.step_name}`,
        body: config.notification_template || "You have a workflow notification.",
        category: "general",
        reference_table: entityType,
        reference_id: entityId,
      });
      resultData = { type: "notification_sent" };
    } else if (stepType === "condition") {
      // Evaluate condition
      const field = config.condition_field;
      const operator = config.condition_operator;
      const value = config.condition_value;

      if (field) {
        const tableMap: Record<string, string> = {
          learner_registration: "learner_registrations",
          programme: "programmes",
          assessment_submission: "assessment_submissions",
          staff_registration: "staff_registrations",
        };
        const table = tableMap[entityType];
        if (table) {
          const { data: entity } = await supabase
            .from(table as any)
            .select("*")
            .eq("id", entityId)
            .maybeSingle();

          if (entity) {
            const fieldValue = (entity as any)[field];
            let conditionMet = false;

            switch (operator) {
              case "equals": conditionMet = String(fieldValue) === String(value); break;
              case "not_equals": conditionMet = String(fieldValue) !== String(value); break;
              case "greater_than": conditionMet = Number(fieldValue) > Number(value); break;
              case "less_than": conditionMet = Number(fieldValue) < Number(value); break;
              case "contains": conditionMet = String(fieldValue).toLowerCase().includes(String(value).toLowerCase()); break;
              default: conditionMet = true;
            }

            outcome = conditionMet ? "approved" : "rejected";
            resultData = { condition: { field, operator, value, actual: fieldValue, met: conditionMet } };
          }
        }
      }
    }

    // Mark step as completed
    await supabase
      .from("workflow_step_instances")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: userId,
        outcome,
        result_data: resultData,
      })
      .eq("id", stepInstanceId);

    // Audit
    await supabase.from("workflow_audit_log").insert({
      instance_id: instanceId,
      step_instance_id: stepInstanceId,
      action: `auto_${stepType}_executed`,
      performed_by: userId,
      details: resultData,
    });

  } catch (err: any) {
    // Mark step as failed on error
    await supabase
      .from("workflow_step_instances")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        result_data: { error: err.message },
      })
      .eq("id", stepInstanceId);
  }
}

// Helper: advance to next step and auto-execute if non-human
async function advanceAndAutoExecute(
  instanceId: string,
  nextStepInstanceId: string,
  nextStepId: string,
  entityType: string,
  entityId: string,
  userId: string | null
): Promise<void> {
  // Get step definition
  const { data: stepDef } = await supabase
    .from("workflow_steps")
    .select("*")
    .eq("id", nextStepId)
    .maybeSingle();

  if (!stepDef) return;

  const isAutomatic = ["auto_action", "notification", "condition"].includes(stepDef.step_type);

  if (isAutomatic) {
    // Auto-execute immediately
    await autoExecuteStep(instanceId, nextStepInstanceId, stepDef, entityType, entityId, userId);

    // After auto-execution, find and advance to the next step recursively
    const outcome = stepDef.step_type === "condition" ? "approved" : "auto_completed";
    
    // Get the step instance to check the actual outcome
    const { data: executedStep } = await supabase
      .from("workflow_step_instances")
      .select("outcome")
      .eq("id", nextStepInstanceId)
      .maybeSingle();

    const actualOutcome = executedStep?.outcome || outcome;
    const branchStepId = actualOutcome === "rejected" 
      ? stepDef.next_step_on_reject 
      : stepDef.next_step_on_approve;

    if (branchStepId) {
      // Find the step instance for the branch target
      const { data: branchStepInst } = await supabase
        .from("workflow_step_instances")
        .select("id")
        .eq("instance_id", instanceId)
        .eq("step_id", branchStepId)
        .eq("status", "pending")
        .maybeSingle();

      if (branchStepInst) {
        await supabase
          .from("workflow_step_instances")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", branchStepInst.id);

        await supabase
          .from("workflow_instances")
          .update({ current_step_id: branchStepId })
          .eq("id", instanceId);

        // Recurse for chained auto-steps
        await advanceAndAutoExecute(instanceId, branchStepInst.id, branchStepId, entityType, entityId, userId);
      }
    } else {
      // Sequential: find next pending
      const { data: nextPending } = await supabase
        .from("workflow_step_instances")
        .select("id, step_id")
        .eq("instance_id", instanceId)
        .eq("status", "pending")
        .order("created_at")
        .limit(1);

      if (nextPending?.length) {
        await supabase
          .from("workflow_step_instances")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", nextPending[0].id);

        await supabase
          .from("workflow_instances")
          .update({ current_step_id: nextPending[0].step_id })
          .eq("id", instanceId);

        // Recurse
        await advanceAndAutoExecute(instanceId, nextPending[0].id, nextPending[0].step_id, entityType, entityId, userId);
      } else {
        // All done
        await supabase
          .from("workflow_instances")
          .update({ status: "completed", completed_at: new Date().toISOString(), current_step_id: null })
          .eq("id", instanceId);
      }
    }
  }
  // If not automatic, it stays "in_progress" waiting for human action
}

// ── Complete a step ──
export function useCompleteWorkflowStep() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ stepInstanceId, outcome, reason }: {
      stepInstanceId: string;
      outcome: "approved" | "rejected" | "returned" | "auto_completed";
      reason?: string;
    }) => {
      // Authorization check via DB function
      if (user?.id) {
        const { data: canAct } = await supabase.rpc("can_act_on_workflow_step", {
          _user_id: user.id,
          _step_instance_id: stepInstanceId,
        });
        if (!canAct) throw new Error("You do not have authority to act on this step. Check your role or delegation status.");
      }

      // Update step instance
      const { data: stepInst, error: stepErr } = await supabase
        .from("workflow_step_instances")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user?.id || null,
          outcome,
          reason,
        })
        .eq("id", stepInstanceId)
        .select("*, workflow_steps(step_order, next_step_on_approve, next_step_on_reject)")
        .single();
      if (stepErr) throw stepErr;

      const instanceId = stepInst.instance_id;

      // Get entity info from workflow instance
      const { data: instance } = await supabase
        .from("workflow_instances")
        .select("entity_type, entity_id")
        .eq("id", instanceId)
        .maybeSingle();

      // Determine next step
      const ws = stepInst.workflow_steps as any;
      const nextStepId = outcome === "rejected" ? ws?.next_step_on_reject : ws?.next_step_on_approve;

      if (nextStepId) {
        const { data: nextStepInst } = await supabase
          .from("workflow_step_instances")
          .select("id")
          .eq("instance_id", instanceId)
          .eq("step_id", nextStepId)
          .eq("status", "pending")
          .maybeSingle();

        if (nextStepInst) {
          await supabase
            .from("workflow_step_instances")
            .update({ status: "in_progress", started_at: new Date().toISOString() })
            .eq("id", nextStepInst.id);

          await supabase
            .from("workflow_instances")
            .update({ current_step_id: nextStepId })
            .eq("id", instanceId);

          // Auto-execute if non-human step
          if (instance) {
            await advanceAndAutoExecute(instanceId, nextStepInst.id, nextStepId, instance.entity_type, instance.entity_id, user?.id || null);
          }
        }
      } else {
        // Sequential: find next pending step
        const { data: nextPending } = await supabase
          .from("workflow_step_instances")
          .select("id, step_id")
          .eq("instance_id", instanceId)
          .eq("status", "pending")
          .order("created_at")
          .limit(1);

        if (nextPending?.length) {
          await supabase
            .from("workflow_step_instances")
            .update({ status: "in_progress", started_at: new Date().toISOString() })
            .eq("id", nextPending[0].id);

          await supabase
            .from("workflow_instances")
            .update({ current_step_id: nextPending[0].step_id })
            .eq("id", instanceId);

          // Auto-execute if non-human step
          if (instance) {
            await advanceAndAutoExecute(instanceId, nextPending[0].id, nextPending[0].step_id, instance.entity_type, instance.entity_id, user?.id || null);
          }
        } else {
          // All steps done — complete workflow
          await supabase
            .from("workflow_instances")
            .update({
              status: outcome === "rejected" ? "failed" : "completed",
              completed_at: new Date().toISOString(),
              current_step_id: null,
            })
            .eq("id", instanceId);
        }
      }

      // Audit
      await supabase.from("workflow_audit_log").insert({
        instance_id: instanceId,
        step_instance_id: stepInstanceId,
        action: `step_${outcome}`,
        performed_by: user?.id || null,
        details: { outcome, reason },
      });

      return stepInst;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_step_instances"] });
      qc.invalidateQueries({ queryKey: ["workflow_instance_for_entity"] });
    },
  });
}

// ── Workflow Audit Log ──
export function useWorkflowAuditLog(instanceId?: string) {
  return useQuery({
    queryKey: ["workflow_audit_log", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_audit_log")
        .select("*")
        .eq("instance_id", instanceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Check if current user can act on a workflow step ──
export function useCanActOnStep(stepInstanceId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["can_act_on_workflow_step", stepInstanceId, user?.id],
    enabled: !!stepInstanceId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("can_act_on_workflow_step", {
          _user_id: user!.id,
          _step_instance_id: stepInstanceId!,
        });
      if (error) throw error;
      return data as boolean;
    },
  });
}

// ── Get all actionable steps for the current user ──
export function useMyActionableSteps() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_actionable_steps", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Get all in-progress step instances
      const { data: activeSteps, error } = await supabase
        .from("workflow_step_instances")
        .select("*, workflow_steps(step_name, step_type, config), workflow_instances:instance_id(entity_type, entity_id, workflow_templates(name))")
        .eq("status", "in_progress");

      if (error) throw error;
      if (!activeSteps?.length) return [];

      // Check each step with the DB function
      const actionable = [];
      for (const step of activeSteps) {
        const { data: canAct } = await supabase.rpc("can_act_on_workflow_step", {
          _user_id: user!.id,
          _step_instance_id: step.id,
        });
        if (canAct) actionable.push(step);
      }
      return actionable;
    },
  });
}
