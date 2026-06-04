import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Country = Database["public"]["Tables"]["countries"]["Row"];
type CountryInsert = Database["public"]["Tables"]["countries"]["Insert"];
type RegulatoryBody = Database["public"]["Tables"]["regulatory_bodies"]["Row"];
type RegulatoryBodyInsert = Database["public"]["Tables"]["regulatory_bodies"]["Insert"];
type QualificationFramework = Database["public"]["Tables"]["qualification_frameworks"]["Row"];
type QualificationFrameworkInsert = Database["public"]["Tables"]["qualification_frameworks"]["Insert"];
type QualificationLevel = Database["public"]["Tables"]["qualification_levels"]["Row"];
type QualificationLevelInsert = Database["public"]["Tables"]["qualification_levels"]["Insert"];

export type { Country, RegulatoryBody, QualificationFramework, QualificationLevel };

// ── Countries ──
export function useAllCountries() {
  return useQuery({
    queryKey: ["countries-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("countries").select("*").order("name");
      if (error) throw error;
      return data as Country[];
    },
  });
}

export function useCreateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: CountryInsert) => {
      const { data, error } = await supabase.from("countries").insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["countries-all"] }),
  });
}

export function useUpdateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...d }: Partial<Country> & { id: string }) => {
      const { data, error } = await supabase.from("countries").update(d).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["countries-all"] }),
  });
}

export function useDeleteCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("countries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["countries-all"] }),
  });
}

// ── Regulatory Bodies ──
export function useRegulatoryBodies(countryId?: string) {
  return useQuery({
    queryKey: ["regulatory-bodies", countryId],
    queryFn: async () => {
      let q = supabase.from("regulatory_bodies").select("*, countries(name)").order("name");
      if (countryId) q = q.eq("country_id", countryId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRegulatoryBody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: RegulatoryBodyInsert) => {
      const { data, error } = await supabase.from("regulatory_bodies").insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regulatory-bodies"] }),
  });
}

export function useDeleteRegulatoryBody() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("regulatory_bodies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regulatory-bodies"] }),
  });
}

// ── Qualification Frameworks ──
export function useQualificationFrameworks(countryId?: string) {
  return useQuery({
    queryKey: ["qualification-frameworks", countryId],
    queryFn: async () => {
      let q = supabase.from("qualification_frameworks").select("*, countries(name)").order("name");
      if (countryId) q = q.eq("country_id", countryId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateQualificationFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: QualificationFrameworkInsert) => {
      const { data, error } = await supabase.from("qualification_frameworks").insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualification-frameworks"] }),
  });
}

export function useDeleteQualificationFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qualification_frameworks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualification-frameworks"] }),
  });
}

// ── Qualification Levels ──
export function useQualificationLevels(frameworkId?: string) {
  return useQuery({
    queryKey: ["qualification-levels", frameworkId],
    queryFn: async () => {
      if (!frameworkId) return [];
      const { data, error } = await supabase
        .from("qualification_levels")
        .select("*")
        .eq("framework_id", frameworkId)
        .order("level_number");
      if (error) throw error;
      return data as QualificationLevel[];
    },
    enabled: !!frameworkId,
  });
}

export function useCreateQualificationLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: QualificationLevelInsert) => {
      const { data, error } = await supabase.from("qualification_levels").insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualification-levels"] }),
  });
}

export function useDeleteQualificationLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("qualification_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualification-levels"] }),
  });
}
