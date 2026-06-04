import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Data Quality Audit Hook
 *
 * Scans for orphaned records, duplicate entries, and data integrity issues
 * across critical tables. Results are computed client-side from existing
 * data to avoid needing custom server functions.
 */

interface AuditIssue {
  type: "orphan" | "duplicate" | "integrity" | "missing_data";
  table: string;
  description: string;
  severity: "critical" | "warning" | "info";
  count: number;
}

export function useDataQualityAudit() {
  return useQuery({
    queryKey: ["data-quality-audit"],
    queryFn: async (): Promise<AuditIssue[]> => {
      const issues: AuditIssue[] = [];

      // 1. Check for enrolments referencing null cohorts
      const { data: nullCohortEnrolments, count: nullCohortCount } = await supabase
        .from("enrolments")
        .select("id", { count: "exact" })
        .is("cohort_id", null);

      if ((nullCohortCount ?? 0) > 0) {
        issues.push({
          type: "orphan",
          table: "enrolments",
          description: `${nullCohortCount} enrolment(s) have no cohort assigned (cohort may have been deleted).`,
          severity: "warning",
          count: nullCohortCount ?? 0,
        });
      }

      // 2. Check for profiles without matching user_roles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .limit(500);

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p) => p.user_id);
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("user_id", userIds);

        const usersWithRoles = new Set((rolesData ?? []).map((r: any) => r.user_id));
        const noRoleCount = userIds.filter((id) => !usersWithRoles.has(id)).length;

        if (noRoleCount > 0) {
          issues.push({
            type: "missing_data",
            table: "profiles",
            description: `${noRoleCount} user profile(s) have no roles assigned.`,
            severity: "warning",
            count: noRoleCount,
          });
        }
      }

      // 3. Check for duplicate learner registrations (same email + programme)
      const { data: registrations } = await supabase
        .from("learner_registrations")
        .select("email, programme_id")
        .limit(1000);

      if (registrations) {
        const regKeys = new Map<string, number>();
        for (const reg of registrations) {
          const key = `${reg.email}:${reg.programme_id}`;
          regKeys.set(key, (regKeys.get(key) ?? 0) + 1);
        }
        const dupCount = [...regKeys.values()].filter((c) => c > 1).length;
        if (dupCount > 0) {
          issues.push({
            type: "duplicate",
            table: "learner_registrations",
            description: `${dupCount} duplicate registration(s) found (same email + programme).`,
            severity: "critical",
            count: dupCount,
          });
        }
      }

      // 4. Check for assessments with no programme link
      const { count: orphanAssessments } = await supabase
        .from("assessments")
        .select("id", { count: "exact" })
        .is("programme_id", null);

      if ((orphanAssessments ?? 0) > 0) {
        issues.push({
          type: "orphan",
          table: "assessments",
          description: `${orphanAssessments} assessment(s) have no programme assigned.`,
          severity: "critical",
          count: orphanAssessments ?? 0,
        });
      }

      // 5. Check for content blocks with no module
      const { count: orphanBlocks } = await supabase
        .from("content_blocks")
        .select("id", { count: "exact" })
        .is("module_id", null);

      if ((orphanBlocks ?? 0) > 0) {
        issues.push({
          type: "orphan",
          table: "content_blocks",
          description: `${orphanBlocks} content block(s) have no module assigned.`,
          severity: "warning",
          count: orphanBlocks ?? 0,
        });
      }

      // 6. Check for submissions without assessor
      const { count: unassessedSubs } = await supabase
        .from("assessment_submissions")
        .select("id", { count: "exact" })
        .in("status", ["assessed", "graded", "passed"])
        .is("assessor_id", null);

      if ((unassessedSubs ?? 0) > 0) {
        issues.push({
          type: "integrity",
          table: "assessment_submissions",
          description: `${unassessedSubs} graded submission(s) have no assessor assigned.`,
          severity: "warning",
          count: unassessedSubs ?? 0,
        });
      }

      return issues.sort((a, b) => {
        const sev = { critical: 0, warning: 1, info: 2 };
        return sev[a.severity] - sev[b.severity];
      });
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
