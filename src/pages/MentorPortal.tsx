import { useState, useMemo } from "react";
import {
  Users, Target, TrendingUp,
  ArrowUpRight, ArrowDownRight, Search, CheckCircle2,
  Clock, AlertTriangle, Star, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useEnrolments, useCohorts, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

type MenteeStatus = "Active" | "At Risk" | "Excelling" | "Completed";

const menteeStatusStyles: Record<MenteeStatus, string> = {
  Active: "bg-info/10 text-info",
  "At Risk": "bg-warning/10 text-warning",
  Excelling: "bg-success/10 text-success",
  Completed: "bg-muted-foreground/10 text-muted-foreground",
};

const menteeStatusIcons: Record<MenteeStatus, typeof CheckCircle2> = {
  Active: TrendingUp,
  "At Risk": AlertTriangle,
  Excelling: Star,
  Completed: CheckCircle2,
};

function getMenteeStatus(progress: number, status: string): MenteeStatus {
  if (status === "completed") return "Completed";
  if (progress >= 80) return "Excelling";
  if (progress < 30) return "At Risk";
  return "Active";
}

export default function MentorPortal() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const { data: calendarEvents = [] } = useCalendarEvents();

  const { data: enrolments, isLoading: loadingEnr } = useEnrolments();
  const { data: cohorts } = useCohorts();

  // Real-time cross-portal sync
  useRealtimeSync(["enrolments", "assessment_submissions", "notifications"]);
  // Filter enrolments that have a mentor assigned
  const mentees = useMemo(() => {
    return (enrolments ?? []).filter(e => e.mentor_id != null).map(e => {
      const cohort = (cohorts ?? []).find(c => c.id === e.cohort_id);
      const progress = e.progress_percentage ?? 0;
      const menteeStatus = getMenteeStatus(progress, e.status);
      return {
        id: e.id,
        learnerId: e.learner_id,
        programme: (cohort as any)?.programmes?.title ?? "—",
        progress,
        status: menteeStatus,
        enrolmentStatus: e.status,
        enrolledAt: e.enrolled_at,
      };
    });
  }, [enrolments, cohorts]);

  const filtered = useMemo(() => {
    return mentees.filter(m => {
      const matchesSearch = m.programme.toLowerCase().includes(search.toLowerCase()) || m.learnerId.includes(search);
      const matchesFilter = filterStatus === "All" || m.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [mentees, search, filterStatus]);

  const stats = useMemo(() => {
    const active = mentees.filter(m => m.status === "Active" || m.status === "Excelling").length;
    const atRisk = mentees.filter(m => m.status === "At Risk").length;
    const completed = mentees.filter(m => m.status === "Completed").length;
    const avgProgress = mentees.length > 0 ? Math.round(mentees.reduce((s, m) => s + m.progress, 0) / mentees.length) : 0;
    return [
      { label: "Active Mentees", value: String(active), change: `${mentees.length} total`, up: true, icon: Users },
      { label: "At Risk", value: String(atRisk), change: atRisk > 0 ? "needs attention" : "none", up: atRisk === 0, icon: AlertTriangle },
      { label: "Completed", value: String(completed), change: "", up: true, icon: CheckCircle2 },
      { label: "Avg Progress", value: `${avgProgress}%`, change: "", up: avgProgress > 50, icon: TrendingUp },
    ];
  }, [mentees]);

  if (loadingEnr) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mentor Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Guide your mentees, track goals, and manage sessions.</p>
        </div>
      </FadeIn>

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

      {/* Calendar + Mentees Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
      {/* Mentees Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">My Mentees</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} mentees</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option>All</option>
              <option>Active</option>
              <option>At Risk</option>
              <option>Excelling</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Learner ID</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">No mentees assigned yet.</td></tr>
              ) : (
                filtered.map(m => {
                  const StatusIcon = menteeStatusIcons[m.status];
                  return (
                    <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-foreground">{m.learnerId.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.programme}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", m.progress >= 80 ? "bg-success" : m.progress >= 50 ? "bg-primary" : m.progress >= 30 ? "bg-warning" : "bg-destructive")} style={{ width: `${m.progress}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{m.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", menteeStatusStyles[m.status])}>
                          <StatusIcon className="w-3 h-3" />{m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {m.enrolledAt ? new Date(m.enrolledAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
        <div>
          <CalendarWidget events={calendarEvents} />
        </div>
      </div>
    </div>
  );
}
