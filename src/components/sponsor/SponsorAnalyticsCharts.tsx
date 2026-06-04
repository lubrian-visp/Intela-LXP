import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { SponsorEnrolment } from "@/hooks/useSponsorData";
import { FadeIn } from "@/components/animations/MotionWrappers";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

interface Props {
  enrolments: SponsorEnrolment[];
  invoices?: any[];
}

export default function SponsorAnalyticsCharts({ enrolments, invoices = [] }: Props) {
  // Progress distribution
  const progressDist = useMemo(() => {
    const buckets = [
      { name: "0-25%", min: 0, max: 25, count: 0 },
      { name: "26-50%", min: 26, max: 50, count: 0 },
      { name: "51-75%", min: 51, max: 75, count: 0 },
      { name: "76-100%", min: 76, max: 100, count: 0 },
    ];
    enrolments.forEach(e => {
      const p = e.progress_percentage ?? 0;
      const bucket = buckets.find(b => p >= b.min && p <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [enrolments]);

  // Status breakdown for pie chart
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    enrolments.forEach(e => {
      const s = e.status === "completed" ? "Completed" :
        e.status === "active" || e.status === "enrolled" ? "Active" :
          e.status === "dropped" || e.status === "cancelled" ? "Dropped" : "Other";
      map.set(s, (map.get(s) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [enrolments]);

  // Spend over time from invoices
  const spendTrend = useMemo(() => {
    if (!invoices.length) return [];
    const monthMap = new Map<string, { total: number; paid: number }>();
    invoices.forEach(inv => {
      const date = inv.issued_date ?? inv.created_at;
      if (!date) return;
      const month = date.substring(0, 7); // YYYY-MM
      const entry = monthMap.get(month) ?? { total: 0, paid: 0 };
      entry.total += Number(inv.amount ?? 0);
      if (inv.status === "paid") entry.paid += Number(inv.amount ?? 0);
      monthMap.set(month, entry);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }),
        total: d.total,
        paid: d.paid,
      }));
  }, [invoices]);

  // Programme completion rates
  const programmeRates = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    enrolments.forEach(e => {
      const entry = map.get(e.programme_title) ?? { total: 0, completed: 0 };
      entry.total++;
      if (e.status === "completed") entry.completed++;
      map.set(e.programme_title, entry);
    });
    return Array.from(map.entries()).map(([name, d]) => ({
      name: name.length > 20 ? name.substring(0, 20) + "…" : name,
      rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      enrolled: d.total,
    }));
  }, [enrolments]);

  if (!enrolments.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Progress Distribution */}
      <FadeIn>
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Learner Progress Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={progressDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FadeIn>

      {/* Status Pie */}
      <FadeIn delay={0.1}>
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Enrolment Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </FadeIn>

      {/* Spend Trend */}
      {spendTrend.length > 0 && (
        <FadeIn delay={0.2}>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Spend Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={spendTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Invoiced" />
                <Line type="monotone" dataKey="paid" stroke="hsl(var(--success))" strokeWidth={2} name="Paid" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      )}

      {/* Completion Rates */}
      <FadeIn delay={0.3}>
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Completion Rate by Programme</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={programmeRates} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}%`, "Completion"]}
              />
              <Bar dataKey="rate" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </FadeIn>
    </div>
  );
}
