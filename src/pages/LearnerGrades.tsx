import { useMemo, useState, useCallback } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "react-router-dom";
import { GraduationCap, Search, Trophy, TrendingUp, FileText, ShieldCheck, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import RubricBreakdown from "@/components/learner/RubricBreakdown";
import { useAuth } from "@/hooks/useAuth";
import {
  useUnifiedGradebook,
  useGradingScales,
  useDefaultGradingScale,
  bandForScore,
  bandColourClasses,
} from "@/hooks/useGradebook";
import { useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Learner-facing Grades view.
 * Reads from `unified_gradebook` view, automatically scoped to the
 * authenticated learner via RLS (learner_id = auth.uid()).
 */
export default function LearnerGrades() {
  usePageTitle("My Grades", "Learner Portal");
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "assessment" | "activity">("all");
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());

  const toggleFeedback = useCallback((id: string) => {
    setExpandedFeedback(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const { data: grades = [], isLoading } = useUnifiedGradebook({ learnerId: user?.id });
  const { data: enrolments = [] } = useEnrolments();
  const { data: scales = [] } = useGradingScales();
  const defaultScale = useDefaultGradingScale();

  useRealtimeSync(["activity_grades", "assessment_submissions"]);

  const programmes = useMemo(() => {
    const map = new Map<string, string>();
    enrolments.forEach((e: any) => {
      if (e.programme_id && e.programme?.title) map.set(e.programme_id, e.programme.title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [enrolments]);

  const filtered = useMemo(() => {
    return grades.filter((g) => {
      if (sourceFilter !== "all" && g.source !== sourceFilter) return false;
      if (programmeFilter !== "all" && g.programme_id !== programmeFilter) return false;
      const s = search.toLowerCase();
      if (s && !g.activity_title.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [grades, search, programmeFilter, sourceFilter]);

  const stats = useMemo(() => {
    const graded = grades.filter((g) => g.score != null);
    const passed = graded.filter((g) => g.pass_mark != null && g.score! >= g.pass_mark).length;
    const failed = graded.filter((g) => g.pass_mark != null && g.score! < g.pass_mark).length;
    const pending = grades.filter(
      (g) => g.score == null || g.moderation_status === "pending",
    ).length;
    const avg =
      graded.length > 0
        ? Math.round(
            (graded.reduce((sum, g) => sum + (g.score! / (g.max_score || 100)) * 100, 0) /
              graded.length) *
              10,
          ) / 10
        : 0;
    return { total: grades.length, graded: graded.length, passed, failed, pending, avg };
  }, [grades]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-heading font-semibold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            My Grades
          </h1>
          <p className="text-muted-foreground mt-1">
            All your assessment and activity results across programmes.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/transcript">
            <FileText className="w-4 h-4 mr-2" />
            View Transcript
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">Average Score</p>
          <p className="text-2xl font-heading font-bold mt-1">{stats.avg}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            Across {stats.graded} graded items
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">Passed</p>
          <p className="text-2xl font-heading font-bold mt-1 text-emerald-600">{stats.passed}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Achieved
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">Pending</p>
          <p className="text-2xl font-heading font-bold mt-1 text-amber-600">{stats.pending}</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting grade or moderation</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wider">Total Items</p>
          <p className="text-2xl font-heading font-bold mt-1">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Recorded
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search grades…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programmes</SelectItem>
              {programmes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="assessment">Assessments</TabsTrigger>
              <TabsTrigger value="activity">Activities</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Grades list */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No grades to show yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your grades will appear here once your facilitators or assessors record them.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => {
            const pct =
              g.score != null && g.max_score ? Math.round((g.score / g.max_score) * 100) : null;
            const band = pct != null && defaultScale ? bandForScore(defaultScale, pct) : null;
            const passed =
              g.score != null && g.pass_mark != null ? g.score >= g.pass_mark : null;
            const programmeTitle =
              programmes.find((p) => p.id === g.programme_id)?.title ?? "—";

            return (
              <Card key={`${g.source}-${g.grade_id}`} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{g.activity_title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {g.source === "assessment" ? "Assessment" : "Activity"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {g.activity_type}
                      </Badge>
                      {g.moderation_status === "approved" && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Moderated
                        </Badge>
                      )}
                      {g.moderation_status === "pending" && (
                        <Badge variant="outline" className="text-xs text-amber-700">
                          Awaiting moderation
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {programmeTitle}
                      {g.activity_date && (
                        <> • {format(new Date(g.activity_date), "dd MMM yyyy")}</>
                      )}
                    </p>
                    {g.feedback && (
                      <div className="mt-2">
                        <p className={cn(
                          "text-sm text-muted-foreground italic",
                          !expandedFeedback.has(`${g.source}-${g.grade_id}`) && "line-clamp-2"
                        )}>
                          "{g.feedback}"
                        </p>
                        {g.feedback.length > 120 && (
                          <button
                            onClick={() => toggleFeedback(`${g.source}-${g.grade_id}`)}
                            aria-expanded={expandedFeedback.has(`${g.source}-${g.grade_id}`)}
                            aria-label={expandedFeedback.has(`${g.source}-${g.grade_id}`) ? "Collapse feedback" : "Read full feedback"}
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-0.5"
                          >
                            {expandedFeedback.has(`${g.source}-${g.grade_id}`) ? (
                              <><ChevronUp className="w-3 h-3" /> Show less</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> Read full feedback</>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {g.score != null ? (
                      <>
                        <p className="text-2xl font-heading font-bold">
                          {g.score}
                          <span className="text-sm text-muted-foreground font-normal">
                            {" "}
                            / {g.max_score ?? 100}
                          </span>
                        </p>
                        {pct != null && (
                          <p className="text-xs text-muted-foreground">{pct}%</p>
                        )}
                        {band && (
                          <Badge
                            className={cn("mt-1 text-xs", bandColourClasses(band.colour_token))}
                          >
                            {band.label}
                          </Badge>
                        )}
                        {passed != null && (
                          <p
                            className={cn(
                              "text-xs mt-1 flex items-center gap-1 justify-end",
                              passed ? "text-emerald-600" : "text-rose-600",
                            )}
                          >
                            {passed ? (
                              <>
                                <Trophy className="w-3 h-3" /> Passed
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" /> Not yet achieved
                              </>
                            )}
                          </p>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-amber-700">
                        Not yet graded
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Rubric breakdown — shown when available */}
                {g.source === "assessment" && g.grade_id && (
                  <RubricBreakdown submissionId={g.grade_id} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
