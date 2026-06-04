import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

export interface StaffRoleCatalogEntry {
  id: string;
  display_name: string;
  user_type_key: string;
  app_role_key: string;
  category: "admin" | "ld_delivery" | "specialist";
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  admin:       "Admin & Management",
  ld_delivery: "Learning & Development",
  specialist:  "Specialist Roles",
};

export function useStaffRoleCatalog(activeOnly = true) {
  return useQuery({
    queryKey: ["staff_role_catalog", activeOnly],
    queryFn: async () => {
      let q = db.from("staff_role_catalog").select("*").order("sort_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as StaffRoleCatalogEntry[];
    },
    staleTime: 60_000,
  });
}

export function useCreateStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<StaffRoleCatalogEntry, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db
        .from("staff_role_catalog")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as StaffRoleCatalogEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_role_catalog"] });
      toast({ title: "Role added to catalog" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<StaffRoleCatalogEntry> & { id: string }) => {
      const { error } = await db.from("staff_role_catalog").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_role_catalog"] });
      toast({ title: "Role updated" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("staff_role_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_role_catalog"] });
      toast({ title: "Role removed from catalog" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
