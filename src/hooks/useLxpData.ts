import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Skills ──
export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills" as any)
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; category: string; description?: string }) => {
      const { data, error } = await supabase.from("skills" as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

// ── Content Skill Tags ──
export function useContentSkillTags(filters?: { contentBlockId?: string; assessmentId?: string; programmeId?: string }) {
  return useQuery({
    queryKey: ["content_skill_tags", filters],
    queryFn: async () => {
      let q = (supabase.from("content_skill_tags" as any) as any).select("*, skills(*)");
      if (filters?.contentBlockId) q = q.eq("content_block_id", filters.contentBlockId);
      if (filters?.assessmentId) q = q.eq("assessment_id", filters.assessmentId);
      if (filters?.programmeId) q = q.eq("programme_id", filters.programmeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useTagContentWithSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { skill_id: string; content_block_id?: string; assessment_id?: string; programme_id?: string; created_by?: string }) => {
      const { data, error } = await supabase.from("content_skill_tags" as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_skill_tags"] }),
  });
}

export function useRemoveSkillTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_skill_tags" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_skill_tags"] }),
  });
}

// ── Learner Skill Profiles ──
export function useLearnerSkillProfile(learnerId?: string) {
  return useQuery({
    queryKey: ["learner_skill_profiles", learnerId],
    enabled: !!learnerId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("learner_skill_profiles" as any) as any)
        .select("*, skills(*)")
        .eq("learner_id", learnerId!);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertSkillProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { learner_id: string; skill_id: string; proficiency_level: number; target_level?: number }) => {
      const { data, error } = await supabase
        .from("learner_skill_profiles" as any)
        .upsert(input, { onConflict: "learner_id,skill_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["learner_skill_profiles", vars.learner_id] }),
  });
}

// ── User Generated Content ──
export function useUserGeneratedContent(filters?: { status?: string; authorId?: string }) {
  return useQuery({
    queryKey: ["user_generated_content", filters],
    queryFn: async () => {
      let q = supabase.from("user_generated_content" as any).select("*").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.authorId) q = q.eq("author_id", filters.authorId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateUGC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      author_id: string; title: string; description?: string;
      content_type: string; content_url?: string; file_path?: string;
      tags?: string[]; programme_id?: string;
    }) => {
      const { data, error } = await supabase.from("user_generated_content" as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_generated_content"] }),
  });
}

export function useUpdateUGC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("user_generated_content" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_generated_content"] }),
  });
}

// ── Content Ratings ──
export function useContentRatings(filters?: { contentBlockId?: string; ugcId?: string }) {
  return useQuery({
    queryKey: ["content_ratings", filters],
    queryFn: async () => {
      let q = supabase.from("content_ratings" as any).select("*").order("created_at", { ascending: false });
      if (filters?.contentBlockId) q = q.eq("content_block_id", filters.contentBlockId);
      if (filters?.ugcId) q = q.eq("ugc_id", filters.ugcId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; rating: number; review_text?: string; content_block_id?: string; ugc_id?: string }) => {
      const { data, error } = await supabase.from("content_ratings" as any).upsert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_ratings"] }),
  });
}

// ── Content Comments ──
export function useContentComments(filters?: { contentBlockId?: string; ugcId?: string }) {
  return useQuery({
    queryKey: ["content_comments", filters],
    queryFn: async () => {
      let q = supabase.from("content_comments" as any).select("*").order("created_at", { ascending: true });
      if (filters?.contentBlockId) q = q.eq("content_block_id", filters.contentBlockId);
      if (filters?.ugcId) q = q.eq("ugc_id", filters.ugcId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; body: string; content_block_id?: string; ugc_id?: string; parent_comment_id?: string }) => {
      const { data, error } = await supabase.from("content_comments" as any).insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_comments"] }),
  });
}

// ── Learning Recommendations ──
export function useLearningRecommendations(learnerId?: string) {
  return useQuery({
    queryKey: ["learning_recommendations", learnerId],
    enabled: !!learnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_recommendations" as any)
        .select("*")
        .eq("learner_id", learnerId!)
        .eq("is_dismissed", false)
        .order("relevance_score", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useDismissRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, learnerId }: { id: string; learnerId: string }) => {
      const { error } = await supabase.from("learning_recommendations" as any).update({ is_dismissed: true }).eq("id", id);
      if (error) throw error;
      return { learnerId };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["learning_recommendations", data.learnerId] }),
  });
}

// ── External Content ──
export function useExternalContentProviders() {
  return useQuery({
    queryKey: ["external_content_providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("external_content_providers" as any).select("*").eq("is_active", true);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useExternalContentItems(providerId?: string) {
  return useQuery({
    queryKey: ["external_content_items", providerId],
    queryFn: async () => {
      let q = supabase.from("external_content_items" as any).select("*, external_content_providers(provider_name)").eq("is_active", true);
      if (providerId) q = q.eq("provider_id", providerId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}
