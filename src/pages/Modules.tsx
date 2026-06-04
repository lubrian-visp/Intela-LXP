import { BookOpen, Plus, Video, FileText, Code, Briefcase, GraduationCap, Clock, Lock, Search, LayoutGrid, List, ChevronRight, Award } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useProgrammeModules, useProgrammes } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

type Module = Tables<"programme_modules">;

const typeConfig: Record<string, { icon: any; label: string; color: string; bg: string; strip: string }> = {
  theory: { icon: BookOpen, label: "Theory", color: "text-info", bg: "bg-info/10", strip: "bg-info" },
  practical: { icon: Code, label: "Practical", color: "text-accent", bg: "bg-accent/10", strip: "bg-accent" },
  workplace: { icon: Briefcase, label: "Workplace", color: "text-success", bg: "bg-success/10", strip: "bg-success" },
};

const statusStyle: Record<string, string> = {
  published: "bg-success/10 text-success border-success/20",
  draft: "bg-warning/10 text-warning border-warning/20",
};

export default function Modules() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | undefined>(undefined);

  const { data: programmes } = useProgrammes();
  const { data: modules, isLoading } = useProgrammeModules(selectedProgrammeId || programmes?.[0]?.id);

  const activeProgrammeId = selectedProgrammeId || programmes?.[0]?.id;
  const types = ["all", "theory", "practical", "workplace"];

  const filtered = (modules ?? [])
    .filter(m => typeFilter === "all" || m.module_type === typeFilter)
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modules</h1>
          <p className="text-sm text-muted-foreground mt-1">Content containers with prerequisites and competency mapping.</p>
        </div>
      </div>

      {/* Programme selector */}
      {programmes && programmes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {programmes.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProgrammeId(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                activeProgrammeId === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Modules", value: modules?.length ?? 0, icon: <BookOpen className="w-4 h-4 text-info" /> },
          { label: "Mandatory", value: (modules ?? []).filter(m => m.is_mandatory).length, icon: <FileText className="w-4 h-4 text-success" /> },
          { label: "Total Credits", value: (modules ?? []).reduce((a, m) => a + (m.credits ?? 0), 0), icon: <GraduationCap className="w-4 h-4 text-accent" /> },
          { label: "Total Hours", value: (modules ?? []).reduce((a, m) => a + (m.duration_hours ?? 0), 0), icon: <Clock className="w-4 h-4 text-warning" /> },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                typeFilter === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search modules..."
              className="pl-8 pr-4 py-1.5 text-xs bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent w-52 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-md transition-colors", view === "grid" ? "bg-card shadow-sm" : "")}>
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => setView("list")} className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-card shadow-sm" : "")}>
              <List className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      )}

      {/* Module Grid */}
      {!isLoading && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(mod => {
            const tc = typeConfig[mod.module_type ?? "theory"] || typeConfig.theory;
            const TypeIcon = tc.icon;
            return (
              <div key={mod.id} className="group bg-card rounded-xl shadow-card border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden">
                <div className={cn("h-1", tc.strip)} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", tc.bg)}>
                        <TypeIcon className={cn("w-3.5 h-3.5", tc.color)} />
                      </div>
                      {mod.is_mandatory && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-info/10 text-info border-info/20">
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">#{mod.sequence_order}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">{mod.title}</h3>
                  {mod.description && (
                    <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                  )}

                  <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground">
                    {mod.duration_hours && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mod.duration_hours}h</span>
                    )}
                    {mod.credits != null && mod.credits > 0 && (
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" />{mod.credits} credits</span>
                    )}
                    <span className="flex items-center gap-1 capitalize"><TypeIcon className="w-3 h-3" />{mod.module_type}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {!isLoading && view === "list" && filtered.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Module</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Credits</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mod => {
                const tc = typeConfig[mod.module_type ?? "theory"] || typeConfig.theory;
                return (
                  <tr key={mod.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{mod.sequence_order}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{mod.title}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-xs font-medium capitalize", tc.color)}>{mod.module_type}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{mod.duration_hours ? `${mod.duration_hours}h` : "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{mod.credits ?? "—"}</td>
                    <td className="px-5 py-3 text-xs">{mod.is_mandatory ? "✓" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">
            {!activeProgrammeId ? "Select a programme to view its modules." : "No modules found for this programme."}
          </p>
        </div>
      )}
    </div>
  );
}
