import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useStaffOverview() {
  return useQuery({
    queryKey: ["talent_staff_overview"],
    queryFn: async () => {
      const { data: staff, error } = await db
        .from("staff_registrations")
        .select("id, full_name, email, department, role_requested, status, created_at, approved_at");
      if (error) throw error;

      const { data: roleAssignments, error: raErr } = await db
        .from("staff_role_assignments")
        .select("staff_registration_id, role_name, is_active")
        .eq("is_active", true);
      if (raErr) throw raErr;

      const { data: cohortStaff, error: csErr } = await supabase
        .from("cohort_staff_assignments")
        .select("user_id, role, cohort_id, cohorts(name, programme_id, programmes(title))");
      if (csErr) throw csErr;

      return { staff: staff ?? [], roleAssignments: roleAssignments ?? [], cohortStaff: cohortStaff ?? [] };
    },
  });
}

export function useLearnerPipeline() {
  return useQuery({
    queryKey: ["talent_learner_pipeline"],
    queryFn: async () => {
      const { data: enrolments, error } = await supabase
        .from("enrolments")
        .select("id, learner_id, status, progress_percentage, enrolled_at, completed_at, cohorts(name, programme_id, programmes(title))");
      if (error) throw error;

      const { data: registrations, error: regErr } = await db
        .from("learner_registrations")
        .select("id, full_name, email, learner_number, status, programme_id, programme_name");
      if (regErr) throw regErr;

      const { data: submissions, error: subErr } = await supabase
        .from("assessment_submissions")
        .select("id, learner_id, status, score, assessments(title, max_score, pass_mark, programme_id)");
      if (subErr) throw subErr;

      const { data: credentials, error: credErr } = await supabase
        .from("issued_credentials")
        .select("id, learner_id, programme_id, title, status, issued_at");
      if (credErr) throw credErr;

      return {
        enrolments: enrolments ?? [],
        registrations: registrations ?? [],
        submissions: submissions ?? [],
        credentials: credentials ?? [],
      };
    },
  });
}

export function useProgrammeSummaries() {
  return useQuery({
    queryKey: ["talent_programme_summaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, title, status, nqf_level, credits")
        .in("status", ["approved", "published", "active"]);
      if (error) throw error;
      return data ?? [];
    },
  });
}
