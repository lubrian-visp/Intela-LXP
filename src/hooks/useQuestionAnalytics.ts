import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QuestionStat {
  questionId: string;
  questionText: string;
  questionType: string;
  points: number;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  difficultyIndex: number; // 0-100, % correct (higher = easier)
  avgPoints: number;
  difficulty: "easy" | "medium" | "hard" | "very-hard";
}

/**
 * Item analysis for an assessment: difficulty index per question.
 * Pulls quiz_responses joined with quiz_questions.
 */
export function useQuestionAnalytics(assessmentId?: string | null) {
  return useQuery({
    queryKey: ["question-analytics", assessmentId],
    enabled: !!assessmentId,
    queryFn: async (): Promise<QuestionStat[]> => {
      if (!assessmentId) return [];

      const { data: questions, error: qErr } = await supabase
        .from("quiz_questions")
        .select("id, question_text, question_type, points")
        .eq("assessment_id", assessmentId);
      if (qErr) throw qErr;
      if (!questions?.length) return [];

      const qIds = questions.map(q => q.id);
      const { data: responses, error: rErr } = await supabase
        .from("quiz_responses")
        .select("question_id, is_correct, points_earned")
        .in("question_id", qIds);
      if (rErr) throw rErr;

      return questions.map(q => {
        const rs = (responses ?? []).filter(r => r.question_id === q.id);
        const total = rs.length;
        const correct = rs.filter(r => r.is_correct === true).length;
        const incorrect = rs.filter(r => r.is_correct === false).length;
        const difficultyIndex = total > 0 ? Math.round((correct / total) * 100) : 0;
        const avgPoints = total > 0
          ? Math.round((rs.reduce((a, r) => a + Number(r.points_earned ?? 0), 0) / total) * 10) / 10
          : 0;
        let difficulty: QuestionStat["difficulty"] = "medium";
        if (total === 0) difficulty = "medium";
        else if (difficultyIndex >= 80) difficulty = "easy";
        else if (difficultyIndex >= 50) difficulty = "medium";
        else if (difficultyIndex >= 25) difficulty = "hard";
        else difficulty = "very-hard";

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          points: Number(q.points ?? 1),
          totalAttempts: total,
          correctCount: correct,
          incorrectCount: incorrect,
          difficultyIndex,
          avgPoints,
          difficulty,
        };
      }).sort((a, b) => a.difficultyIndex - b.difficultyIndex);
    },
  });
}
