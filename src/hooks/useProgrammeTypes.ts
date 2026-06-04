import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProgrammeType = Database["public"]["Tables"]["programme_types"]["Row"];
type ProgrammeTypeInsert = Database["public"]["Tables"]["programme_types"]["Insert"];
type ProgrammeTypeUpdate = Database["public"]["Tables"]["programme_types"]["Update"];
type Country = Database["public"]["Tables"]["countries"]["Row"];
type CountryMapping = Database["public"]["Tables"]["programme_type_country_mappings"]["Row"];
type RegulatoryBody = Database["public"]["Tables"]["regulatory_bodies"]["Row"];
type QualificationFramework = Database["public"]["Tables"]["qualification_frameworks"]["Row"];
type ComplianceRequirement = Database["public"]["Tables"]["compliance_requirements"]["Row"];
type FundingRule = Database["public"]["Tables"]["funding_rules"]["Row"];
type ReportingMandate = Database["public"]["Tables"]["reporting_mandates"]["Row"];
type IncentiveScheme = Database["public"]["Tables"]["incentive_schemes"]["Row"];

export type { ProgrammeType, Country, CountryMapping, RegulatoryBody, QualificationFramework, ComplianceRequirement, FundingRule, ReportingMandate, IncentiveScheme };

export function useProgrammeTypes() {
  return useQuery({
    queryKey: ["programme-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programme_types")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as ProgrammeType[];
    },
  });
}

export function useCountries(activeOnly = true) {
  return useQuery({
    queryKey: ["countries", activeOnly],
    queryFn: async () => {
      let query = supabase.from("countries").select("*").order("name");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as Country[];
    },
  });
}

export function useCountryMappings(programmeTypeName: string | undefined) {
  return useQuery({
    queryKey: ["country-mappings", programmeTypeName],
    queryFn: async () => {
      if (!programmeTypeName) return [];
      const { data, error } = await supabase
        .from("programme_type_country_mappings")
        .select("*, regulatory_bodies(*), qualification_frameworks(*)")
        .eq("programme_type_name", programmeTypeName)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!programmeTypeName,
  });
}

export function useCountryOverlay(countryId: string | undefined, programmeTypeName: string | undefined) {
  return useQuery({
    queryKey: ["country-overlay", countryId, programmeTypeName],
    queryFn: async () => {
      if (!countryId || !programmeTypeName) return null;

      // Get the mapping
      const { data: mapping, error: mappingErr } = await supabase
        .from("programme_type_country_mappings")
        .select("*, regulatory_bodies(*), qualification_frameworks(*)")
        .eq("country_id", countryId)
        .eq("programme_type_name", programmeTypeName)
        .eq("is_active", true)
        .maybeSingle();
      if (mappingErr) throw mappingErr;
      if (!mapping) return null;

      // Get compliance requirements for this mapping
      const { data: compliance, error: compErr } = await supabase
        .from("compliance_requirements")
        .select("*, regulatory_bodies(*)")
        .eq("mapping_id", mapping.id);
      if (compErr) throw compErr;

      // Get country regulatory framework
      const { data: framework, error: fwErr } = await supabase
        .from("country_regulatory_frameworks")
        .select("*")
        .eq("country_id", countryId)
        .eq("status", "active")
        .maybeSingle();
      if (fwErr) throw fwErr;

      // Get funding rules
      let fundingRules: FundingRule[] = [];
      if (framework) {
        const { data: funding, error: fundErr } = await supabase
          .from("funding_rules")
          .select("*")
          .eq("framework_id", framework.id)
          .eq("is_active", true);
        if (fundErr) throw fundErr;
        fundingRules = funding || [];
      }

      // Get reporting mandates
      let reportingMandates: ReportingMandate[] = [];
      if (framework) {
        const { data: reports, error: repErr } = await supabase
          .from("reporting_mandates")
          .select("*")
          .eq("framework_id", framework.id);
        if (repErr) throw repErr;
        reportingMandates = reports || [];
      }

      // Get incentive schemes
      const { data: incentives, error: incErr } = await supabase
        .from("incentive_schemes")
        .select("*")
        .eq("country_id", countryId)
        .eq("is_active", true);
      if (incErr) throw incErr;

      return {
        mapping,
        compliance: compliance || [],
        framework,
        fundingRules,
        reportingMandates,
        incentives: incentives || [],
      };
    },
    enabled: !!countryId && !!programmeTypeName,
  });
}

export function useCreateProgrammeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProgrammeTypeInsert) => {
      const { data: result, error } = await supabase
        .from("programme_types")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programme-types"] }),
  });
}

export function useUpdateProgrammeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ProgrammeTypeUpdate & { id: string }) => {
      const { data: result, error } = await supabase
        .from("programme_types")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programme-types"] }),
  });
}

export function useImpactCounts(programmeTypeId: string | undefined) {
  return useQuery({
    queryKey: ["programme-type-impact", programmeTypeId],
    queryFn: async () => {
      if (!programmeTypeId) return { cohorts: 0, learners: 0 };

      // Get all programme IDs of this type
      const { data: programmes, error: pErr } = await supabase
        .from("programmes")
        .select("id")
        .eq("programme_type_id", programmeTypeId);
      if (pErr) throw pErr;

      const programmeIds = (programmes ?? []).map(p => p.id);
      if (programmeIds.length === 0) return { cohorts: 0, learners: 0 };

      // Count cohorts
      const { count: cohortCount, error: cErr } = await supabase
        .from("cohorts")
        .select("id", { count: "exact", head: true })
        .in("programme_id", programmeIds);
      if (cErr) throw cErr;

      // Count active learners through enrolments
      const { data: cohorts, error: chErr } = await supabase
        .from("cohorts")
        .select("id")
        .in("programme_id", programmeIds);
      if (chErr) throw chErr;

      const cohortIds = (cohorts ?? []).map(c => c.id);
      let learnerCount = 0;
      if (cohortIds.length > 0) {
        const { count, error: eErr } = await supabase
          .from("enrolments")
          .select("id", { count: "exact", head: true })
          .in("cohort_id", cohortIds)
          .in("status", ["active", "enrolled"]);
        if (!eErr) learnerCount = count ?? 0;
      }

      return { cohorts: cohortCount ?? 0, learners: learnerCount };
    },
    enabled: !!programmeTypeId,
    staleTime: 30_000,
  });
}

export function useDeleteProgrammeType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("programme_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["programme-types"] }),
  });
}
