import { useMemo } from "react";
import { Loader2, BarChart3, Users, Building2, GraduationCap, FileCheck, Globe, Activity, TrendingUp } from "lucide-react";
import { usePlatformAnalytics, PlatformAnalyticsRow } from "@/hooks/usePlatformAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Navigate } from "react-router-dom";

function StatCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-accent/10 text-accent flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "bg-green-600" : score >= 50 ? "bg-amber-500" : "bg-red-600";
  return <Badge className={`${tone} hover:${tone} text-white`}>{score}</Badge>;
}

function QuotaBar({ used, max }: { used: number; max: number | null }) {
  if (!max) return <span className="text-xs text-muted-foreground">unlimited</span>;
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Progress value={pct} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground tabular-nums">{used}/{max}</span>
    </div>
  );
}

export default function PlatformAnalytics() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("super_admin") || roles.includes("systems_admin");
  const { data: rows = [], isLoading, error } = usePlatformAnalytics();

  const totals = useMemo<PlatformAnalyticsRow | null>(() => {
    if (!rows.length) return null;
    return rows.reduce(
      (acc, r) => ({
        ...acc,
        active_members: acc.active_members + Number(r.active_members),
        pending_invitations: acc.pending_invitations + Number(r.pending_invitations),
        total_programmes: acc.total_programmes + Number(r.total_programmes),
        active_programmes: acc.active_programmes + Number(r.active_programmes),
        total_enrolments: acc.total_enrolments + Number(r.total_enrolments),
        active_enrolments: acc.active_enrolments + Number(r.active_enrolments),
        submissions_30d: acc.submissions_30d + Number(r.submissions_30d),
        verified_domains: acc.verified_domains + Number(r.verified_domains),
        custom_domains: acc.custom_domains + Number(r.custom_domains),
      }),
      { active_members: 0, pending_invitations: 0, total_programmes: 0, active_programmes: 0,
        total_enrolments: 0, active_enrolments: 0, submissions_30d: 0,
        verified_domains: 0, custom_domains: 0 } as any
    );
  }, [rows]);

  const chartData = useMemo(
    () => rows.slice(0, 10).map((r) => ({
      name: r.tenant_name.length > 14 ? r.tenant_name.slice(0, 14) + "…" : r.tenant_name,
      members: Number(r.active_members),
      enrolments: Number(r.active_enrolments),
      submissions: Number(r.submissions_30d),
    })),
    [rows]
  );

  if (!isAdmin) return <Navigate to="/" replace />;

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  if (error) return <div className="p-6 text-destructive">Failed to load analytics: {(error as any).message}</div>;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-accent" /> Platform Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Aggregate usage, activity and health across all tenants.</p>
      </div>

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Building2} label="Tenants" value={rows.length} />
          <StatCard icon={Users} label="Active members" value={totals.active_members} hint={`${totals.pending_invitations} pending invites`} />
          <StatCard icon={GraduationCap} label="Programmes" value={totals.total_programmes} hint={`${totals.active_programmes} active`} />
          <StatCard icon={Activity} label="Enrolments" value={totals.total_enrolments} hint={`${totals.active_enrolments} active`} />
          <StatCard icon={FileCheck} label="Submissions (30d)" value={totals.submissions_30d} />
          <StatCard icon={Globe} label="Custom domains" value={totals.custom_domains} hint={`${totals.verified_domains} verified`} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Top tenants by activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="members" fill="hsl(var(--primary))" name="Members" />
              <Bar dataKey="enrolments" fill="hsl(var(--accent))" name="Enrolments" />
              <Bar dataKey="submissions" fill="#10b981" name="Submissions (30d)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Per-tenant breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Programmes</TableHead>
                <TableHead>Enrolments</TableHead>
                <TableHead>Submissions (30d)</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.tenant_id}>
                  <TableCell>
                    <div className="font-medium">{r.tenant_name}</div>
                    <div className="text-xs text-muted-foreground">{r.tenant_slug}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.subscription_tier ?? "—"}</Badge></TableCell>
                  <TableCell><QuotaBar used={Number(r.active_members)} max={r.max_users} /></TableCell>
                  <TableCell><QuotaBar used={Number(r.total_programmes)} max={r.max_programmes} /></TableCell>
                  <TableCell className="tabular-nums">{r.active_enrolments}/{r.total_enrolments}</TableCell>
                  <TableCell className="tabular-nums">{r.submissions_30d}</TableCell>
                  <TableCell className="tabular-nums">{r.verified_domains}/{r.custom_domains}</TableCell>
                  <TableCell><HealthBadge score={Number(r.health_score)} /></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No tenants yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
