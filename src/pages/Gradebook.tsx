import { useMemo, useState } from "react";
import { GraduationCap, Plus, Filter, Search, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedGradebook, useGradingScales, useDefaultGradingScale, useModerateActivityGrade, bandForScore, bandColourClasses, type UnifiedGrade } from "@/hooks/useGradebook";
import { useEnrolments, useCohorts, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import RecordActivityGradeDialog from "@/components/gradebook/RecordActivityGradeDialog";

export default function Gradebook() {
  const { user, roles } = useAuth();
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "assessment" | "activity">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "missing" | "pending_moderation" | "passed" | "failed">("all");
  const [recordOpen, setRecordOpen] = useState(false);

  const { data: grades = [], isLoading } = useUnifiedGradebook();
  const { data: enrolments = [] } = useEnrolments();
  const { data: cohorts = [] } = useCohorts();
  const { data: scales = [] } = useGradingScales();
  const defaultScale = useDefaultGradingScale();
  const moderate = useModerateActivityGrade();

  useRealtimeSync(["activity_grades", "assessment_submissions"]);

  const canRecord = roles.some((r) => ["super_admin", "operations", "programme_manager", "facilitator", "assessor"].includes(r));
  const canModerate = roles.some((r) => ["super_admin", "operations", "programme_manager", "moderator"].includes(r));

  const filtered = useMemo(() => {
    return grades.filter((g) => {
      if (filterSource !== "all" && g.source !== filterSource) return false;
      const s = search.toLowerCase();
      if (s && !g.activity_title.toLowerCase().includes(s)) return false;
      if (filterStatus === "missing" && g.score != null) return false;
      if (filterStatus === "pending_moderation" && g.moderation_status !== "pending") return false;
      if (filterStatus === "passed") {
        const isPassed = g.score != null && g.pass_mark != null ? g.score >= g.pass_mark : false;
        if (!isPassed) return false;
      }
      if (filterStatus === "failed") {
        const isFailed = g.score != null && g.pass_mark != null ? g.score < g.pass_mark : false;
        if (!isFailed) return false;
      }
      return true;
    });
  }, [grades, filterSource, filterStatus, search]);

  const stats = useMemo(() => {
    const total = grades.length;
    const graded = grades.filter((g) => g.score != null).length;
    const pendingMod = grades.filter((g) => g.moderation_status === "pending").length;
    const overdue = grades.filter((g) => {
      if (g.score != null) return false;
      const d = g.activity_date ? differenceInDays(new Date(), new Date(g.activity_date)) : 0;
      return d > 7;
    }).length;
    const avg = graded > 0 ? grades.reduce((s, g) => s + (g.score ?? 0), 0) / graded : 0;
    return { total, graded, pendingMod, overdue, avg };
  }, [grades]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gradebook</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified record of all assessment and activity grades. Used to auto-generate transcripts.
          </p>
        </div>
        {canRecord && (
          <Button size="sm" onClick={() => setRecordOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Record Activity Grade
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-secondary"><GraduationCap className="w-4 h-4 text-accent" /></div>
          <div><p className="text-xl font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Total Grade Records</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-secondary"><CheckCircle2 className="w-4 h-4 text-success" /></div>
          <div><p className="text-xl font-bold">{Math.round(stats.avg)}%</p><p className="text-[10px] text-muted-foreground">Average Score</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-secondary"><ShieldCheck className="w-4 h-4 text-warning" /></div>
          <div><p className="text-xl font-bold">{stats.pendingMod}</p><p className="text-[10px] text-muted-foreground">Pending Moderation</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-secondary"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
          <div><p className="text-xl font-bold">{stats.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue (&gt;7 days)</p></div>
        </Card>
      </div>

      {/* Grading Scale Legend */}
      {defaultScale && (
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-sm font-semibold">Grading Scale: {defaultScale.name}</p>
            <p className="text-[11px] text-muted-foreground">{defaultScale.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {defaultScale.bands?.map((b) => {
              const c = bandColourClasses(b.colour_token);
              return (
                <div key={b.id} className={cn("flex items-center gap-2 px-3 py-1.5 border", c.bg, c.border)}>
                  <span className={cn("w-2 h-2 rounded-full", c.solid)} />
                  <span className={cn("text-xs font-medium", c.text)}>{b.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {b.min_score}–{b.max_score}{defaultScale.scale_type === "percentage" ? "%" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity..."
              className="pl-8 pr-3 py-1.5 text-xs border border-border bg-background w-full focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Tabs value={filterSource} onValueChange={(v: any) => setFilterSource(v)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="assessment">Assessments</TabsTrigger>
              <TabsTrigger value="activity">Activities</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <TabsList>
              <TabsTrigger value="all">Any</TabsTrigger>
              <TabsTrigger value="passed">Passed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
              <TabsTrigger value="pending_moderation">Pending Mod</TabsTrigger>
              <TabsTrigger value="missing">Missing</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Grade rows */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Activity</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Band</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Moderation</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                {canModerate && <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canModerate ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground text-sm">No grades match the current filters.</td></tr>
              ) : filtered.map((g) => {
                const band = bandForScore(defaultScale, g.score);
                const c = band ? bandColourClasses(band.colour_token) : bandColourClasses("muted");
                const pct = g.score != null && g.max_score ? (g.score / Number(g.max_score)) * 100 : 0;
                return (
                  <tr key={`${g.source}-${g.grade_id}`} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{g.activity_title}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{g.activity_type.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {g.score != null ? (
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-1.5 bg-secondary max-w-[80px]">
                            <div className={cn("h-full", c.solid)} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs font-medium tabular-nums">{Number(g.score).toFixed(1)}/{g.max_score ?? 100}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">Missing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {band ? (
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 border", c.bg, c.text, c.border)}>
                          {band.label}
                        </span>
                      ) : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          g.moderation_status === "approved" && "border-success/30 text-success",
                          g.moderation_status === "rejected" && "border-destructive/30 text-destructive",
                          g.moderation_status === "flagged" && "border-warning/30 text-warning",
                          g.moderation_status === "pending" && "border-info/30 text-info",
                        )}
                      >
                        {g.moderation_status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">
                      {g.activity_date ? format(new Date(g.activity_date), "dd MMM yyyy") : "—"}
                    </td>
                    {canModerate && (
                      <td className="px-4 py-2.5">
                        {g.source === "activity" && g.moderation_status !== "approved" && g.recorded_by !== user?.id && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                              onClick={() => moderate.mutate({ id: g.grade_id, moderation_status: "approved" })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-warning border-warning/30"
                              onClick={() => moderate.mutate({ id: g.grade_id, moderation_status: "flagged" })}>
                              Flag
                            </Button>
                          </div>
                        )}
                        {g.recorded_by === user?.id && (
                          <span className="text-[10px] text-muted-foreground italic">Own grade — 4-eyes</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <RecordActivityGradeDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        enrolments={enrolments}
        cohorts={cohorts}
      />
    </div>
  );
}
