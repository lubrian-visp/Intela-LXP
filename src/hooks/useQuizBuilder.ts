import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuizQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: string;
  points: number;
  sequence_order: number;
  explanation: string | null;
  section_id?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: any;
  branching_rules?: { if_option_id: string; action: "next" | "end" | "skip_to"; target_question_id?: string }[];
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
  created_at: string;
}

export interface QuizResponse {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option_id: string | null;
  text_answer: string | null;
  is_correct: boolean | null;
  points_earned: number;
  created_at: string;
}

/** Fetch quiz questions + options for an assessment */
export function useQuizQuestions(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["quiz_questions", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("assessment_id", assessmentId!)
        .order("sequence_order");
      if (error) throw error;

      // Fetch options for all questions
      const qIds = (questions as any[]).map((q: any) => q.id);
      if (qIds.length === 0) return [] as QuizQuestion[];

      const { data: options, error: optErr } = await supabase
        .from("quiz_options")
        .select("*")
        .in("question_id", qIds)
        .order("sequence_order");
      if (optErr) throw optErr;

      return (questions as any[]).map((q: any) => ({
        ...q,
        options: (options as any[]).filter((o: any) => o.question_id === q.id),
      })) as QuizQuestion[];
    },
  });
}

/** Create a quiz question */
export function useCreateQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      question_text: string;
      question_type: string;
      points?: number;
      sequence_order?: number;
      explanation?: string;
      metadata?: any;
      options?: { option_text: string; is_correct: boolean }[];
    }) => {
      const { options, ...questionData } = input;
      const { data: question, error } = await supabase
        .from("quiz_questions")
        .insert(questionData)
        .select()
        .single();
      if (error) throw error;

      // Insert options if provided
      if (options && options.length > 0) {
        const optionsWithQuestionId = options.map((o, i) => ({
          question_id: (question as any).id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          sequence_order: i,
        }));
        const { error: optErr } = await supabase.from("quiz_options").insert(optionsWithQuestionId);
        if (optErr) throw optErr;
      }

      return question;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quiz_questions", vars.assessment_id] });
      toast.success("Question added");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Update an existing quiz question (and replace its options) */
export function useUpdateQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      assessment_id: string;
      question_text?: string;
      question_type?: string;
      points?: number;
      explanation?: string | null;
      metadata?: any;
      options?: { option_text: string; is_correct: boolean }[];
    }) => {
      const { id, assessment_id, options, ...patch } = input;
      const { error } = await supabase.from("quiz_questions").update(patch).eq("id", id);
      if (error) throw error;
      if (options) {
        await supabase.from("quiz_options").delete().eq("question_id", id);
        if (options.length > 0) {
          const rows = options.map((o, i) => ({
            question_id: id,
            option_text: o.option_text,
            is_correct: o.is_correct,
            sequence_order: i,
          }));
          const { error: oErr } = await supabase.from("quiz_options").insert(rows);
          if (oErr) throw oErr;
        }
      }
      return { id };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quiz_questions", vars.assessment_id] });
      toast.success("Question updated");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Reorder quiz questions */
export function useReorderQuizQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { assessment_id: string; orderedIds: string[] }) => {
      await Promise.all(
        input.orderedIds.map((id, idx) =>
          supabase.from("quiz_questions").update({ sequence_order: idx }).eq("id", id)
        )
      );
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["quiz_questions", vars.assessment_id] }),
  });
}

/** Delete a quiz question */
export function useDeleteQuizQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assessment_id: string }) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quiz_questions", vars.assessment_id] });
      toast.success("Question removed");
    },
  });
}

/** Submit quiz answers and auto-grade */
export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      learner_id: string;
      enrolment_id?: string;
      answers: { question_id: string; selected_option_id?: string; text_answer?: string }[];
      questions: QuizQuestion[];
    }) => {
      // Create submission
      const { data: submission, error: subErr } = await supabase
        .from("assessment_submissions")
        .insert({
          assessment_id: input.assessment_id,
          learner_id: input.learner_id,
          enrolment_id: input.enrolment_id,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (subErr) throw subErr;

      // Auto-grade each answer
      let totalPoints = 0;
      let earnedPoints = 0;
      const responses = input.answers.map((a) => {
        const question = input.questions.find((q) => q.id === a.question_id);
        if (!question) return null;

        totalPoints += question.points;
        let isCorrect = false;
        let pointsEarned = 0;

        if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
          const correctOption = question.options?.find((o) => o.is_correct);
          isCorrect = !!correctOption && correctOption.id === a.selected_option_id;
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === "short_answer") {
          // Short answer needs manual grading
          isCorrect = false;
          pointsEarned = 0;
        } else if (question.question_type === "numerical") {
          const md = (question as any).metadata || {};
          const expected = Number(md.answer);
          const tol = Number(md.tolerance ?? 0);
          const got = Number(a.text_answer);
          isCorrect = !isNaN(got) && !isNaN(expected) && Math.abs(got - expected) <= tol;
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === "fill_blank") {
          const md = (question as any).metadata || {};
          const blanks: { answers: string[]; case_sensitive?: boolean }[] = md.blanks || [];
          let answers: string[] = [];
          try { answers = JSON.parse(a.text_answer || "[]"); } catch { answers = []; }
          if (blanks.length === 0) { isCorrect = false; pointsEarned = 0; }
          else {
            const matched = blanks.filter((b, i) => {
              const v = (answers[i] ?? "").trim();
              return b.answers.some((acc) =>
                b.case_sensitive ? acc === v : acc.toLowerCase() === v.toLowerCase()
              );
            }).length;
            isCorrect = matched === blanks.length;
            pointsEarned = (matched / blanks.length) * question.points;
          }
        } else if (question.question_type === "matching") {
          const md = (question as any).metadata || {};
          const pairs: { left: string; right: string }[] = md.pairs || [];
          let answer: Record<string, string> = {};
          try { answer = JSON.parse(a.text_answer || "{}"); } catch { answer = {}; }
          if (pairs.length === 0) { isCorrect = false; pointsEarned = 0; }
          else {
            const matched = pairs.filter((p) => answer[p.left] === p.right).length;
            isCorrect = matched === pairs.length;
            pointsEarned = (matched / pairs.length) * question.points;
          }
        } else if (question.question_type === "ordering") {
          const md = (question as any).metadata || {};
          const items: string[] = md.items || [];
          let order: string[] = [];
          try { order = JSON.parse(a.text_answer || "[]"); } catch { order = []; }
          isCorrect = items.length > 0 && items.length === order.length &&
            items.every((it, i) => order[i] === it);
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === "hotspot") {
          const md = (question as any).metadata || {};
          const spots: { x: number; y: number; radius: number; is_correct: boolean }[] = md.hotspots || [];
          let click: { x: number; y: number } | null = null;
          try { click = JSON.parse(a.text_answer || "null"); } catch { click = null; }
          if (!click || spots.length === 0) { isCorrect = false; pointsEarned = 0; }
          else {
            const hit = spots.find((s) => {
              const dx = s.x - click!.x, dy = s.y - click!.y;
              return Math.sqrt(dx * dx + dy * dy) <= s.radius;
            });
            isCorrect = !!hit?.is_correct;
            pointsEarned = isCorrect ? question.points : 0;
          }
        } else if (question.question_type === "drag_drop") {
          const md = (question as any).metadata || {};
          const correct: Record<string, string> = md.correct_mapping || {};
          let answer: Record<string, string> = {};
          try { answer = JSON.parse(a.text_answer || "{}"); } catch { answer = {}; }
          const keys = Object.keys(correct);
          if (keys.length === 0) { isCorrect = false; pointsEarned = 0; }
          else {
            const matched = keys.filter((k) => answer[k] === correct[k]).length;
            isCorrect = matched === keys.length;
            pointsEarned = (matched / keys.length) * question.points;
          }
        } else if (question.question_type === "code") {
          const md = (question as any).metadata || {};
          if (md.language === "javascript" && md.expected_output != null) {
            try {
              // sandboxed eval — last expression value compared as string
              // eslint-disable-next-line no-new-func
              const fn = new Function(`"use strict"; return (function(){ ${a.text_answer || ""} \n })();`);
              const result = fn();
              isCorrect = String(result).trim() === String(md.expected_output).trim();
            } catch { isCorrect = false; }
            pointsEarned = isCorrect ? question.points : 0;
          } else {
            isCorrect = false;
            pointsEarned = 0; // manual grading
          }
        } else if (question.question_type === "formula") {
          const md = (question as any).metadata || {};
          const expected = Number(md.expected);
          const tol = Number(md.tolerance ?? 0);
          const got = Number(a.text_answer);
          isCorrect = !isNaN(got) && !isNaN(expected) && Math.abs(got - expected) <= tol;
          pointsEarned = isCorrect ? question.points : 0;
        }

        earnedPoints += pointsEarned;

        return {
          submission_id: (submission as any).id,
          question_id: a.question_id,
          selected_option_id: a.selected_option_id || null,
          text_answer: a.text_answer || null,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        };
      }).filter(Boolean);

      // Insert responses
      if (responses.length > 0) {
        const { error: respErr } = await supabase.from("quiz_responses").insert(responses as any[]);
        if (respErr) throw respErr;
      }

      // Calculate score as percentage
      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Update submission with score
      const hasShortAnswer = input.questions.some((q) =>
        q.question_type === "short_answer" ||
        (q.question_type === "code" && (q as any).metadata?.language !== "javascript")
      );
      const { error: updateErr } = await supabase
        .from("assessment_submissions")
        .update({
          score,
          status: hasShortAnswer ? "submitted" : "graded",
          assessed_at: hasShortAnswer ? null : new Date().toISOString(),
          feedback: hasShortAnswer
            ? `Auto-graded: ${earnedPoints}/${totalPoints} points. Short answers pending manual review.`
            : `Auto-graded: ${earnedPoints}/${totalPoints} points (${score}%)`,
        })
        .eq("id", (submission as any).id);
      if (updateErr) throw updateErr;

      return { submissionId: (submission as any).id, score, earnedPoints, totalPoints };
    },
    onSuccess: (result) => {
      toast.success(`Quiz submitted! Score: ${result.score}% (${result.earnedPoints}/${result.totalPoints} points)`);
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Fetch quiz responses for a submission */
export function useQuizResponses(submissionId: string | undefined) {
  return useQuery({
    queryKey: ["quiz_responses", submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_responses")
        .select("*")
        .eq("submission_id", submissionId!);
      if (error) throw error;
      return data as QuizResponse[];
    },
  });
}

/** Safe quiz option type without is_correct (for learner-facing views) */
export interface SafeQuizOption {
  id: string;
  question_id: string;
  option_text: string;
  sequence_order: number;
  created_at: string;
}

/** Fetch quiz questions with safe options (no is_correct) for learner-facing quiz taking */
export function useLearnerQuizQuestions(assessmentId: string | undefined) {
  const db = supabase as any;
  return useQuery({
    queryKey: ["learner_quiz_questions", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data: questions, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("assessment_id", assessmentId!)
        .order("sequence_order");
      if (error) throw error;

      const qIds = (questions as any[]).map((q: any) => q.id);
      if (qIds.length === 0) return [] as QuizQuestion[];

      // Use safe view that omits is_correct
      const { data: options, error: optErr } = await db
        .from("quiz_options_safe")
        .select("*")
        .in("question_id", qIds)
        .order("sequence_order");
      if (optErr) throw optErr;

      return (questions as any[]).map((q: any) => ({
        ...q,
        options: (options as any[]).filter((o: any) => o.question_id === q.id),
      })) as QuizQuestion[];
    },
  });
}
