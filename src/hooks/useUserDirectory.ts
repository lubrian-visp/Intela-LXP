import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AppRole =
  | "super_admin"
  | "systems_admin"
  | "administrator"
  | "operations"
  | "programme_manager"
  | "talent_manager"
  | "facilitator"
  | "assessor"
  | "moderator"
  | "mentor"
  | "sponsor"
  | "learner";

/** Authority level per role — higher number = higher authority */
export const ROLE_AUTHORITY: Record<string, number> = {
  super_admin: 100,
  systems_admin: 90,
  administrator: 80,
  operations: 70,
  programme_manager: 60,
  talent_manager: 50,
  facilitator: 40,
  assessor: 40,
  moderator: 40,
  mentor: 40,
  sponsor: 30,
  learner: 10,
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  systems_admin: "Systems Admin",
  administrator: "Administrator",
  operations: "Operations Control",
  programme_manager: "Programme Manager",
  talent_manager: "Talent Manager",
  facilitator: "Facilitator",
  assessor: "Assessor",
  moderator: "Moderator",
  mentor: "Mentor",
  sponsor: "Sponsor",
  learner: "Learner",
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  systems_admin: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  administrator: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  programme_manager: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  talent_manager: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  facilitator: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  assessor: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  moderator: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  mentor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  sponsor: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  learner: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
};

const DIRECTORY_ACCESS_ROLES = ["super_admin", "systems_admin", "administrator", "operations", "programme_manager"];

export function getUserAuthorityLevel(userRoles: string[]): number {
  return Math.max(0, ...userRoles.map((r) => ROLE_AUTHORITY[r] ?? 0));
}

/** Returns roles the current user is allowed to see (lower authority only) */
export function getVisibleRoles(userRoles: string[]): string[] {
  const myLevel = getUserAuthorityLevel(userRoles);
  return Object.entries(ROLE_AUTHORITY)
    .filter(([, level]) => level < myLevel)
    .map(([role]) => role);
}

/** Roles the current user can disable features for */
export function getOversightTargetRoles(userRoles: string[]): string[] {
  if (userRoles.includes("super_admin")) {
    return ["systems_admin", "operations"];
  }
  if (userRoles.includes("operations")) {
    return ["programme_manager"];
  }
  return [];
}

export function hasDirectoryAccess(userRoles: string[]): boolean {
  return userRoles.some((r) => DIRECTORY_ACCESS_ROLES.includes(r));
}

export interface DirectoryUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  location: string | null;
  organisation: string | null;
  status: string;
  verified_at: string | null;
  created_at: string;
  roles: string[];
}

export function useDirectoryProfiles() {
  return useQuery({
    queryKey: ["directory-profiles"],
    queryFn: async () => {
      // Use profiles_safe view — RLS-aware and PoPIA-safe.
      // Do not request masked PII fields here: their underlying base columns
      // are intentionally not granted to authenticated users, and including
      // them blocks the whole directory query.
      const { data: profiles, error: pErr } = await (supabase as any)
        .from("profiles_safe")
        .select("id, user_id, full_name, email, avatar_url, job_title, department, location, status, verified_at, created_at")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
      if (rErr) throw rErr;

      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });

      return (profiles ?? []).map((p: any): DirectoryUser => ({
        ...p,
        phone: null,
        organisation: null,
        roles: roleMap.get(p.user_id) ?? [],
      }));
    },
  });
}

export interface OversightSetting {
  id: string;
  target_role: string;
  feature_key: string;
  is_disabled: boolean;
  disabled_by: string | null;
  disabled_at: string | null;
  reason: string | null;
}

export function useOversightSettings() {
  return useQuery({
    queryKey: ["directory-oversight-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directory_oversight_settings" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as OversightSetting[];
    },
  });
}

export function useToggleOversight() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      targetRole,
      featureKey,
      disable,
      reason,
    }: {
      targetRole: string;
      featureKey: string;
      disable: boolean;
      reason?: string;
    }) => {
      const { data: existing } = await (supabase as any)
        .from("directory_oversight_settings")
        .select("id")
        .eq("target_role", targetRole)
        .eq("feature_key", featureKey)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from("directory_oversight_settings")
          .update({
            is_disabled: disable,
            disabled_by: user?.id,
            disabled_at: disable ? new Date().toISOString() : null,
            reason: reason ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("directory_oversight_settings")
          .insert({
            target_role: targetRole,
            feature_key: featureKey,
            is_disabled: disable,
            disabled_by: user?.id,
            disabled_at: disable ? new Date().toISOString() : null,
            reason: reason ?? null,
          });
        if (error) throw error;
      }

      // Audit log
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "directory_oversight",
        entity_id: targetRole,
        action: disable ? "feature_disabled" : "feature_enabled",
        performed_by: user?.id,
        details: {
          target_role: targetRole,
          feature_key: featureKey,
          reason: reason ?? null,
        },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory-oversight-settings"] });
      toast.success("Oversight setting updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update oversight setting");
    },
  });
}
