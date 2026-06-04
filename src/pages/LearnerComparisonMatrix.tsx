import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExportButton from "@/components/ExportButton";
import {
  Users, Trophy, TrendingUp, TrendingDown, Minus,
  Search, ArrowUpDown, Medal, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LearnerRow {
  learnerId: string;
  learnerName: string;
  scores: Record<string, { score: number | null; status: string }>;
  avg: number;
  passRate: number;
  rank: number;
}

export default function LearnerComparisonMatrix() {
  const [programmeFilter, setProgrammeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"rank" | "name" | "avg">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Fetch programmes
  const { data: programmes = [] } = useQuery({
    queryKey: ["programmes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("programmes").select("id, title").order("title");
      return data ?? [];
    },
  });

  // Fetch all submissions with learner profiles and assessment info
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["comparison-submissions", programmeFilter],
    queryFn: async () => {
      let query = supabase
        .from("assessment_submissions")
        .select("learner_id, assessment_id, score, status, assessments!inner(id, title, programme_id, max_score, pass_mark)")
        .in("status", ["graded", "assessed", "passed", "failed", "approved", "moderated"]);

      if (programmeFilter !== "all") {
        query = query.eq("assessments.programme_id", programmeFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  // Fetch profiles for learner names
  const learnerIds = useMemo(() => [...new Set(submissions.map((s: any) => s.learner_id))], [submissions]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["comparison-profiles", learnerIds],
    queryFn: async () => {
      if (!learnerIds.length) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", learnerIds);
      return data ?? [];
    },
    enabled: learnerIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { m[p.user_id] = p.full_name || "Unknown"; });
    return m;
  }, [profiles]);

  // Build assessment columns
  const assessments = useMemo(() => {
    const map = new Map<string, { id: string; title: string; maxScore: number; passMark: number | null }>();
    submissions.forEach((s: any) => {
      const a = s.assessments;
      if (a && !map.has(a.id)) {
        map.set(a.id, { id: a.id, title: a.title, maxScore: a.max_score ?? 100, passMark: a.pass_mark });
      }
    });
    return Array.from(map.values());
  }, [submissions]);

  // Build learner rows
  const rows: LearnerRow[] = useMemo(() => {
    const grouped: Record<string, Record<string, { score: number | null; status: string }>> = {};

    submissions.forEach((s: any) => {
      if (!grouped[s.learner_id]) grouped[s.learner_id] = {};
      const existing = grouped[s.learner_id][s.assessment_id];
      // Keep best score
      if (!existing || (s.score != null && (existing.score == null || s.score > existing.score))) {
        grouped[s.learner_id][s.assessment_id] = { score: s.score, status: s.status };
      }
    });

    const result: LearnerRow[] = Object.entries(grouped).map(([learnerId, scores]) => {
      const scoreValues = Object.values(scores).filter(s => s.score != null).map(s => s.score!);
      const avg = scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 0;
      const passCount = Object.entries(scores).filter(([aId, s]) => {
        const assessment = assessments.find(a => a.id === aId);
        return s.score != null && assessment?.passMark != null && s.score >= assessment.passMark;
      }).length;
      const totalWithPassMark = Object.entries(scores).filter(([aId]) => {
        const assessment = assessments.find(a => a.id === aId);
        return assessment?.passMark != null;
      }).length;
      const passRate = totalWithPassMark > 0 ? Math.round((passCount / totalWithPassMark) * 100) : 0;

      return {
        learnerId,
        learnerName: profileMap[learnerId] || "Unknown",
        scores,
        avg: Math.round(avg * 10) / 10,
        passRate,
        rank: 0,
      };
    });

    // Rank by average descending
    result.sort((a, b) => b.avg - a.avg);
    result.forEach((r, i) => { r.rank = i + 1; });

    return result;
  }, [submissions, assessments, profileMap]);

  // Filter & sort
  const filteredRows = useMemo(() => {
    let filtered = rows;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => r.learnerName.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === "rank") cmp = a.rank - b.rank;
      else if (sortField === "name") cmp = a.learnerName.localeCompare(b.learnerName);
      else cmp = a.avg - b.avg;
      return sortDir === "desc" ? -cmp : cmp;
    });
    return filtered;
  }, [rows, search, sortField, sortDir]);

  // Summary stats
  const classAvg = rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.avg, 0) / rows.length * 10) / 10 : 0;
  const classPassRate = rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.passRate, 0) / rows.length) : 0;

  // Export data
  const exportData = filteredRows.map(r => {
    const row: Record<string, unknown> = { Rank: r.rank, Learner: r.learnerName, "Avg Score": r.avg, "Pass Rate %": r.passRate };
    assessments.forEach(a => { row[a.title] = r.scores[a.id]?.score ?? "—"; });
    return row;
  });

  const toggleSort = (field: "rank" | "name" | "avg") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-4 h-4 text-warning" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-muted-foreground" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-[hsl(25,60%,50%)]" />;
    return <span className="text-xs text-muted-foreground font-mono w-4 text-center">{rank}</span>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Learner Comparison Matrix</h1>
            <p className="text-sm text-muted-foreground">Side-by-side performance comparison across assessments.</p>
          </div>
          <ExportButton data={exportData} filename="learner-comparison-matrix" />
        </div>
      </FadeIn>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Learners", value: rows.length, icon: <Users className="w-4 h-4 text-primary" />, bg: "bg-primary/5" },
          { label: "Assessments", value: assessments.length, icon: <Target className="w-4 h-4 text-info" />, bg: "bg-info/5" },
          { label: "Class Average", value: `${classAvg}%`, icon: <TrendingUp className="w-4 h-4 text-success" />, bg: "bg-success/5" },
          { label: "Class Pass Rate", value: `${classPassRate}%`, icon: <Trophy className="w-4 h-4 text-warning" />, bg: "bg-warning/5" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", s.bg)}>{s.icon}</div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="All Programmes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Programmes</SelectItem>
            {programmes.map((p: any) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search learner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-xs"
          />
        </div>
      </div>

      {/* Matrix Table */}
      {filteredRows.length === 0 ? (
        <div className="bg-card rounded-xl p-16 shadow-card border border-border/50 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Data Available</h3>
          <p className="text-xs text-muted-foreground">No graded submissions found for the selected filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="w-12">
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px] gap-1" onClick={() => toggleSort("rank")}>
                      # <ArrowUpDown className="w-2.5 h-2.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[160px]">
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px] gap-1" onClick={() => toggleSort("name")}>
                      Learner <ArrowUpDown className="w-2.5 h-2.5" />
                    </Button>
                  </TableHead>
                  {assessments.map(a => (
                    <TableHead key={a.id} className="text-center min-w-[90px]">
                      <div className="text-[9px] font-medium text-muted-foreground leading-tight truncate max-w-[90px]" title={a.title}>
                        {a.title}
                      </div>
                      {a.passMark != null && (
                        <span className="text-[8px] text-muted-foreground/60">Pass: {a.passMark}</span>
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-[10px] gap-1" onClick={() => toggleSort("avg")}>
                      Avg <ArrowUpDown className="w-2.5 h-2.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center text-[10px]">Pass %</TableHead>
                  <TableHead className="text-center text-[10px]">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map(row => {
                  const scoreEntries = Object.values(row.scores).filter(s => s.score != null).map(s => s.score!);
                  const trend = scoreEntries.length >= 2
                    ? scoreEntries[scoreEntries.length - 1] - scoreEntries[0]
                    : 0;

                  return (
                    <TableRow key={row.learnerId} className="hover:bg-secondary/10 transition-colors">
                      <TableCell className="text-center">{getRankIcon(row.rank)}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-foreground">{row.learnerName}</span>
                      </TableCell>
                      {assessments.map(a => {
                        const entry = row.scores[a.id];
                        const score = entry?.score;
                        const isPassing = score != null && a.passMark != null && score >= a.passMark;
                        const isFailing = score != null && a.passMark != null && score < a.passMark;

                        return (
                          <TableCell key={a.id} className="text-center">
                            {score != null ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-mono px-2 border-0",
                                  isPassing && "bg-success/10 text-success",
                                  isFailing && "bg-destructive/10 text-destructive",
                                  !isPassing && !isFailing && "bg-secondary text-foreground"
                                )}
                              >
                                {score}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <span className={cn(
                          "text-xs font-bold",
                          row.avg >= classAvg ? "text-success" : "text-destructive"
                        )}>
                          {row.avg}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] border-0",
                            row.passRate >= 75 ? "bg-success/10 text-success" :
                            row.passRate >= 50 ? "bg-warning/10 text-warning" :
                            "bg-destructive/10 text-destructive"
                          )}
                        >
                          {row.passRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {trend > 0 ? <TrendingUp className="w-3.5 h-3.5 text-success mx-auto" /> :
                         trend < 0 ? <TrendingDown className="w-3.5 h-3.5 text-destructive mx-auto" /> :
                         <Minus className="w-3.5 h-3.5 text-muted-foreground mx-auto" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
