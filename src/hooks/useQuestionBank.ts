import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface QuestionBank {
  id: string;
  name: string;
  description: string | null;
  programme_id: string | null;
  folder_path: string;
  created_by: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankItem {
  id: string;
  bank_id: string;
  question_text: string;
  question_type: string;
  points: number;
  difficulty_level: string | null;
  explanation: string | null;
  options: any;
  matching_pairs: any;
  ordering_items: any;
  fill_blanks: any;
  likert_config: any;
  tags: string[];
  learning_outcome_ids: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useQuestionBanks(programmeId?: string) {
  return useQuery({
    queryKey: ["question_banks", programmeId],
    queryFn: async () => {
      let query = supabase.from("question_banks").select("*").order("created_at", { ascending: false });
      if (programmeId) {
        query = query.or(`programme_id.eq.${programmeId},is_shared.eq.true`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as QuestionBank[];
    },
  });
}

export function useQuestionBankItems(bankId: string | undefined) {
  return useQuery({
    queryKey: ["question_bank_items", bankId],
    enabled: !!bankId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("question_bank_items")
        .select("*")
        .eq("bank_id", bankId!)
        .order("created_at");
      if (error) throw error;
      return data as QuestionBankItem[];
    },
  });
}

export function useCreateQuestionBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; programme_id?: string; is_shared?: boolean }) => {
      const { data, error } = await supabase.from("question_banks").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["question_banks"] });
      toast.success("Question bank created");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useCreateQuestionBankItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<QuestionBankItem> & { bank_id: string; question_text: string; question_type: string }) => {
      const { data, error } = await supabase.from("question_bank_items").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["question_bank_items", vars.bank_id] });
      toast.success("Question added to bank");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteQuestionBankItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; bank_id: string }) => {
      const { error } = await supabase.from("question_bank_items").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["question_bank_items", vars.bank_id] });
      toast.success("Question removed");
    },
  });
}

/** Import a question bank item into a quiz assessment */
export function useImportBankItemToQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { item: QuestionBankItem; assessment_id: string; sequence_order: number }) => {
      const { item, assessment_id, sequence_order } = input;
      // Build metadata for typed questions (matching/ordering/fill_blank/numerical)
      const metadata: any = {};
      if (item.question_type === "matching" && Array.isArray(item.matching_pairs)) {
        metadata.pairs = item.matching_pairs.map((p: any) => ({
          left: p.left || p.term || "",
          right: p.right || p.definition || "",
        }));
      } else if (item.question_type === "ordering" && Array.isArray(item.ordering_items)) {
        metadata.items = item.ordering_items.map((i: any) =>
          typeof i === "string" ? i : i.text || ""
        );
      } else if ((item.question_type === "fill_blank" || item.question_type === "fill_in_blank") && item.fill_blanks) {
        const blanks = Array.isArray(item.fill_blanks) ? item.fill_blanks : [item.fill_blanks];
        metadata.blanks = blanks.map((b: any) => ({
          answers: Array.isArray(b.answers) ? b.answers : [b.answer || ""],
          case_sensitive: !!b.case_sensitive,
        }));
      }

      // Normalise legacy "fill_in_blank" → "fill_blank"
      const qtype = item.question_type === "fill_in_blank" ? "fill_blank" : item.question_type;

      // Create quiz_question from bank item
      const { data: question, error } = await supabase
        .from("quiz_questions")
        .insert({
          assessment_id,
          question_text: item.question_text,
          question_type: qtype,
          points: item.points,
          sequence_order,
          explanation: item.explanation,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert options if they exist (only for choice-style types)
      const options = Array.isArray(item.options) ? item.options : [];
      if (options.length > 0 && (qtype === "multiple_choice" || qtype === "true_false" || qtype === "multiple_select")) {
        const optionsData = options.map((o: any, i: number) => ({
          question_id: (question as any).id,
          option_text: o.option_text || o.text || "",
          is_correct: o.is_correct || false,
          sequence_order: i,
        }));
        const { error: optErr } = await supabase.from("quiz_options").insert(optionsData);
        if (optErr) throw optErr;
      }

      return question;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quiz_questions", vars.assessment_id] });
      toast.success("Question imported from bank");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
