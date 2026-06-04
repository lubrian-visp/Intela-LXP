import { useMemo } from "react";
import {
  Calendar, Users, FileText, Bell,
  ClipboardList, MessageSquare, BookOpen, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCohorts, useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickAction {
  label: string;
  icon: any;
  path: string;
  description: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { label: "Timetable",        icon: Calendar,      path: "/sessions",           description: "View & manage sessions",  color: "bg-blue-500/10 text-blue-500" },
  { label: "Cohort Overview",  icon: Users,         path: "/cohort-management",  description: "Learner groups",          color: "bg-orange-500/10 text-orange-500" },
  { label: "Documents",        icon: FileText,      path: "/portfolio",          description: "Files & evidence",        color: "bg-purple-500/10 text-purple-500" },
  { label: "Discussions",      icon: MessageSquare, path: "/discussions",        description: "Forums & communication",  color: "bg-green-500/10 text-green-500" },
  { label: "Announcements",    icon: Bell,          path: "/announcements",      description: "Team notices",            color: "bg-yellow-500/10 text-yellow-500" },
  { label: "Quotes",           icon: ClipboardList, path: "/provider/quotes",    description: "Quote management",        color: "bg-rose-500/10 text-rose-500" },
];

export default function LdSupportDashboard() {
  const navigate = useNavigate();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const { data: cohorts, isLoading: cohortsLoading } = useCohorts();
  const { data: enrolments } = useEnrolments();

  useRealtimeSync(["cohorts", "enrolments", "training_sessions", "notifications"]);

  const kpiItems = useMemo(() => {
    const activeCohorts = (cohorts ?? []).filter(c => c.status === "active" || c.status === "planned").length;
    const totalLearners = (enrolments ?? []).filter(e => e.status === "active" || e.status === "enrolled").length;
    const upcomingEvents = calendarEvents.filter(e => new Date(e.start) >= new Date()).length;
    return [
      { label: "Active Cohorts",    value: activeCohorts,   sub: "assigned to you",    trend: true,  icon: Users,        iconBg: "bg-blue-500/10",   iconColor: "text-blue-500" },
      { label: "Active Learners",   value: totalLearners,   sub: "across cohorts",     trend: true,  icon: BookOpen,     iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { label: "Upcoming Sessions", value: upcomingEvents,  sub: "on calendar",        trend: true,  icon: Calendar,     iconBg: "bg-green-500/10",  iconColor: "text-green-500" },
      { label: "Pending Tasks",     value: 0,               sub: "nothing overdue",    trend: true,  icon: Clock,        iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ];
  }, [cohorts, enrolments, calendarEvents]);

  return (
    <div className="space-y-6">
      <WelcomeBanner
        subtitle="Your coordination hub — sessions, cohorts, documents and communications all in one place."
        actions={
          <>
            <ActionButton icon={Bell}     label="Announcements" onClick={() => navigate("/announcements")} />
            <ActionButton icon={Calendar} label="View Timetable" onClick={() => navigate("/sessions")} primary />
          </>
        }
      />

      {cohortsLoading
        ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        : <KpiGrid items={kpiItems} />
      }

      {/* Quick Actions */}
      <FadeIn>
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card hover:bg-secondary/30 hover:border-primary/30 hover:shadow-sm transition-all group text-center"
              >
                <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", a.color.split(" ")[0])}>
                  <a.icon className={cn("w-5 h-5", a.color.split(" ")[1])} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Calendar */}
      <FadeIn>
        <CalendarWidget events={calendarEvents} maxItems={6} />
      </FadeIn>

      {/* Cohort list */}
      <FadeIn>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-semibold text-foreground">Active Cohorts</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cohorts you are supporting</p>
          </div>
          {cohortsLoading ? (
            <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : (cohorts ?? []).filter(c => c.status === "active" || c.status === "planned").length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No active cohorts found.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {(cohorts ?? [])
                .filter(c => c.status === "active" || c.status === "planned")
                .map(c => {
                  const count = (enrolments ?? []).filter(e => e.cohort_id === c.id).length;
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate("/cohort-management")}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/20 transition-colors cursor-pointer"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        c.status === "active" ? "bg-green-500" : "bg-blue-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(c as any).programmes?.title ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                        <Users className="w-3.5 h-3.5" />
                        {count} learner{count !== 1 ? "s" : ""}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0",
                        c.status === "active" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                      )}>
                        {c.status}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
