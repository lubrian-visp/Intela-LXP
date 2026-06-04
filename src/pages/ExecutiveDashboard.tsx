import { FadeIn, SlideInLeft as SlideIn } from "@/components/animations/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { useDataQualityAudit } from "@/hooks/useDataQualityAudit";
import {
  DollarSign,
  TrendingUp,
  Users,
  GraduationCap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  BarChart3,
} from "lucide-react";
import ProgressRing from "@/components/dashboard/ProgressRing";

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const { data, isLoading } = useExecutiveDashboard();
  const { data: auditIssues = [] } = useDataQualityAudit();

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-2">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const criticalIssues = auditIssues.filter((i) => i.severity === "critical");
  const warningIssues = auditIssues.filter((i) => i.severity === "warning");

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div>
          <h1 className="text-xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Cross-role platform overview — financial, talent, programme and health metrics.
          </p>
        </div>
      </FadeIn>

      {/* Financial ROI Section */}
      <FadeIn delay={0.05}>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Financial Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue"
              value={`${data.financial.currency} ${data.financial.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
            />
            <MetricCard
              title="Outstanding"
              value={`${data.financial.currency} ${data.financial.totalOutstanding.toLocaleString()}`}
              icon={Clock}
            />
            <MetricCard
              title="Overdue Invoices"
              value={data.financial.overdueInvoices}
              icon={AlertTriangle}
            />
            <MetricCard
              title="Quote Conversion"
              value={`${data.financial.quoteConversionRate}%`}
              icon={TrendingUp}
            />
          </div>
        </div>
      </FadeIn>

      {/* Programme Metrics */}
      <FadeIn delay={0.1}>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Programme Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Programmes"
              value={data.programmes.totalProgrammes}
              subtitle={`${data.programmes.activeProgrammes} active`}
              icon={GraduationCap}
            />
            <MetricCard
              title="Completion Rate"
              value={`${data.programmes.averageCompletionRate}%`}
              icon={CheckCircle2}
            />
            <MetricCard
              title="Total Enrolments"
              value={data.programmes.totalEnrolments}
              subtitle={`${data.programmes.activeEnrolments} active`}
              icon={Users}
            />
            <MetricCard
              title="Completed"
              value={data.programmes.completedEnrolments}
              icon={Award}
            />
          </div>
        </div>
      </FadeIn>

      {/* Talent Pipeline */}
      <FadeIn delay={0.15}>
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Talent Pipeline
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Active Learners"
              value={data.talent.activeLearners}
              icon={Users}
            />
            <MetricCard
              title="Credentials Issued"
              value={data.talent.credentialsIssued}
              icon={Award}
            />
            <MetricCard
              title="Avg Assessment Score"
              value={`${data.talent.averageAssessmentScore}%`}
              icon={BarChart3}
            />
            <MetricCard
              title="Platform Users"
              value={data.health.totalUsers}
              subtitle={`${data.health.activeRoles} active roles`}
              icon={Users}
            />
          </div>
        </div>
      </FadeIn>

      {/* Platform Health & Data Quality */}
      <FadeIn delay={0.2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Health */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Platform Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Approvals</span>
                <Badge variant={data.health.pendingApprovals > 10 ? "destructive" : "secondary"}>
                  {data.health.pendingApprovals}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">SLA Breaches</span>
                <Badge variant={data.health.slaBreach > 0 ? "destructive" : "secondary"}>
                  {data.health.slaBreach}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Roles</span>
                <Badge variant="outline">{data.health.activeRoles}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Data Quality Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {auditIssues.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  No data quality issues detected.
                </div>
              ) : (
                <>
                  {criticalIssues.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Critical Issues</span>
                      <Badge variant="destructive">{criticalIssues.length}</Badge>
                    </div>
                  )}
                  {warningIssues.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Warnings</span>
                      <Badge variant="secondary">{warningIssues.length}</Badge>
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    {auditIssues.slice(0, 3).map((issue, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        • {issue.description}
                      </p>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </FadeIn>
    </div>
  );
}
