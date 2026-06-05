import { useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/hooks/useAuth";
import { useSubmissions, useRealtimeSync, useEnrolments, useAssessments } from "@/hooks/useCoreData";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearnerSubmissionDialog } from "@/components/learner/LearnerSubmissionDialog";
import { ReflectiveJournalDialog } from "@/components/learner/ReflectiveJournalDialog";
import { useRecordStudyActivity } from "@/hooks/useLearnerStreak";
import { useEffect } from "react";
import {
  FileCheck, Clock, CheckCircle2, AlertCircle, BarChart3,
  Filter, XCircle, Target, Send, Zap, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  pending: { color: "text-info", bg: "bg-info/10", label: "Pending", icon: Clock },
  submitted: { color: "text-info", bg: "bg-info/10", label: "Submitted", icon: Clock },
  assessed: { color: "text-success", bg: "bg-success/10", label: "Assessed", icon: CheckCircle2 },
  graded: { color: "text-success", bg: "bg-success/10", label: "Graded", icon: CheckCircle2 },
  passed: { color: "text-success", bg: "bg-success/10", label: "Passed", icon: CheckCircle2 },
  failed: { color: "text-destructive", bg: "bg-destructive/10", label: "Failed", icon: XCircle },
  approved: { color: "text-success", bg: "bg-success/10", label: "Approved", icon: CheckCircle2 },
  resubmit: { color: "text-warning", bg: "bg-warning/10", label: "Revision Needed", icon: AlertCircle },
  moderated: { color: "text-accent-foreground", bg: "bg-accent/10", label: "Moderated", icon: BarChart3 },
};

const CATEGORY_BADGE: Record<string, string> = {
  diagnostic: "bg-info/10 text-info",
  formative: "bg-success/10 text-success",
  summative: "bg-warning/10 text-warning",
  transfer: "bg-primary/10 text-primary",
};

// Assessment types that should launch the interactive quiz taker
const QUIZ_TYPES = ["formative", "summative", "quiz", "knowledge_check", "pre_test"];

export default function LearnerAssessments() {
  usePageTitle("My Assessments", "Learner Portal");
  const { user } = useAuth();
  const navigate = useNavigate();
  const recordActivity = useRecordStudyActivity();
  const [scopeFilter, setScopeFilter]          = useState<string>("all");
  const [tab, setTab]                          = useState("progress");
  const [submitAssessment, setSubmitAssessment]  = useState<any>(null);
  const [journalAssessment, setJournalAssessment] = useState<any>(null);
  const [expandedHistory, setExpandedHistory]    = useState<Set<string>>(new Set());

  // Record assessment page visit as study activity
  useEffect(() => {
    if (user?.id) recordActivity.mutate({ minutes: 5, activity: "assessment" });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: submissions = [], isLoading: subsLoading } = useSubmissions({ learnerId: user?.id });
  const { data: enrolments = [], isLoading: enrLoading } = useEnrolments({ learnerId: user?.id });

  useRealtimeSync(["assessment_submissions", "notifications"]);

  const programmeIds = useMemo(() => {
    const ids = new Set<string>();
    enrolments.forEach((e: any) => {
      const progId = e.cohorts?.programme_id;
      if (progId) ids.add(progId);
    });
    return Array.from(ids);
  }, [enrolments]);

  const { data: allAssessments = [] } = useAssessments(programmeIds[0]);

  const isLoading = subsLoading || enrLoading;

  const stats = useMemo(() => {
    const total = submissions.length;
    const completed = submissions.filter((s: any) => ["graded", "assessed", "passed", "approved"].includes(s.status)).length;
    const pending = submissions.filter((s: any) => ["pending", "submitted"].includes(s.status)).length;
    const avgScore = submissions
      .filter((s: any) => s.score != null)
      .reduce((acc: number, s: any, _, arr) => acc + (s.score ?? 0) / arr.length, 0);
    return { total, completed, pending, avgScore: Math.round(avgScore) };
  }, [submissions]);

  const assessmentProgress = useMemo(() => {
    const grouped: Record<string, { assessment: any; submissions: any[]; bestScore: number | null; status: string; category: string }> = {};
    submissions.forEach((s: any) => {
      const aId = s.assessment_id;
      if (!grouped[aId]) grouped[aId] = { assessment: s.assessments, submissions: [], bestScore: null, status: "pending", category: "formative" };
      grouped[aId].submissions.push(s);
      if (s.score != null) grouped[aId].bestScore = Math.max(grouped[aId].bestScore ?? 0, s.score);
      const priority = ["passed", "graded", "assessed", "approved", "moderated", "submitted", "pending", "resubmit", "failed"];
      const current = priority.indexOf(grouped[aId].status);
      const incoming = priority.indexOf(s.status);
      if (incoming < current || current === -1) grouped[aId].status = s.status;
    });
    allAssessments.forEach((a: any) => { if (grouped[a.id]) grouped[a.id].category = a.assessment_category || "formative"; });
    return Object.entries(grouped).map(([id, data]) => ({ id, ...data }));
  }, [submissions, allAssessments]);

  // Assessments available but not yet submitted
  const unsubmittedAssessments = useMemo(() => {
    const submittedIds = new Set(submissions.map((s: any) => s.assessment_id));
    return allAssessments.filter((a: any) => !submittedIds.has(a.id));
  }, [allAssessments, submissions]);

  // Find resubmit-eligible submissions
  const resubmitMap = useMemo(() => {
    const map: Record<string, any> = {};
    submissions.forEach((s: any) => { if (s.status === "resubmit") map[s.assessment_id] = s; });
    return map;
  }, [submissions]);

  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">My Assessments</h1>
        <p className="text-sm text-muted-foreground">Track your assessment progress and results across all programmes.</p>
      </FadeIn>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assessments", value: stats.total, icon: <FileCheck className="w-4 h-4 text-info" />, bg: "bg-info/5" },
          { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="w-4 h-4 text-success" />, bg: "bg-success/5" },
          { label: "Pending", value: stats.pending, icon: <Clock className="w-4 h-4 text-warning" />, bg: "bg-warning/5" },
          { label: "Avg Score", value: stats.avgScore > 0 ? `${stats.avgScore}%` : "—", icon: <BarChart3 className="w-4 h-4 text-primary" />, bg: "bg-primary/5" },
        ].map((s) => (
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

      {/* Overall Progress Bar */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Overall Completion</span>
          <span className={cn("text-sm font-bold", completionPct === 100 ? "text-success" : "text-foreground")}>{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2" />
        <p className="text-[10px] text-muted-foreground mt-1">{stats.completed} of {stats.total} assessments completed</p>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="progress" className="text-xs gap-1.5"><Target className="w-3 h-3" /> Progress</TabsTrigger>
          <TabsTrigger value="available" className="text-xs gap-1.5"><Send className="w-3 h-3" /> Submit</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1.5"><Clock className="w-3 h-3" /> Timeline</TabsTrigger>
        </TabsList>

        {/* Progress View */}
        <TabsContent value="progress" className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                <SelectItem value="diagnostic" className="text-xs">Diagnostic</SelectItem>
                <SelectItem value="formative" className="text-xs">Formative</SelectItem>
                <SelectItem value="summative" className="text-xs">Summative</SelectItem>
                <SelectItem value="transfer" className="text-xs">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assessmentProgress.length === 0 ? (
            <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
              <FileCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No Assessments Yet</h3>
              <p className="text-xs text-muted-foreground">You don't have any assessment submissions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assessmentProgress.filter((ap) => scopeFilter === "all" || ap.category === scopeFilter).map((ap) => {
                const st = statusStyles[ap.status] ?? statusStyles.pending;
                const Icon = st.icon;
                const maxScore = ap.assessment?.max_score ?? 100;
                const passMark = ap.assessment?.pass_mark;
                const scorePct = ap.bestScore != null ? Math.round((ap.bestScore / maxScore) * 100) : null;
                const isPassing = passMark != null && ap.bestScore != null && ap.bestScore >= passMark;
                const canResubmit = resubmitMap[ap.id];

                return (
                  <div key={ap.id} className="bg-card rounded-xl border border-border/50 shadow-card hover:shadow-card-hover transition-all p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg shrink-0", st.bg)}>
                        <Icon className={cn("w-4 h-4", st.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground truncate">{ap.assessment?.title ?? "Assessment"}</h3>
                          <Badge variant="outline" className={cn("text-[8px] px-1.5 shrink-0", CATEGORY_BADGE[ap.category])}>{ap.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-2">
                          <span>{ap.submissions.length} attempt{ap.submissions.length !== 1 ? "s" : ""}</span>
                          {ap.bestScore != null && <span className="font-medium text-foreground">Best: {ap.bestScore}/{maxScore}</span>}
                          {passMark != null && <span>Pass mark: {passMark}</span>}
                        </div>
                        {scorePct != null && (
                          <div className="space-y-1">
                            <Progress value={scorePct} className="h-1.5" />
                            <div className="flex items-center justify-between text-[9px]">
                              <span className={cn("font-medium", isPassing ? "text-success" : "text-destructive")}>
                                {scorePct}% {isPassing ? "✓ Passing" : "✗ Below pass mark"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge className={cn("text-[9px]", st.bg, st.color, "border-0")}>{st.label}</Badge>
                        {/* View Results — for auto-graded (system-marked) attempts */}
                        {["graded", "assessed", "passed"].includes(ap.status) && ap.submissions.some((s: any) => s.feedback?.startsWith("Auto-graded")) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] gap-1 border-primary/30 text-primary"
                            onClick={() => navigate(`/quiz/${ap.id}?enrolmentId=${enrolments[0]?.id}&review=${ap.submissions[0]?.id}`)}
                          >
                            <History className="w-2.5 h-2.5" /> Results
                          </Button>
                        )}
                        {canResubmit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => setSubmitAssessment({ ...ap.assessment, id: ap.id })}
                          >
                            <Send className="w-2.5 h-2.5" /> Resubmit
                          </Button>
                        )}
                        {/* Attempt history toggle */}
                        {ap.submissions.length > 1 && (
                          <button
                            className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                            onClick={() => setExpandedHistory(prev => {
                              const next = new Set(prev);
                              next.has(ap.id) ? next.delete(ap.id) : next.add(ap.id);
                              return next;
                            })}
                            aria-expanded={expandedHistory.has(ap.id)}
                          >
                            {ap.submissions.length} attempts
                            {expandedHistory.has(ap.id) ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Attempt History — expanded list of all submissions */}
                    {expandedHistory.has(ap.id) && (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Attempt History</p>
                        {ap.submissions
                          .sort((a: any, b: any) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())
                          .map((s: any, idx: number) => {
                            const isAutoGraded = s.feedback?.startsWith("Auto-graded");
                            const sStatus = statusStyles[s.status] ?? statusStyles.pending;
                            return (
                              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/30">
                                <span className="text-[9px] text-muted-foreground w-16 shrink-0">
                                  Attempt {ap.submissions.length - idx}
                                </span>
                                <span className="text-[10px] font-medium text-foreground flex-1">
                                  {s.score != null ? `${s.score}/${ap.assessment?.max_score ?? 100}` : "—"}
                                  {isAutoGraded && (
                                    <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">⚡ Auto-graded</span>
                                  )}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {s.submitted_at ? format(new Date(s.submitted_at), "d MMM yy") : "—"}
                                </span>
                                <Badge className={cn("text-[8px] border-0", sStatus.bg, sStatus.color)}>{sStatus.label}</Badge>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Available / Submit Tab */}
        <TabsContent value="available" className="mt-4 space-y-2">
          {unsubmittedAssessments.length === 0 && assessmentProgress.length === 0 ? (
            <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
              <Send className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No assessments available for submission</p>
            </div>
          ) : (
            <>
              {unsubmittedAssessments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Assessments</h3>
                  {unsubmittedAssessments.map((a: any) => (
                    <div key={a.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <FileCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">{a.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <Badge variant="outline" className={cn("text-[8px]", CATEGORY_BADGE[a.assessment_category || "formative"])}>{a.assessment_category}</Badge>
                          {a.max_score && <span>Max: {a.max_score}</span>}
                          {a.due_date && <span>Due: {a.due_date}</span>}
                        </div>
                      </div>
                      {QUIZ_TYPES.includes(a.assessment_type ?? "") ? (
                        <Button size="sm" className="gap-1.5 h-7 text-xs bg-primary"
                          aria-label={`Take online quiz: ${a.title}`}
                          onClick={() => navigate(`/quiz/${a.id}?enrolmentId=${enrolments[0]?.id ?? ""}`)}>
                          <Zap className="w-3 h-3" /> Take Quiz
                        </Button>
                      ) : a.assessment_type === "reflection_journal" ? (
                        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs border-blue-500/30 text-blue-600"
                          aria-label={`Write journal: ${a.title}`}
                          onClick={() => setJournalAssessment(a)}>
                          📓 Write Journal
                        </Button>
                      ) : (
                        <Button size="sm" className="gap-1.5 h-7 text-xs"
                          aria-label={`Submit ${a.title}`}
                          onClick={() => setSubmitAssessment(a)}>
                          <Send className="w-3 h-3" /> Submit
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resubmission-eligible */}
              {Object.keys(resubmitMap).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-xs font-semibold text-warning uppercase tracking-wider">Revision Needed</h3>
                  {Object.entries(resubmitMap).map(([aId, sub]: [string, any]) => (
                    <div key={aId} className="bg-card rounded-xl border border-warning/20 p-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <AlertCircle className="w-4 h-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">{sub.assessments?.title ?? "Assessment"}</h4>
                        {sub.feedback && <p className="text-[10px] text-muted-foreground truncate">"{sub.feedback}"</p>}
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs border-warning/30 text-warning" onClick={() => setSubmitAssessment({ ...sub.assessments, id: aId })}>
                        <Send className="w-3 h-3" /> Resubmit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Timeline View — mobile-responsive card layout */}
        <TabsContent value="timeline" className="mt-4">
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            {submissions.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">No submissions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {submissions
                  .sort((a: any, b: any) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime())
                  .map((s: any) => {
                    const st   = statusStyles[s.status] ?? statusStyles.pending;
                    const Icon = st.icon;
                    return (
                      /* Responsive: stacks on mobile, row on sm+ */
                      <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn("p-1.5 rounded-lg shrink-0", st.bg)}>
                            <Icon className={cn("w-3.5 h-3.5", st.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.assessments?.title ?? "Assessment"}</p>
                            {s.feedback && <p className="text-[10px] text-muted-foreground line-clamp-1">"{s.feedback}"</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-9 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <p className="text-xs font-medium text-foreground">{s.score != null ? `${s.score}/${s.assessments?.max_score ?? 100}` : "—"}</p>
                            <p className="text-[9px] text-muted-foreground">{s.submitted_at ? format(new Date(s.submitted_at), "d MMM yyyy") : "Draft"}</p>
                          </div>
                          <Badge className={cn("text-[8px] border-0 shrink-0", st.bg, st.color)}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* File / Text Submission Dialog */}
      {submitAssessment && (
        <LearnerSubmissionDialog
          open={!!submitAssessment}
          onOpenChange={(open) => { if (!open) setSubmitAssessment(null); }}
          assessment={submitAssessment}
          enrolmentId={enrolments[0]?.id}
          existingSubmission={resubmitMap[submitAssessment.id] || null}
        />
      )}

      {/* Reflective Journal Dialog */}
      {journalAssessment && (
        <ReflectiveJournalDialog
          open={!!journalAssessment}
          onOpenChange={(open) => { if (!open) setJournalAssessment(null); }}
          assessment={journalAssessment}
          enrolmentId={enrolments[0]?.id}
        />
      )}
    </div>
  );
}
