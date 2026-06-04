import { useState, useMemo } from "react";
import {
  GraduationCap, Users, TrendingUp, ArrowUpRight, ArrowDownRight,
  Search, Calendar, AlertTriangle, BookOpen, Package, UserPlus,
  Route, ClipboardCheck, BarChart3, FolderKanban,
  ShieldCheck, UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useProgrammes, useCohorts, useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

/* ── Card Hub types ─── */
interface HubCard {
  label: string;
  icon: any;
  path: string;
  description: string;
}

interface HubSection {
  title: string;
  cards: HubCard[];
}

const hubSections: HubSection[] = [
  {
    title: "Programme Setup",
    cards: [
      { label: "Create Programme", icon: Package, path: "/programmes", description: "Design & scaffold new programmes" },
      { label: "Manage Cohorts", icon: Users, path: "/cohorts", description: "Create cohorts & assign learners" },
      { label: "Timetable", icon: Calendar, path: "/sessions", description: "Schedule training sessions" },
    ],
  },
  {
    title: "Learning Design",
    cards: [
      { label: "Learning Tracks", icon: Route, path: "/pathways", description: "Build structured learning pathways" },
      { label: "Learning Hub", icon: BookOpen, path: "/modules", description: "Manage modules & content blocks" },
      { label: "Assessment Builder", icon: ClipboardCheck, path: "/assessments", description: "Create & configure assessment instruments" },
      { label: "Portfolio of Evidence", icon: FolderKanban, path: "/portfolio", description: "Manage learner evidence artefacts" },
    ],
  },
  {
    title: "Delivery & Monitoring",
    cards: [
      { label: "Assessment Analytics", icon: BarChart3, path: "/assessment-analytics", description: "Score distributions & pass rates" },
      { label: "Coverage Report", icon: ClipboardCheck, path: "/assessment-coverage", description: "Assessment-to-curriculum mapping" },
      { label: "Programme Analytics", icon: TrendingUp, path: "/analytics", description: "Learner progress & programme insights" },
      { label: "Credential Issuance", icon: GraduationCap, path: "/credentials", description: "Issue & manage certificates" },
    ],
  },
  {
    title: "Staff",
    cards: [
      { label: "Facilitator Allocation", icon: UserCheck, path: "/admin/users", description: "Assign facilitators to cohorts" },
      { label: "Moderator Allocation", icon: ShieldCheck, path: "/admin/users", description: "Assign moderators for QA" },
      { label: "Staff Compliance", icon: ShieldCheck, path: "/staff/onboarding", description: "Track staff onboarding & CPD" },
    ],
  },
];

export default function ProgrammeManagerPortal() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Real-time cross-portal sync
  useRealtimeSync(["programmes", "cohorts", "enrolments", "approval_tasks", "notifications"]);

  const { data: programmes, isLoading: loadingProg } = useProgrammes();
  const { data: cohorts } = useCohorts();
  const { data: enrolments } = useEnrolments();
  const { data: calendarEvents = [] } = useCalendarEvents();

  const programmeRows = useMemo(() => {
    return (programmes ?? []).map(p => {
      const progCohorts = (cohorts ?? []).filter(c => c.programme_id === p.id);
      const cohortIds = new Set(progCohorts.map(c => c.id));
      const progEnrolments = (enrolments ?? []).filter(e => cohortIds.has(e.cohort_id));
      const activeEnr = progEnrolments.filter(e => e.status === "active" || e.status === "enrolled");
      const completedEnr = progEnrolments.filter(e => e.status === "completed").length;
      const atRisk = activeEnr.filter(e => (e.progress_percentage ?? 0) < 25).length;
      const avgProgress = activeEnr.length > 0 ? Math.round(activeEnr.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / activeEnr.length) : 0;
      return { id: p.id, name: p.title, nqfLevel: p.nqf_level, cohorts: progCohorts.length, enrolled: progEnrolments.length, completed: completedEnr, atRisk, completionRate: avgProgress, status: p.status };
    });
  }, [programmes, cohorts, enrolments]);

  const filtered = useMemo(() => {
    return programmeRows.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterStatus === "All" || p.status === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [programmeRows, search, filterStatus]);

  const stats = useMemo(() => {
    const active = programmeRows.filter(p => p.status === "active").length;
    const totalLearners = programmeRows.reduce((s, p) => s + p.enrolled, 0);
    const totalCompleted = programmeRows.reduce((s, p) => s + p.completed, 0);
    const completionRate = totalLearners > 0 ? Math.round((totalCompleted / totalLearners) * 100) : 0;
    return [
      { label: "Active Programmes", value: String(active), change: `${programmeRows.length} total`, up: true, icon: GraduationCap },
      { label: "Total Learners", value: String(totalLearners), change: "", up: true, icon: Users },
      { label: "Completion Rate", value: `${completionRate}%`, change: `${totalCompleted} completed`, up: completionRate > 50, icon: TrendingUp },
      { label: "Total Cohorts", value: String((cohorts ?? []).length), change: "", up: true, icon: Calendar },
    ];
  }, [programmeRows, cohorts]);

  const statusStyles: Record<string, string> = {
    active: "bg-success/10 text-success",
    draft: "bg-info/10 text-info",
    archived: "bg-muted-foreground/10 text-muted-foreground",
  };

  if (loadingProg) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programme Manager Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Oversee programmes, cohorts, and learner outcomes.</p>
        </div>
      </FadeIn>

      {/* KPI Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-secondary"><s.icon className="w-4 h-4 text-muted-foreground" /></div>
                <span className={cn("text-[11px] font-medium flex items-center gap-0.5", s.up ? "text-success" : "text-destructive")}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Calendar Widget */}
      <CalendarWidget events={calendarEvents} maxItems={4} />

      {/* Card Hubs */}
      {hubSections.map(section => (
        <div key={section.title}>
          <h2 className="text-sm font-semibold text-foreground mb-3">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {section.cards.map(card => (
              <button
                key={card.label}
                onClick={() => navigate(card.path)}
                className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/30 hover:border-primary/30 transition-all text-left group shadow-sm"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <card.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{card.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{card.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Programmes Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Programme Overview</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} programmes</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option>All</option><option>Active</option><option>Draft</option><option>Archived</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">NQF</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cohorts</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">At Risk</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Progress</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">No programmes found.</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => navigate(`/programmes/${p.id}/builder`)}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.nqfLevel ? <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-foreground">L{p.nqfLevel}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-foreground">{p.cohorts}</td>
                    <td className="px-4 py-3 text-center text-foreground">{p.enrolled}</td>
                    <td className="px-4 py-3 text-center">
                      {p.atRisk > 0 ? (
                        <span className="text-xs font-medium text-warning flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> {p.atRisk}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.completionRate > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", p.completionRate >= 80 ? "bg-success" : p.completionRate >= 60 ? "bg-primary" : "bg-warning")} style={{ width: `${p.completionRate}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{p.completionRate}%</span>
                        </div>
                      ) : <span className="text-[11px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[p.status] ?? "bg-secondary text-foreground")}>{p.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
