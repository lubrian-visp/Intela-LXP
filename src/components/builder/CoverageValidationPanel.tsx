import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, CheckCircle2, FolderOpen, BookOpen, FileText,
  BarChart3, ShieldAlert, Zap, XCircle, ChevronDown, ChevronRight, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentLink } from "@/hooks/useAssessmentLinks";
import type { Lesson } from "@/hooks/useLessons";

interface Assessment {
  id: string;
  title: string;
  assessment_type: string;
  assessment_category?: string;
  module_id: string | null;
  programme_id: string;
}

interface Pathway {
  id: string;
  title: string;
}

interface Module {
  id: string;
  title: string;
  pathway_id: string | null;
}

interface CoverageValidationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessments: Assessment[];
  assessmentLinks: AssessmentLink[];
  pathways: Pathway[];
  modules: Module[];
  lessons: Lesson[];
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  nodeType?: "pathway" | "module" | "lesson";
  nodeId?: string;
  nodeName?: string;
}

export function CoverageValidationPanel({
  open,
  onOpenChange,
  assessments,
  assessmentLinks,
  pathways,
  modules,
  lessons,
}: CoverageValidationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(["coverage", "balance", "issues"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  // ── Coverage Analysis ──
  const coverage = useMemo(() => {
    const tracksCovered = pathways.filter((p) =>
      assessmentLinks.some((l) => l.pathway_id === p.id)
    );
    const modulesCovered = modules.filter((m) =>
      assessmentLinks.some((l) => l.module_id === m.id)
    );
    const lessonsCovered = lessons.filter((les) =>
      assessmentLinks.some((l) => l.lesson_id === les.id)
    );

    const uncoveredTracks = pathways.filter((p) => !tracksCovered.includes(p));
    const uncoveredModules = modules.filter((m) => !modulesCovered.includes(m));
    const uncoveredLessons = lessons.filter((les) => !lessonsCovered.includes(les));

    return {
      tracks: { total: pathways.length, covered: tracksCovered.length, uncovered: uncoveredTracks },
      modules: { total: modules.length, covered: modulesCovered.length, uncovered: uncoveredModules },
      lessons: { total: lessons.length, covered: lessonsCovered.length, uncovered: uncoveredLessons },
    };
  }, [pathways, modules, lessons, assessmentLinks]);

  // ── Formative/Summative Balance ──
  const balance = useMemo(() => {
    const categories: Record<string, number> = { diagnostic: 0, formative: 0, summative: 0, transfer: 0 };
    const linkedAssessmentIds = new Set(assessmentLinks.map((l) => l.assessment_id));
    
    assessments.forEach((a) => {
      if (linkedAssessmentIds.has(a.id)) {
        const cat = a.assessment_category || "formative";
        categories[cat] = (categories[cat] || 0) + 1;
      }
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    return { categories, total };
  }, [assessments, assessmentLinks]);

  // ── Validation Issues ──
  const issues = useMemo(() => {
    const result: ValidationIssue[] = [];

    // Gap: modules with no assessment coverage (direct or inherited)
    modules.forEach((m) => {
      const hasDirectLink = assessmentLinks.some((l) => l.module_id === m.id);
      const hasTrackLink = m.pathway_id && assessmentLinks.some((l) => l.pathway_id === m.pathway_id && !l.module_id && !l.lesson_id);
      const moduleLessons = lessons.filter((les) => les.module_id === m.id);
      const hasLessonLinks = moduleLessons.some((les) => assessmentLinks.some((l) => l.lesson_id === les.id));

      if (!hasDirectLink && !hasTrackLink && !hasLessonLinks) {
        result.push({
          severity: "warning",
          category: "gap",
          message: `No assessment coverage`,
          nodeType: "module",
          nodeId: m.id,
          nodeName: m.title,
        });
      }
    });

    // Gap: lessons with no assessment
    lessons.forEach((les) => {
      const hasDirectLink = assessmentLinks.some((l) => l.lesson_id === les.id);
      const mod = modules.find((m) => m.id === les.module_id);
      const hasModuleLink = mod && assessmentLinks.some((l) => l.module_id === mod.id && !l.lesson_id);
      const hasTrackLink = mod?.pathway_id && assessmentLinks.some((l) => l.pathway_id === mod.pathway_id && !l.module_id && !l.lesson_id);

      if (!hasDirectLink && !hasModuleLink && !hasTrackLink) {
        result.push({
          severity: "info",
          category: "gap",
          message: `No assessment coverage`,
          nodeType: "lesson",
          nodeId: les.id,
          nodeName: les.title,
        });
      }
    });

    // Overload: nodes with 5+ assessments
    modules.forEach((m) => {
      const count = assessmentLinks.filter((l) => l.module_id === m.id).length;
      if (count >= 5) {
        result.push({
          severity: "warning",
          category: "overload",
          message: `${count} assessments linked (may overload learners)`,
          nodeType: "module",
          nodeId: m.id,
          nodeName: m.title,
        });
      }
    });

    lessons.forEach((les) => {
      const count = assessmentLinks.filter((l) => l.lesson_id === les.id).length;
      if (count >= 3) {
        result.push({
          severity: "warning",
          category: "overload",
          message: `${count} assessments linked to one lesson`,
          nodeType: "lesson",
          nodeId: les.id,
          nodeName: les.title,
        });
      }
    });

    // Balance: no summative assessments
    const linkedIds = new Set(assessmentLinks.map((l) => l.assessment_id));
    const linkedAssessments = assessments.filter((a) => linkedIds.has(a.id));
    const hasSummative = linkedAssessments.some((a) => a.assessment_category === "summative");
    const hasFormative = linkedAssessments.some((a) => a.assessment_category === "formative");

    if (linkedAssessments.length > 0 && !hasSummative) {
      result.push({
        severity: "error",
        category: "balance",
        message: "No summative assessments linked. Learners cannot be formally evaluated.",
      });
    }
    if (linkedAssessments.length > 0 && !hasFormative) {
      result.push({
        severity: "warning",
        category: "balance",
        message: "No formative assessments linked. Consider adding practice checks.",
      });
    }

    // Unlinked assessments
    const unlinkedCount = assessments.filter((a) => !linkedIds.has(a.id)).length;
    if (unlinkedCount > 0) {
      result.push({
        severity: "info",
        category: "orphan",
        message: `${unlinkedCount} assessment${unlinkedCount !== 1 ? "s" : ""} in the library not linked to any component.`,
      });
    }

    return result;
  }, [assessments, assessmentLinks, pathways, modules, lessons]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  const overallScore = useMemo(() => {
    const totalNodes = coverage.tracks.total + coverage.modules.total + coverage.lessons.total;
    const coveredNodes = coverage.tracks.covered + coverage.modules.covered + coverage.lessons.covered;
    if (totalNodes === 0) return 0;
    // Base coverage score
    let score = Math.round((coveredNodes / totalNodes) * 100);
    // Penalize for errors/warnings
    score = Math.max(0, score - errorCount * 15 - warningCount * 5);
    return score;
  }, [coverage, errorCount, warningCount]);

  const scoreColor = overallScore >= 80 ? "text-success" : overallScore >= 50 ? "text-warning" : "text-destructive";
  const scoreBg = overallScore >= 80 ? "bg-success" : overallScore >= 50 ? "bg-warning" : "bg-destructive";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Coverage & Validation
          </SheetTitle>
          <SheetDescription className="text-xs">
            Assessment coverage analysis and validation checks
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Overall Health Score */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-foreground">Coverage Health Score</span>
                <span className={cn("text-2xl font-bold", scoreColor)}>{overallScore}%</span>
              </div>
              <Progress value={overallScore} className="h-2 mb-3" />
              <div className="flex items-center gap-3 text-[10px]">
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <XCircle className="w-3 h-3" /> {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="flex items-center gap-1 text-warning font-medium">
                    <AlertTriangle className="w-3 h-3" /> {warningCount} warning{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
                {infoCount > 0 && (
                  <span className="flex items-center gap-1 text-info font-medium">
                    <Info className="w-3 h-3" /> {infoCount} info
                  </span>
                )}
                {issues.length === 0 && (
                  <span className="flex items-center gap-1 text-success font-medium">
                    <CheckCircle2 className="w-3 h-3" /> All checks passed
                  </span>
                )}
              </div>
            </div>

            {/* Coverage Breakdown */}
            <CollapsibleSection
              title="Coverage Breakdown"
              icon={<FolderOpen className="w-3.5 h-3.5" />}
              expanded={expandedSections.has("coverage")}
              onToggle={() => toggleSection("coverage")}
            >
              <div className="space-y-3">
                {([
                  { label: "Tracks", icon: FolderOpen, data: coverage.tracks },
                  { label: "Modules", icon: BookOpen, data: coverage.modules },
                  { label: "Lessons", icon: FileText, data: coverage.lessons },
                ] as const).map((item) => {
                  const pct = item.data.total > 0 ? Math.round((item.data.covered / item.data.total) * 100) : 0;
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <Icon className="w-3 h-3 text-muted-foreground" />
                          {item.label}
                        </span>
                        <span className={cn(
                          "font-semibold",
                          pct === 100 ? "text-success" : pct > 50 ? "text-warning" : "text-destructive"
                        )}>
                          {item.data.covered}/{item.data.total} ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      {item.data.uncovered.length > 0 && (
                        <div className="pl-4 space-y-0.5">
                          {item.data.uncovered.slice(0, 5).map((node: any) => (
                            <div key={node.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <AlertTriangle className="w-2.5 h-2.5 text-warning shrink-0" />
                              <span className="truncate">{node.title}</span>
                            </div>
                          ))}
                          {item.data.uncovered.length > 5 && (
                            <span className="text-[9px] text-muted-foreground pl-4">
                              +{item.data.uncovered.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* Assessment Balance */}
            <CollapsibleSection
              title="Assessment Balance"
              icon={<Zap className="w-3.5 h-3.5" />}
              expanded={expandedSections.has("balance")}
              onToggle={() => toggleSection("balance")}
            >
              <div className="space-y-2">
                {(["diagnostic", "formative", "summative", "transfer"] as const).map((cat) => {
                  const count = balance.categories[cat] || 0;
                  const pct = balance.total > 0 ? Math.round((count / balance.total) * 100) : 0;

                  const COLORS: Record<string, string> = {
                    diagnostic: "bg-info",
                    formative: "bg-success",
                    summative: "bg-warning",
                    transfer: "bg-primary",
                  };

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className={cn("text-[9px] border", {
                          "bg-info/10 text-info border-info/20": cat === "diagnostic",
                          "bg-success/10 text-success border-success/20": cat === "formative",
                          "bg-warning/10 text-warning border-warning/20": cat === "summative",
                          "bg-primary/10 text-primary border-primary/20": cat === "transfer",
                        })}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Badge>
                        <span className="text-muted-foreground font-medium">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", COLORS[cat])} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                {balance.total === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">
                    No assessments linked yet
                  </p>
                )}

                {/* Ideal ratio hint */}
                {balance.total > 0 && (
                  <div className="mt-2 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
                    <p className="font-medium text-foreground mb-0.5">Recommended balance:</p>
                    <p>~60% Formative · ~25% Summative · ~10% Diagnostic · ~5% Transfer</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Validation Issues */}
            <CollapsibleSection
              title={`Validation Issues (${issues.length})`}
              icon={<ShieldAlert className="w-3.5 h-3.5" />}
              expanded={expandedSections.has("issues")}
              onToggle={() => toggleSection("issues")}
              badge={
                errorCount > 0
                  ? <Badge variant="destructive" className="text-[8px] px-1.5">{errorCount}</Badge>
                  : warningCount > 0
                  ? <Badge className="text-[8px] px-1.5 bg-warning text-warning-foreground">{warningCount}</Badge>
                  : null
              }
            >
              {issues.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-success mb-1.5" />
                  <p className="text-xs text-success font-medium">All validation checks passed</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Assessment coverage looks good</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {issues
                    .sort((a, b) => {
                      const order = { error: 0, warning: 1, info: 2 };
                      return order[a.severity] - order[b.severity];
                    })
                    .map((issue, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-md text-xs border",
                          issue.severity === "error" && "bg-destructive/5 border-destructive/20",
                          issue.severity === "warning" && "bg-warning/5 border-warning/20",
                          issue.severity === "info" && "bg-info/5 border-info/20"
                        )}
                      >
                        {issue.severity === "error" && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />}
                        {issue.severity === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />}
                        {issue.severity === "info" && <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          {issue.nodeName && (
                            <p className="font-medium text-foreground truncate">
                              {issue.nodeType === "module" && <BookOpen className="w-2.5 h-2.5 inline mr-1" />}
                              {issue.nodeType === "lesson" && <FileText className="w-2.5 h-2.5 inline mr-1" />}
                              {issue.nodeName}
                            </p>
                          )}
                          <p className="text-muted-foreground">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{title}</span>
        {badge}
      </button>
      {expanded && (
        <div className="px-3 py-3 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
}
