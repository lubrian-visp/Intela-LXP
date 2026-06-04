import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlagiarismCheck {
  id: string;
  submission_id: string;
  learner_id: string;
  similarity_score: number;
  flagged_segments: any[];
  ai_analysis: string | null;
  status: string;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch plagiarism check for a submission */
export function usePlagiarismCheck(submissionId: string | undefined) {
  return useQuery({
    queryKey: ["plagiarism_check", submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plagiarism_checks")
        .select("*")
        .eq("submission_id", submissionId!)
        .maybeSingle();
      if (error) throw error;
      return data as PlagiarismCheck | null;
    },
  });
}

/** Fetch all plagiarism checks for an assessment */
export function useAssessmentPlagiarismChecks(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["assessment_plagiarism_checks", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      // Get all submissions for this assessment, then their plagiarism checks
      const { data: submissions, error: subErr } = await supabase
        .from("assessment_submissions")
        .select("id")
        .eq("assessment_id", assessmentId!);
      if (subErr) throw subErr;
      if (!submissions || submissions.length === 0) return [];

      const subIds = submissions.map((s: any) => s.id);
      const { data, error } = await supabase
        .from("plagiarism_checks")
        .select("*")
        .in("submission_id", subIds)
        .order("similarity_score", { ascending: false });
      if (error) throw error;
      return data as PlagiarismCheck[];
    },
  });
}

/** Run plagiarism check via AI edge function */
export function useRunPlagiarismCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      submission_id: string;
      learner_id: string;
      text_content: string;
      assessment_id: string;
    }) => {
      // Call the plagiarism check edge function
      const { data, error } = await supabase.functions.invoke("plagiarism-check", {
        body: {
          submission_id: input.submission_id,
          learner_id: input.learner_id,
          text_content: input.text_content,
          assessment_id: input.assessment_id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["plagiarism_check", vars.submission_id] });
      qc.invalidateQueries({ queryKey: ["assessment_plagiarism_checks", vars.assessment_id] });
      toast.success("Plagiarism check completed");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
