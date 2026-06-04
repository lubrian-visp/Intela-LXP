import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export const L_AND_D_ROLES = [
  "Facilitator",
  "Assessor",
  "Moderator",
  "Mentor",
  "Skills Development Facilitator",
  "Learning Material Developer",
  "Instructional Designer",
] as const;

export type LAndDRole = (typeof L_AND_D_ROLES)[number];

export interface StaffRoleAssignment {
  id: string;
  staff_registration_id: string;
  role_name: string;
  assigned_at: string;
  assigned_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStaffRoleAssignments() {
  return useQuery({
    queryKey: ["staff_role_assignments"],
    queryFn: async () => {
      const { data, error } = await db
        .from("staff_role_assignments")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as StaffRoleAssignment[];
    },
  });
}

export function useAssignStaffRole() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { staff_registration_id: string; role_name: string }) => {
      const { error } = await db.from("staff_role_assignments").upsert(
        {
          staff_registration_id: input.staff_registration_id,
          role_name: input.role_name,
          assigned_by: user?.id,
          is_active: true,
        },
        { onConflict: "staff_registration_id,role_name" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_role_assignments"] });
      toast.success("Role assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRemoveStaffRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { staff_registration_id: string; role_name: string }) => {
      const { error } = await db
        .from("staff_role_assignments")
        .delete()
        .eq("staff_registration_id", input.staff_registration_id)
        .eq("role_name", input.role_name);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_role_assignments"] });
      toast.success("Role removed");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useBulkAssignStaffRoles() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (entries: { staff_registration_id: string; role_name: string }[]) => {
      const { error } = await db.from("staff_role_assignments").upsert(
        entries.map((e) => ({
          ...e,
          assigned_by: user?.id,
          is_active: true,
        })),
        { onConflict: "staff_registration_id,role_name" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_role_assignments"] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}
