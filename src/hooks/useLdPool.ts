import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LdPoolRole {
  id: string;
  role_key: string;
  display_name: string;
  color_class: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface LdPoolMember {
  id: string;
  staff_registration_id: string | null;
  user_id: string;
  role_key: string;
  display_role: string;
  pool_status: "active" | "suspended" | "removed";
  specialisation: string | null;
  max_cohorts: number;
  added_at: string;
  notes: string | null;
  // joined
  profile?: { full_name: string | null; avatar_url: string | null; job_title: string | null };
  // computed
  active_cohort_count?: number;
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export function useLdPoolRoles() {
  return useQuery({
    queryKey: ["ld_pool_roles"],
    queryFn: async () => {
      const { data, error } = await db.from("ld_pool_roles").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as LdPoolRole[];
    },
    staleTime: 60_000,
  });
}

// ── Pool members ──────────────────────────────────────────────────────────────

export function useLdPoolMembers(roleFilter?: string) {
  return useQuery({
    queryKey: ["ld_pool_members", roleFilter],
    queryFn: async () => {
      let q = db
        .from("ld_pool_members")
        .select("*")
        .order("display_role")
        .order("added_at", { ascending: false });
      if (roleFilter && roleFilter !== "all") q = q.eq("role_key", roleFilter);
      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) return [] as LdPoolMember[];

      const userIds = (data as any[]).map((m: any) => m.user_id);

      // Fetch profiles separately (no direct FK from ld_pool_members → profiles)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      // Cohort workload counts
      const { data: assignments } = await db
        .from("cohort_staff_assignments")
        .select("user_id")
        .in("user_id", userIds);
      const cohortCounts: Record<string, number> = {};
      (assignments ?? []).forEach((a: any) => {
        cohortCounts[a.user_id] = (cohortCounts[a.user_id] ?? 0) + 1;
      });

      return (data as any[]).map((m: any) => ({
        ...m,
        profile: profileMap[m.user_id] ?? { full_name: null, avatar_url: null, job_title: null },
        active_cohort_count: cohortCounts[m.user_id] ?? 0,
      })) as LdPoolMember[];
    },
  });
}

/** Pool members filtered to a specific role — used by AssignStaffModal */
export function useLdPoolMembersByRole(role: string, enabled = true) {
  return useQuery({
    queryKey: ["ld_pool_members_by_role", role],
    enabled: enabled && !!role,
    queryFn: async () => {
      const { data, error } = await db
        .from("ld_pool_members")
        .select("*")
        .eq("role_key", role)
        .eq("pool_status", "active")
        .order("display_role");
      if (error) throw error;
      if (!data?.length) return [] as LdPoolMember[];

      const userIds = (data as any[]).map((m: any) => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      const { data: assignments } = await db
        .from("cohort_staff_assignments")
        .select("user_id")
        .in("user_id", userIds);
      const cohortCounts: Record<string, number> = {};
      (assignments ?? []).forEach((a: any) => {
        cohortCounts[a.user_id] = (cohortCounts[a.user_id] ?? 0) + 1;
      });

      return (data as any[]).map((m: any) => ({
        ...m,
        profile: profileMap[m.user_id] ?? { full_name: null, avatar_url: null, job_title: null },
        active_cohort_count: cohortCounts[m.user_id] ?? 0,
      })) as LdPoolMember[];
    },
    staleTime: 30_000,
  });
}

export function useUpdateLdPoolMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<LdPoolMember> & { id: string }) => {
      const { error } = await db.from("ld_pool_members").update(rest).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "ld_pool", entity_id: id,
        action: `member_${(rest as any).pool_status ?? "updated"}`,
        performed_by: user?.id, details: rest,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ld_pool_members"] });
      toast({ title: "Pool member updated" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Submission assessor / moderator assignment ────────────────────────────────

export function useAssignSubmissionStaff() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      submissionId, staffUserId, role,
    }: { submissionId: string; staffUserId: string; role: "assessor" | "moderator" }) => {
      const field = role === "assessor" ? "assessor_id" : "moderator_id";
      const { error } = await db
        .from("assessment_submissions")
        .update({ [field]: staffUserId })
        .eq("id", submissionId);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "ld_pool", entity_id: submissionId,
        action: `${role}_assigned`, performed_by: user?.id,
        details: { staff_user_id: staffUserId, role },
      });
    },
    onSuccess: (_, { role }) => {
      qc.invalidateQueries({ queryKey: ["assessment_submissions"] });
      qc.invalidateQueries({ queryKey: ["ld_pool_members"] });
      toast({ title: `${role === "assessor" ? "Assessor" : "Moderator"} assigned` });
    },
    onError: (e: any) => toast({ title: "Assignment failed", description: e.message, variant: "destructive" }),
  });
}

// ── L&D Allocations ───────────────────────────────────────────────────────────

export interface LdAllocation {
  id: string;
  pool_member_id: string;
  allocated_user_id: string;
  allocator_id: string;
  role_key: string;
  scope_type: "cohort" | "programme" | "session";
  scope_id: string | null;
  scope_label: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "revoked";
  revoked_by: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  notes: string | null;
  created_at: string;
  // joined
  allocated_profile?: { full_name: string | null };
  allocator_profile?: { full_name: string | null };
  member?: LdPoolMember;
}

export function useLdAllocations(filter?: { status?: string; allocatedUserId?: string }) {
  return useQuery({
    queryKey: ["ld_allocations", filter],
    queryFn: async () => {
      let q = db
        .from("ld_allocations")
        .select("*, member:ld_pool_members(id, role_key, user_id, display_role)")
        .order("created_at", { ascending: false });
      if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);
      if (filter?.allocatedUserId) q = q.eq("allocated_user_id", filter.allocatedUserId);
      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) return [] as LdAllocation[];

      const allUserIds = new Set<string>();
      (data as any[]).forEach((a: any) => {
        if (a.allocated_user_id) allUserIds.add(a.allocated_user_id);
        if (a.allocator_id)      allUserIds.add(a.allocator_id);
        if (a.member?.user_id)   allUserIds.add(a.member.user_id);
      });

      const { data: profiles } = await supabase
        .from("profiles").select("user_id, full_name")
        .in("user_id", [...allUserIds]);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));

      return (data as any[]).map((a: any) => ({
        ...a,
        allocator_profile:  profileMap[a.allocator_id]      ?? { full_name: null },
        allocated_profile:  profileMap[a.allocated_user_id] ?? { full_name: null },
        member: a.member ? {
          ...a.member,
          profile: profileMap[a.member.user_id] ?? { full_name: null },
        } : null,
      })) as LdAllocation[];
    },
  });
}

export function useCreateLdAllocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      pool_member_id: string;
      allocated_user_id: string;
      role_key: string;
      scope_type: "cohort" | "programme" | "session";
      scope_id?: string;
      scope_label: string;
      start_date: string;
      end_date: string;
      notes?: string;
    }) => {
      const { data: alloc, error } = await db
        .from("ld_allocations")
        .insert({ ...input, allocator_id: user?.id, status: "active" })
        .select().single();
      if (error) throw error;

      // Also create/update cohort_staff_assignments if scope is cohort
      if (input.scope_type === "cohort" && input.scope_id) {
        await db.from("cohort_staff_assignments").upsert(
          { cohort_id: input.scope_id, user_id: input.allocated_user_id,
            role: input.role_key, assigned_by: user?.id },
          { onConflict: "cohort_id,user_id,role" }
        );
      }

      await supabase.from("onboarding_audit_log").insert({
        entity_type: "ld_pool", entity_id: alloc.id,
        action: "ld_allocation_created", performed_by: user?.id,
        details: { scope_type: input.scope_type, scope_label: input.scope_label,
                   role_key: input.role_key },
      });
      return alloc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ld_allocations"] });
      qc.invalidateQueries({ queryKey: ["ld_pool_members"] });
      qc.invalidateQueries({ queryKey: ["cohort_staff_assignments"] });
      toast({ title: "Practitioner allocated successfully" });
    },
    onError: (e: any) => toast({ title: "Allocation failed", description: e.message, variant: "destructive" }),
  });
}

export function useRevokeLdAllocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await db.from("ld_allocations").update({
        status: "revoked", revoked_by: user?.id,
        revoked_at: new Date().toISOString(), revocation_reason: reason,
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "ld_pool", entity_id: id,
        action: "ld_allocation_revoked", performed_by: user?.id, details: { reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ld_allocations"] });
      toast({ title: "Allocation revoked" });
    },
    onError: (e: any) => toast({ title: "Revoke failed", description: e.message, variant: "destructive" }),
  });
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export function useLdPoolAuditLog() {
  return useQuery({
    queryKey: ["ld_pool_audit"],
    queryFn: async () => {
      const { data, error } = await db
        .from("onboarding_audit_log")
        .select("*")
        .eq("entity_type", "ld_pool")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}
