import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuizSection {
  id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  sequence_order: number;
  is_pool: boolean;
  pick_count: number | null;
  shuffle_questions: boolean;
  source_bank_id?: string | null;
  filter_tags?: string[] | null;
  filter_difficulty?: string[] | null;
  filter_question_types?: string[] | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

export function useQuizSections(assessmentId?: string) {
  return useQuery({
    queryKey: ["quiz_sections", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await db
        .from("quiz_sections")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("sequence_order");
      if (error) throw error;
      return data as QuizSection[];
    },
  });
}

export function useCreateQuizSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<QuizSection> & { assessment_id: string }) => {
      const { data, error } = await db.from("quiz_sections").insert(input).select().single();
      if (error) throw error;
      return data as QuizSection;
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["quiz_sections", s.assessment_id] });
      toast.success("Section added");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateQuizSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assessment_id: string; patch: Partial<QuizSection> }) => {
      const { error } = await db.from("quiz_sections").update(input.patch).eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (v) => qc.invalidateQueries({ queryKey: ["quiz_sections", v.assessment_id] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteQuizSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; assessment_id: string }) => {
      const { error } = await db.from("quiz_sections").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["quiz_sections", v.assessment_id] });
      qc.invalidateQueries({ queryKey: ["quiz_questions", v.assessment_id] });
      toast.success("Section removed");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAssignQuestionToSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question_id: string; assessment_id: string; section_id: string | null }) => {
      const { error } = await db
        .from("quiz_questions")
        .update({ section_id: input.section_id })
        .eq("id", input.question_id);
      if (error) throw error;
      return input;
    },
    onSuccess: (v) => qc.invalidateQueries({ queryKey: ["quiz_questions", v.assessment_id] }),
    onError: (e: any) => toast.error(e.message),
  });
}

/** Sample questions for a learner attempt: returns ordered list of question IDs respecting sections + pools. */
export function samplePoolQuestions(
  sections: QuizSection[],
  questions: { id: string; section_id: string | null; sequence_order: number }[]
): string[] {
  const result: string[] = [];
  // Questions with no section come first, in their natural order
  const orphans = questions
    .filter((q) => !q.section_id)
    .sort((a, b) => a.sequence_order - b.sequence_order);
  result.push(...orphans.map((q) => q.id));
  // Then by section in sequence_order
  const ordered = [...sections].sort((a, b) => a.sequence_order - b.sequence_order);
  for (const sec of ordered) {
    let inSec = questions
      .filter((q) => q.section_id === sec.id)
      .sort((a, b) => a.sequence_order - b.sequence_order);
    if (sec.shuffle_questions || sec.is_pool) {
      inSec = [...inSec].sort(() => Math.random() - 0.5);
    }
    if (sec.is_pool && sec.pick_count && sec.pick_count > 0) {
      inSec = inSec.slice(0, sec.pick_count);
    }
    result.push(...inSec.map((q) => q.id));
  }
  return result;
}

/** Sync a smart-pool section: re-import N random bank questions matching filters. */
export function useSyncSmartPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { section: QuizSection }) => {
      const sec = input.section;
      if (!sec.source_bank_id) throw new Error("No source bank configured");
      const pickCount = sec.pick_count && sec.pick_count > 0 ? sec.pick_count : 10;

      let q = db.from("question_bank_items").select("*").eq("bank_id", sec.source_bank_id);
      if (sec.filter_difficulty?.length) q = q.in("difficulty_level", sec.filter_difficulty);
      if (sec.filter_question_types?.length) q = q.in("question_type", sec.filter_question_types);
      if (sec.filter_tags?.length) q = q.overlaps("tags", sec.filter_tags);
      const { data: items, error } = await q;
      if (error) throw error;
      const pool = (items as any[]) || [];
      if (pool.length === 0) throw new Error("No bank questions match these filters");

      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, pickCount);

      await db.from("quiz_questions").delete().eq("section_id", sec.id);

      const { count } = await db
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("assessment_id", sec.assessment_id);
      let nextOrder = (count as number) || 0;

      for (const it of shuffled) {
        const metadata: any = {};
        if (it.question_type === "matching" && Array.isArray(it.matching_pairs)) {
          metadata.pairs = it.matching_pairs.map((p: any) => ({
            left: p.left || p.term || "", right: p.right || p.definition || "",
          }));
        } else if (it.question_type === "ordering" && Array.isArray(it.ordering_items)) {
          metadata.items = it.ordering_items.map((i: any) =>
            typeof i === "string" ? i : i.text || ""
          );
        } else if ((it.question_type === "fill_blank" || it.question_type === "fill_in_blank") && it.fill_blanks) {
          const blanks = Array.isArray(it.fill_blanks) ? it.fill_blanks : [it.fill_blanks];
          metadata.blanks = blanks.map((b: any) => ({
            answers: Array.isArray(b.answers) ? b.answers : [b.answer || ""],
            case_sensitive: !!b.case_sensitive,
          }));
        }
        const qtype = it.question_type === "fill_in_blank" ? "fill_blank" : it.question_type;

        const { data: question, error: qErr } = await db
          .from("quiz_questions")
          .insert({
            assessment_id: sec.assessment_id,
            section_id: sec.id,
            question_text: it.question_text,
            question_type: qtype,
            points: it.points || 1,
            sequence_order: nextOrder++,
            explanation: it.explanation,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          })
          .select().single();
        if (qErr) throw qErr;

        const options = Array.isArray(it.options) ? it.options : [];
        if (options.length > 0 && (qtype === "multiple_choice" || qtype === "true_false" || qtype === "multiple_select")) {
          const rows = options.map((o: any, i: number) => ({
            question_id: (question as any).id,
            option_text: o.option_text || o.text || "",
            is_correct: !!o.is_correct,
            sequence_order: i,
          }));
          await db.from("quiz_options").insert(rows);
        }
      }
      return { count: shuffled.length };
    },
    onSuccess: (r, vars) => {
      qc.invalidateQueries({ queryKey: ["quiz_questions", vars.section.assessment_id] });
      qc.invalidateQueries({ queryKey: ["quiz_sections", vars.section.assessment_id] });
      toast.success(`Synced ${r.count} question${r.count === 1 ? "" : "s"} from bank`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}
