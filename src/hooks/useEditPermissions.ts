import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ── Check if current user can edit a programme's content ──────
export function useCanEditProgrammeContent(programmeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["can-edit-programme-content", user?.id, programmeId],
    queryFn: async () => {
      if (!user?.id || !programmeId) return false;
      const { data, error } = await supabase.rpc("can_edit_programme_content", {
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

// ── List edit permissions for a programme ─────────────────────
export function useProgrammeEditPermissions(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme-edit-permissions", programmeId],
    queryFn: async () => {
      const query = supabase
        .from("programme_edit_permissions" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (programmeId) {
        // Get both programme-specific and global grants
        query.or(`programme_id.eq.${programmeId},programme_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!programmeId,
  });
}

// ── Grant edit permission ─────────────────────────────────────
export function useGrantEditPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      programmeId: string | null;
      granteeId: string;
      reason?: string;
      expiresAt?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("programme_edit_permissions" as any).insert({
        programme_id: params.programmeId,
        grantee_id: params.granteeId,
        granted_by: user.id,
        permission_type: "content_edit",
        scope: params.programmeId ? "programme" : "global",
        reason: params.reason ?? null,
        expires_at: params.expiresAt ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-edit-permissions"] });
      qc.invalidateQueries({ queryKey: ["can-edit-programme-content"] });
      toast.success("Edit permission granted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to grant permission");
    },
  });
}

// ── Revoke edit permission ────────────────────────────────────
export function useRevokeEditPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { permissionId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("programme_edit_permissions" as any)
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          reason: params.reason ?? "Revoked by administrator",
        })
        .eq("id", params.permissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-edit-permissions"] });
      qc.invalidateQueries({ queryKey: ["can-edit-programme-content"] });
      toast.success("Edit permission revoked");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke permission");
    },
  });
}
