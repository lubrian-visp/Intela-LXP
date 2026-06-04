import { useState, useMemo } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Link2, Unlink, Search, Zap, FolderOpen, BookOpen, FileText,
  ChevronRight, Filter, Plus, Trash2, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentLink } from "@/hooks/useAssessmentLinks";
import { computeLinkType } from "@/hooks/useAssessmentLinks";
import type { Lesson } from "@/hooks/useLessons";

interface Assessment {
  id: string;
  title: string;
  assessment_type: string;
  assessment_category?: string;
  module_id: string | null;
  programme_id: string;
  max_score?: number | null;
  pass_mark?: number | null;
}

interface Pathway {
  id: string;
  title: string;
}

interface Module {
  id: string;
  title: string;
  pathway_id: string | null;
  module_type?: string | null;
}

interface AssessmentLinkingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessments: Assessment[];
  assessmentLinks: AssessmentLink[];
  pathways: Pathway[];
  modules: Module[];
  lessons: Lesson[];
  onCreateLink: (data: {
    assessment_id: string;
    pathway_id?: string | null;
    module_id?: string | null;
    lesson_id?: string | null;
  }) => void;
  onDeleteLink: (id: string) => void;
  isDraft: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  diagnostic: "bg-info/10 text-info border-info/20",
  formative: "bg-success/10 text-success border-success/20",
  summative: "bg-warning/10 text-warning border-warning/20",
  transfer: "bg-primary/10 text-primary border-primary/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic",
  formative: "Formative",
  summative: "Summative",
  transfer: "Transfer",
};

export function AssessmentLinkingPanel({
  open,
  onOpenChange,
  assessments,
  assessmentLinks,
  pathways,
  modules,
  lessons,
  onCreateLink,
  onDeleteLink,
  isDraft,
}: AssessmentLinkingPanelProps) {
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [linkPathwayId, setLinkPathwayId] = useState<string>("");
  const [linkModuleId, setLinkModuleId] = useState<string>("");
  const [linkLessonIds, setLinkLessonIds] = useState<string[]>([]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || (a as any).assessment_category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [assessments, searchQuery, categoryFilter]);

  const selectedAssessmentData = assessments.find((a) => a.id === selectedAssessment);
  const selectedLinks = assessmentLinks.filter((l) => l.assessment_id === selectedAssessment);

  // Filter modules by selected pathway
  const filteredModules = useMemo(() => {
    if (!linkPathwayId) return modules;
    return modules.filter((m) => m.pathway_id === linkPathwayId);
  }, [modules, linkPathwayId]);

  // Filter lessons by selected module
  const filteredLessons = useMemo(() => {
    if (!linkModuleId) return [];
    return lessons.filter((l) => l.module_id === linkModuleId);
  }, [lessons, linkModuleId]);

  const handleCreateLink = () => {
    if (!selectedAssessment) return;
    if (!linkPathwayId && !linkModuleId && linkLessonIds.length === 0) return;

    if (linkLessonIds.length > 0) {
      // Create individual links for each lesson
      linkLessonIds.forEach((lessonId) => {
        onCreateLink({
          assessment_id: selectedAssessment,
          pathway_id: linkPathwayId || null,
          module_id: linkModuleId || null,
          lesson_id: lessonId,
        });
      });
    } else {
      onCreateLink({
        assessment_id: selectedAssessment,
        pathway_id: linkPathwayId || null,
        module_id: linkModuleId || null,
        lesson_id: null,
      });
    }

    // Reset link form
    setLinkPathwayId("");
    setLinkModuleId("");
    setLinkLessonIds([]);
  };

  const getLinkDescription = (link: AssessmentLink) => {
    const parts: string[] = [];
    if (link.pathway_id) {
      const pw = pathways.find((p) => p.id === link.pathway_id);
      parts.push(`Track: ${pw?.title ?? "Unknown"}`);
    }
    if (link.module_id) {
      const mod = modules.find((m) => m.id === link.module_id);
      parts.push(`Module: ${mod?.title ?? "Unknown"}`);
    }
    if (link.lesson_id) {
      const les = lessons.find((l) => l.id === link.lesson_id);
      parts.push(`Lesson: ${les?.title ?? "Unknown"}`);
    }
    return parts.join(" → ");
  };

  const linkPreview = useMemo(() => {
    const parts: string[] = [];
    if (linkPathwayId) {
      const pw = pathways.find((p) => p.id === linkPathwayId);
      parts.push(`Track: ${pw?.title ?? ""}`);
    }
    if (linkModuleId) {
      const mod = modules.find((m) => m.id === linkModuleId);
      parts.push(`Module: ${mod?.title ?? ""}`);
    }
    if (linkLessonIds.length > 0) {
      const lessonNames = linkLessonIds
        .map((id) => lessons.find((l) => l.id === id)?.title ?? "")
        .filter(Boolean);
      parts.push(`Lesson(s): ${lessonNames.join(", ")}`);
    }
    return parts.join(" → ");
  }, [linkPathwayId, linkModuleId, linkLessonIds, pathways, modules, lessons]);

  const linkType = computeLinkType(
    linkPathwayId || null,
    linkModuleId || null,
    linkLessonIds.length > 0 ? linkLessonIds[0] : null
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Assessment Linking Panel
          </SheetTitle>
          <SheetDescription className="text-xs">
            Link assessments to tracks, modules, or lessons
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Assessment Library */}
          <div className="px-4 py-2 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assessments..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  <SelectItem value="diagnostic" className="text-xs">Diagnostic</SelectItem>
                  <SelectItem value="formative" className="text-xs">Formative</SelectItem>
                  <SelectItem value="summative" className="text-xs">Summative</SelectItem>
                  <SelectItem value="transfer" className="text-xs">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {/* Assessment List */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2">
                  Assessments ({filteredAssessments.length})
                </p>
                {filteredAssessments.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-4 text-center">No assessments found</p>
                ) : (
                  filteredAssessments.map((assessment) => {
                    const linkCount = assessmentLinks.filter((l) => l.assessment_id === assessment.id).length;
                    const isSelected = selectedAssessment === assessment.id;
                    const category = (assessment as any).assessment_category ?? "formative";

                    return (
                      <button
                        key={assessment.id}
                        onClick={() => setSelectedAssessment(isSelected ? null : assessment.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all text-xs",
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <Zap className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{assessment.title}</p>
                          <p className="text-[10px] text-muted-foreground">{assessment.assessment_type}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] border", CATEGORY_COLORS[category])}>
                          {CATEGORY_LABELS[category] ?? category}
                        </Badge>
                        {linkCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5">
                            <Link2 className="w-2.5 h-2.5 mr-0.5" />
                            {linkCount}
                          </Badge>
                        )}
                        <ChevronRight className={cn("w-3 h-3 transition-transform", isSelected && "rotate-90")} />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Linking Interface (when assessment selected) */}
              {selectedAssessmentData && (
                <>
                  <Separator />
                  <div className="space-y-3 px-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                      Link: {selectedAssessmentData.title}
                    </p>

                    {/* Current Links */}
                    {selectedLinks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Current Links:</p>
                        {selectedLinks.map((link) => (
                          <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-xs">
                            <Link2 className="w-3 h-3 text-primary shrink-0" />
                            <span className="flex-1 truncate">{getLinkDescription(link)}</span>
                            <Badge variant="outline" className="text-[8px]">{link.link_type.replace(/_/g, " ")}</Badge>
                            {isDraft && (
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onDeleteLink(link.id)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Link Form */}
                    {isDraft && (
                      <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                        <p className="text-[10px] font-semibold text-primary uppercase">Link to Programme Components</p>

                        {/* Track Selection */}
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" /> Track
                          </Label>
                          <Select value={linkPathwayId} onValueChange={(v) => { setLinkPathwayId(v === "none" ? "" : v); setLinkModuleId(""); setLinkLessonIds([]); }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select track (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">None</SelectItem>
                              {pathways.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Module Selection */}
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Module
                          </Label>
                          <Select value={linkModuleId} onValueChange={(v) => { setLinkModuleId(v === "none" ? "" : v); setLinkLessonIds([]); }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select module (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">None</SelectItem>
                              {filteredModules.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="text-xs">{m.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Lesson Selection (multi-select) */}
                        {linkModuleId && filteredLessons.length > 0 && (
                          <div className="space-y-1">
                            <Label className="text-[10px] flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Lesson(s)
                            </Label>
                            <div className="space-y-1 max-h-32 overflow-y-auto rounded border border-border p-1.5">
                              {filteredLessons.map((lesson) => (
                                <label key={lesson.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
                                  <Checkbox
                                    checked={linkLessonIds.includes(lesson.id)}
                                    onCheckedChange={(checked) => {
                                      setLinkLessonIds((prev) =>
                                        checked ? [...prev, lesson.id] : prev.filter((id) => id !== lesson.id)
                                      );
                                    }}
                                  />
                                  <span className="truncate">{lesson.title}</span>
                                  {lesson.duration_minutes && (
                                    <span className="text-[9px] text-muted-foreground ml-auto">{lesson.duration_minutes}m</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {linkModuleId && filteredLessons.length === 0 && (
                          <p className="text-[10px] text-muted-foreground italic px-1">
                            No lessons in this module yet. Add lessons first to link at lesson level.
                          </p>
                        )}

                        {/* Link Preview */}
                        {linkPreview && (
                          <div className="p-2 rounded bg-background border border-border">
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">Link Preview</p>
                            <p className="text-xs font-medium text-foreground">{linkPreview}</p>
                            <Badge variant="outline" className="mt-1 text-[8px]">{linkType.replace(/_/g, " ")}</Badge>
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full gap-1.5 text-xs"
                          onClick={handleCreateLink}
                          disabled={!linkPathwayId && !linkModuleId && linkLessonIds.length === 0}
                        >
                          <Plus className="w-3 h-3" />
                          Create Link
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Coverage Summary */}
              <Separator />
              <div className="px-2 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Coverage Summary</p>
                <CoverageSummary
                  pathways={pathways}
                  modules={modules}
                  lessons={lessons}
                  assessmentLinks={assessmentLinks}
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CoverageSummary({
  pathways,
  modules,
  lessons,
  assessmentLinks,
}: {
  pathways: Pathway[];
  modules: Module[];
  lessons: Lesson[];
  assessmentLinks: AssessmentLink[];
}) {
  const tracksCovered = pathways.filter((p) =>
    assessmentLinks.some((l) => l.pathway_id === p.id)
  ).length;

  const modulesCovered = modules.filter((m) =>
    assessmentLinks.some((l) => l.module_id === m.id)
  ).length;

  const lessonsCovered = lessons.filter((l) =>
    assessmentLinks.some((link) => link.lesson_id === l.id)
  ).length;

  const items = [
    { label: "Tracks", total: pathways.length, covered: tracksCovered, icon: FolderOpen },
    { label: "Modules", total: modules.length, covered: modulesCovered, icon: BookOpen },
    { label: "Lessons", total: lessons.length, covered: lessonsCovered, icon: FileText },
  ];

  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const pct = item.total > 0 ? Math.round((item.covered / item.total) * 100) : 0;
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="w-16 text-muted-foreground">{item.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct === 100 ? "bg-success" : pct > 50 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium w-16 text-right",
              pct === 100 ? "text-success" : pct > 50 ? "text-warning" : "text-destructive"
            )}>
              {item.covered}/{item.total} ({pct}%)
            </span>
            {pct === 100 ? (
              <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
            ) : item.total > 0 && item.covered < item.total ? (
              <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
