import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PoolConfig {
  id: string;
  role_key: string;
  display_name: string;
  privilege_level: number;
  can_allocate: boolean;
  is_pool_eligible: boolean;
  requires_approval: boolean;
  approval_assigned_role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PoolMember {
  id: string;
  staff_registration_id: string | null;
  user_id: string;
  role_key: string;
  pool_status: "active" | "suspended" | "removed";
  added_at: string;
  added_by: string | null;
  removed_at: string | null;
  removed_by: string | null;
  notes: string | null;
  // joined
  profile?: { full_name: string | null; avatar_url: string | null; job_title: string | null };
  config?: PoolConfig;
  active_allocations?: AdminAllocation[];
}

export interface AdminAllocation {
  id: string;
  pool_member_id: string;
  allocated_user_id: string;
  allocator_id: string;
  scope_type: "team" | "task" | "programme" | "department";
  scope_label: string;
  start_date: string;
  end_date: string;
  status: "pending_approval" | "active" | "completed" | "revoked";
  approval_task_id: string | null;
  revoked_by: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  member?: PoolMember;
  allocator_profile?: { full_name: string | null };
  allocated_profile?: { full_name: string | null };
}

export interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  details: any;
  created_at: string;
}

// ── Config hooks ──────────────────────────────────────────────────────────────

export function usePoolConfig() {
  return useQuery({
    queryKey: ["admin_pool_config"],
    queryFn: async () => {
      const { data, error } = await db
        .from("admin_pool_config")
        .select("*")
        .order("privilege_level", { ascending: false });
      if (error) throw error;
      return data as PoolConfig[];
    },
    staleTime: 60_000,
  });
}

export function useMyPrivilegeLevel() {
  const { user, roles } = useAuth();
  const { data: configs = [] } = usePoolConfig();
  if (!user || configs.length === 0) return 0;
  const levels = roles
    .map(r => configs.find(c => c.role_key === r && c.can_allocate && c.is_active)?.privilege_level ?? 0);
  return Math.max(0, ...levels);
}

export function useUpdatePoolConfig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<PoolConfig> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await db.from("admin_pool_config").update(rest).eq("id", id);
      if (error) throw error;
      await db.from("onboarding_audit_log").insert({
        entity_type: "admin_allocation", entity_id: id,
        action: "pool_config_updated", performed_by: user?.id,
        details: rest,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_pool_config"] });
      toast({ title: "Pool configuration updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
}

// ── Pool member hooks ─────────────────────────────────────────────────────────

export function usePoolMembers(statusFilter?: string) {
  return useQuery({
    queryKey: ["admin_pool_members", statusFilter],
    queryFn: async () => {
      // Step 1: fetch pool members + config (config has a proper FK)
      let q = db
        .from("admin_pool_members")
        .select("*, config:admin_pool_config!admin_pool_members_role_key_fkey(*)")
        .order("added_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") q = q.eq("pool_status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) return [] as PoolMember[];

      // Step 2: fetch profiles separately (no direct FK from admin_pool_members → profiles)
      const userIds = (data as any[]).map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      return (data as any[]).map((m: any) => ({
        ...m,
        profile: profileMap[m.user_id] ?? { full_name: null, avatar_url: null, job_title: null },
      })) as PoolMember[];
    },
  });
}

export function useUpdatePoolMemberStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id, status, notes,
    }: { id: string; status: "active" | "suspended" | "removed"; notes?: string }) => {
      const update: any = { pool_status: status, notes: notes ?? null };
      if (status === "removed") {
        update.removed_at = new Date().toISOString();
        update.removed_by = user?.id;
      }
      const { error } = await db.from("admin_pool_members").update(update).eq("id", id);
      if (error) throw error;
      await db.from("onboarding_audit_log").insert({
        entity_type: "admin_allocation", entity_id: id,
        action: `member_${status}`, performed_by: user?.id,
        details: { notes },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_pool_members"] });
      toast({ title: "Member status updated" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Allocation hooks ──────────────────────────────────────────────────────────

export function useAllocations(filter?: { status?: string; allocatorId?: string }) {
  return useQuery({
    queryKey: ["admin_allocations", filter],
    queryFn: async () => {
      // Step 1: fetch allocations + nested member (no profile joins — resolved separately)
      let q = db
        .from("admin_allocations")
        .select("*, member:admin_pool_members(id, role_key, user_id)")
        .order("created_at", { ascending: false });
      if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);
      if (filter?.allocatorId) q = q.eq("allocator_id", filter.allocatorId);
      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) return [] as AdminAllocation[];

      // Step 2: collect all unique user IDs (allocated, allocator, member)
      const allUserIds = new Set<string>();
      (data as any[]).forEach((a: any) => {
        if (a.allocated_user_id) allUserIds.add(a.allocated_user_id);
        if (a.allocator_id)      allUserIds.add(a.allocator_id);
        if (a.member?.user_id)   allUserIds.add(a.member.user_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", [...allUserIds]);
      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      );

      return (data as any[]).map((a: any) => ({
        ...a,
        allocator_profile:  profileMap[a.allocator_id]      ?? { full_name: null },
        allocated_profile:  profileMap[a.allocated_user_id] ?? { full_name: null },
        member: a.member ? {
          ...a.member,
          profile: profileMap[a.member.user_id] ?? { full_name: null, avatar_url: null },
        } : null,
      })) as AdminAllocation[];
    },
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const myLevel = useMyPrivilegeLevel();
  const { data: configs = [] } = usePoolConfig();

  return useMutation({
    mutationFn: async (input: {
      pool_member_id: string;
      allocated_user_id: string;
      member_role_key: string;
      scope_type: "team" | "task" | "programme" | "department";
      scope_label: string;
      start_date: string;
      end_date: string;
      notes?: string;
    }) => {
      // Privilege ceiling check: allocator must outrank the member they're allocating
      const memberConfig = configs.find(c => c.role_key === input.member_role_key);
      if (memberConfig && memberConfig.privilege_level >= myLevel) {
        throw new Error(
          `You cannot allocate a ${memberConfig.display_name} — they are at or above your privilege level.`
        );
      }

      // Determine if this allocation needs approval (based on allocator's own role config)
      const myConfig = configs.find(c => c.can_allocate && c.is_active);
      const { data: myRoleRow } = await db
        .from("user_roles").select("role").eq("user_id", user?.id).limit(1).single();
      const myRoleConfig = configs.find(c => c.role_key === myRoleRow?.role && c.can_allocate);
      const needsApproval = myRoleConfig?.requires_approval ?? false;

      const status = needsApproval ? "pending_approval" : "active";
      let approval_task_id: string | null = null;

      // Insert allocation
      const { data: allocation, error } = await db
        .from("admin_allocations")
        .insert({
          pool_member_id: input.pool_member_id,
          allocated_user_id: input.allocated_user_id,
          allocator_id: user?.id,
          scope_type: input.scope_type,
          scope_label: input.scope_label,
          start_date: input.start_date,
          end_date: input.end_date,
          notes: input.notes ?? null,
          status,
        })
        .select()
        .single();
      if (error) throw error;

      // Create approval task if needed
      if (needsApproval && myRoleConfig?.approval_assigned_role) {
        const { data: task, error: taskError } = await db
          .from("approval_tasks")
          .insert({
            title: `Approve Admin Allocation — ${input.scope_label}`,
            description: `${myRoleConfig.display_name} has requested an admin staff allocation for scope: ${input.scope_type} "${input.scope_label}". Please review and approve or reject.`,
            task_type: "admin_allocation_approval",
            reference_table: "admin_allocations",
            reference_id: allocation.id,
            requested_by: user?.id,
            assigned_role: myRoleConfig.approval_assigned_role,
            status: "pending",
          })
          .select()
          .single();
        if (!taskError && task) {
          approval_task_id = task.id;
          await db.from("admin_allocations").update({ approval_task_id: task.id }).eq("id", allocation.id);
        }
      }

      // Audit
      await db.from("onboarding_audit_log").insert({
        entity_type: "admin_allocation", entity_id: allocation.id,
        action: needsApproval ? "allocation_pending_approval" : "allocation_created",
        performed_by: user?.id,
        details: {
          scope_type: input.scope_type,
          scope_label: input.scope_label,
          start_date: input.start_date,
          end_date: input.end_date,
          allocated_user_id: input.allocated_user_id,
          requires_approval: needsApproval,
        },
      });

      return allocation;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin_allocations"] });
      qc.invalidateQueries({ queryKey: ["admin_pool_members"] });
      qc.invalidateQueries({ queryKey: ["approval_tasks"] });
      toast({ title: vars.notes !== undefined ? "Allocation created" : "Allocation created" });
    },
    onError: (e: any) => toast({ title: "Allocation failed", description: e.message, variant: "destructive" }),
  });
}

export function useRevokeAllocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await db.from("admin_allocations").update({
        status: "revoked",
        revoked_by: user?.id,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
      }).eq("id", id);
      if (error) throw error;
      await db.from("onboarding_audit_log").insert({
        entity_type: "admin_allocation", entity_id: id,
        action: "allocation_revoked", performed_by: user?.id,
        details: { reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_allocations"] });
      qc.invalidateQueries({ queryKey: ["admin_pool_members"] });
      toast({ title: "Allocation revoked" });
    },
    onError: (e: any) => toast({ title: "Revoke failed", description: e.message, variant: "destructive" }),
  });
}

export function useApproveAllocation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const status = approved ? "active" : "revoked";
      const { data: alloc, error: fetchErr } = await db
        .from("admin_allocations").select("approval_task_id").eq("id", id).single();
      if (fetchErr) throw fetchErr;

      const { error } = await db.from("admin_allocations")
        .update({ status, ...(approved ? {} : { revoked_by: user?.id, revoked_at: new Date().toISOString() }) })
        .eq("id", id);
      if (error) throw error;

      // Resolve the approval task
      if (alloc?.approval_task_id) {
        await db.from("approval_tasks").update({
          status: approved ? "approved" : "rejected",
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
        }).eq("id", alloc.approval_task_id);
      }

      await db.from("onboarding_audit_log").insert({
        entity_type: "admin_allocation", entity_id: id,
        action: approved ? "allocation_approved" : "allocation_rejected",
        performed_by: user?.id, details: {},
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_allocations"] });
      qc.invalidateQueries({ queryKey: ["approval_tasks"] });
      toast({ title: "Allocation decision saved" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export function usePoolAuditLog() {
  return useQuery({
    queryKey: ["admin_pool_audit"],
    queryFn: async () => {
      const { data, error } = await db
        .from("onboarding_audit_log")
        .select("*")
        .eq("entity_type", "admin_allocation")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}
