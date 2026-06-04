import { useState, useMemo } from "react";
import {
  Users, TrendingUp, CheckCircle2,
  ArrowUpRight, ArrowDownRight, GraduationCap,
  AlertTriangle, Download, Globe, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useSponsorEnrolments, SponsorEnrolment } from "@/hooks/useSponsorData";
import { useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSponsorInvoices } from "@/hooks/useSponsorData";
import SponsorAnalyticsCharts from "@/components/sponsor/SponsorAnalyticsCharts";

type LearnerStatus = "On Track" | "At Risk" | "Completed" | "Dropped";

const learnerStatusStyles: Record<LearnerStatus, string> = {
  "On Track": "bg-success/10 text-success",
  "At Risk": "bg-warning/10 text-warning",
  Completed: "bg-info/10 text-info",
  Dropped: "bg-destructive/10 text-destructive",
};

function getStatus(e: SponsorEnrolment): LearnerStatus {
  if (e.status === "completed") return "Completed";
  if (e.status === "dropped" || e.status === "cancelled" || e.status === "withdrawn" || e.status === "failed") return "Dropped";
  if ((e.progress_percentage ?? 0) < 25) return "At Risk";
  return "On Track";
}

export default function SponsorPortal() {
  const [learnerFilter, setLearnerFilter] = useState("All");
  const [searchLearner, setSearchLearner] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: enrolments = [], isLoading } = useSponsorEnrolments();
  const { data: invoices = [] } = useSponsorInvoices();
  const { data: calendarEvents = [] } = useCalendarEvents();

  useRealtimeSync(["enrolments", "cohorts", "programmes", "notifications"]);

  // Enrich with display status
  const enriched = useMemo(() =>
    enrolments.map(e => ({ ...e, displayStatus: getStatus(e) })),
    [enrolments]
  );

  // Dynamic filter options from actual data
  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    enriched.forEach(e => { if (e.country_id && e.country_name) map.set(e.country_id, e.country_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [enriched]);

  const typeOptions = useMemo(() => {
    const map = new Map<string, string>();
    enriched.forEach(e => { if (e.programme_type_id && e.programme_type_name) map.set(e.programme_type_id, e.programme_type_name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [enriched]);

  // Apply country + programme type filters
  const filteredByContext = useMemo(() =>
    enriched.filter(e => {
      if (countryFilter !== "all" && e.country_id !== countryFilter) return false;
      if (typeFilter !== "all" && e.programme_type_id !== typeFilter) return false;
      return true;
    }),
    [enriched, countryFilter, typeFilter]
  );

  const filtered = useMemo(() =>
    filteredByContext.filter(l => {
      const matchesSearch = l.programme_title.toLowerCase().includes(searchLearner.toLowerCase()) || searchLearner === "";
      const matchesFilter = learnerFilter === "All" || l.displayStatus === learnerFilter;
      return matchesSearch && matchesFilter;
    }),
    [filteredByContext, searchLearner, learnerFilter]
  );

  const stats = useMemo(() => {
    const total = filteredByContext.length;
    const completed = filteredByContext.filter(e => e.displayStatus === "Completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return [
      { label: "Learners Sponsored", value: String(total), change: "", up: true, icon: Users },
      { label: "On Track", value: String(filteredByContext.filter(e => e.displayStatus === "On Track").length), change: "", up: true, icon: TrendingUp },
      { label: "Completion Rate", value: `${completionRate}%`, change: `${completed} completed`, up: completionRate > 50, icon: CheckCircle2 },
      { label: "At Risk", value: String(filteredByContext.filter(e => e.displayStatus === "At Risk").length), change: "", up: false, icon: AlertTriangle },
    ];
  }, [filteredByContext]);

  // Programme performance (filtered)
  const programmePerformance = useMemo(() => {
    const progMap = new Map<string, { enrolled: number; completed: number; inProgress: number; dropped: number; totalProgress: number; typeName: string | null }>();
    filteredByContext.forEach(e => {
      const key = e.programme_title;
      const entry = progMap.get(key) ?? { enrolled: 0, completed: 0, inProgress: 0, dropped: 0, totalProgress: 0, typeName: e.programme_type_name };
      entry.enrolled++;
      entry.totalProgress += e.progress_percentage ?? 0;
      if (e.displayStatus === "Completed") entry.completed++;
      else if (e.displayStatus === "Dropped") entry.dropped++;
      else entry.inProgress++;
      progMap.set(key, entry);
    });
    return Array.from(progMap.entries()).map(([name, d]) => ({
      programme: name,
      ...d,
      avgProgress: d.enrolled > 0 ? Math.round(d.totalProgress / d.enrolled) : 0,
    }));
  }, [filteredByContext]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sponsor Portal</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your investment and learner outcomes.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Country filter — only shows countries present in sponsor's data */}
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <Globe className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countryOptions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Programme Type filter — only shows types present in sponsor's data */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <Layers className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programme Types</SelectItem>
                {typeOptions.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Report
            </button>
          </div>
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

      <CalendarWidget events={calendarEvents} maxItems={4} />

      {/* Analytics Charts */}
      <SponsorAnalyticsCharts enrolments={enriched} invoices={invoices} />

      {/* Programme Performance */}
      {programmePerformance.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Programme Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In Progress</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {programmePerformance.map(p => (
                  <tr key={p.programme} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{p.programme}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.typeName ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-foreground">{p.enrolled}</td>
                    <td className="px-4 py-3 text-center text-success font-medium">{p.completed}</td>
                    <td className="px-4 py-3 text-center text-foreground">{p.inProgress}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-medium", p.avgProgress >= 70 ? "text-success" : p.avgProgress >= 40 ? "text-warning" : "text-destructive")}>{p.avgProgress}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sponsored Learners */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sponsored Learners</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} learners</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={searchLearner} onChange={e => setSearchLearner(e.target.value)} placeholder="Search..." className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
            <select value={learnerFilter} onChange={e => setLearnerFilter(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option>All</option>
              <option>On Track</option>
              <option>At Risk</option>
              <option>Completed</option>
              <option>Dropped</option>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">No sponsored learners found.</td></tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-foreground">{l.learner_id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.programme_title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", (l.progress_percentage ?? 0) >= 80 ? "bg-success" : (l.progress_percentage ?? 0) >= 50 ? "bg-primary" : "bg-warning")} style={{ width: `${l.progress_percentage ?? 0}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{l.progress_percentage ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", learnerStatusStyles[l.displayStatus])}>{l.displayStatus}</span>
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
