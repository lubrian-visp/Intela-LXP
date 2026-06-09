import { useState, useMemo } from "react";
import {
  Users, TrendingUp, Search, CheckCircle2,
  AlertTriangle, Star, MessageSquare, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useEnrolments, useCohorts, useRealtimeSync } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight } from "lucide-react";

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
  usePageTitle("Dashboard", "Mentor Portal");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: calendarEvents = [] } = useCalendarEvents();

  const { data: enrolments, isLoading: loadingEnr } = useEnrolments();
  const { data: cohorts } = useCohorts();

  // Real-time cross-portal sync
  useRealtimeSync(["enrolments", "assessment_submissions", "notifications"]);

  // Fetch learner profiles for name display
  const learnerIds = useMemo(
    () => [...new Set((enrolments ?? []).filter(e => e.mentor_id === user?.id).map(e => e.learner_id))],
    [enrolments, user?.id]
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ["mentor-profiles", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", learnerIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles as any[]).forEach(p => { m[p.user_id] = p.full_name || "Unnamed Learner"; });
    return m;
  }, [profiles]);

  // FIXED: Only show mentees assigned to the current mentor (was showing ALL)
  const mentees = useMemo(() => {
    return (enrolments ?? []).filter(e => e.mentor_id === user?.id).map(e => {
      const cohort = (cohorts ?? []).find(c => c.id === e.cohort_id);
      const progress = e.progress_percentage ?? 0;
      const menteeStatus = getMenteeStatus(progress, e.status);
      return {
        id: e.id,
        learnerId: e.learner_id,
        learnerName: profileMap[e.learner_id] ?? `Learner ${e.learner_id.slice(0, 6)}`,
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

  const kpiItems = useMemo(() => {
    const active = mentees.filter(m => m.status === "Active" || m.status === "Excelling").length;
    const atRisk = mentees.filter(m => m.status === "At Risk").length;
    const completed = mentees.filter(m => m.status === "Completed").length;
    const avgProgress = mentees.length > 0 ? Math.round(mentees.reduce((s, m) => s + m.progress, 0) / mentees.length) : 0;
    return [
      { label: "Active Mentees", value: active, sub: `${mentees.length} total`, trend: true, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { label: "At Risk", value: atRisk, sub: atRisk > 0 ? "needs attention" : "all on track", trend: atRisk === 0, icon: AlertTriangle, iconBg: atRisk > 0 ? "bg-rose-500/10" : "bg-green-500/10", iconColor: atRisk > 0 ? "text-rose-500" : "text-green-500" },
      { label: "Completed", value: completed, sub: "this period", trend: true, icon: CheckCircle2, iconBg: "bg-green-500/10", iconColor: "text-green-500" },
      { label: "Avg Progress", value: `${avgProgress}%`, sub: "across mentees", trend: avgProgress > 50, icon: TrendingUp, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
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
      <WelcomeBanner
        subtitle="Guide your mentees, track goals, and manage sessions."
        actions={
          <>
            <ActionButton icon={Calendar} label="Schedule Session" onClick={() => navigate("/mentor/sessions")} />
            <ActionButton icon={MessageSquare} label="Messages" onClick={() => navigate("/mentor/messages")} primary />
          </>
        }
      />
      <KpiGrid items={kpiItems} />

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
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                <th className="px-4 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">No mentees assigned yet.</td></tr>
              ) : (
                filtered.map(m => {
                  const StatusIcon = menteeStatusIcons[m.status];
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-secondary/20 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/learner/profile/${m.learnerId}`)}
                      role="button" tabIndex={0}
                      onKeyDown={k => k.key === "Enter" && navigate(`/learner/profile/${m.learnerId}`)}
                      aria-label={`View profile for ${m.learnerName}`}
                    >
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{m.learnerName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{m.learnerId.slice(0, 8)}…</p>
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
                      <td className="px-4 py-3">
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
