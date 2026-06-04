import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProgrammeOption {
  id: string;
  title: string;
  status: string;
}

/**
 * Fetches programmes available for learner onboarding.
 * Only returns programmes with status 'approved' or 'published' by default.
 */
export function useProgrammesList(statuses: string[] = ["approved", "published", "draft", "pending_approval"]) {
  return useQuery({
    queryKey: ["programmes-list", statuses],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, title, status")
        .in("status", statuses)
        .order("title");
      if (error) throw error;
      return (data ?? []) as ProgrammeOption[];
    },
  });
}
