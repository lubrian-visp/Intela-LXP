import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useRealtimeSync } from "@/hooks/useCoreData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Clock, Search, Users, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExportButton from "@/components/ExportButton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

const COMPLIANCE_THRESHOLD = 75;

export default function AttendanceComplianceReport() {
  useRealtimeSync(["session_attendance", "training_sessions", "enrolments", "cohorts"]);

  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Fetch cohorts
  const { data: cohorts = [] } = useQuery({
    queryKey: ["cohorts"],
    queryFn: async () => {
      const { data } = await supabase.from("cohorts").select("id, name, programme_id, programmes(title)").order("name");
      return data ?? [];
    },
  });

  // Fetch all sessions with attendance
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["training_sessions_with_attendance", selectedCohort],
    queryFn: async () => {
      let q = supabase.from("training_sessions").select("id, title, cohort_id, scheduled_start, status").order("scheduled_start");
      if (selectedCohort !== "all") q = q.eq("cohort_id", selectedCohort);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: allAttendance = [], isLoading: attLoading } = useQuery({
    queryKey: ["all_attendance", selectedCohort],
    queryFn: async () => {
      let sessionIds: string[] = [];
      if (selectedCohort !== "all") {
        const { data: sess } = await supabase.from("training_sessions").select("id").eq("cohort_id", selectedCohort);
        sessionIds = (sess ?? []).map(s => s.id);
        if (sessionIds.length === 0) return [];
      }

      let q = supabase.from("session_attendance").select("*, training_sessions(title, scheduled_start, cohort_id)");
      if (sessionIds.length > 0) q = q.in("session_id", sessionIds);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Fetch profiles for names
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_attendance"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data ?? [];
    },
  });

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { m[p.user_id] = p.full_name || "Unknown"; });
    return m;
  }, [profiles]);

  // Compute per-learner attendance stats
  const learnerStats = useMemo(() => {
    const totalSessionsByCohort: Record<string, number> = {};
    sessions.forEach((s: any) => {
      const key = s.cohort_id || "all";
      totalSessionsByCohort[key] = (totalSessionsByCohort[key] || 0) + 1;
    });

    const map: Record<string, {
      learnerId: string;
      name: string;
      totalSessions: number;
      attended: number;
      lateCount: number;
      totalLateMinutes: number;
      absentCount: number;
      rate: number;
      cohortIds: Set<string>;
    }> = {};

    // Count attendance per learner
    allAttendance.forEach((a: any) => {
      if (!map[a.learner_id]) {
        map[a.learner_id] = {
          learnerId: a.learner_id,
          name: profileMap[a.learner_id] || a.learner_id.slice(0, 8),
          totalSessions: 0,
          attended: 0,
          lateCount: 0,
          totalLateMinutes: 0,
          absentCount: 0,
          rate: 0,
          cohortIds: new Set(),
        };
      }
      const stat = map[a.learner_id];
      if (a.training_sessions?.cohort_id) stat.cohortIds.add(a.training_sessions.cohort_id);
      if (a.status === "present" || a.status === "late") {
        stat.attended++;
        if (a.status === "late" || (a.late_minutes && a.late_minutes > 0)) {
          stat.lateCount++;
          stat.totalLateMinutes += a.late_minutes || 0;
        }
      } else if (a.status === "absent") {
        stat.absentCount++;
      }
    });

    // Calculate rates
    Object.values(map).forEach((stat) => {
      // Total sessions = sum of sessions across all cohorts this learner belongs to
      let total = 0;
      stat.cohortIds.forEach((cid) => {
        total += totalSessionsByCohort[cid] || 0;
      });
      stat.totalSessions = total || sessions.length;
      stat.rate = stat.totalSessions > 0 ? Math.round((stat.attended / stat.totalSessions) * 100) : 0;
    });

    return Object.values(map);
  }, [allAttendance, sessions, profileMap]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return learnerStats;
    const q = search.toLowerCase();
    return learnerStats.filter((s) => s.name.toLowerCase().includes(q));
  }, [learnerStats, search]);

  // Sort: at-risk first
  const sorted = useMemo(() => [...filtered].sort((a, b) => a.rate - b.rate), [filtered]);

  // Summary stats
  const atRiskCount = sorted.filter((s) => s.rate < COMPLIANCE_THRESHOLD).length;
  const avgRate = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b.rate, 0) / sorted.length) : 0;
  const totalLateArrivals = sorted.reduce((a, b) => a + b.lateCount, 0);

  // Chart data
  const distributionData = useMemo(() => {
    const buckets = [
      { range: "0-25%", count: 0, color: "hsl(var(--destructive))" },
      { range: "26-50%", count: 0, color: "hsl(var(--warning))" },
      { range: "51-75%", count: 0, color: "hsl(var(--accent))" },
      { range: "76-100%", count: 0, color: "hsl(var(--success))" },
    ];
    sorted.forEach((s) => {
      if (s.rate <= 25) buckets[0].count++;
      else if (s.rate <= 50) buckets[1].count++;
      else if (s.rate <= 75) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets;
  }, [sorted]);

  const checkinMethodData = useMemo(() => {
    const methods: Record<string, number> = { self: 0, qr: 0, manual: 0, other: 0 };
    allAttendance.forEach((a: any) => {
      const m = a.check_in_method || "other";
      methods[m] = (methods[m] || 0) + 1;
    });
    return Object.entries(methods)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [allAttendance]);

  const pieColors = ["hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--muted-foreground))"];

  const isLoading = sessionsLoading || attLoading;

  // Export data
  const exportData = sorted.map((s) => ({
    Learner: s.name,
    "Attendance Rate": `${s.rate}%`,
    "Sessions Attended": s.attended,
    "Total Sessions": s.totalSessions,
    "Late Count": s.lateCount,
    "Total Late Minutes": s.totalLateMinutes,
    Status: s.rate < COMPLIANCE_THRESHOLD ? "At Risk" : "Compliant",
  }));

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance Compliance Report</h1>
            <p className="text-sm text-muted-foreground">
              Track attendance rates, late arrivals, and compliance across cohorts.
            </p>
          </div>
          <ExportButton data={exportData} filename="attendance-compliance" />
        </div>
      </FadeIn>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedCohort} onValueChange={setSelectedCohort}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Cohorts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cohorts</SelectItem>
            {cohorts.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search learner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Attendance</p>
                  <p className="text-2xl font-bold text-foreground">{avgRate}%</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">At Risk (&lt;{COMPLIANCE_THRESHOLD}%)</p>
                  <p className="text-2xl font-bold text-foreground">{atRiskCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Late Arrivals</p>
                  <p className="text-2xl font-bold text-foreground">{totalLateArrivals}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {distributionData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Check-in Methods</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={checkinMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {checkinMethodData.map((_, idx) => (
                      <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Learner table */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Learner Attendance ({sorted.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Learner</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Rate</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Attended</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Late</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Late Min</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        No attendance data found.
                      </td>
                    </tr>
                  ) : (
                    sorted.map((s) => (
                      <tr key={s.learnerId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                        <td className="text-center px-3 py-3">
                          <span className={cn(
                            "text-xs font-bold",
                            s.rate >= COMPLIANCE_THRESHOLD ? "text-success" : s.rate >= 50 ? "text-warning" : "text-destructive"
                          )}>
                            {s.rate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3 text-muted-foreground">{s.attended}/{s.totalSessions}</td>
                        <td className="text-center px-3 py-3 text-muted-foreground">{s.lateCount}</td>
                        <td className="text-center px-3 py-3 text-muted-foreground">{s.totalLateMinutes}</td>
                        <td className="text-center px-3 py-3">
                          {s.rate < COMPLIANCE_THRESHOLD ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="w-3 h-3" /> At Risk
                            </Badge>
                          ) : (
                            <Badge className="bg-success/15 text-success text-[10px] gap-1 hover:bg-success/20">
                              <CheckCircle className="w-3 h-3" /> Compliant
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
