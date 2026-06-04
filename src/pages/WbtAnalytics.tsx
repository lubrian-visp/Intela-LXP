import { useWbtAnalytics } from "@/hooks/useWbtAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Briefcase, Users, Award, Star, TrendingUp, CheckCircle2 } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted))", "#f59e0b", "#10b981"];

export default function WbtAnalytics() {
  const { data: analytics, isLoading } = useWbtAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!analytics) return <div className="text-center py-12 text-muted-foreground">No analytics data available.</div>;

  const statCards = [
    { label: "Total Projects", value: analytics.totalProjects, icon: Briefcase, color: "text-primary" },
    { label: "Active Projects", value: analytics.activeProjects, icon: TrendingUp, color: "text-accent" },
    { label: "Completed", value: analytics.completedProjects, icon: CheckCircle2, color: "text-green-500" },
    { label: "Applications", value: analytics.totalApplications, icon: Users, color: "text-blue-500" },
    { label: "Credentials Issued", value: analytics.totalCredentialsIssued, icon: Award, color: "text-amber-500" },
    { label: "Avg Mentor Rating", value: `${analytics.averageMentorRating}/5`, icon: Star, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-2xl font-bold text-foreground">WBT Analytics Dashboard</h1>
        <p className="text-muted-foreground">Agile Work-Based Training performance metrics and insights.</p>
      </FadeIn>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <s.icon className={`h-6 w-6 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Projects by status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Projects by Status</CardTitle></CardHeader>
          <CardContent>
            {analytics.projectsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={analytics.projectsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }: any) => `${status} (${count})`}>
                    {analytics.projectsByStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Projects by framework */}
        <Card>
          <CardHeader><CardTitle className="text-base">Projects by Framework</CardTitle></CardHeader>
          <CardContent>
            {analytics.projectsByFramework.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.projectsByFramework}>
                  <XAxis dataKey="framework" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top mentors */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Mentors</CardTitle></CardHeader>
        <CardContent>
          {analytics.topMentors.length > 0 ? (
            <div className="space-y-3">
              {analytics.topMentors.map((m: any, i: number) => (
                <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold">
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{m.user_id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{m.rating_average || 0}</p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{m.total_projects_completed || 0}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No mentor data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
