import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssessorReportRow {
  id: string;
  assessor_id: string;
  programme_id: string;
  cohort_id: string | null;
  learner_id: string | null;
  report_mode: "cohort" | "learner";
  status: string;
  assessor_name: string | null;
  submission_date: string | null;
  client_name: string | null;
  venue: string | null;
  programme_name: string | null;
  module_us_covered: string | null;
  start_date: string | null;
  end_date: string | null;
  section2_criteria: CriterionItem[];
  section2_problems: string | null;
  section2_strengths: string | null;
  section3_criteria: CriterionItem[];
  section3_problems: string | null;
  section3_strengths: string | null;
  section3_recommendations: string | null;
  section3_evidence: string | null;
  section4_learners: LearnerOutcome[];
  section5_difficulties: string | null;
  section5_conflicts: string | null;
  section5_mentor_update: string | null;
  section5_declaration: string | null;
  assessor_signature_date: string | null;
  admin_signature_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CriterionItem {
  id: string;
  criterion: string;
  description: string;
  yes: boolean;
  no: boolean;
  comments: string;
}

export interface LearnerOutcome {
  no: number;
  surname: string;
  names: string;
  gender: string;
  id_number: string;
  outcome: "Competent" | "Not Yet Competent" | "Remedial" | "";
  comments: string;
}

// Default section 2 criteria — matches the Assessor Feedback Report template
export const defaultSection2Criteria: CriterionItem[] = [
  {
    id: "s2-1",
    criterion: "2.1 Comparisons between outcomes-based and other forms of assessment",
    description: "Comparisons between outcomes-based and another form of assessment of learning highlight key differences in terms of the underlying philosophies and approaches to assessment, including an outline of advantages and disadvantages. The assessments are integrated into teaching and learning, consisting formative and summative assessment components.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s2-2",
    criterion: "2.2 Induction of learner to programme",
    description: "Learners were inducted by the assessor. At the beginning of the course learners were introduced to the programme by the facilitator/Assessor and coordinators from the training provider.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s2-3",
    criterion: "2.3 Learner information on assessment methods",
    description: "Learners are informed of the variety of assessment methods and how they could be used when conducting assessments in different situations. Assessments were outlined to learners during the Induction programme as well as during classroom before assessments.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s2-4",
    criterion: "2.4 Key principles of assessment",
    description: "Key principles of assessment are described and illustrated in practical situations. The descriptions highlight the importance of applying the principles in terms of the possible effect on the assessment process and results.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s2-5",
    criterion: "2.5 Feedback on assessment results",
    description: "Feedback given to learners in form of written and verbal.",
    yes: false, no: false, comments: "",
  },
];

// Default section 3 criteria — matches the Assessor Feedback Report template
export const defaultSection3Criteria: CriterionItem[] = [
  {
    id: "s3-1",
    criterion: "3.1 Preparation of assessment resources, logistics, documentation and environment",
    description: "Preparation of assessment resources, logistics, documentation and environment meets the requirements of the assessment at hand and ensures fairness and safety of assessment.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s3-2",
    criterion: "3.2 Notification of parties involved",
    description: "Parties involved in the assessment are notified of assessment. Checks are carried out to ensure parties involved in the assessment are ready and available to meet required schedules.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s3-3",
    criterion: "3.3 Assessment Instruments are moderated",
    description: "Assessment Instruments are moderated.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s3-4",
    criterion: "3.4 Assessment details explained to candidates",
    description: "Assessment details are explained to candidates clearly and constructively. Opportunities for clarification are provided and responses promote understanding of the requirements.",
    yes: false, no: false, comments: "",
  },
  {
    id: "s3-5",
    criterion: "3.5 Accommodation of candidates with special needs",
    description: "Candidates with special needs are accommodated for the assessment to ensure a fair and valid assessment takes place.",
    yes: false, no: false, comments: "",
  },
];

export function useAssessorReports(assessorId?: string) {
  return useQuery({
    queryKey: ["assessor_reports", assessorId],
    enabled: !!assessorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessor_reports")
        .select("*")
        .eq("assessor_id", assessorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AssessorReportRow[];
    },
  });
}

export function useAssessorReport(id: string | undefined) {
  return useQuery({
    queryKey: ["assessor_reports", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessor_reports")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as AssessorReportRow;
    },
  });
}

export function useCreateAssessorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AssessorReportRow>) => {
      const { data, error } = await supabase
        .from("assessor_reports")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AssessorReportRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessor_reports"] }),
  });
}

export function useUpdateAssessorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AssessorReportRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("assessor_reports")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AssessorReportRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessor_reports"] }),
  });
}

export function useDeleteAssessorReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessor_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessor_reports"] }),
  });
}
