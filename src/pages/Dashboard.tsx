import { GraduationCap, Users, BookOpen, Award, TrendingUp, Settings, Shield, LayoutDashboard } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import ProgrammeCard, { ProgrammeCardData } from "@/components/dashboard/ProgrammeCard";
import CohortTable from "@/components/dashboard/CohortTable";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useProgrammes, useCohorts, useEnrolments, useCredentials, usePathways, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: programmes, isLoading: loadingProg } = useProgrammes();
  const { data: cohorts, isLoading: loadingCoh } = useCohorts();
  const { data: enrolments, isLoading: loadingEnr } = useEnrolments();
  const { data: credentials } = useCredentials();
  const { data: pathways } = usePathways();
  const { data: calendarEvents = [] } = useCalendarEvents();

  // Real-time cross-portal sync
  useRealtimeSync(["programmes", "cohorts", "enrolments", "issued_credentials", "notifications"]);

  const isLoading = loadingProg || loadingCoh || loadingEnr;

  const stats = useMemo(() => {
    const activeProgrammes = (programmes ?? []).filter(p => p.status === "active").length;
    const totalLearners = new Set((enrolments ?? []).map(e => e.learner_id)).size;
    const activeEnrolments = (enrolments ?? []).filter(e => e.status === "active" || e.status === "enrolled").length;
    const totalCredentials = (credentials ?? []).length;
    const pendingCredentials = (credentials ?? []).filter(c => c.status === "pending").length;
    const avgProgress = activeEnrolments > 0
      ? Math.round((enrolments ?? []).filter(e => e.status === "active" || e.status === "enrolled").reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / activeEnrolments)
      : 0;

    return [
      { label: "Active Programmes", value: activeProgrammes, change: `${(programmes ?? []).length} total`, changeType: "neutral" as const, icon: <GraduationCap className="w-5 h-5 text-accent" /> },
      { label: "Total Learners", value: totalLearners, change: `${activeEnrolments} active enrolments`, changeType: "positive" as const, icon: <Users className="w-5 h-5 text-info" /> },
      { label: "Avg Progress", value: `${avgProgress}%`, change: `across ${activeEnrolments} enrolments`, changeType: avgProgress > 50 ? "positive" as const : "neutral" as const, icon: <BookOpen className="w-5 h-5 text-success" /> },
      { label: "Credentials Issued", value: totalCredentials, change: pendingCredentials > 0 ? `+${pendingCredentials} pending` : "All verified", changeType: "neutral" as const, icon: <Award className="w-5 h-5 text-accent" /> },
    ];
  }, [programmes, enrolments, credentials]);

  const kpiItems = useMemo(() => stats.map(s => ({
    label: s.label,
    value: s.value,
    sub: s.change,
    trend: s.changeType !== "neutral",
    icon: GraduationCap,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  })), [stats]);

  // Build programme cards from real data
  const programmeCards: ProgrammeCardData[] = useMemo(() => {
    return (programmes ?? [])
      .filter(p => p.status === "active")
      .slice(0, 4)
      .map(p => {
        const progCohorts = (cohorts ?? []).filter(c => c.programme_id === p.id);
        const cohortIds = new Set(progCohorts.map(c => c.id));
        const progEnrolments = (enrolments ?? []).filter(e => cohortIds.has(e.cohort_id));
        const activeEnr = progEnrolments.filter(e => e.status === "active" || e.status === "enrolled");
        const avgProg = activeEnr.length > 0
          ? Math.round(activeEnr.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / activeEnr.length)
          : 0;
        const progPathways = (pathways ?? []).filter(pw => pw.programme_id === p.id);

        return {
          id: p.id,
          title: p.title,
          type: (p as any).programme_types?.name ?? "Programme",
          pathways: progPathways.length,
          modules: 0, // would need a separate query per programme
          cohorts: progCohorts.length,
          progress: avgProg,
          status: p.status as "active" | "draft" | "archived",
          learners: new Set(progEnrolments.map(e => e.learner_id)).size,
        };
      });
  }, [programmes, cohorts, enrolments, pathways]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner
        subtitle="Here's what's happening across your platform today."
        actions={
          <>
            <ActionButton icon={Settings} label="Platform Settings" onClick={() => navigate("/admin/settings")} />
            <ActionButton icon={Shield} label="User Directory" onClick={() => navigate("/admin/users")} primary />
          </>
        }
      />
      <KpiGrid items={kpiItems} />

      {/* Programmes + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <FadeIn delay={0.2}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Active Programmes</h3>
              <a href="/programmes" className="text-xs font-medium text-accent hover:underline">View all →</a>
            </div>
          </FadeIn>
          {programmeCards.length === 0 ? (
            <FadeIn delay={0.3}>
              <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center">
                <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active programmes yet.</p>
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {programmeCards.map((p) => (
                <StaggerItem key={p.id}>
                  <ProgrammeCard programme={p} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        <FadeIn delay={0.3} className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
          <CalendarWidget events={calendarEvents} maxItems={4} />
          <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border/50">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Cohorts</span>
              <span className="text-sm font-bold text-foreground">{(cohorts ?? []).length}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active Cohorts</span>
              <span className="text-sm font-bold text-foreground">{(cohorts ?? []).filter(c => c.status === "active").length}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pathways</span>
              <span className="text-sm font-bold text-foreground">{(pathways ?? []).length}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pending Enrolments</span>
              <span className="text-sm font-bold text-foreground">{(enrolments ?? []).filter(e => e.status === "pending").length}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Completed</span>
              <span className="text-sm font-bold text-foreground">{(enrolments ?? []).filter(e => e.status === "completed").length}</span>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Cohorts */}
      <FadeIn delay={0.4}>
        <CohortTable />
      </FadeIn>
    </div>
  );
}
