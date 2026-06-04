import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Sponsor Profile ───────────────────────────────────────────
export function useSponsorProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery({
    queryKey: ["sponsor-profile", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_profiles")
        .select("*")
        .eq("user_id", targetId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllSponsorProfiles() {
  return useQuery({
    queryKey: ["sponsor-profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSponsorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Record<string, any>) => {
      const { data, error } = await supabase
        .from("sponsor_profiles")
        .upsert(profile as any, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-profile"] });
      qc.invalidateQueries({ queryKey: ["sponsor-profiles-all"] });
      toast.success("Sponsor profile saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSponsorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
      }
      if (rejectionReason) updates.rejection_reason = rejectionReason;

      const { error } = await supabase
        .from("sponsor_profiles")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-profiles-all"] });
      toast.success("Sponsor status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Sponsor Invitations ────────────────────────────────────────
export function useSponsorInvitations() {
  return useQuery({
    queryKey: ["sponsor-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSponsorInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (invitation: { email: string; company_name: string; programme_ids?: string[]; notes?: string }) => {
      const { data, error } = await supabase
        .from("sponsor_invitations")
        .insert({ ...invitation, invited_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-invitations"] });
      toast.success("Sponsor invitation created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Sponsor Programme Links ────────────────────────────────────
export function useSponsorLinks(sponsorId?: string) {
  return useQuery({
    queryKey: ["sponsor-links", sponsorId],
    enabled: !!sponsorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_programme_links")
        .select("*")
        .eq("sponsor_id", sponsorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllSponsorLinks() {
  return useQuery({
    queryKey: ["sponsor-links-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_programme_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSponsorLink() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (link: Record<string, any>) => {
      const { data, error } = await supabase
        .from("sponsor_programme_links")
        .insert({ ...link, created_by: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-links"] });
      qc.invalidateQueries({ queryKey: ["sponsor-links-all"] });
      toast.success("Sponsor link created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteSponsorLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sponsor_programme_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor-links"] });
      qc.invalidateQueries({ queryKey: ["sponsor-links-all"] });
      toast.success("Sponsor link removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
