import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const db = supabase as any;

export interface ChallengeExam {
  id: string;
  programme_id: string;
  title: string;
  description: string | null;
  passing_grade: number;
  time_limit_minutes: number;
  max_attempts: number;
  question_count: number;
  question_pool_assessment_ids: string[];
  is_active: boolean;
  on_pass_action: string;
  on_fail_action: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeExamAttempt {
  id: string;
  exam_id: string;
  learner_id: string;
  score: number | null;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
  answers: Record<string, any>;
  created_at: string;
}

export function useChallengeExams(programmeId?: string) {
  return useQuery({
    queryKey: ["challenge-exams", programmeId],
    queryFn: async () => {
      let q = db.from("challenge_exams").select("*").order("created_at", { ascending: false });
      if (programmeId) q = q.eq("programme_id", programmeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ChallengeExam[];
    },
  });
}

export function useChallengeExamAttempts(examId?: string, learnerId?: string) {
  return useQuery({
    queryKey: ["challenge-exam-attempts", examId, learnerId],
    enabled: !!examId,
    queryFn: async () => {
      let q = db.from("challenge_exam_attempts").select("*").eq("exam_id", examId).order("created_at", { ascending: false });
      if (learnerId) q = q.eq("learner_id", learnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ChallengeExamAttempt[];
    },
  });
}

export function useCreateChallengeExam() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Partial<ChallengeExam>) => {
      const { data, error } = await db
        .from("challenge_exams")
        .insert({ ...values, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-exams"] });
      toast.success("Challenge exam created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateChallengeExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ChallengeExam> & { id: string }) => {
      const { error } = await db.from("challenge_exams").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-exams"] });
      toast.success("Challenge exam updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteChallengeExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("challenge_exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-exams"] });
      toast.success("Challenge exam deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useStartChallengeAttempt() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (examId: string) => {
      const { data, error } = await db
        .from("challenge_exam_attempts")
        .insert({ exam_id: examId, learner_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-exam-attempts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSubmitChallengeAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, score, passed, answers }: { id: string; score: number; passed: boolean; answers: Record<string, any> }) => {
      const { error } = await db
        .from("challenge_exam_attempts")
        .update({ score, passed, answers, completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-exam-attempts"] });
      toast.success("Challenge exam submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
