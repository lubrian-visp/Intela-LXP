import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, ChevronDown, ChevronRight, CheckCircle2,
  PanelLeftClose, PanelLeft, Clock, Bookmark, Award
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ContentBlock {
  id: string;
  title: string;
  block_type: string;
  duration_minutes: number | null;
  sequence_order: number;
}

interface Module {
  id: string;
  title: string;
  sequence_order: number;
  duration_hours: number | null;
  is_mandatory: boolean | null;
  blocks: ContentBlock[];
}

interface CourseSidebarProps {
  programmeTitle: string;
  modules: Module[];
  activeBlockId: string | null;
  activeModuleId: string | null;
  completedBlockIds: Set<string>;
  bookmarkedBlockIds: Set<string>;
  onSelectBlock: (moduleId: string, blockId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  overallProgress: number;
}

export default function CourseSidebar({
  programmeTitle,
  modules,
  activeBlockId,
  activeModuleId,
  completedBlockIds,
  bookmarkedBlockIds,
  onSelectBlock,
  collapsed,
  onToggleCollapse,
  overallProgress,
}: CourseSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(activeModuleId ? [activeModuleId] : modules.length > 0 ? [modules[0].id] : [])
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const getModuleProgress = (mod: Module) => {
    if (!mod.blocks.length) return 0;
    const completed = mod.blocks.filter((b) => completedBlockIds.has(b.id)).length;
    return Math.round((completed / mod.blocks.length) * 100);
  };

  const formatDuration = (mod: Module) => {
    const total = mod.blocks.reduce((s, b) => s + (b.duration_minutes || 0), 0);
    if (total > 0) return `${total}m`;
    if (mod.duration_hours) return `${mod.duration_hours}h`;
    return null;
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r border-border/50 bg-card flex flex-col items-center py-3 gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}>
          <PanelLeft className="w-4 h-4" />
        </Button>
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-3 h-3 text-primary" />
        </div>
        <div className="flex-1" />
        {modules.map((mod, i) => {
          const prog = getModuleProgress(mod);
          return (
            <button
              key={mod.id}
              onClick={() => {
                onToggleCollapse();
                setExpandedModules(new Set([mod.id]));
              }}
              className={cn(
                "w-8 h-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-colors",
                activeModuleId === mod.id
                  ? "bg-primary text-primary-foreground"
                  : prog === 100
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
              title={mod.title}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border/50 bg-card flex flex-col shrink-0 h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground truncate flex-1 mr-2">{programmeTitle}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onToggleCollapse}>
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Overall Progress</span>
            <span className="font-semibold text-foreground">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-1.5" />
        </div>
      </div>

      {/* Module Tree */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {modules.map((mod, i) => {
            const modProgress = getModuleProgress(mod);
            const isExpanded = expandedModules.has(mod.id);
            const isActiveModule = activeModuleId === mod.id;
            const duration = formatDuration(mod);

            return (
              <Collapsible key={mod.id} open={isExpanded} onOpenChange={() => toggleModule(mod.id)}>
                <div
                  className={cn(
                    "rounded-xl border transition-all",
                    isActiveModule
                      ? "border-primary/30 bg-primary/[0.04] shadow-sm"
                      : "border-border/40 bg-card hover:border-border"
                  )}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 px-3 py-3 cursor-pointer">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center shrink-0",
                          modProgress === 100
                            ? "bg-emerald-500 text-white"
                            : isActiveModule
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {modProgress === 100 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                          {mod.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          <span>{mod.blocks.length} lessons</span>
                          {duration && (
                            <>
                              <span>•</span>
                              <span>{duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 space-y-0.5">
                      {mod.blocks.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/50 px-3 py-2 italic">No content yet</p>
                      ) : (
                        mod.blocks.map((block) => {
                          const isActive = activeBlockId === block.id;
                          const isDone = completedBlockIds.has(block.id);
                          return (
                            <button
                              key={block.id}
                              onClick={() => onSelectBlock(mod.id, block.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg transition-colors relative",
                                isActive
                                  ? "bg-primary/10"
                                  : "hover:bg-accent/40"
                              )}
                            >
                              {isActive && (
                                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-full" />
                              )}
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <span
                                  className={cn(
                                    "w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                                    isActive ? "border-primary" : "border-muted-foreground/30"
                                  )}
                                >
                                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    "text-[11px] leading-snug line-clamp-2 block",
                                    isActive
                                      ? "text-primary font-semibold"
                                      : "text-foreground/80"
                                  )}
                                >
                                  {block.title}
                                </span>
                                {block.duration_minutes && block.duration_minutes > 0 && (
                                  <span className="text-[9px] text-muted-foreground/60 mt-0.5 block">
                                    {block.duration_minutes < 60
                                      ? `${block.duration_minutes} min`
                                      : `${Math.floor(block.duration_minutes / 60)}h ${block.duration_minutes % 60 > 0 ? `${block.duration_minutes % 60}m` : ""}`}
                                  </span>
                                )}
                              </div>
                              {bookmarkedBlockIds.has(block.id) && (
                                <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer with certificate preview */}
      <div className="p-3 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/[0.04] border border-primary/20">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Certificate</p>
            <p className="text-[10px] text-muted-foreground">
              {overallProgress === 100 ? "Ready to claim!" : "Complete all modules to earn"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
