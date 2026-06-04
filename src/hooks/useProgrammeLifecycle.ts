import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAutoStartWorkflow } from "@/hooks/useWorkflowIntegration";

// ── Status types ──────────────────────────────────────────────
export type LifecycleStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "suspended"
  | "archived";

export const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  draft: ["pending_approval"],
  submitted: ["pending_approval"],
  pending_approval: ["approved", "rejected"],
  approved: ["published"],
  rejected: ["draft"],
  published: ["archived", "suspended"],
  suspended: ["draft", "archived"],
  archived: [],
};

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  suspended: "Suspended",
  archived: "Archived",
};

export const LIFECYCLE_COLORS: Record<LifecycleStatus, string> = {
  draft: "bg-warning/10 text-warning border-warning/20",
  submitted: "bg-info/10 text-info border-info/20",
  pending_approval: "bg-info/10 text-info border-info/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  published: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground border-border",
};

/** Can edit structure (modules, pathways, credits) — only in draft/rejected */
export function canEdit(status: LifecycleStatus): boolean {
  return status === "draft" || status === "rejected";
}

/** Can edit content blocks — allowed even on approved/published programmes */
export function canEditContent(status: LifecycleStatus): boolean {
  return status === "draft" || status === "rejected" || status === "approved" || status === "published";
}

export function canTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Permission check hooks ────────────────────────────────────

/** Check if current user has a specific programme permission flag */
export function useProgrammePermission(action: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["programme-permission", user?.id, action],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("has_permission", {
        _user_id: user.id,
        _resource: "programme",
        _action: action,
      });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

/** Check if current user can approve a specific programme (four-eyes + delegation) */
export function useCanApproveProgramme(programmeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["can-approve-programme", user?.id, programmeId],
    queryFn: async () => {
      if (!user?.id || !programmeId) return false;
      const { data, error } = await supabase.rpc("can_approve_programme", {
        _user_id: user.id,
        _programme_id: programmeId,
      });
      if (error) return false;
      return data as boolean;
    },
    enabled: !!user?.id && !!programmeId,
    staleTime: 30_000,
  });
}

// ── Lifecycle audit logging ───────────────────────────────────

export function useLogLifecycleAction() {
  return useMutation({
    mutationFn: async (params: {
      programme_id: string;
      action: string;
      previous_status?: string;
      new_status?: string;
      reason?: string;
      role_at_action: string;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("programme_lifecycle_audit").insert({
        programme_id: params.programme_id,
        performed_by: user.id,
        role_at_action: params.role_at_action,
        action: params.action,
        previous_status: params.previous_status ?? null,
        new_status: params.new_status ?? null,
        reason: params.reason ?? null,
        metadata: params.metadata ?? {},
      });
      if (error) throw error;
    },
  });
}

// ── Status transition mutation ────────────────────────────────

export function useTransitionProgramme() {
  const qc = useQueryClient();
  const logAction = useLogLifecycleAction();
  const autoStartWorkflow = useAutoStartWorkflow();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
      previousStatus,
      roleAtAction,
    }: {
      id: string;
      status: LifecycleStatus;
      reason?: string;
      previousStatus?: string;
      roleAtAction?: string;
    }) => {
      const { data, error } = await supabase
        .from("programmes")
        .update({ status })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (!data && !error) throw new Error("Programme not found or you lack permission to update it.");
      if (error) throw error;

      // Log to audit trail (fire-and-forget, don't block UI)
      logAction.mutate({
        programme_id: id,
        action: `status_change_to_${status}`,
        previous_status: previousStatus,
        new_status: status,
        reason,
        role_at_action: roleAtAction ?? "unknown",
      });

      // Auto-start workflow on status change
      autoStartWorkflow.mutate({
        entityType: "programme",
        entityId: id,
        triggerEvent: "on_status_change",
        metadata: { previous_status: previousStatus, new_status: status, reason },
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programmes"] });
    },
  });
}

// ── Clone to draft ────────────────────────────────────────────

export function useCloneToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programmeId: string) => {
      const { data: original, error: progErr } = await supabase
        .from("programmes")
        .select("*")
        .eq("id", programmeId)
        .single();
      if (progErr) throw progErr;

      const currentVersion = original.version || "v1.0";
      const versionNum = parseFloat(currentVersion.replace("v", "")) || 1.0;
      const newVersion = `v${(versionNum + 0.1).toFixed(1)}`;

      const { data: newProgramme, error: newProgErr } = await supabase
        .from("programmes")
        .insert({
          title: original.title,
          description: original.description,
          programme_type_id: original.programme_type_id,
          country_id: original.country_id,
          qualification_framework_id: original.qualification_framework_id,
          credits: original.credits,
          nqf_level: original.nqf_level,
          duration_months: original.duration_months,
          theory_percentage: original.theory_percentage,
          workplace_percentage: original.workplace_percentage,
          created_by: original.created_by,
          manager_id: original.manager_id,
          status: "draft",
          version: newVersion,
        })
        .select()
        .single();
      if (newProgErr) throw newProgErr;

      // Clone pathways
      const { data: pathways } = await supabase
        .from("pathways")
        .select("*")
        .eq("programme_id", programmeId);

      const pathwayIdMap: Record<string, string> = {};
      if (pathways) {
        for (const pw of pathways) {
          const { data: newPw } = await supabase
            .from("pathways")
            .insert({
              programme_id: newProgramme.id,
              title: pw.title,
              phase: pw.phase,
              version: newVersion,
              status: "draft",
            })
            .select()
            .single();
          if (newPw) pathwayIdMap[pw.id] = newPw.id;
        }
      }

      // Clone modules
      const { data: modules } = await supabase
        .from("programme_modules")
        .select("*")
        .eq("programme_id", programmeId)
        .order("sequence_order");

      const moduleIdMap: Record<string, string> = {};
      if (modules) {
        for (const mod of modules) {
          const { data: newMod } = await supabase
            .from("programme_modules")
            .insert({
              programme_id: newProgramme.id,
              pathway_id: mod.pathway_id ? pathwayIdMap[mod.pathway_id] || null : null,
              title: mod.title,
              description: mod.description,
              module_type: mod.module_type,
              credits: mod.credits,
              duration_hours: mod.duration_hours,
              is_mandatory: mod.is_mandatory,
              sequence_order: mod.sequence_order,
              credential_label: mod.credential_label,
            })
            .select()
            .single();
          if (newMod) moduleIdMap[mod.id] = newMod.id;
        }
      }

      // Clone content blocks
      if (modules) {
        for (const mod of modules) {
          const newModId = moduleIdMap[mod.id];
          if (!newModId) continue;
          const { data: blocks } = await supabase
            .from("content_blocks")
            .select("*")
            .eq("module_id", mod.id)
            .order("sequence_order");
          if (blocks) {
            for (const block of blocks) {
              await supabase.from("content_blocks").insert({
                module_id: newModId,
                title: block.title,
                block_type: block.block_type,
                content: block.content,
                file_url: block.file_url,
                is_required: block.is_required,
                duration_minutes: block.duration_minutes,
                sequence_order: block.sequence_order,
              });
            }
          }
        }
      }

      // Clone assessments
      if (modules) {
        const { data: assessments } = await supabase
          .from("assessments")
          .select("*")
          .eq("programme_id", programmeId);
        if (assessments) {
          for (const asmt of assessments) {
            await supabase.from("assessments").insert({
              programme_id: newProgramme.id,
              module_id: asmt.module_id ? moduleIdMap[asmt.module_id] || null : null,
              title: asmt.title,
              description: asmt.description,
              assessment_type: asmt.assessment_type,
              max_score: asmt.max_score,
              pass_mark: asmt.pass_mark,
              weighting: asmt.weighting,
              created_by: asmt.created_by,
            });
          }
        }
      }

      return newProgramme;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["programmes"] });
      toast.success(`New draft ${data.version} created`);
    },
  });
}
