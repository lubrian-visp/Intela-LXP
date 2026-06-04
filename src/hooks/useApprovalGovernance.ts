import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ApprovalAuthority {
  canApprove: boolean;
  canEnrol: boolean;
  reason: string | null;
  authoritySource: "super_admin" | "operations" | "programme_manager" | "delegated" | null;
}

/**
 * Checks if the current user can approve a specific registration.
 * Enforces:
 *  - Four-eyes: registerer ≠ approver
 *  - Role-based: Super Admin, Operations (global), Programme Manager (own programmes)
 *  - Delegation: staff delegated by Ops Control via delegated_approvers table
 */
export function useCanApproveRegistration(
  registrationId: string | null,
  registeredBy: string | null | undefined,
  programmeId: string | null | undefined
): ApprovalAuthority {
  const { user, roles } = useAuth();

  const { data: delegations } = useQuery({
    queryKey: ["delegated_approvers_for_user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delegated_approvers")
        .select("*")
        .eq("delegated_user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: managedProgrammes } = useQuery({
    queryKey: ["managed_programmes", user?.id],
    enabled: !!user?.id && roles.includes("programme_manager"),
    queryFn: async () => {
      // Programmes this PM created
      const { data, error } = await (supabase as any)
        .from("programmes")
        .select("id")
        .eq("created_by", user!.id);
      if (error) throw error;
      return (data || []).map((p: any) => p.id as string);
    },
  });

  if (!user || !registrationId) {
    return { canApprove: false, canEnrol: false, reason: "Not authenticated", authoritySource: null };
  }

  // Four-eyes check
  if (registeredBy && registeredBy === user.id) {
    return {
      canApprove: false,
      canEnrol: false,
      reason: "Four-Eyes Principle: You registered this learner and cannot also approve them.",
      authoritySource: null,
    };
  }

  // Super Admin
  if (roles.includes("super_admin")) {
    return { canApprove: true, canEnrol: true, reason: null, authoritySource: "super_admin" };
  }

  // Operations Control
  if (roles.includes("operations")) {
    return { canApprove: true, canEnrol: true, reason: null, authoritySource: "operations" };
  }

  // Programme Manager — scoped to own programmes
  if (roles.includes("programme_manager")) {
    if (!programmeId) {
      return { canApprove: false, canEnrol: false, reason: "No programme assigned to this registration.", authoritySource: null };
    }
    if (managedProgrammes && managedProgrammes.includes(programmeId)) {
      return { canApprove: true, canEnrol: true, reason: null, authoritySource: "programme_manager" };
    }
    return {
      canApprove: false,
      canEnrol: false,
      reason: "You can only approve learners for programmes you manage.",
      authoritySource: null,
    };
  }

  // Delegated approver
  if (delegations && delegations.length > 0) {
    const hasValidDelegation = delegations.some((d) => {
      const notExpired = !d.expires_at || new Date(d.expires_at) > new Date();
      const scopeMatch =
        d.scope_type === "global" ||
        (d.scope_type === "programme" && d.scope_value === programmeId);
      return notExpired && scopeMatch;
    });
    if (hasValidDelegation) {
      return { canApprove: true, canEnrol: true, reason: null, authoritySource: "delegated" };
    }
  }

  return {
    canApprove: false,
    canEnrol: false,
    reason: "You do not have approval authority for this registration.",
    authoritySource: null,
  };
}

/**
 * Returns the authority source label for display in UI and audit trail
 */
export function getAuthorityLabel(source: ApprovalAuthority["authoritySource"]): string {
  switch (source) {
    case "super_admin": return "Super Admin Override";
    case "operations": return "Operations Control";
    case "programme_manager": return "Programme Manager";
    case "delegated": return "Delegated Authority";
    default: return "Unknown";
  }
}
