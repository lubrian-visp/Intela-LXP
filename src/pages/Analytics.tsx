import { BarChart3, TrendingUp, Users, BookOpen, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useProgrammes, useEnrolments, useCohorts, useSubmissions, useCredentials } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import ExportButton from "@/components/ExportButton";
import { useMemo } from "react";
import { format, subMonths, startOfMonth } from "date-fns";

const CHART_COLORS = [
  "hsl(222, 60%, 18%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)",
  "hsl(210, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
];

export default function Analytics() {
  const { data: programmes = [], isLoading: pLoading } = useProgrammes();
  const { data: enrolments = [], isLoading: eLoading } = useEnrolments();
  const { data: cohorts = [] } = useCohorts();
  const { data: submissions = [] } = useSubmissions();
  const { data: credentials = [] } = useCredentials();

  const isLoading = pLoading || eLoading;

  // Build monthly enrolment trend (last 6 months)
  const enrolmentTrend = useMemo(() => {
    const months: { month: string; learners: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = i === 0 ? new Date() : startOfMonth(subMonths(new Date(), i - 1));
      const count = enrolments.filter(e => {
        const ea = e.enrolled_at ? new Date(e.enrolled_at) : new Date(e.created_at);
        return ea >= start && ea < end;
      }).length;
      months.push({ month: format(d, "MMM"), learners: count });
    }
    return months;
  }, [enrolments]);

  // Build monthly completion trend
  const completionTrend = useMemo(() => {
    const months: { month: string; completions: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = i === 0 ? new Date() : startOfMonth(subMonths(new Date(), i - 1));
      const count = enrolments.filter(e => {
        if (!e.completed_at) return false;
        const ca = new Date(e.completed_at);
        return ca >= start && ca < end;
      }).length;
      months.push({ month: format(d, "MMM"), completions: count });
    }
    return months;
  }, [enrolments]);

  // Programme type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    programmes.forEach(p => {
      const typeName = (p as any).programme_types?.name || "Uncategorised";
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [programmes]);

  // Key metrics
  const activeEnrolments = enrolments.filter(e => e.status === "active" || e.status === "enrolled").length;
  const avgProgress = enrolments.length > 0
    ? Math.round(enrolments.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / enrolments.length)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform performance and programme insights.</p>
          </div>
          <ExportButton
            data={enrolments.map(e => ({
              learner_id: e.learner_id,
              cohort_id: e.cohort_id,
              status: e.status,
              progress: e.progress_percentage,
              enrolled_at: e.enrolled_at,
              completed_at: e.completed_at,
            }))}
            filename="analytics-enrolments"
            columns={[
              { key: "learner_id", label: "Learner" },
              { key: "cohort_id", label: "Cohort" },
              { key: "status", label: "Status" },
              { key: "progress", label: "Progress %" },
              { key: "enrolled_at", label: "Enrolled" },
              { key: "completed_at", label: "Completed" },
            ]}
          />
        </div>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completions Chart */}
        <StaggerItem>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Completions</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="completions" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StaggerItem>

        {/* Enrollment Trend */}
        <StaggerItem>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Enrolment Growth</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={enrolmentTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="learners" stroke="hsl(222, 60%, 18%)" strokeWidth={2} dot={{ fill: "hsl(38, 92%, 50%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </StaggerItem>

        {/* Programme Type Distribution */}
        <StaggerItem>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Programme Type Distribution</h3>
            {typeDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No programmes yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                      {typeDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {typeDistribution.map(t => (
                    <div key={t.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-muted-foreground">{t.name}</span>
                      <span className="text-xs font-semibold text-foreground ml-auto">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </StaggerItem>

        {/* Key Metrics */}
        <StaggerItem>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
            <h3 className="text-sm font-semibold text-foreground mb-4">Key Metrics</h3>
            <div className="space-y-4">
              {[
                { label: "Avg. Progress", value: `${avgProgress}%`, icon: <TrendingUp className="w-4 h-4 text-success" /> },
                { label: "Active Learners", value: String(activeEnrolments), icon: <Users className="w-4 h-4 text-info" /> },
                { label: "Programmes", value: String(programmes.length), icon: <BookOpen className="w-4 h-4 text-accent" /> },
                { label: "Submissions", value: String(submissions.length), icon: <BarChart3 className="w-4 h-4 text-primary" /> },
                { label: "Credentials Issued", value: String(credentials.length), icon: <Award className="w-4 h-4 text-warning" /> },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-card">{m.icon}</div>
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
