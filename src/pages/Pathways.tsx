import { Route, Plus, ChevronRight, BookOpen, Wrench, Briefcase, Lock, Unlock, GraduationCap, ArrowRight, Clock, Users, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePathways, useProgrammes, useEnrolments } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";

const phaseIcon = {
  knowledge: BookOpen,
  practical: Wrench,
  workplace: Briefcase,
};

const phaseLabel: Record<string, string> = {
  knowledge: "Knowledge",
  practical: "Practical",
  workplace: "Workplace/Capstone",
};

const phaseColor: Record<string, string> = {
  knowledge: "text-info",
  practical: "text-accent",
  workplace: "text-success",
};

const phaseBg: Record<string, string> = {
  knowledge: "bg-info/10",
  practical: "bg-accent/10",
  workplace: "bg-success/10",
};

const phases = ["knowledge", "practical", "workplace"] as const;

export default function Pathways() {
  const [selectedProgramme, setSelectedProgramme] = useState("all");
  const [expandedPathway, setExpandedPathway] = useState<string | null>(null);

  const { data: pathways, isLoading: loadingPathways } = usePathways();
  const { data: programmes, isLoading: loadingProgrammes } = useProgrammes();
  const { data: enrolments } = useEnrolments();

  const isLoading = loadingPathways || loadingProgrammes;

  // Build programme filter list
  const programmeNames = ["all", ...new Set((pathways ?? []).map(p => {
    const prog = programmes?.find(pr => pr.id === p.programme_id);
    return prog?.title ?? "Unknown";
  }))];

  // Filter pathways
  const filtered = selectedProgramme === "all"
    ? (pathways ?? [])
    : (pathways ?? []).filter(p => {
        const prog = programmes?.find(pr => pr.id === p.programme_id);
        return prog?.title === selectedProgramme;
      });

  // Group by programme
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, p) => {
    const prog = programmes?.find(pr => pr.id === p.programme_id);
    const name = prog?.title ?? "Unknown";
    (acc[name] ??= []).push(p);
    return acc;
  }, {});

  // Count learners per pathway (via programme → cohorts → enrolments)
  const countLearners = (programmeId: string) => {
    return (enrolments ?? []).filter(e => {
      // enrolments don't directly link to programme, but we count all for now
      return e.status === "active" || e.status === "enrolled";
    }).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-32" />)}
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 flex-1" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pathways</h1>
          <p className="text-sm text-muted-foreground mt-1">Structured learning journeys: Knowledge → Practical → Workplace.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          New Pathway
        </button>
      </div>

      {/* Phase Legend */}
      <div className="flex items-center gap-6">
        {phases.map((phase, i) => {
          const Icon = phaseIcon[phase];
          return (
            <div key={phase} className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", phaseBg[phase])}>
                <Icon className={cn("w-4 h-4", phaseColor[phase])} />
                <span className="text-xs font-semibold text-foreground">{phaseLabel[phase]}</span>
              </div>
              {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground/40" />}
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {programmeNames.map(p => (
          <button
            key={p}
            onClick={() => setSelectedProgramme(p)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              selectedProgramme === p
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "all" ? "All Programmes" : p}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16">
          <Route className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pathways created yet. Create your first pathway to get started.</p>
        </div>
      )}

      {/* Pathway Groups */}
      {Object.entries(grouped).map(([programme, programmePathways]) => (
        <div key={programme} className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-accent" />
            {programme}
          </h3>

          {/* Visual Pipeline */}
          <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
            {phases.map(phase => {
              const pathway = programmePathways.find(p => p.phase === phase);
              const Icon = phaseIcon[phase];
              if (!pathway) {
                return (
                  <div key={phase} className="flex-1 min-w-[280px] border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2">
                    <Icon className="w-5 h-5 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground/50">No {phaseLabel[phase].toLowerCase()} pathway</p>
                    <button className="text-[10px] text-accent font-medium hover:underline">+ Add</button>
                  </div>
                );
              }

              const isExpanded = expandedPathway === pathway.id;
              const modules = (pathway as any).programme_modules ?? [];

              return (
                <div
                  key={phase}
                  className={cn(
                    "flex-1 min-w-[280px] bg-card rounded-xl border border-border/50 shadow-card transition-all duration-300 cursor-pointer hover:shadow-card-hover",
                    isExpanded && "ring-2 ring-accent/20"
                  )}
                  onClick={() => setExpandedPathway(isExpanded ? null : pathway.id)}
                >
                  {/* Header */}
                  <div className={cn("px-4 py-3 rounded-t-xl border-b border-border/50 flex items-center justify-between", phaseBg[phase])}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", phaseColor[phase])} />
                      <span className="text-xs font-semibold text-foreground">{phaseLabel[phase]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        pathway.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      )}>
                        {pathway.version}
                      </span>
                      <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-1">{pathway.title}</h4>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {modules.length} modules
                      </span>
                    </div>

                    {/* Module Chain */}
                    <div className="space-y-1.5">
                      {modules
                        .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                        .map((mod: any, mi: number) => (
                        <div key={mod.id} className="flex items-center gap-2">
                          <div className="flex flex-col items-center w-4 shrink-0">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full border-2 shrink-0",
                              mod.is_mandatory !== false ? "border-success bg-success/20" : "border-muted-foreground/30 bg-muted"
                            )} />
                            {mi < modules.length - 1 && (
                              <div className="w-px h-4 bg-border" />
                            )}
                          </div>
                          <div className={cn(
                            "flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors",
                            isExpanded ? "bg-secondary/50" : "bg-transparent"
                          )}>
                            <div className="flex items-center gap-2 min-w-0">
                              {mod.prerequisite_module_id ? (
                                <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                              ) : (
                                <Unlock className="w-3 h-3 text-success/50 shrink-0" />
                              )}
                              <span className="text-foreground truncate font-medium">{mod.title}</span>
                            </div>
                            {isExpanded && (
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {mod.duration_hours && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />{mod.duration_hours}h
                                  </span>
                                )}
                                {mod.credential_label && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium truncate max-w-[100px]">
                                    🏅 {mod.credential_label}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
