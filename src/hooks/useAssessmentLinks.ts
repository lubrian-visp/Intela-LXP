import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssessmentLink {
  id: string;
  assessment_id: string;
  pathway_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  link_type: string;
  is_inherited: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LinkType =
  | "track_only"
  | "module_only"
  | "lesson_only"
  | "track_module"
  | "track_lesson"
  | "module_lesson"
  | "track_module_lesson"
  | "combination";

/** Compute link_type from the selected scope fields */
export function computeLinkType(
  pathwayId: string | null,
  moduleId: string | null,
  lessonId: string | null
): LinkType {
  const hasTrack = !!pathwayId;
  const hasModule = !!moduleId;
  const hasLesson = !!lessonId;

  if (hasTrack && hasModule && hasLesson) return "track_module_lesson";
  if (hasTrack && hasModule) return "track_module";
  if (hasTrack && hasLesson) return "track_lesson";
  if (hasModule && hasLesson) return "module_lesson";
  if (hasTrack) return "track_only";
  if (hasModule) return "module_only";
  if (hasLesson) return "lesson_only";
  return "module_only"; // fallback
}

/** Get all assessment links for a programme's assessments */
export function useAssessmentLinks(programmeId: string | undefined) {
  return useQuery({
    queryKey: ["assessment_links", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      // Get all assessments for this programme, then get their links
      const { data: assessments, error: aErr } = await supabase
        .from("assessments")
        .select("id")
        .eq("programme_id", programmeId!);
      if (aErr) throw aErr;
      if (!assessments?.length) return [] as AssessmentLink[];

      const assessmentIds = assessments.map((a) => a.id);
      const { data, error } = await supabase
        .from("assessment_links")
        .select("*")
        .in("assessment_id", assessmentIds);
      if (error) throw error;
      return data as AssessmentLink[];
    },
  });
}

/** Get links for a specific assessment */
export function useAssessmentLinksForAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["assessment_links", "single", assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_links")
        .select("*")
        .eq("assessment_id", assessmentId!);
      if (error) throw error;
      return data as AssessmentLink[];
    },
  });
}

export function useCreateAssessmentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      assessment_id: string;
      pathway_id?: string | null;
      module_id?: string | null;
      lesson_id?: string | null;
      link_type?: string;
      created_by?: string;
    }) => {
      const linkType = input.link_type ?? computeLinkType(
        input.pathway_id ?? null,
        input.module_id ?? null,
        input.lesson_id ?? null
      );
      const { data, error } = await supabase
        .from("assessment_links")
        .insert({ ...input, link_type: linkType })
        .select()
        .single();
      if (error) throw error;
      return data as AssessmentLink;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment_links"] });
    },
  });
}

export function useDeleteAssessmentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessment_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment_links"] });
    },
  });
}

export function useBulkCreateAssessmentLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      links: {
        assessment_id: string;
        pathway_id?: string | null;
        module_id?: string | null;
        lesson_id?: string | null;
        created_by?: string;
      }[]
    ) => {
      const prepared = links.map((l) => ({
        ...l,
        link_type: computeLinkType(l.pathway_id ?? null, l.module_id ?? null, l.lesson_id ?? null),
      }));
      const { data, error } = await supabase
        .from("assessment_links")
        .insert(prepared)
        .select();
      if (error) throw error;
      return data as AssessmentLink[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment_links"] });
    },
  });
}

/**
 * Resolve which assessments are linked to a specific node.
 * Includes direct links AND inherited links (e.g., track-level assessments appear on all modules within).
 */
export function getLinksForNode(
  links: AssessmentLink[],
  nodeType: "pathway" | "module" | "lesson",
  nodeId: string,
  parentPathwayId?: string,
  parentModuleId?: string
): AssessmentLink[] {
  return links.filter((link) => {
    // Direct match
    if (nodeType === "pathway" && link.pathway_id === nodeId && !link.module_id && !link.lesson_id) return true;
    if (nodeType === "module" && link.module_id === nodeId) return true;
    if (nodeType === "lesson" && link.lesson_id === nodeId) return true;

    // Inherited: track-level links appear on modules/lessons within that track
    if (nodeType === "module" && parentPathwayId && link.pathway_id === parentPathwayId && !link.module_id && !link.lesson_id) {
      return true;
    }
    if (nodeType === "lesson" && parentPathwayId && link.pathway_id === parentPathwayId && !link.module_id && !link.lesson_id) {
      return true;
    }
    // Inherited: module-level links appear on lessons within that module
    if (nodeType === "lesson" && parentModuleId && link.module_id === parentModuleId && !link.lesson_id) {
      return true;
    }

    return false;
  });
}
