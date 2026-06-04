import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Clock, CheckCircle2, XCircle, AlertTriangle, Zap } from "lucide-react";
import { useWorkflowAnalytics } from "@/hooks/useWorkflowSLA";

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(217, 91%, 60%)", "hsl(0, 84%, 60%)", "hsl(45, 93%, 47%)", "hsl(262, 83%, 58%)"];

export default function WorkflowAnalyticsDashboard() {
  const { data: analytics, isLoading } = useWorkflowAnalytics();

  if (isLoading) return (
    <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
  );

  if (!analytics) return null;

  const statusData = Object.entries(analytics.statusCounts).map(([name, value]) => ({ name, value }));
  const outcomeData = Object.entries(analytics.outcomeCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-accent" />
          <p className="text-2xl font-bold text-foreground">{analytics.totalInstances}</p>
          <p className="text-[10px] text-muted-foreground">Total Workflows</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          <p className="text-2xl font-bold text-foreground">{analytics.completionRate}%</p>
          <p className="text-[10px] text-muted-foreground">Completion Rate</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold text-foreground">{analytics.avgCompletionHours}h</p>
          <p className="text-[10px] text-muted-foreground">Avg. Completion Time</p>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="w-5 h-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold text-foreground">{analytics.statusCounts.failed || 0}</p>
          <p className="text-[10px] text-muted-foreground">Failed Workflows</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-accent" /> Monthly Workflow Trend
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="started" name="Started" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="hsl(0, 84%, 60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Distribution */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">Status Distribution</h3>
          <div className="h-48">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No data yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottleneck Steps */}
      <Card className="p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Bottleneck Steps (Longest Avg. Time)
        </h3>
        {analytics.bottlenecks.length > 0 ? (
          <div className="space-y-2">
            {analytics.bottlenecks.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-xs font-medium text-foreground">{b.name}</span>
                  <Badge variant="outline" className="text-[9px]">{b.count} occurrences</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className={`text-xs font-semibold ${b.avgHours > 24 ? "text-destructive" : b.avgHours > 8 ? "text-amber-600" : "text-foreground"}`}>
                    {b.avgHours}h avg
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No step completion data available yet.</p>
        )}
      </Card>

      {/* Step Outcome Distribution */}
      {outcomeData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">Step Outcome Distribution</h3>
          <div className="flex flex-wrap gap-3">
            {outcomeData.map((o, i) => (
              <div key={o.name} className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-xs font-medium capitalize">{o.name}</span>
                <Badge variant="secondary" className="text-[9px]">{o.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
