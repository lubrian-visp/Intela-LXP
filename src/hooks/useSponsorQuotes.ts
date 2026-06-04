import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSponsorQuotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_quotes" as any)
        .select("*, programmes(title, cost_per_learner), cohorts(name), countries(name, iso_code, currency_code), programme_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await supabase
        .from("sponsor_quotes" as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_quotes"] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("sponsor_quotes" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_quotes"] }),
  });
}

/** Convert an accepted quote into a draft invoice */
export function useConvertQuoteToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: any) => {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from("sponsor_invoices" as any)
        .insert({
          sponsor_id: quote.sponsor_id,
          invoice_number: invoiceNumber,
          description: `Quote ${quote.quote_number} — ${quote.learner_count} learner(s) × ${quote.currency} ${Number(quote.cost_per_learner).toLocaleString()}`,
          amount: quote.total_amount,
          currency: quote.currency,
          programme_id: quote.programme_id,
          programme_type_id: quote.programme_type_id,
          country_id: quote.country_id,
          quote_id: quote.id,
          learner_count: quote.learner_count,
          cost_per_learner: quote.cost_per_learner,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor_quotes"] });
      qc.invalidateQueries({ queryKey: ["sponsor_invoices"] });
    },
  });
}
