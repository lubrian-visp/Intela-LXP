import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

// ─── Types ───────────────────────────────────────────────────────
export interface FontEntry {
  id: string;
  font_source: "google" | "custom" | "system";
  family_name: string;
  category: string;
  variants: string[];
  subsets: string[];
  is_active: boolean;
  is_favorite: boolean;
  file_urls: Record<string, string>;
  license_type: string | null;
  license_expiry: string | null;
  popularity_rank: number;
  preview_text: string;
  created_at: string;
  updated_at: string;
}

export interface TypographySettings {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  wordSpacing?: string;
  textTransform: string;
}

export interface TypographyAssignment {
  id: string;
  is_draft: boolean;
  element_group: string;
  font_family: string;
  font_source: string;
  loaded_variants: string[];
  font_weight: string;
  font_style: string;
  desktop_settings: TypographySettings;
  tablet_settings: TypographySettings;
  mobile_settings: TypographySettings;
  updated_at: string;
}

export interface TypographyPreset {
  id: string;
  preset_name: string;
  description: string | null;
  category: string;
  assignments: any[];
  is_system: boolean;
  created_at: string;
}

export interface FontAuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_value: any;
  after_value: any;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

export const ELEMENT_GROUPS = [
  { key: "headings", label: "Headings", description: "H1, H2, H3, H4, H5, H6" },
  { key: "body", label: "Body Text", description: "Paragraphs, lists, general content" },
  { key: "navigation", label: "Navigation", description: "Menu items, navigation links" },
  { key: "buttons", label: "Buttons", description: "All button text" },
  { key: "forms", label: "Forms", description: "Input labels, field text, placeholders" },
  { key: "special", label: "Special", description: "Blockquotes, captions, code" },
  { key: "brand", label: "Brand", description: "Logo text, taglines" },
] as const;

export const FONT_CATEGORIES = ["sans-serif", "serif", "display", "handwriting", "monospace"] as const;

export const FONT_WEIGHTS = [
  { value: "100", label: "Thin (100)" },
  { value: "200", label: "Extra Light (200)" },
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi Bold (600)" },
  { value: "700", label: "Bold (700)" },
  { value: "800", label: "Extra Bold (800)" },
  { value: "900", label: "Black (900)" },
];

// ─── Hooks ───────────────────────────────────────────────────────

export function useFontLibrary(source?: string, category?: string, search?: string) {
  return useQuery({
    queryKey: ["font-library", source, category, search],
    queryFn: async () => {
      let q = db.from("font_library").select("*").eq("is_active", true).order("popularity_rank", { ascending: true });
      if (source) q = q.eq("font_source", source);
      if (category) q = q.eq("category", category);
      if (search) q = q.ilike("family_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as FontEntry[];
    },
  });
}

export function useFavoriteFonts() {
  return useQuery({
    queryKey: ["font-library", "favorites"],
    queryFn: async () => {
      const { data, error } = await db.from("font_library").select("*").eq("is_favorite", true).order("family_name");
      if (error) throw error;
      return data as FontEntry[];
    },
  });
}

export function useToggleFavoriteFont() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await db.from("font_library").update({ is_favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["font-library"] });
    },
  });
}

export function useAddCustomFont() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (font: { family_name: string; category: string; variants: string[]; file_urls: Record<string, string>; license_type?: string }) => {
      const { error } = await db.from("font_library").insert({
        font_source: "custom",
        ...font,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["font-library"] });
      toast({ title: "Custom font added" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add font", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteFont() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("font_library").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["font-library"] });
      toast({ title: "Font removed" });
    },
  });
}

// ─── Typography Assignments ──────────────────────────────────────

export function useTypographyAssignments(isDraft: boolean) {
  return useQuery({
    queryKey: ["typography-assignments", isDraft],
    queryFn: async () => {
      const { data, error } = await db.from("typography_assignments").select("*").eq("is_draft", isDraft).order("element_group");
      if (error) throw error;
      return data as TypographyAssignment[];
    },
  });
}

export function useUpdateTypographyAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: Partial<TypographyAssignment> & { id: string }) => {
      const { id, ...rest } = assignment;
      const { error } = await db.from("typography_assignments").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typography-assignments"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });
}

export function usePublishTypography() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Get draft assignments
      const { data: drafts, error: fetchErr } = await db.from("typography_assignments").select("*").eq("is_draft", true);
      if (fetchErr) throw fetchErr;
      
      // Delete published
      const { error: delErr } = await db.from("typography_assignments").delete().eq("is_draft", false);
      if (delErr) throw delErr;
      
      // Insert drafts as published
      for (const draft of (drafts || [])) {
        const { id, is_draft, created_at, updated_at, ...rest } = draft;
        const { error: insErr } = await db.from("typography_assignments").insert({ ...rest, is_draft: false });
        if (insErr) throw insErr;
      }

      // Audit log
      await db.from("font_audit_log").insert({
        action: "publish_typography",
        entity_type: "typography_assignments",
        after_value: drafts,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typography-assignments"] });
      toast({ title: "Typography published", description: "Changes are now live across the platform." });
    },
    onError: (err: any) => {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useRevertDraftToPublished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: published, error: fetchErr } = await db.from("typography_assignments").select("*").eq("is_draft", false);
      if (fetchErr) throw fetchErr;
      
      const { error: delErr } = await db.from("typography_assignments").delete().eq("is_draft", true);
      if (delErr) throw delErr;
      
      for (const pub of (published || [])) {
        const { id, is_draft, created_at, updated_at, ...rest } = pub;
        const { error: insErr } = await db.from("typography_assignments").insert({ ...rest, is_draft: true });
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typography-assignments"] });
      toast({ title: "Draft reverted to published state" });
    },
  });
}

// ─── Presets ─────────────────────────────────────────────────────

export function useTypographyPresets() {
  return useQuery({
    queryKey: ["typography-presets"],
    queryFn: async () => {
      const { data, error } = await db.from("typography_presets").select("*").order("is_system", { ascending: false }).order("preset_name");
      if (error) throw error;
      return data as TypographyPreset[];
    },
  });
}

export function useApplyPreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (preset: TypographyPreset) => {
      // Delete current drafts
      const { error: delErr } = await db.from("typography_assignments").delete().eq("is_draft", true);
      if (delErr) throw delErr;

      // Insert preset assignments as drafts
      for (const a of preset.assignments) {
        const { error: insErr } = await db.from("typography_assignments").insert({
          is_draft: true,
          element_group: a.element_group,
          font_family: a.font_family,
          font_source: a.font_source || "google",
          loaded_variants: a.loaded_variants || ["400", "700"],
          font_weight: a.font_weight || "400",
          desktop_settings: a.desktop_settings,
          tablet_settings: a.tablet_settings,
          mobile_settings: a.mobile_settings,
        });
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typography-assignments"] });
      toast({ title: "Preset applied to draft" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to apply preset", description: err.message, variant: "destructive" });
    },
  });
}

export function useSavePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: drafts, error: fetchErr } = await db.from("typography_assignments").select("*").eq("is_draft", true);
      if (fetchErr) throw fetchErr;

      const assignments = (drafts || []).map((d: any) => ({
        element_group: d.element_group,
        font_family: d.font_family,
        font_source: d.font_source,
        font_weight: d.font_weight,
        loaded_variants: d.loaded_variants,
        desktop_settings: d.desktop_settings,
        tablet_settings: d.tablet_settings,
        mobile_settings: d.mobile_settings,
      }));

      const { error } = await db.from("typography_presets").insert({
        preset_name: name,
        description,
        category: "custom",
        assignments,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typography-presets"] });
      toast({ title: "Preset saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save preset", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeletePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("typography_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typography-presets"] });
      toast({ title: "Preset deleted" });
    },
  });
}

// ─── Audit Log ───────────────────────────────────────────────────

export function useFontAuditLog() {
  return useQuery({
    queryKey: ["font-audit-log"],
    queryFn: async () => {
      const { data, error } = await db.from("font_audit_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as FontAuditEntry[];
    },
  });
}

// ─── Google Font Loader Utility ──────────────────────────────────

const loadedFonts = new Set<string>();

export function loadGoogleFont(family: string, weights: string[] = ["400", "700"]) {
  const key = `${family}:${weights.join(",")}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);

  const weightsParam = weights.join(";");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightsParam}&display=swap`;
  document.head.appendChild(link);
}

// ─── Export / Import ─────────────────────────────────────────────

export function exportTypographySettings(assignments: TypographyAssignment[]): string {
  return JSON.stringify({
    version: 1,
    exported_at: new Date().toISOString(),
    assignments: assignments.map(({ element_group, font_family, font_source, loaded_variants, font_weight, font_style, desktop_settings, tablet_settings, mobile_settings }) => ({
      element_group, font_family, font_source, loaded_variants, font_weight, font_style, desktop_settings, tablet_settings, mobile_settings,
    })),
  }, null, 2);
}

export function parseTypographyImport(json: string): any[] | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version === 1 && Array.isArray(parsed.assignments)) {
      return parsed.assignments;
    }
    return null;
  } catch {
    return null;
  }
}
