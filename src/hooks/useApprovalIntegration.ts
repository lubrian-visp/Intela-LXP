import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-create an approval_task when a programme transitions to "pending_approval".
 * Called from the ProgrammeBuilder after a successful status transition.
 */
export function useCreateApprovalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      programmeId,
      programmeTitle,
      requestedBy,
    }: {
      programmeId: string;
      programmeTitle: string;
      requestedBy: string;
    }) => {
      const { error } = await supabase.from("approval_tasks").insert({
        title: `Approve Programme: ${programmeTitle}`,
        description: `Programme "${programmeTitle}" has been submitted for approval. Review and approve or reject.`,
        task_type: "programme_approval",
        reference_table: "programmes",
        reference_id: programmeId,
        requested_by: requestedBy,
        assigned_role: "operations",
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_tasks"] });
    },
  });
}

/**
 * Resolve an approval task when a programme is approved or rejected.
 */
export function useResolveApprovalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      programmeId,
      decidedBy,
      status,
      notes,
    }: {
      programmeId: string;
      decidedBy: string;
      status: "approved" | "rejected";
      notes?: string;
    }) => {
      // Find the pending task for this programme
      const { data: tasks } = await supabase
        .from("approval_tasks")
        .select("id")
        .eq("reference_id", programmeId)
        .eq("reference_table", "programmes")
        .eq("status", "pending")
        .limit(1);

      if (tasks && tasks.length > 0) {
        const { error } = await supabase
          .from("approval_tasks")
          .update({
            status,
            decided_by: decidedBy,
            decided_at: new Date().toISOString(),
            notes: notes ?? null,
          })
          .eq("id", tasks[0].id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_tasks"] });
    },
  });
}
