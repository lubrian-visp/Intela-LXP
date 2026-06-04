import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface CohortStaffAssignment {
  id: string;
  cohort_id: string;
  user_id: string;
  role: string;
  assigned_by: string | null;
  assigned_at: string;
  profile?: { full_name: string | null };
}

export function useCohortStaffAssignments(cohortId?: string) {
  return useQuery({
    queryKey: ["cohort_staff_assignments", cohortId],
    enabled: !!cohortId,
    queryFn: async () => {
      const { data, error } = await db
        .from("cohort_staff_assignments")
        .select("*")
        .eq("cohort_id", cohortId);
      if (error) throw error;

      // Fetch profile names for assigned staff
      const userIds = [...new Set((data as any[]).map((d: any) => d.user_id))];
      if (userIds.length === 0) return [] as CohortStaffAssignment[];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      return (data as any[]).map((d: any) => ({
        ...d,
        profile: profileMap[d.user_id] ?? { full_name: null },
      })) as CohortStaffAssignment[];
    },
  });
}

export function useAssignCohortStaff() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { cohort_id: string; user_id: string; role: string }) => {
      const { error } = await db.from("cohort_staff_assignments").upsert(
        {
          cohort_id: input.cohort_id,
          user_id: input.user_id,
          role: input.role,
          assigned_by: user?.id,
        },
        { onConflict: "cohort_id,user_id,role" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cohort_staff_assignments", vars.cohort_id] });
      toast.success("Staff member assigned to cohort.");
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to assign staff."),
  });
}

export function useRemoveCohortStaff() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; cohort_id: string }) => {
      const { error } = await db
        .from("cohort_staff_assignments")
        .delete()
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["cohort_staff_assignments", vars.cohort_id] });
      toast.success("Staff member removed.");
    },
    onError: (err: any) => toast.error(err.message ?? "Failed to remove staff."),
  });
}
