import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIContentBlock {
  title: string;
  block_type: string;
  is_required: boolean;
  duration_minutes: number;
  content_summary: string;
}

export interface AIModule {
  title: string;
  module_type: string;
  description: string;
  duration_hours: number;
  credits: number;
  is_mandatory: boolean;
  content_blocks: AIContentBlock[];
}

export interface AIPathway {
  title: string;
  phase: string;
  modules: AIModule[];
}

export interface AICurriculumResult {
  pathways: AIPathway[];
  summary: string;
}

export function useFeatureFlag(flagKey: string) {
  return useQuery({
    queryKey: ["feature_flags", flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("is_enabled")
        .eq("flag_key", flagKey)
        .single();
      if (error) return true; // default to enabled if flag missing
      return data.is_enabled;
    },
  });
}

export function useAICurriculumImport() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [result, setResult] = useState<AICurriculumResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseDocument = async (
    file: File,
    programmeId: string,
    programmeTitle: string,
    programmeTypeConfig?: Record<string, any>
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress("Reading document...");

    try {
      // Read file as text
      let documentText = "";
      if (file.type === "application/pdf") {
        // For PDFs we send the raw text extraction hint
        documentText = await file.text();
        // If it's binary PDF, we'll just send what we can
        if (documentText.includes("%PDF")) {
          // Upload to storage and reference it
          setProgress("Uploading document...");
          const filePath = `${programmeId}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("curriculum-uploads")
            .upload(filePath, file);
          if (uploadError) throw new Error("Failed to upload document: " + uploadError.message);

          // For binary PDFs, extract what we can or notify user
          documentText = `[This is a PDF document titled "${file.name}". The user uploaded it as a curriculum outline. Please generate a reasonable programme structure based on the filename and any extractable content. If the content is not parseable, create a template structure with placeholder content that the user can customize.]`;
        }
      } else {
        documentText = await file.text();
      }

      if (!documentText.trim()) {
        throw new Error("Could not extract text from the document. Please try a .txt, .md, or plain text file.");
      }

      // Truncate very long documents
      const maxChars = 50000;
      if (documentText.length > maxChars) {
        documentText = documentText.substring(0, maxChars) + "\n\n[Document truncated at 50,000 characters]";
      }

      setProgress("AI is analyzing your curriculum...");

      const { data, error: fnError } = await supabase.functions.invoke("ai-curriculum-import", {
        body: {
          documentText,
          programmeId,
          programmeTitle,
          programmeTypeConfig,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || "AI processing failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.pathways || !Array.isArray(data.pathways)) {
        throw new Error("AI returned an unexpected format. Please try again.");
      }

      setResult(data as AICurriculumResult);
      setProgress("Analysis complete!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error occurred";
      setError(msg);
      setProgress("");
    } finally {
      setIsProcessing(false);
    }
  };

  const commitToBuilder = async (
    programmeId: string,
    data: AICurriculumResult
  ) => {
    setIsProcessing(true);
    setProgress("Creating pathways...");
    setError(null);

    try {
      for (const pathway of data.pathways) {
        // Create pathway
        const { data: createdPathway, error: pathwayError } = await supabase
          .from("pathways")
          .insert({
            programme_id: programmeId,
            title: pathway.title,
            phase: pathway.phase,
          })
          .select()
          .single();

        if (pathwayError) throw new Error(`Failed to create pathway "${pathway.title}": ${pathwayError.message}`);

        setProgress(`Creating modules for "${pathway.title}"...`);

        for (let mi = 0; mi < pathway.modules.length; mi++) {
          const mod = pathway.modules[mi];

          // Create module
          const { data: createdModule, error: moduleError } = await supabase
            .from("programme_modules")
            .insert({
              programme_id: programmeId,
              pathway_id: createdPathway.id,
              title: mod.title,
              module_type: mod.module_type,
              description: mod.description,
              duration_hours: mod.duration_hours,
              credits: mod.credits,
              is_mandatory: mod.is_mandatory,
              sequence_order: mi + 1,
            })
            .select()
            .single();

          if (moduleError) throw new Error(`Failed to create module "${mod.title}": ${moduleError.message}`);

          // Create content blocks
          if (mod.content_blocks && mod.content_blocks.length > 0) {
            const blocks = mod.content_blocks.map((block, bi) => ({
              module_id: createdModule.id,
              title: block.title,
              block_type: block.block_type,
              is_required: block.is_required,
              duration_minutes: block.duration_minutes,
              sequence_order: bi + 1,
              content: { summary: block.content_summary },
            }));

            const { error: blocksError } = await supabase
              .from("content_blocks")
              .insert(blocks);

            if (blocksError) throw new Error(`Failed to create content blocks for "${mod.title}": ${blocksError.message}`);
          }
        }
      }

      setProgress("Import complete!");
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setProgress("");
    setIsProcessing(false);
  };

  return {
    isProcessing,
    progress,
    result,
    error,
    parseDocument,
    commitToBuilder,
    reset,
  };
}
