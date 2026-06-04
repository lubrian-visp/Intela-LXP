import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveTemplate } from "@/lib/programmeTypeTemplates";

/**
 * Scaffolds pathways, modules, and content blocks from a Programme Type template.
 * Called after programme creation.
 */
export function useScaffoldProgramme() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      programmeId,
      typeConfig,
    }: {
      programmeId: string;
      typeConfig: Record<string, any>;
    }) => {
      const template = resolveTemplate(typeConfig);

      for (const [pwIndex, pw] of template.pathways.entries()) {
        // Create pathway
        const { data: pathway, error: pwErr } = await supabase
          .from("pathways")
          .insert({
            programme_id: programmeId,
            title: pw.title,
            phase: pw.phase,
            status: "draft",
          })
          .select()
          .single();
        if (pwErr) throw pwErr;

        for (const [modIndex, mod] of pw.modules.entries()) {
          // Create module
          const { data: module, error: modErr } = await supabase
            .from("programme_modules")
            .insert({
              programme_id: programmeId,
              pathway_id: pathway.id,
              title: mod.title,
              description: mod.description ?? null,
              module_type: mod.module_type,
              credits: mod.credits ?? 0,
              duration_hours: mod.duration_hours ?? null,
              is_mandatory: mod.is_mandatory ?? true,
              sequence_order: pwIndex * 100 + modIndex + 1,
            })
            .select()
            .single();
          if (modErr) throw modErr;

          // Create suggested content blocks
          if (mod.suggested_blocks) {
            for (const [blockIndex, block] of mod.suggested_blocks.entries()) {
              await supabase.from("content_blocks").insert({
                module_id: module.id,
                title: block.title,
                block_type: block.block_type,
                is_required: block.is_required ?? true,
                duration_minutes: block.duration_minutes ?? null,
                sequence_order: blockIndex + 1,
              });
            }
          }
        }
      }

      return { programmeId };
    },
    onSuccess: ({ programmeId }) => {
      qc.invalidateQueries({ queryKey: ["pathways", programmeId] });
      qc.invalidateQueries({ queryKey: ["programme_modules", programmeId] });
      qc.invalidateQueries({ queryKey: ["content_blocks"] });
    },
  });
}
