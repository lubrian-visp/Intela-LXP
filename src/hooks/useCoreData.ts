import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// ── Programmes ──
export function useProgrammes(status?: string) {
  return useQuery({
    queryKey: ["programmes", status],
    queryFn: async () => {
      let q = supabase.from("programmes").select("*, programme_types(name, color), countries(name, iso_code)").order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useProgramme(id: string | undefined) {
  return useQuery({
    queryKey: ["programmes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("*, programme_types(name, color), countries(name, iso_code)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"programmes">) => {
      const { data, error } = await supabase.from("programmes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useUpdateProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"programmes"> & { id: string }) => {
      const { data, error } = await supabase.from("programmes").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

/** Pre-flight check: returns impact summary for a programme before deletion */
export async function getProgrammeDeletionImpact(programmeId: string) {
  const [regs, cohorts, assessments, modules] = await Promise.all([
    supabase.from("learner_registrations").select("id", { count: "exact", head: true }).eq("programme_id", programmeId),
    supabase.from("cohorts").select("id").eq("programme_id", programmeId),
    supabase.from("assessments").select("id", { count: "exact", head: true }).eq("programme_id", programmeId),
    supabase.from("programme_modules").select("id", { count: "exact", head: true }).eq("programme_id", programmeId),
  ]);

  let enrolmentCount = 0;
  let submissionCount = 0;
  const cohortIds = cohorts.data?.map(c => c.id) ?? [];
  if (cohortIds.length) {
    const { count } = await supabase.from("enrolments").select("id", { count: "exact", head: true }).in("cohort_id", cohortIds);
    enrolmentCount = count ?? 0;
  }

  const assessmentIds = assessments.data?.map((a: any) => a.id) ?? [];
  if (assessmentIds.length) {
    const { count } = await supabase.from("assessment_submissions").select("id", { count: "exact", head: true }).in("assessment_id", assessmentIds);
    submissionCount = count ?? 0;
  }

  const learnerCount = regs.count ?? 0;
  const hasLinkedLearners = learnerCount > 0 || enrolmentCount > 0;

  return {
    learnerCount,
    enrolmentCount,
    cohortCount: cohortIds.length,
    assessmentCount: assessments.count ?? 0,
    submissionCount,
    moduleCount: modules.count ?? 0,
    hasLinkedLearners,
    /** Safe to hard-delete only if no learners/enrolments are linked */
    canHardDelete: !hasLinkedLearners,
  };
}

export type DeletionImpact = Awaited<ReturnType<typeof getProgrammeDeletionImpact>>;

/**
 * Archive a programme (soft-delete). This is the recommended action
 * when learners or enrolments are linked — preserves all data integrity.
 */
export function useArchiveProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("programmes")
        .update({ status: "archived" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programmes"] });
    },
  });
}

/**
 * Hard-delete a programme — ONLY permitted when no learners or enrolments
 * are linked. Cleans up structural data (modules, pathways, content, assessments).
 */
export function useDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Safety check: block if learners/enrolments exist
      const impact = await getProgrammeDeletionImpact(id);
      if (!impact.canHardDelete) {
        throw new Error(
          `Cannot delete: ${impact.learnerCount} learner(s) and ${impact.enrolmentCount} enrolment(s) are linked. Archive instead.`
        );
      }

      // Safe to delete — only structural/assessment data remains

      // 1. Assessment submissions → assessments
      const { data: assessments } = await supabase.from("assessments").select("id").eq("programme_id", id);
      if (assessments?.length) {
        const aIds = assessments.map(a => a.id);
        await supabase.from("assessment_submissions").delete().in("assessment_id", aIds);
        await supabase.from("assessment_links").delete().in("assessment_id", aIds);
      }
      await supabase.from("assessments").delete().eq("programme_id", id);

      // 2. Moderation items
      await supabase.from("moderation_items").delete().eq("programme_id", id);

      // 3. Content blocks → lessons → modules → pathways
      const { data: modules } = await supabase.from("programme_modules").select("id").eq("programme_id", id);
      if (modules?.length) {
        const moduleIds = modules.map(m => m.id);
        await supabase.from("content_blocks").delete().in("module_id", moduleIds);
        await supabase.from("lessons").delete().in("module_id", moduleIds);
      }
      await supabase.from("programme_modules").delete().eq("programme_id", id);
      await supabase.from("pathways").delete().eq("programme_id", id);

      // 4. Cohorts (empty at this point)
      await supabase.from("cohorts").delete().eq("programme_id", id);

      // 5. Lifecycle audit + assessor reports
      await supabase.from("programme_lifecycle_audit").delete().eq("programme_id", id);
      await supabase.from("assessor_reports").delete().eq("programme_id", id);
      await supabase.from("assessor_report_templates").delete().eq("programme_id", id);

      // 6. Delete the programme
      const { error } = await supabase.from("programmes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programmes"] });
      qc.invalidateQueries({ queryKey: ["programme_modules"] });
      qc.invalidateQueries({ queryKey: ["pathways"] });
      qc.invalidateQueries({ queryKey: ["assessments"] });
      qc.invalidateQueries({ queryKey: ["content_blocks"] });
    },
  });
}

// ── Cohorts ──
export function useCohorts(programmeId?: string) {
  return useQuery({
    queryKey: ["cohorts", programmeId],
    queryFn: async () => {
      let q = supabase.from("cohorts").select("*, programmes(title)").order("start_date", { ascending: false });
      if (programmeId) q = q.eq("programme_id", programmeId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"cohorts">) => {
      const { data, error } = await supabase.from("cohorts").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohorts"] }),
  });
}

export function useUpdateCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"cohorts"> & { id: string }) => {
      const { data, error } = await supabase.from("cohorts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohorts"] }),
  });
}

// ── Enrolments ──
export function useEnrolments(filters?: { cohortId?: string; learnerId?: string; status?: string }) {
  return useQuery({
    queryKey: ["enrolments", filters],
    queryFn: async () => {
      let q = supabase.from("enrolments").select("*, cohorts(name, programme_id, programmes(title, status))").order("created_at", { ascending: false });
      if (filters?.cohortId) q = q.eq("cohort_id", filters.cohortId);
      if (filters?.learnerId) q = q.eq("learner_id", filters.learnerId);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEnrolment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"enrolments">) => {
      const { data, error } = await supabase.from("enrolments").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrolments"] }),
  });
}

export function useUpdateEnrolment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"enrolments"> & { id: string }) => {
      const { data, error } = await supabase.from("enrolments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrolments"] }),
  });
}

export function useDeleteEnrolment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enrolments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrolments"] }),
  });
}

/**
 * Fetch learner registration details (name, learner_number, email) for a list of learner_ids.
 */
export function useCohortLearnerDetails(learnerIds: string[]) {
  return useQuery({
    queryKey: ["cohort_learner_details", learnerIds],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_registrations")
        .select("id, full_name, learner_number, email")
        .in("id", learnerIds);
      if (error) throw error;
      const map: Record<string, { full_name: string; learner_number: string | null; email: string }> = {};
      (data ?? []).forEach(r => { map[r.id] = r; });
      return map;
    },
  });
}

// ── Programme Modules ──
export function useProgrammeModules(programmeId?: string) {
  return useQuery({
    queryKey: ["programme_modules", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programme_modules")
        .select("*")
        .eq("programme_id", programmeId!)
        .order("sequence_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"programme_modules">) => {
      const { data, error } = await supabase.from("programme_modules").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programme_modules"] }),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"programme_modules"> & { id: string }) => {
      const { data, error } = await supabase.from("programme_modules").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programme_modules"] }),
  });
}

export function useReorderModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sequence_order: number; pathway_id: string | null }[]) => {
      const promises = updates.map((u) =>
        supabase
          .from("programme_modules")
          .update({ sequence_order: u.sequence_order, pathway_id: u.pathway_id })
          .eq("id", u.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme_modules"] });
    },
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete content blocks first
      await supabase.from("content_blocks").delete().eq("module_id", id);
      const { error } = await supabase.from("programme_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme_modules"] });
      qc.invalidateQueries({ queryKey: ["content_blocks"] });
    },
  });
}

export function useDeletePathway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Unassign modules from this pathway first
      await supabase.from("programme_modules").update({ pathway_id: null }).eq("pathway_id", id);
      const { error } = await supabase.from("pathways").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pathways"] });
      qc.invalidateQueries({ queryKey: ["programme_modules"] });
    },
  });
}

// ── Assessments ──
export function useAssessments(programmeId?: string) {
  return useQuery({
    queryKey: ["assessments", programmeId],
    queryFn: async () => {
      let q = supabase.from("assessments").select("*, programme_modules(title)").order("created_at", { ascending: false });
      if (programmeId) q = q.eq("programme_id", programmeId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"assessments">) => {
      const { data, error } = await supabase.from("assessments").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessments"] }),
  });
}

export function useUpdateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"assessments"> & { id: string }) => {
      const { data, error } = await supabase.from("assessments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessments"] }),
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("assessment_submissions").delete().eq("assessment_id", id);
      await supabase.from("assessment_links").delete().eq("assessment_id", id);
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      qc.invalidateQueries({ queryKey: ["assessment_submissions"] });
      qc.invalidateQueries({ queryKey: ["assessment_links"] });
    },
  });
}

// ── Assessment Submissions ──
export function useSubmissions(filters?: { assessmentId?: string; learnerId?: string; assessorId?: string }) {
  return useQuery({
    queryKey: ["assessment_submissions", filters],
    queryFn: async () => {
      let q = supabase.from("assessment_submissions").select("*, assessments(title, max_score, pass_mark)").order("created_at", { ascending: false });
      if (filters?.assessmentId) q = q.eq("assessment_id", filters.assessmentId);
      if (filters?.learnerId) q = q.eq("learner_id", filters.learnerId);
      if (filters?.assessorId) q = q.eq("assessor_id", filters.assessorId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"assessment_submissions">) => {
      const { data, error } = await supabase.from("assessment_submissions").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment_submissions"] }),
  });
}

export function useUpdateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"assessment_submissions"> & { id: string }) => {
      const { data, error } = await supabase.from("assessment_submissions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment_submissions"] }),
  });
}

// ── Issued Credentials ──
export function useCredentials(learnerId?: string) {
  return useQuery({
    queryKey: ["issued_credentials", learnerId],
    queryFn: async () => {
      let q = supabase.from("issued_credentials").select("*, programmes(title)").order("issued_at", { ascending: false });
      if (learnerId) q = q.eq("learner_id", learnerId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"issued_credentials">) => {
      const { data, error } = await supabase.from("issued_credentials").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issued_credentials"] }),
  });
}

// ── Approval Tasks ──
export function useApprovalTasks(filters?: { assignedTo?: string; status?: string }) {
  return useQuery({
    queryKey: ["approval_tasks", filters],
    queryFn: async () => {
      let q = supabase.from("approval_tasks").select("*").order("created_at", { ascending: false });
      if (filters?.assignedTo) q = q.eq("assigned_to", filters.assignedTo);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateApprovalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"approval_tasks"> & { id: string }) => {
      const { data, error } = await supabase.from("approval_tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval_tasks"] }),
  });
}

// ── Pathways ──
export function usePathways(programmeId?: string) {
  return useQuery({
    queryKey: ["pathways", programmeId],
    queryFn: async () => {
      let q = supabase
        .from("pathways")
        .select("*, programmes(title), programme_modules(id, title, module_type, duration_hours, sequence_order, credential_label, prerequisite_module_id, is_mandatory)")
        .order("phase")
        .order("created_at", { ascending: false });
      if (programmeId) q = q.eq("programme_id", programmeId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePathway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"pathways">) => {
      const { data, error } = await supabase.from("pathways").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pathways"] }),
  });
}

export function useUpdatePathway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"pathways"> & { id: string }) => {
      const { data, error } = await supabase.from("pathways").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pathways"] }),
  });
}

// ── Moderation Items ──
export function useModerationItems(filters?: { status?: string; priority?: string }) {
  return useQuery({
    queryKey: ["moderation_items", filters],
    queryFn: async () => {
      let q = supabase.from("moderation_items").select("*, programmes(title)").order("flagged_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.priority) q = q.eq("priority", filters.priority);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateModerationItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; reviewed_by?: string; reviewed_at?: string; review_notes?: string; moderation_feedback?: string; rejection_category?: string }) => {
      const { data, error } = await supabase.from("moderation_items").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation_items"] });
      qc.invalidateQueries({ queryKey: ["assessment_submissions"] });
    },
  });
}

// ── Training Sessions ──
export function useTrainingSessions(cohortId?: string) {
  return useQuery({
    queryKey: ["training_sessions", cohortId],
    queryFn: async () => {
      let q = supabase.from("training_sessions").select("*, cohorts(name, programmes(title))").order("scheduled_start", { ascending: true });
      if (cohortId) q = q.eq("cohort_id", cohortId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTrainingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase.from("training_sessions").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training_sessions"] }),
  });
}

export function useUpdateTrainingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("training_sessions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training_sessions"] }),
  });
}

// ── Session Attendance ──
export function useSessionAttendance(sessionId?: string) {
  return useQuery({
    queryKey: ["session_attendance", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("session_attendance").select("*").eq("session_id", sessionId!).order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase.from("session_attendance").upsert(input, { onConflict: "session_id,learner_id" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session_attendance"] }),
  });
}

// ── Realtime Subscriptions ──
import { useEffect } from "react";

/**
 * Universal realtime sync hook — subscribes to changes on a table
 * and auto-invalidates the matching React Query cache keys.
 * Call once per portal/page that needs live updates.
 */
export function useRealtimeSync(tables: string[]) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!tables.length) return;

    const channel = supabase.channel(`sync-${tables.join("-")}`);

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          qc.invalidateQueries({ queryKey: [table] });
          // Also invalidate common aliases
          const aliases: Record<string, string[]> = {
            enrolments: ["enrolments"],
            approval_tasks: ["approval_tasks"],
            assessment_submissions: ["assessment_submissions"],
            notifications: ["notifications"],
            issued_credentials: ["issued_credentials"],
            training_sessions: ["training_sessions"],
            session_chat_messages: ["session_chat_messages"],
            discussion_posts: ["discussion_posts"],
            announcements: ["announcements"],
            learner_registrations: ["learner_registrations"],
            cohorts: ["cohorts"],
            programmes: ["programmes"],
          };
          (aliases[table] ?? []).forEach((key) =>
            qc.invalidateQueries({ queryKey: [key] })
          );
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(",")]);
}

// Legacy wrappers (kept for backwards compat, prefer useRealtimeSync)
export function useRealtimeEnrolments(onUpdate: (payload: any) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("enrolments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "enrolments" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["enrolments"] });
        onUpdate(payload);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
}

export function useRealtimeApprovalTasks(onUpdate: (payload: any) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("approval-tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_tasks" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["approval_tasks"] });
        onUpdate(payload);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
}

// ── Cohort Safe Deletion ──

/** Pre-flight impact check for a cohort before deletion */
export async function getCohortDeletionImpact(cohortId: string) {
  const [enrolments, sessions, staffAssignments] = await Promise.all([
    supabase.from("enrolments").select("id", { count: "exact", head: true }).eq("cohort_id", cohortId),
    supabase.from("training_sessions").select("id", { count: "exact", head: true }).eq("cohort_id", cohortId),
    supabase.from("cohort_staff_assignments").select("id", { count: "exact", head: true }).eq("cohort_id", cohortId),
  ]);

  const enrolmentCount = enrolments.count ?? 0;
  const sessionCount = sessions.count ?? 0;
  const staffCount = staffAssignments.count ?? 0;

  return {
    enrolmentCount,
    sessionCount,
    staffCount,
    hasLinkedLearners: enrolmentCount > 0,
    /** Safe to hard-delete only if no enrolments are linked */
    canHardDelete: enrolmentCount === 0,
  };
}

export type CohortDeletionImpact = Awaited<ReturnType<typeof getCohortDeletionImpact>>;

/** Archive a cohort (soft-delete). Preserves all enrolment and session records. */
export function useArchiveCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("cohorts")
        .update({ status: "archived" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cohorts"] });
    },
  });
}

/**
 * Hard-delete a cohort — ONLY permitted when no enrolments are linked.
 * Cleans up staff assignments and training sessions first.
 */
export function useDeleteCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const impact = await getCohortDeletionImpact(id);
      if (!impact.canHardDelete) {
        throw new Error(
          `Cannot delete: ${impact.enrolmentCount} enrolment(s) are linked. Archive instead.`
        );
      }

      // Clean up dependants
      await supabase.from("cohort_staff_assignments").delete().eq("cohort_id", id);
      await supabase.from("training_sessions").delete().eq("cohort_id", id);
      await supabase.from("session_attendance").delete().in(
        "session_id",
        (await supabase.from("training_sessions").select("id").eq("cohort_id", id)).data?.map(s => s.id) ?? []
      );

      const { error } = await supabase.from("cohorts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cohorts"] });
      qc.invalidateQueries({ queryKey: ["enrolments"] });
    },
  });
}

// ── Programme Type Safe Deletion ──

/** Pre-flight impact check for a programme type before deletion */
export async function getProgrammeTypeDeletionImpact(typeId: string) {
  const { count } = await supabase
    .from("programmes")
    .select("id", { count: "exact", head: true })
    .eq("programme_type_id", typeId);

  const programmeCount = count ?? 0;
  return {
    programmeCount,
    canHardDelete: programmeCount === 0,
  };
}

export type ProgrammeTypeDeletionImpact = Awaited<ReturnType<typeof getProgrammeTypeDeletionImpact>>;

// ── Deletion Audit Logger ──

/** Logs a deletion/archive/reassignment action to the deletion_audit_log table */
export async function logDeletionAudit(params: {
  userId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
}) {
  await supabase.from("deletion_audit_log" as any).insert({
    user_id: params.userId,
    action_type: params.actionType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_name: params.entityName || null,
    details: params.details || {},
  });
}

// ── Enhanced Archive with Metadata ──

/** Archive a programme with archived_at and archived_by metadata + audit log */
export function useArchiveProgrammeWithAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId, name }: { id: string; userId: string; name: string }) => {
      const { data, error } = await supabase
        .from("programmes")
        .update({ status: "archived", archived_at: new Date().toISOString(), archived_by: userId } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logDeletionAudit({
        userId,
        actionType: "ARCHIVE",
        entityType: "programme",
        entityId: id,
        entityName: name,
        details: { previous_status: "active" },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

/** Archive a cohort with metadata + audit log */
export function useArchiveCohortWithAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId, name }: { id: string; userId: string; name: string }) => {
      const { data, error } = await supabase
        .from("cohorts")
        .update({ status: "archived", archived_at: new Date().toISOString(), archived_by: userId } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logDeletionAudit({
        userId,
        actionType: "ARCHIVE",
        entityType: "cohort",
        entityId: id,
        entityName: name,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohorts"] }),
  });
}

/** Archive a programme type with metadata + audit log */
export function useArchiveProgrammeTypeWithAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId, name }: { id: string; userId: string; name: string }) => {
      const { data, error } = await supabase
        .from("programme_types")
        .update({ is_active: false, archived_at: new Date().toISOString(), archived_by: userId } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logDeletionAudit({
        userId,
        actionType: "ARCHIVE",
        entityType: "programme_type",
        entityId: id,
        entityName: name,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programme-types"] }),
  });
}

// ── Force Delete (with dependency cleanup) ──

export type ForceDeleteCohortAction = {
  type: "reassign";
  targetCohortId: string;
} | {
  type: "nullify";
} | {
  type: "withdraw";
};

/**
 * Force-delete a cohort with dependency cleanup.
 * Only for Super Admin / Operations.
 */
export function useForceDeleteCohort() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cohortId,
      cohortName,
      userId,
      enrolmentAction,
    }: {
      cohortId: string;
      cohortName: string;
      userId: string;
      enrolmentAction: ForceDeleteCohortAction;
    }) => {
      // 1. Handle enrolments based on chosen action
      if (enrolmentAction.type === "reassign") {
        const { error } = await supabase
          .from("enrolments")
          .update({ cohort_id: enrolmentAction.targetCohortId })
          .eq("cohort_id", cohortId);
        if (error) throw error;
        await logDeletionAudit({
          userId,
          actionType: "REASSIGN",
          entityType: "enrolment",
          entityId: cohortId,
          entityName: cohortName,
          details: { target_cohort_id: enrolmentAction.targetCohortId, action: "reassign_enrolments" },
        });
      } else if (enrolmentAction.type === "nullify") {
        const { error } = await supabase
          .from("enrolments")
          .update({ cohort_id: null })
          .eq("cohort_id", cohortId);
        if (error) throw error;
        await logDeletionAudit({
          userId,
          actionType: "NULLIFY",
          entityType: "enrolment",
          entityId: cohortId,
          entityName: cohortName,
          details: { action: "nullify_cohort_links" },
        });
      } else if (enrolmentAction.type === "withdraw") {
        const { error } = await supabase
          .from("enrolments")
          .update({ status: "withdrawn", cohort_id: null })
          .eq("cohort_id", cohortId);
        if (error) throw error;
        await logDeletionAudit({
          userId,
          actionType: "WITHDRAW",
          entityType: "enrolment",
          entityId: cohortId,
          entityName: cohortName,
          details: { action: "withdraw_all_enrolments" },
        });
      }

      // 2. Clean up staff assignments, sessions, attendance
      const { data: sessions } = await supabase.from("training_sessions").select("id").eq("cohort_id", cohortId);
      if (sessions?.length) {
        await supabase.from("session_attendance").delete().in("session_id", sessions.map(s => s.id));
      }
      await supabase.from("training_sessions").delete().eq("cohort_id", cohortId);
      await supabase.from("cohort_staff_assignments").delete().eq("cohort_id", cohortId);

      // 3. Delete the cohort
      const { error: deleteError } = await supabase.from("cohorts").delete().eq("id", cohortId);
      if (deleteError) throw deleteError;

      await logDeletionAudit({
        userId,
        actionType: "FORCE_DELETE",
        entityType: "cohort",
        entityId: cohortId,
        entityName: cohortName,
        details: { enrolment_action: enrolmentAction.type },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cohorts"] });
      qc.invalidateQueries({ queryKey: ["enrolments"] });
      qc.invalidateQueries({ queryKey: ["training_sessions"] });
    },
  });
}

export type ForceDeleteProgrammeEnrolmentAction = "reassign" | "nullify" | "withdraw";

/**
 * Force-delete a programme with full dependency cleanup.
 * Only for Super Admin / Operations.
 */
export function useForceDeleteProgramme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      programmeId,
      programmeName,
      userId,
      enrolmentAction,
      targetProgrammeId,
    }: {
      programmeId: string;
      programmeName: string;
      userId: string;
      enrolmentAction: ForceDeleteProgrammeEnrolmentAction;
      targetProgrammeId?: string;
    }) => {
      // Get all cohorts for this programme
      const { data: cohorts } = await supabase.from("cohorts").select("id").eq("programme_id", programmeId);
      const cohortIds = cohorts?.map(c => c.id) ?? [];

      // 1. Handle enrolments across all cohorts
      if (cohortIds.length > 0) {
        if (enrolmentAction === "reassign" && targetProgrammeId) {
          // Get first cohort of target programme to reassign to
          const { data: targetCohorts } = await supabase
            .from("cohorts")
            .select("id")
            .eq("programme_id", targetProgrammeId)
            .limit(1);
          const targetCohortId = targetCohorts?.[0]?.id || null;
          await supabase
            .from("enrolments")
            .update({ cohort_id: targetCohortId })
            .in("cohort_id", cohortIds);
          await logDeletionAudit({
            userId,
            actionType: "REASSIGN",
            entityType: "enrolment",
            entityId: programmeId,
            entityName: programmeName,
            details: { target_programme_id: targetProgrammeId, target_cohort_id: targetCohortId },
          });
        } else if (enrolmentAction === "nullify") {
          await supabase.from("enrolments").update({ cohort_id: null }).in("cohort_id", cohortIds);
          await logDeletionAudit({
            userId, actionType: "NULLIFY", entityType: "enrolment",
            entityId: programmeId, entityName: programmeName,
          });
        } else if (enrolmentAction === "withdraw") {
          await supabase.from("enrolments").update({ status: "withdrawn", cohort_id: null }).in("cohort_id", cohortIds);
          await logDeletionAudit({
            userId, actionType: "WITHDRAW", entityType: "enrolment",
            entityId: programmeId, entityName: programmeName,
          });
        }
      }

      // 2. Clean up sessions, attendance, and sponsor links per cohort
      if (cohortIds.length > 0) {
        const { data: sessions } = await supabase.from("training_sessions").select("id").in("cohort_id", cohortIds);
        if (sessions?.length) {
          await supabase.from("session_attendance").delete().in("session_id", sessions.map(s => s.id));
        }
        await supabase.from("training_sessions").delete().in("cohort_id", cohortIds);
        await supabase.from("cohort_staff_assignments").delete().in("cohort_id", cohortIds);
        // Clean sponsor_programme_links referencing these cohorts (no CASCADE on FK)
        await supabase.from("sponsor_programme_links" as any).delete().in("cohort_id", cohortIds);
        await supabase.from("cohorts").delete().eq("programme_id", programmeId);
      }

      // 3. Clean up structural data
      const { data: assessments } = await supabase.from("assessments").select("id").eq("programme_id", programmeId);
      if (assessments?.length) {
        const aIds = assessments.map(a => a.id);
        await supabase.from("assessment_submissions").delete().in("assessment_id", aIds);
        await supabase.from("assessment_links").delete().in("assessment_id", aIds);
      }
      await supabase.from("assessments").delete().eq("programme_id", programmeId);
      await supabase.from("moderation_items").delete().eq("programme_id", programmeId);

      const { data: modules } = await supabase.from("programme_modules").select("id").eq("programme_id", programmeId);
      if (modules?.length) {
        const moduleIds = modules.map(m => m.id);
        await supabase.from("content_blocks").delete().in("module_id", moduleIds);
        await supabase.from("lessons").delete().in("module_id", moduleIds);
      }
      await supabase.from("programme_modules").delete().eq("programme_id", programmeId);
      await supabase.from("pathways").delete().eq("programme_id", programmeId);
      await supabase.from("programme_lifecycle_audit").delete().eq("programme_id", programmeId);
      await supabase.from("assessor_reports").delete().eq("programme_id", programmeId);
      await supabase.from("assessor_report_templates").delete().eq("programme_id", programmeId);
      await supabase.from("learner_registrations" as any).update({ programme_id: null } as any).eq("programme_id", programmeId);
      // Clean non-cascading FK references to programmes
      await supabase.from("sponsor_programme_links" as any).delete().eq("programme_id", programmeId);
      await supabase.from("certificate_templates").delete().eq("programme_id", programmeId);
      await supabase.from("issued_credentials" as any).delete().eq("programme_id", programmeId);

      // 4. Delete the programme
      const { error } = await supabase.from("programmes").delete().eq("id", programmeId);
      if (error) throw error;

      await logDeletionAudit({
        userId,
        actionType: "FORCE_DELETE",
        entityType: "programme",
        entityId: programmeId,
        entityName: programmeName,
        details: { enrolment_action: enrolmentAction, cohorts_removed: cohortIds.length },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programmes"] });
      qc.invalidateQueries({ queryKey: ["cohorts"] });
      qc.invalidateQueries({ queryKey: ["enrolments"] });
      qc.invalidateQueries({ queryKey: ["programme_modules"] });
      qc.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

// ── Deletion Audit Log Query ──

export function useDeletionAuditLog(filters?: { entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: ["deletion_audit_log", filters],
    queryFn: async () => {
      let q = (supabase.from("deletion_audit_log" as any) as any).select("*").order("created_at", { ascending: false });
      if (filters?.entityType) q = q.eq("entity_type", filters.entityType);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}


