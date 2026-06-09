import { useState, useMemo } from "react";
import { Search, GraduationCap, Award, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface Props {
  data: any;
  programmes: any[];
  isLoading: boolean;
  onViewLearner?: (learnerId: string) => void;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  enrolled: "bg-info/10 text-info",
  completed: "bg-primary/10 text-primary",
  suspended: "bg-destructive/10 text-destructive",
  pending: "bg-warning/10 text-warning",
};

export default function TalentLearnerPipeline({ data, programmes, isLoading, onViewLearner }: Props) {
  const [search, setSearch] = useState("");
  const [progFilter, setProgFilter] = useState("All");

  const enrichedLearners = useMemo(() => {
    if (!data) return [];
    const { enrolments, registrations, submissions, credentials } = data;

    // Build learner map from registrations
    const regMap: Record<string, any> = {};
    registrations.forEach((r: any) => { regMap[r.id] = r; });

    // Group enrolments by learner
    const learnerMap: Record<string, any> = {};
    enrolments.forEach((e: any) => {
      if (!learnerMap[e.learner_id]) {
        const reg = regMap[e.learner_id];
        learnerMap[e.learner_id] = {
          id: e.learner_id,
          name: reg?.full_name || "Unknown",
          email: reg?.email || "",
          learner_number: reg?.learner_number || "",
          enrolments: [],
          submissionCount: 0,
          passedCount: 0,
          credentialCount: 0,
        };
      }
      learnerMap[e.learner_id].enrolments.push(e);
    });

    // Add submission stats
    submissions.forEach((s: any) => {
      if (learnerMap[s.learner_id]) {
        learnerMap[s.learner_id].submissionCount++;
        const a = s.assessments as any;
        if (s.score !== null && a?.pass_mark !== null && s.score >= a.pass_mark) {
          learnerMap[s.learner_id].passedCount++;
        }
      }
    });

    // Add credential counts
    credentials.forEach((c: any) => {
      if (learnerMap[c.learner_id]) learnerMap[c.learner_id].credentialCount++;
    });

    return Object.values(learnerMap);
  }, [data]);

  const filtered = enrichedLearners.filter((l: any) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchProg = progFilter === "All" || l.enrolments.some((e: any) => (e.cohorts as any)?.programme_id === progFilter);
    return matchSearch && matchProg;
  });

  // Pipeline summary
  const pipeline = useMemo(() => {
    if (!data) return { active: 0, completed: 0, atRisk: 0 };
    const enrolments = data.enrolments ?? [];
    return {
      active: enrolments.filter((e: any) => ["active", "enrolled"].includes(e.status)).length,
      completed: enrolments.filter((e: any) => e.status === "completed").length,
      atRisk: enrolments.filter((e: any) => (e.progress_percentage ?? 0) < 25 && ["active", "enrolled"].includes(e.status)).length,
    };
  }, [data]);

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Enrolments", value: pipeline.active, icon: GraduationCap, color: "text-info" },
          { label: "Completed", value: pipeline.completed, icon: Award, color: "text-success" },
          { label: "At Risk (<25%)", value: pipeline.atRisk, icon: TrendingUp, color: "text-destructive" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl shadow-card border border-border/50 p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-secondary">
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Learner Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Learner Talent Pipeline</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} learners tracked</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learners..." className="pl-8 h-8 text-xs w-48" />
            </div>
            <Select value={progFilter} onValueChange={setProgFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Programme" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Programmes</SelectItem>
                {programmes.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme(s)</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assessments</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Credentials</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">No learners found.</td></tr>
              )}
              {filtered.map((l: any) => {
                const bestEnrolment = l.enrolments[0];
                const progress = bestEnrolment?.progress_percentage ?? 0;
                const status = bestEnrolment?.status ?? "unknown";
                const programmeName = (bestEnrolment?.cohorts as any)?.programmes?.title ?? "—";
                return (
                  <tr
                    key={l.id}
                    className={`hover:bg-secondary/20 transition-colors${onViewLearner ? " cursor-pointer group" : ""}`}
                    onClick={() => onViewLearner?.(l.id)}
                    role={onViewLearner ? "button" : undefined}
                    tabIndex={onViewLearner ? 0 : undefined}
                    onKeyDown={onViewLearner ? (k => k.key === "Enter" && onViewLearner(l.id)) : undefined}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-info flex items-center justify-center text-[10px] font-bold text-info-foreground shrink-0">
                          {l.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{l.name}</span>
                          <p className="text-[10px] text-muted-foreground">{l.learner_number || l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-[160px] truncate">{programmeName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium text-foreground">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {l.passedCount}/{l.submissionCount} passed
                    </td>
                    <td className="px-4 py-3">
                      {l.credentialCount > 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                          <Award className="w-3 h-3 mr-1" />{l.credentialCount}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[status] || "bg-muted text-muted-foreground")}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
