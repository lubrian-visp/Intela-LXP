/**
 * Programme Type Template Definitions
 * ────────────────────────────────────
 * Each Programme Type can define a base structure template
 * that auto-scaffolds pathways, modules, and content blocks
 * when a new programme is created.
 */

import type { ProgrammeTypeConfig } from "@/types/programmeTypeConfig";
import { resolveConfig } from "@/types/programmeTypeConfig";

export interface TemplateModule {
  title: string;
  module_type: "theory" | "practical" | "workplace";
  description?: string;
  credits?: number;
  duration_hours?: number;
  is_mandatory?: boolean;
  suggested_blocks?: {
    title: string;
    block_type: string;
    is_required?: boolean;
    duration_minutes?: number;
  }[];
}

export interface TemplatePathway {
  title: string;
  phase: "knowledge" | "practical" | "workplace";
  modules: TemplateModule[];
}

export interface ProgrammeTypeTemplate {
  pathways: TemplatePathway[];
}

/**
 * Resolve a template based on Programme Type config flags.
 * This is dynamic — it reads the config and generates appropriate structure.
 */
export function resolveTemplate(rawConfig: Record<string, any>): ProgrammeTypeTemplate {
  const config = resolveConfig(rawConfig);
  const pathways: TemplatePathway[] = [];

  // Always add a Knowledge pathway
  const knowledgeModules: TemplateModule[] = [
    {
      title: "Foundation Theory",
      module_type: "theory",
      description: "Core theoretical concepts and frameworks",
      credits: config.structural.default_credits ? Math.floor(config.structural.default_credits * 0.3) : 10,
      duration_hours: 20,
      is_mandatory: true,
      suggested_blocks: [
        { title: "Course Introduction", block_type: "text", is_required: true, duration_minutes: 15 },
        { title: "Core Concepts Video", block_type: "video", is_required: true, duration_minutes: 30 },
        { title: "Reading Material", block_type: "file", is_required: true, duration_minutes: 45 },
      ],
    },
    {
      title: "Advanced Theory",
      module_type: "theory",
      description: "In-depth subject matter expertise",
      credits: config.structural.default_credits ? Math.floor(config.structural.default_credits * 0.2) : 8,
      duration_hours: 16,
      is_mandatory: true,
      suggested_blocks: [
        { title: "Advanced Concepts", block_type: "text", is_required: true, duration_minutes: 30 },
        { title: "Case Studies", block_type: "file", is_required: true, duration_minutes: 60 },
      ],
    },
  ];

  pathways.push({
    title: "Knowledge Phase",
    phase: "knowledge",
    modules: knowledgeModules,
  });

  // Add Practical pathway if assessment is competency or project-based
  if (config.assessment === "required" || config.assessment === "optional") {
    const practicalModules: TemplateModule[] = [
      {
        title: "Practical Application",
        module_type: "practical",
        description: "Hands-on skill development and application",
        credits: config.structural.default_credits ? Math.floor(config.structural.default_credits * 0.25) : 10,
        duration_hours: 24,
        is_mandatory: true,
        suggested_blocks: [
          { title: "Practical Brief", block_type: "text", is_required: true, duration_minutes: 15 },
          { title: "Demonstration Video", block_type: "video", is_required: false, duration_minutes: 20 },
        ],
      },
    ];

    // Add assessment block if assessments are required
    if (config.assessment === "required") {
      practicalModules[0].suggested_blocks?.push(
        { title: "Skills Assessment", block_type: "assessment", is_required: true, duration_minutes: 60 }
      );
    }

    // Add PoE block if required
    if (config.poe === "required" || config.poe === "optional") {
      practicalModules[0].suggested_blocks?.push(
        { title: "Evidence Portfolio", block_type: "evidence_portfolio", is_required: config.poe === "required", duration_minutes: 120 }
      );
    }

    pathways.push({
      title: "Practical Phase",
      phase: "practical",
      modules: practicalModules,
    });
  }

  // Add Workplace pathway if workplace is required/optional
  if (config.workplace === "required" || config.workplace === "optional") {
    const workplaceModules: TemplateModule[] = [
      {
        title: "Workplace Integration",
        module_type: "workplace",
        description: "On-the-job learning and mentor-guided practice",
        credits: config.structural.default_credits ? Math.floor(config.structural.default_credits * 0.25) : 10,
        duration_hours: 40,
        is_mandatory: config.workplace === "required",
        suggested_blocks: [
          { title: "Workplace Logbook", block_type: "attendance", is_required: true, duration_minutes: 0 },
          { title: "Mentor Review", block_type: "mentor_review", is_required: true, duration_minutes: 30 },
        ],
      },
    ];

    pathways.push({
      title: "Workplace Phase",
      phase: "workplace",
      modules: workplaceModules,
    });
  }

  return { pathways };
}

/**
 * Determine which content block types are allowed for a given Programme Type config.
 */
export function getAllowedBlockTypes(rawConfig: Record<string, any>): string[] {
  const config = resolveConfig(rawConfig);
  // Base content blocks always available
  const types = ["text", "video", "scorm", "file", "document", "interactive", "image", "resource_library"];

  // Assessment blocks always available
  types.push("assessment", "assignment", "rubric");

  // Engagement blocks
  types.push("discussion");

  // Conditionally add workplace block types
  if (config.workplace === "required" || config.workplace === "optional") {
    types.push("attendance", "mentor_review", "workplace_logbook", "dual_signoff");
  }

  // Peer review — only if peer_group assessments are enabled in config
  const peerEnabled = config.assessmentConfig.allowed_types.some(
    (t) => t.type === "peer_group" && t.enabled
  );
  if (peerEnabled) {
    types.push("peer_review");
  }

  if (config.poe === "required" || config.poe === "optional") {
    types.push("evidence_portfolio");
  }

  return types;
}

/**
 * Get the allowed assessment types for a Programme Type.
 * Returns only the types that are enabled in the config.
 */
export function getAllowedAssessmentTypes(rawConfig: Record<string, any>): string[] {
  const config = resolveConfig(rawConfig);
  return config.assessmentConfig.allowed_types
    .filter((t) => t.enabled)
    .map((t) => t.type);
}

/**
 * Get governance-locked fields for a programme based on its type config.
 * Returns fields that should be read-only in the Builder.
 */
export function getLockedFields(rawConfig: Record<string, any>): Set<string> {
  const config = resolveConfig(rawConfig);
  const locked = new Set<string>();

  // Collect locked fields from all categories
  for (const category of ["structural", "financial", "compliance", "workflow", "hr"] as const) {
    for (const field of config[category].locked_fields) {
      locked.add(`${category}.${field}`);
    }
  }

  return locked;
}

/**
 * Get inherited defaults for a programme from its type config.
 */
export function getInheritedDefaults(rawConfig: Record<string, any>) {
  const config = resolveConfig(rawConfig);
  return {
    duration_months: config.structural.default_duration_months,
    credits: config.structural.default_credits,
    nqf_level: config.structural.default_nqf_level,
    workplace_percentage: config.evaluation.workplace_weight,
    theory_percentage: config.evaluation.knowledge_weight + config.evaluation.practical_weight,
  };
}
