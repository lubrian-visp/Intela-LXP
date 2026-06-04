import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssessmentTypeName, AssessmentTypeRule } from "@/types/programmeTypeConfig";

export interface ProgrammeAssessmentConfigRow {
  id: string;
  programme_id: string;
  assessment_type: string;
  enabled: boolean;
  requires_moderation: boolean;
  weighting: number | null;
  max_attempts: number;
  allow_resubmission: boolean;
  pass_mark: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch the programme-level assessment configuration.
 * Falls back to the Programme Type's assessmentConfig if no overrides exist.
 */
export function useProgrammeAssessmentConfig(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["programme_assessment_config", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programme_assessment_config")
        .select("*")
        .eq("programme_id", programmeId!);
      if (error) throw error;
      return data as ProgrammeAssessmentConfigRow[];
    },
  });
}

/**
 * Upsert a programme-level assessment type config (override from Programme Type defaults).
 */
export function useUpsertProgrammeAssessmentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      programme_id: string;
      assessment_type: string;
      enabled?: boolean;
      requires_moderation?: boolean;
      weighting?: number | null;
      max_attempts?: number;
      allow_resubmission?: boolean;
      pass_mark?: number | null;
    }) => {
      const { data, error } = await supabase
        .from("programme_assessment_config")
        .upsert(input, { onConflict: "programme_id,assessment_type" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["programme_assessment_config", vars.programme_id] }),
  });
}

/**
 * Resolve the effective assessment types for a programme by merging
 * Programme Type defaults with programme-level overrides.
 */
export function resolveEffectiveAssessmentTypes(
  typeDefaults: AssessmentTypeRule[],
  programmeOverrides: ProgrammeAssessmentConfigRow[]
): AssessmentTypeRule[] {
  return typeDefaults.map((rule) => {
    const override = programmeOverrides.find((o) => o.assessment_type === rule.type);
    if (!override) return rule;
    return {
      ...rule,
      enabled: override.enabled,
      requires_moderation: override.requires_moderation,
      default_weighting: override.weighting,
      max_attempts: override.max_attempts,
      allow_resubmission: override.allow_resubmission,
    };
  });
}
