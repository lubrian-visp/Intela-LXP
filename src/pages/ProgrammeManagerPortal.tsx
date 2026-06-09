import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  GraduationCap, Users, TrendingUp, ArrowUpRight, ArrowDownRight,
  Search, Calendar, AlertTriangle, BookOpen, Package, UserPlus,
  Route, ClipboardCheck, BarChart3, FolderKanban,
  ShieldCheck, UserCheck, ChevronRight, Bell, Clock,
  CheckSquare, Award, Layers, Star, FileCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useProgrammes, useCohorts, useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/hooks/useAuth";

/* ── Quick-action tiles ─── */
interface QuickAction {
  label: string;
  icon: any;
  path: string;
  description: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { label: "New Programme", icon: Package, path: "/programmes", description: "Create & scaffold", color: "bg-blue-500/10 text-blue-500" },
  { label: "Manage Cohorts", icon: Users, path: "/cohort-management", description: "Assign learners", color: "bg-orange-500/10 text-orange-500" },
  { label: "Onboard Learners", icon: UserPlus, path: "/learner/onboarding", description: "Register & approve", color: "bg-green-500/10 text-green-500" },
  { label: "Approval Queue", icon: CheckSquare, path: "/approvals", description: "Pending reviews", color: "bg-purple-500/10 text-purple-500" },
  { label: "Assessment Builder", icon: ClipboardCheck, path: "/assessments", description: "Build instruments", color: "bg-rose-500/10 text-rose-500" },
  { label: "Issue Credentials", icon: Award, path: "/credentials", description: "Certificates & badges", color: "bg-yellow-500/10 text-yellow-500" },
];

/* ── Navigation hub ─── */
interface HubCard { label: string; icon: any; path: string; description: string; }
interface HubSection { title: string; color: string; cards: HubCard[]; }

const hubSections: HubSection[] = [
  {
    title: "Programme Setup",
    color: "text-orange-500",
    cards: [
      { label: "Programme Hub", icon: GraduationCap, path: "/programmes", description: "Design & scaffold programmes" },
      { label: "Cohort Management", icon: Layers, path: "/cohort-management", description: "Create cohorts & assign learners" },
      { label: "Timetable", icon: Calendar, path: "/sessions", description: "Schedule training sessions" },
    ],
  },
  {
    title: "Learning Design",
    color: "text-blue-500",
    cards: [
      { label: "Learning Tracks", icon: Route, path: "/pathways", description: "Build structured pathways" },
      { label: "Learning Hub", icon: BookOpen, path: "/modules", description: "Manage modules & content" },
      { label: "Assessment Builder", icon: ClipboardCheck, path: "/assessments", description: "Create assessment instruments" },
      { label: "Portfolio of Evidence", icon: FolderKanban, path: "/portfolio", description: "Manage learner evidence" },
    ],
  },
  {
    title: "Delivery & Monitoring",
    color: "text-green-500",
    cards: [
      { label: "Gradebook", icon: FileCheck, path: "/gradebook", description: "Marks & attendance" },
      { label: "Programme Analytics", icon: TrendingUp, path: "/analytics", description: "Progress & insights" },
      { label: "Credentials", icon: Award, path: "/credentials", description: "Issue certificates" },
    ],
  },
  {
    title: "Staff",
    color: "text-purple-500",
    cards: [
      { label: "Facilitator Allocation", icon: UserCheck, path: "/admin/users", description: "Assign facilitators" },
      { label: "Moderator Allocation", icon: ShieldCheck, path: "/admin/users", description: "Assign QA moderators" },
      { label: "Staff Compliance", icon: ShieldCheck, path: "/staff/onboarding", description: "Track CPD & onboarding" },
    ],
  },
];

function getGreeting(name: string | null) {
  const hour = new Date().getHours();
  const first = name?.split(" ")[0] ?? "there";
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

export default function ProgrammeManagerPortal() {
  usePageTitle("Dashboard", "Programme Manager Portal");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const { profile } = useAuth();

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
      const avgProgress = activeEnr.length > 0
        ? Math.round(activeEnr.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / activeEnr.length)
        : 0;
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
    const atRiskTotal = programmeRows.reduce((s, p) => s + p.atRisk, 0);
    return [
      { label: "Active Programmes", value: String(active), sub: `${programmeRows.length} total`, trend: true, icon: GraduationCap, color: "bg-blue-500/10 text-blue-500" },
      { label: "Total Learners", value: String(totalLearners), sub: `${(cohorts ?? []).length} cohorts`, trend: true, icon: Users, color: "bg-orange-500/10 text-orange-500" },
      { label: "Completion Rate", value: `${completionRate}%`, sub: `${totalCompleted} completed`, trend: completionRate > 50, icon: TrendingUp, color: "bg-green-500/10 text-green-500" },
      { label: "At-Risk Learners", value: String(atRiskTotal), sub: "< 25% progress", trend: atRiskTotal === 0, icon: AlertTriangle, color: atRiskTotal > 0 ? "bg-rose-500/10 text-rose-500" : "bg-green-500/10 text-green-500" },
    ];
  }, [programmeRows, cohorts]);

  const statusStyles: Record<string, string> = {
    active: "bg-green-500/10 text-green-600",
    draft: "bg-blue-500/10 text-blue-600",
    archived: "bg-muted-foreground/10 text-muted-foreground",
  };

  if (loadingProg) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <FadeIn>
        <div className="bg-gradient-to-br from-sidebar via-sidebar/95 to-sidebar/80 rounded-2xl p-6 border border-sidebar-border/50 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h1 className="text-2xl font-bold text-foreground">{getGreeting(profile?.full_name ?? null)}</h1>
              <p className="text-sm text-muted-foreground mt-1">Here's your programme overview for today.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate("/announcements")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                Announcements
              </button>
              <button
                onClick={() => navigate("/approvals")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Approval Queue
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── KPI Cards ── */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", s.color.split(" ")[0])}>
                  <s.icon className={cn("w-4 h-4", s.color.split(" ")[1])} />
                </div>
                <span className={cn("text-[11px] font-medium flex items-center gap-0.5", s.trend ? "text-green-600" : "text-rose-500")}>
                  {s.trend ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.sub}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ── Quick Actions ── */}
      <FadeIn>
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/30 hover:border-primary/30 hover:shadow-sm transition-all group text-center"
              >
                <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", action.color.split(" ")[0])}>
                  <action.icon className={cn("w-5 h-5", action.color.split(" ")[1])} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── Two-col: Calendar + At-risk summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CalendarWidget events={calendarEvents} maxItems={4} />
        </div>

        {/* Programme health panel */}
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Programme Health</h3>
            <button onClick={() => navigate("/analytics")} className="text-[11px] text-primary flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border/40">
            {programmeRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No programmes yet.</p>
            ) : (
              programmeRows.slice(0, 5).map(p => (
                <div
                  key={p.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-secondary/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/programmes/${p.id}/builder`)}
                >
                  <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", p.status === "active" ? "bg-green-500" : "bg-muted-foreground/40")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", p.completionRate >= 80 ? "bg-green-500" : p.completionRate >= 50 ? "bg-primary" : "bg-orange-400")}
                          style={{ width: `${p.completionRate}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{p.completionRate}%</span>
                    </div>
                  </div>
                  {p.atRisk > 0 && (
                    <button
                      onClick={() => navigate("/facilitator/learner-progress")}
                      className="flex items-center gap-0.5 text-[10px] font-medium text-rose-500 shrink-0 hover:underline"
                      aria-label={`View ${p.atRisk} at-risk learners for ${p.name}`}
                    >
                      <AlertTriangle className="w-3 h-3" /> {p.atRisk} at-risk
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation Hub ── */}
      <FadeIn>
        <div className="space-y-5">
          {hubSections.map(section => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className={cn("text-sm font-semibold", section.color)}>{section.title}</h2>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {section.cards.map(card => (
                  <button
                    key={card.label}
                    onClick={() => navigate(card.path)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/30 hover:border-primary/30 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="p-2 rounded-lg bg-primary/8 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                      <card.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground">{card.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">{card.description}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* ── Programme Overview Table ── */}
      <FadeIn>
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Programme Overview</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} programme{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search programmes…"
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
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
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <GraduationCap className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No programmes found.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr
                      key={p.id}
                      className="hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/programmes/${p.id}/builder`)}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-8 rounded-full shrink-0", p.status === "active" ? "bg-green-500" : "bg-muted-foreground/30")} />
                          <span className="font-medium text-foreground">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.nqfLevel
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-foreground">L{p.nqfLevel}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">{p.cohorts}</td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">{p.enrolled}</td>
                      <td className="px-4 py-3 text-center">
                        {p.atRisk > 0
                          ? <button
                              onClick={ev => { ev.stopPropagation(); navigate("/facilitator/learner-progress"); }}
                              className="text-xs font-medium text-rose-500 flex items-center justify-center gap-1 hover:underline mx-auto"
                              aria-label={`${p.atRisk} at-risk learners — view in Facilitator portal`}
                            >
                              <AlertTriangle className="w-3 h-3" /> {p.atRisk}
                            </button>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.completionRate > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", p.completionRate >= 80 ? "bg-green-500" : p.completionRate >= 60 ? "bg-primary" : "bg-orange-400")}
                                style={{ width: `${p.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground">{p.completionRate}%</span>
                          </div>
                        ) : <span className="text-[11px] text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize", statusStyles[p.status] ?? "bg-secondary text-foreground")}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
