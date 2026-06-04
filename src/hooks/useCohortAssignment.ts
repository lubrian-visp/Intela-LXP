import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlags } from "@/hooks/usePlatformSettings";

/**
 * Hook to determine whether cohort assignment mode is automatic or manual.
 * Reads the `system_cohort_assignment_auto` feature flag.
 * Default: manual (flag disabled).
 */
export function useCohortAssignmentMode() {
  const { data: flags, isLoading } = useFeatureFlags("system_");
  const flag = flags?.find((f) => f.flag_key === "system_cohort_assignment_auto");
  return {
    isAutomatic: flag?.is_enabled ?? false,
    isLoading,
    flagId: flag?.id,
  };
}

/**
 * Given a programmeId, find the best cohort for auto-assignment.
 * Rules:
 *   1. Must be active or planned
 *   2. Must have capacity (current enrolments < max_learners)
 *   3. Prefer earliest start_date (upcoming first)
 */
export function useAutoAssignCohort(programmeId?: string) {
  return useQuery({
    queryKey: ["auto_assign_cohort", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      // Get cohorts for this programme
      const { data: cohorts, error: cErr } = await supabase
        .from("cohorts")
        .select("*")
        .eq("programme_id", programmeId!)
        .in("status", ["active", "planned"])
        .order("start_date", { ascending: true, nullsFirst: false });
      if (cErr) throw cErr;
      if (!cohorts || cohorts.length === 0) return null;

      // Get enrolment counts per cohort
      const cohortIds = cohorts.map((c) => c.id);
      const { data: enrolments, error: eErr } = await supabase
        .from("enrolments")
        .select("cohort_id")
        .in("cohort_id", cohortIds)
        .in("status", ["active", "enrolled", "pending"]);
      if (eErr) throw eErr;

      const countMap: Record<string, number> = {};
      (enrolments ?? []).forEach((e) => {
        countMap[e.cohort_id] = (countMap[e.cohort_id] || 0) + 1;
      });

      // Find first cohort with capacity
      for (const cohort of cohorts) {
        const currentCount = countMap[cohort.id] || 0;
        const maxLearners = cohort.max_learners ?? 30;
        if (currentCount < maxLearners) {
          return {
            ...cohort,
            currentCount,
            remainingCapacity: maxLearners - currentCount,
          };
        }
      }

      return null; // All cohorts full
    },
  });
}
