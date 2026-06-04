import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface TenantInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useTenantInvitations(tenantId: string | null) {
  return useQuery({
    queryKey: ["tenant-invitations", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await db
        .from("tenant_invitations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantInvitation[];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ tenant_id, email, role }: { tenant_id: string; email: string; role: string }) => {
      const { data, error } = await db
        .from("tenant_invitations")
        .insert({ tenant_id, email: email.toLowerCase(), role, invited_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as TenantInvitation;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tenant-invitations", data.tenant_id] });
      toast.success("Invitation created. Share the link with the invitee.");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenant_id }: { id: string; tenant_id: string }) => {
      const { error } = await db
        .from("tenant_invitations")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
      return tenant_id;
    },
    onSuccess: (tenant_id) => {
      qc.invalidateQueries({ queryKey: ["tenant-invitations", tenant_id] });
      toast.success("Invitation revoked");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function getInvitationLink(token: string): string {
  return `${window.location.origin}/accept-invitation?token=${token}`;
}
