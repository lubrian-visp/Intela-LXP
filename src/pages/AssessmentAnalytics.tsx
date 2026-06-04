import { useState, useMemo } from "react";
import { useAssessments, useSubmissions, useProgrammes } from "@/hooks/useCoreData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExportButton from "@/components/ExportButton";
import {
  BarChart3, TrendingUp, CheckCircle2, XCircle, Target,
  PieChart, Users, FileCheck, AlertCircle, ListChecks,
} from "lucide-react";
import { QuestionAnalyticsPanel } from "@/components/analytics/QuestionAnalyticsPanel";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, subMonths, startOfMonth, isAfter } from "date-fns";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--info))",
  "hsl(var(--accent))",
];

export default function AssessmentAnalytics() {
  const [programmeId, setProgrammeId] = useState<string>("all");
  const [tab, setTab] = useState("overview");

  const { data: programmes = [], isLoading: progLoading } = useProgrammes();
  const { data: allAssessments = [], isLoading: assLoading } = useAssessments(
    programmeId === "all" ? undefined : programmeId
  );
  const { data: allSubmissions = [], isLoading: subLoading } = useSubmissions();

  const isLoading = progLoading || assLoading || subLoading;

  // Filter submissions by programme
  const assessmentIds = useMemo(() => new Set(allAssessments.map((a: any) => a.id)), [allAssessments]);
  const submissions = useMemo(
    () => programmeId === "all" ? allSubmissions : allSubmissions.filter((s: any) => assessmentIds.has(s.assessment_id)),
    [allSubmissions, assessmentIds, programmeId]
  );

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter((s: any) => ["graded", "assessed", "passed", "approved"].includes(s.status));
    const passed = submissions.filter((s: any) => {
      if (!s.score || !s.assessments?.pass_mark) return s.status === "passed";
      return s.score >= s.assessments.pass_mark;
    });
    const failed = submissions.filter((s: any) => s.status === "failed" || (s.score != null && s.assessments?.pass_mark && s.score < s.assessments.pass_mark));
    const scores = submissions.filter((s: any) => s.score != null).map((s: any) => s.score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const passRate = graded.length > 0 ? Math.round((passed.length / graded.length) * 100) : 0;
    const uniqueLearners = new Set(submissions.map((s: any) => s.learner_id)).size;

    return { total, graded: graded.length, passed: passed.length, failed: failed.length, avgScore, passRate, uniqueLearners };
  }, [submissions]);

  // ── Per-assessment pass rates ──
  const perAssessment = useMemo(() => {
    const map: Record<string, { title: string; category: string; total: number; passed: number; avgScore: number; scores: number[] }> = {};
    submissions.forEach((s: any) => {
      const aId = s.assessment_id;
      if (!map[aId]) map[aId] = { title: s.assessments?.title ?? "Assessment", category: "", total: 0, passed: 0, avgScore: 0, scores: [] };
      map[aId].total++;
      if (s.score != null) map[aId].scores.push(s.score);
      const passMark = s.assessments?.pass_mark;
      if (s.status === "passed" || (s.score != null && passMark && s.score >= passMark)) map[aId].passed++;
    });
    allAssessments.forEach((a: any) => { if (map[a.id]) map[a.id].category = a.assessment_category || "formative"; });
    return Object.entries(map).map(([id, d]) => ({
      id, ...d,
      avgScore: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
      passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [submissions, allAssessments]);

  // ── Score distribution (histogram) ──
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    submissions.forEach((s: any) => {
      if (s.score == null || !s.assessments?.max_score) return;
      const pct = Math.round((s.score / s.assessments.max_score) * 100);
      const bucket = buckets.find(b => pct >= b.min && pct <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [submissions]);

  // ── Category breakdown (pie) ──
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssessments.forEach((a: any) => {
      const cat = a.assessment_category || "formative";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allAssessments]);

  // ── Monthly trend (6 months) ──
  const monthlyTrend = useMemo(() => {
    const months: { month: string; submissions: number; passed: number; passRate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = startOfMonth(subMonths(new Date(), i));
      const end = startOfMonth(subMonths(new Date(), i - 1));
      const label = format(start, "MMM yyyy");
      const monthSubs = submissions.filter((s: any) => {
        const d = new Date(s.submitted_at || s.created_at);
        return isAfter(d, start) && !isAfter(d, end);
      });
      const monthPassed = monthSubs.filter((s: any) => s.status === "passed" || (s.score != null && s.assessments?.pass_mark && s.score >= s.assessments.pass_mark));
      months.push({
        month: label,
        submissions: monthSubs.length,
        passed: monthPassed.length,
        passRate: monthSubs.length > 0 ? Math.round((monthPassed.length / monthSubs.length) * 100) : 0,
      });
    }
    return months;
  }, [submissions]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const exportData = perAssessment.map(a => ({
    Assessment: a.title,
    Category: a.category,
    Submissions: a.total,
    "Pass Rate (%)": a.passRate,
    "Avg Score": a.avgScore,
  }));

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Assessment Analytics</h1>
            <p className="text-sm text-muted-foreground">Pass rates, score distributions, and performance trends.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={programmeId} onValueChange={setProgrammeId}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <SelectValue placeholder="All Programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Programmes</SelectItem>
                {programmes.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton data={exportData} filename="assessment-analytics" />
          </div>
        </div>
      </FadeIn>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Submissions", value: stats.total, icon: <FileCheck className="w-4 h-4 text-info" />, bg: "bg-info/5" },
          { label: "Pass Rate", value: `${stats.passRate}%`, icon: <CheckCircle2 className="w-4 h-4 text-success" />, bg: "bg-success/5" },
          { label: "Avg Score", value: stats.avgScore > 0 ? `${stats.avgScore}%` : "—", icon: <Target className="w-4 h-4 text-primary" />, bg: "bg-primary/5" },
          { label: "Unique Learners", value: stats.uniqueLearners, icon: <Users className="w-4 h-4 text-warning" />, bg: "bg-warning/5" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", s.bg)}>{s.icon}</div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="w-3 h-3" /> Overview</TabsTrigger>
          <TabsTrigger value="per-assessment" className="text-xs gap-1.5"><Target className="w-3 h-3" /> Per Assessment</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs gap-1.5"><TrendingUp className="w-3 h-3" /> Trends</TabsTrigger>
          <TabsTrigger value="questions" className="text-xs gap-1.5"><ListChecks className="w-3 h-3" /> Item Analysis</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Score Distribution</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Category Breakdown</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pass/Fail summary */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pass / Fail Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-2xl font-bold text-foreground">{stats.passed}</span>
                  <span className="text-xs text-muted-foreground">Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="text-2xl font-bold text-foreground">{stats.failed}</span>
                  <span className="text-xs text-muted-foreground">Failed</span>
                </div>
                <div className="flex-1">
                  <Progress value={stats.passRate} className="h-3" />
                  <p className="text-[10px] text-muted-foreground mt-1">{stats.passRate}% pass rate across {stats.graded} graded submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Assessment */}
        <TabsContent value="per-assessment" className="mt-4 space-y-2">
          {perAssessment.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center border border-border/50">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No assessment data available</p>
            </div>
          ) : perAssessment.map(a => (
            <div key={a.id} className="bg-card rounded-xl border border-border/50 p-4 shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{a.title}</h3>
                    <Badge variant="outline" className="text-[8px] px-1.5 shrink-0">{a.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>{a.total} submissions</span>
                    <span>Avg: {a.avgScore}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-lg font-bold", a.passRate >= 70 ? "text-success" : a.passRate >= 50 ? "text-warning" : "text-destructive")}>
                    {a.passRate}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">pass rate</p>
                </div>
              </div>
              <Progress value={a.passRate} className="h-1.5 mt-2" />
            </div>
          ))}
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">6-Month Submission & Pass Rate Trend</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="submissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Submissions" />
                  <Line yAxisId="right" type="monotone" dataKey="passRate" stroke="hsl(var(--success))" strokeWidth={2} name="Pass Rate %" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Item Analysis */}
        <TabsContent value="questions" className="mt-4">
          <QuestionAnalyticsPanel programmeId={programmeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
