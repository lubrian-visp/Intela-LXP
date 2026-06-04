import { useTenantQuotaUsage } from "@/hooks/useFeatureFlags";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Gauge } from "lucide-react";

interface Props { tenantId: string }

function pct(current: number, max: number | null) {
  if (!max || max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

function statusColor(percent: number) {
  if (percent >= 100) return "destructive";
  if (percent >= 80) return "warning";
  return "default";
}

export default function TenantQuotaPanel({ tenantId }: Props) {
  const { data: usage, isLoading } = useTenantQuotaUsage(tenantId);

  const userPct = usage ? pct(usage.active_users, usage.max_users) : 0;
  const progPct = usage ? pct(usage.current_programmes, usage.max_programmes) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          Quota Usage
        </CardTitle>
        <CardDescription>
          Current resource usage against subscription limits. Quotas are enforced on insert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading || !usage ? (
          <p className="text-sm text-muted-foreground">Loading usage…</p>
        ) : (
          <>
            {/* Users quota */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Active Users
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums">
                    {usage.active_users}{" "}
                    <span className="text-muted-foreground">
                      / {usage.max_users ?? "∞"}
                    </span>
                  </span>
                  {usage.max_users !== null && (
                    <Badge
                      variant={statusColor(userPct) === "destructive" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {userPct}%
                    </Badge>
                  )}
                </div>
              </div>
              {usage.max_users !== null && <Progress value={userPct} className="h-2" />}
            </div>

            {/* Programmes quota */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  Programmes
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums">
                    {usage.current_programmes}{" "}
                    <span className="text-muted-foreground">
                      / {usage.max_programmes ?? "∞"}
                    </span>
                  </span>
                  {usage.max_programmes !== null && (
                    <Badge
                      variant={statusColor(progPct) === "destructive" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {progPct}%
                    </Badge>
                  )}
                </div>
              </div>
              {usage.max_programmes !== null && <Progress value={progPct} className="h-2" />}
            </div>

            {(userPct >= 80 || progPct >= 80) && (
              <p className="text-xs text-warning">
                ⚠ Approaching subscription limits. Consider upgrading the plan to avoid disruptions.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
