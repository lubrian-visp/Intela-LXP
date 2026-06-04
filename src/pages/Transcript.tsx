import { useState, useRef } from "react";
import { GraduationCap, Download, Printer, Award, CheckCircle2, Clock, BookOpen, User, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissions, useCredentials, useEnrolments, useRealtimeSync } from "@/hooks/useCoreData";
import { useUnifiedGradebook, useDefaultGradingScale, bandForScore, bandColourClasses } from "@/hooks/useGradebook";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function Transcript() {
  const { user, profile } = useAuth();
  const learnerId = user?.id;

  const { data: submissions = [], isLoading: loadingSubs } = useSubmissions(learnerId ? { learnerId } : undefined);
  const { data: credentials = [], isLoading: loadingCreds } = useCredentials(learnerId);
  const { data: enrolments = [], isLoading: loadingEnrol } = useEnrolments(learnerId ? { learnerId } : undefined);
  const { data: unifiedGrades = [] } = useUnifiedGradebook(learnerId ? { learnerId } : undefined);
  const scale = useDefaultGradingScale();
  useRealtimeSync(["assessment_submissions", "issued_credentials", "enrolments", "activity_grades"]);

  const printRef = useRef<HTMLDivElement>(null);
  const isLoading = loadingSubs || loadingCreds || loadingEnrol;

  // Aggregate stats
  const totalAssessments = submissions.length;
  const passedAssessments = submissions.filter((s: any) => ["assessed", "approved", "passed"].includes(s.status)).length;
  const avgScore = totalAssessments > 0
    ? Math.round(submissions.reduce((acc: number, s: any) => acc + (s.score ?? 0), 0) / totalAssessments)
    : 0;
  const activeCredentials = credentials.filter((c: any) => c.status === "active").length;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Transcript</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete academic record including grades, completions, and credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Assessments Taken", value: totalAssessments, icon: <FileText className="w-4 h-4 text-info" /> },
          { label: "Passed / Competent", value: passedAssessments, icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
          { label: "Average Score", value: `${avgScore}%`, icon: <GraduationCap className="w-4 h-4 text-accent" /> },
          { label: "Credentials Earned", value: activeCredentials, icon: <Award className="w-4 h-4 text-warning" /> },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Printable Transcript */}
      <div ref={printRef} className="space-y-6 print:space-y-4">
        {/* Learner Info */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-secondary">
              <User className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{profile?.full_name || "Learner"}</h2>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Enrolments</p>
              <p className="font-medium text-foreground">{enrolments.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date Generated</p>
              <p className="font-medium text-foreground">{format(new Date(), "dd MMMM yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-success">Active</p>
            </div>
          </div>
        </div>

        {/* Assessment Results Table */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Assessment Results
            </h3>
          </div>
          {submissions.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No assessment records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assessment</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pass Mark</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Result</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s: any) => {
                    const passed = s.score != null && s.assessments?.pass_mark != null && s.score >= s.assessments.pass_mark;
                    const resultLabel = ["assessed", "approved", "passed"].includes(s.status)
                      ? (passed ? "Competent" : "Not Yet Competent")
                      : s.status === "submitted" ? "Pending" : s.status;
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-2.5 font-medium text-foreground">{s.assessments?.title ?? "Assessment"}</td>
                        <td className="px-5 py-2.5 text-muted-foreground">
                          {s.score != null ? `${s.score}/${s.assessments?.max_score ?? 100}` : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-muted-foreground">{s.assessments?.pass_mark ?? "—"}</td>
                        <td className="px-5 py-2.5">
                          <span className={cn(
                            "text-xs font-medium capitalize",
                            passed ? "text-success" : resultLabel === "Pending" ? "text-warning" : "text-destructive"
                          )}>
                            {resultLabel}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-muted-foreground text-xs">
                          {s.submitted_at ? format(new Date(s.submitted_at), "dd MMM yyyy") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Grades (non-assessment) */}
        {unifiedGrades.filter(g => g.source === "activity").length > 0 && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" /> Continuous Assessment & Activities
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Activity</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Band</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {unifiedGrades.filter(g => g.source === "activity").map(g => {
                    const band = bandForScore(scale, g.score);
                    const c = band ? bandColourClasses(band.colour_token) : bandColourClasses("muted");
                    const pct = g.score != null && g.max_score ? (Number(g.score) / Number(g.max_score)) * 100 : 0;
                    return (
                      <tr key={g.grade_id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-5 py-2.5 font-medium text-foreground">{g.activity_title}</td>
                        <td className="px-5 py-2.5 text-muted-foreground text-xs capitalize">{g.activity_type.replace("_", " ")}</td>
                        <td className="px-5 py-2.5">
                          {g.score != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-secondary"><div className={cn("h-full", c.solid)} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                              <span className="text-xs tabular-nums">{Number(g.score).toFixed(1)}/{g.max_score ?? 100}</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-2.5">
                          {band ? (
                            <span className={cn("inline-flex items-center px-2 py-0.5 border text-[10px] font-medium", c.bg, c.text, c.border)}>{band.label}</span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-muted-foreground text-xs">
                          {g.activity_date ? format(new Date(g.activity_date), "dd MMM yyyy") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grading Scale Legend */}
        {scale && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Grading Scale: {scale.name}</p>
            <p className="text-[10px] text-muted-foreground mb-3">{scale.description}</p>
            <div className="flex flex-wrap gap-2">
              {scale.bands?.map(b => {
                const c = bandColourClasses(b.colour_token);
                return (
                  <div key={b.id} className={cn("flex items-center gap-2 px-2.5 py-1 border", c.bg, c.border)}>
                    <span className={cn("w-2 h-2 rounded-full", c.solid)} />
                    <span className={cn("text-[10px] font-medium", c.text)}>{b.label}</span>
                    <span className="text-[10px] text-muted-foreground">{b.min_score}–{b.max_score}{scale.scale_type === "percentage" ? "%" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4" /> Issued Credentials
            </h3>
          </div>
          {credentials.length === 0 ? (
            <div className="p-8 text-center">
              <Award className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No credentials issued yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Credential</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issued</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-foreground">{c.title}</td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs capitalize">{c.credential_type}</td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs">{c.programmes?.title ?? "—"}</td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs">
                        {c.issued_at ? format(new Date(c.issued_at), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={cn(
                          "text-xs font-medium capitalize flex items-center gap-1",
                          c.status === "active" ? "text-success" : c.status === "pending" ? "text-warning" : "text-muted-foreground"
                        )}>
                          {c.status === "active" && <CheckCircle2 className="w-3 h-3" />}
                          {c.status === "pending" && <Clock className="w-3 h-3" />}
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        {c.blockchain_hash ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.blockchain_hash.slice(0, 6)}...{c.blockchain_hash.slice(-4)}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enrolment History */}
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Programme Enrolment History
            </h3>
          </div>
          {enrolments.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No enrolment records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cohort</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enrolled</th>
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolments.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-foreground">{e.cohorts?.programmes?.title ?? "—"}</td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs">{e.cohorts?.name ?? "—"}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary max-w-[80px]">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${e.progress_percentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{e.progress_percentage ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={cn(
                          "text-xs font-medium capitalize",
                          e.status === "completed" ? "text-success" : e.status === "active" ? "text-info" : "text-muted-foreground"
                        )}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs">
                        {e.enrolled_at ? format(new Date(e.enrolled_at), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground text-xs">
                        {e.completed_at ? format(new Date(e.completed_at), "dd MMM yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
