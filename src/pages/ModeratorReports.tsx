import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useModerationItems } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const STATUS_COLORS: Record<string, string> = {
  approved: "hsl(152, 60%, 40%)",
  rejected: "hsl(0, 70%, 55%)",
  pending: "hsl(38, 92%, 50%)",
  under_review: "hsl(210, 80%, 55%)",
};

export default function ModeratorReports() {
  const { data: items = [], isLoading } = useModerationItems();

  const all = items as any[];
  const stats = useMemo(() => {
    const approved = all.filter(i => i.status === "approved").length;
    const rejected = all.filter(i => i.status === "rejected").length;
    const pending = all.filter(i => i.status === "pending" || i.status === "under_review").length;
    return [
      { label: "Total", value: all.length, color: "text-foreground" },
      { label: "Approved", value: approved, color: "text-success" },
      { label: "Rejected", value: rejected, color: "text-destructive" },
      { label: "Pending", value: pending, color: "text-warning" },
    ];
  }, [all]);

  // By priority chart
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    all.forEach(i => { counts[i.priority] = (counts[i.priority] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [all]);

  // By status pie
  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    all.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "hsl(220, 13%, 60%)" }));
  }, [all]);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">QA Reports</h1>
        <p className="text-sm text-muted-foreground">Moderation and quality assurance statistics.</p>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Priority */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Items by Priority</h3>
          {priorityData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" fill="hsl(222, 60%, 18%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Status */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
          {statusPie.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No data yet.</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusPie.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-muted-foreground capitalize">{s.name.replace("_", " ")}</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
