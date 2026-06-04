import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CriterionItem } from "./useAssessorReports";

export interface ReportTemplate {
  id: string;
  name: string;
  scope_level: "global" | "programme";
  programme_id: string | null;
  section2_criteria: CriterionItem[];
  section3_criteria: CriterionItem[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  section2_criteria: CriterionItem[];
  section3_criteria: CriterionItem[];
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

/** Fetch all templates (admin view) */
export function useAllReportTemplates() {
  return useQuery({
    queryKey: ["assessor_report_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessor_report_templates")
        .select("*")
        .order("scope_level", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReportTemplate[];
    },
  });
}

/** Resolve template for a programme: programme override → global fallback */
export function useResolvedTemplate(programmeId?: string) {
  return useQuery({
    queryKey: ["assessor_report_template_resolved", programmeId],
    queryFn: async () => {
      // Try programme-specific first
      if (programmeId) {
        const { data } = await supabase
          .from("assessor_report_templates")
          .select("*")
          .eq("scope_level", "programme")
          .eq("programme_id", programmeId)
          .eq("is_active", true)
          .single();
        if (data) return data as unknown as ReportTemplate;
      }
      // Fall back to global
      const { data, error } = await supabase
        .from("assessor_report_templates")
        .select("*")
        .eq("scope_level", "global")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as ReportTemplate;
    },
  });
}

/** Version history for a template */
export function useTemplateVersions(templateId?: string) {
  return useQuery({
    queryKey: ["assessor_report_template_versions", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessor_report_template_versions")
        .select("*")
        .eq("template_id", templateId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as unknown as TemplateVersion[];
    },
  });
}

export function useUpdateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReportTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("assessor_report_templates")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ReportTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessor_report_templates"] });
      qc.invalidateQueries({ queryKey: ["assessor_report_template_resolved"] });
      qc.invalidateQueries({ queryKey: ["assessor_report_template_versions"] });
    },
  });
}

export function useCreateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ReportTemplate>) => {
      const { data, error } = await supabase
        .from("assessor_report_templates")
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ReportTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessor_report_templates"] });
    },
  });
}
