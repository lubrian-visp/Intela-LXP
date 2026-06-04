import { FileCheck, Plus, Search, Clock, CheckCircle2, AlertCircle, BarChart3, Star, X, Send, RotateCcw, ChevronRight, Eye, Pencil, Trash2, Filter, Library, Award, ShieldCheck, Sparkles } from "lucide-react";
import PublishAssessmentDialog from "@/components/assessment/PublishAssessmentDialog";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAssessments, useSubmissions, useUpdateSubmission, useUpdateAssessment, useDeleteAssessment, useCreateAssessment, useProgrammes, useRealtimeSync, useProgrammeModules } from "@/hooks/useCoreData";
import { CreateAssessmentDialog } from "@/components/builder/CreateAssessmentDialog";
import { InlineCreateAssessmentForm } from "@/components/builder/InlineCreateAssessmentForm";

import QuestionBankPanel from "@/components/assessment/QuestionBankPanel";
import RubricBuilder from "@/components/assessment/RubricBuilder";
import { useUpsertAssessmentSettings } from "@/hooks/useAssessmentSettings";
import { useLinkRubricToAssessment } from "@/hooks/useRubrics";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import ExportButton from "@/components/ExportButton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Assessment = Tables<"assessments"> & {
  programme_modules: { title: string } | null;
};
type Submission = Tables<"assessment_submissions"> & {
  assessments: { title: string; max_score: number | null; pass_mark: number | null } | null;
};

const typeLabel: Record<string, string> = {
  formative: "Formative", summative: "Summative", rubric: "Rubric", exam: "Exam",
  project: "Project", competency: "Competency", homework: "Homework",
  peer_group: "Peer Group", group_project: "Group Project", final_project: "Final Project",
  workplace: "Workplace", oral: "Oral", portfolio: "Portfolio",
  self_assessment: "Self-Assessment", pre_test: "Pre-Test", skills_gap: "Skills Gap",
  prior_knowledge: "Prior Knowledge", knowledge_check: "Knowledge Check",
  reflection_journal: "Reflection", exit_ticket: "Exit Ticket", simulation: "Simulation",
  polling: "Polling", practical_exam: "Practical Exam", certification_exam: "Certification",
  action_plan: "Action Plan", manager_observation: "Manager Obs.", follow_up: "Follow-Up",
};
const typeColor: Record<string, string> = {
  formative: "text-info", summative: "text-accent", rubric: "text-info", exam: "text-accent",
  project: "text-success", competency: "text-primary", homework: "text-warning",
  peer_group: "text-info", group_project: "text-success", final_project: "text-accent",
  workplace: "text-primary", oral: "text-warning", portfolio: "text-info",
};
const typeBg: Record<string, string> = {
  formative: "bg-info/10", summative: "bg-accent/10", rubric: "bg-info/10", exam: "bg-accent/10",
  project: "bg-success/10", competency: "bg-primary/10", homework: "bg-warning/10",
  peer_group: "bg-info/10", group_project: "bg-success/10", final_project: "bg-accent/10",
  workplace: "bg-primary/10", oral: "bg-warning/10", portfolio: "bg-info/10",
};
const typeStrip: Record<string, string> = {
  formative: "bg-info", summative: "bg-accent", rubric: "bg-info", exam: "bg-accent",
  project: "bg-success", competency: "bg-primary", homework: "bg-warning",
  peer_group: "bg-info", group_project: "bg-success", final_project: "bg-accent",
  workplace: "bg-primary", oral: "bg-warning", portfolio: "bg-info",
};

const categoryLabel: Record<string, string> = {
  diagnostic: "Diagnostic",
  formative: "Formative",
  summative: "Summative",
  transfer: "Transfer",
};
const categoryColor: Record<string, string> = {
  diagnostic: "text-warning",
  formative: "text-info",
  summative: "text-accent",
  transfer: "text-success",
};

const submissionStatusStyle = {
  pending: { dot: "bg-warning", text: "text-warning" },
  submitted: { dot: "bg-info", text: "text-info" },
  graded: { dot: "bg-success", text: "text-success" },
  resubmit: { dot: "bg-destructive", text: "text-destructive" },
};

export default function Assessments() {
  const [tab, setTab] = useState<"assessments" | "queue" | "question_bank" | "rubrics">("assessments");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradingFeedback, setGradingFeedback] = useState("");
  const [gradingScore, setGradingScore] = useState("");
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);
  const [publishTarget, setPublishTarget] = useState<Assessment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  
  const [selectedProgramme, setSelectedProgramme] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: assessments, isLoading: assessmentsLoading } = useAssessments();
  const { data: submissions, isLoading: submissionsLoading } = useSubmissions();
  const { data: programmes } = useProgrammes();
  const updateSubmission = useUpdateSubmission();
  const updateAssessment = useUpdateAssessment();
  const deleteAssessment = useDeleteAssessment();
  const createAssessment = useCreateAssessment();
  const upsertSettings = useUpsertAssessmentSettings();
  const linkRubric = useLinkRubricToAssessment();

  useRealtimeSync(["assessments", "assessment_submissions", "moderation_items", "notifications"]);

  // Filtered assessments
  const filtered = useMemo(() => {
    return (assessments ?? []).filter(a => {
      const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
      const matchProgramme = selectedProgramme === "all" || a.programme_id === selectedProgramme;
      const matchCategory = selectedCategory === "all" || a.assessment_category === selectedCategory;
      return matchSearch && matchProgramme && matchCategory;
    });
  }, [assessments, search, selectedProgramme, selectedCategory]);

  const pendingCount = (submissions ?? []).filter(s => s.status === "pending" || s.status === "submitted").length;

  // Programme for Create dialog — use first programme if only one, otherwise require selection
  const createProgrammeId = selectedProgramme !== "all" ? selectedProgramme : (programmes ?? [])[0]?.id;
  const { data: createModules = [] } = useProgrammeModules(createProgrammeId);
  const { data: editModules = [] } = useProgrammeModules(editingAssessment?.programme_id);

  const openGradingPanel = (s: Submission) => {
    setSelectedSubmission(s);
    setGradingScore(s.score?.toString() ?? "");
    setGradingFeedback(s.feedback ?? "");
  };

  const handleGrade = async (status: "graded" | "resubmit") => {
    if (!selectedSubmission) return;
    try {
      await updateSubmission.mutateAsync({
        id: selectedSubmission.id,
        status,
        score: status === "graded" && gradingScore ? parseFloat(gradingScore) : null,
        feedback: gradingFeedback || null,
        assessed_at: new Date().toISOString(),
      });
      toast.success(status === "graded" ? "Submission graded" : "Resubmission requested");
      setSelectedSubmission(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update submission");
    }
  };

  const handleCreate = async (data: any) => {
    if (!createProgrammeId) {
      toast.error("Please select a programme first");
      return;
    }
    try {
      const { rubric_id, question_bank_id, ...rest } = data;
      const result: any = await createAssessment.mutateAsync({
        ...rest,
        programme_id: createProgrammeId,
        module_id: data.module_id || null,
      });
      // Link rubric if selected
      if (rubric_id && result?.id) {
        try { await linkRubric.mutateAsync({ assessment_id: result.id, rubric_id }); } catch {}
      }
      // Persist question bank link as a lightweight metadata row (best-effort)
      if (question_bank_id && result?.id) {
        try {
          await (supabase as any).from("assessment_question_banks").insert({
            assessment_id: result.id,
            bank_id: question_bank_id,
          });
        } catch {/* table optional — silently ignore if not present */}
      }
      toast.success("Assessment created");
      setCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create assessment");
    }
  };


  const handleEditSubmit = async (data: any) => {
    if (!editingAssessment) return;
    try {
      await updateAssessment.mutateAsync({
        id: editingAssessment.id,
        title: data.title,
        description: data.description || null,
        assessment_type: data.assessment_type,
        assessment_category: data.assessment_category,
        module_id: data.module_id,
        max_score: data.max_score,
        pass_mark: data.pass_mark,
        due_date: data.due_date,
        weighting: data.weighting,
        requires_moderation: data.requires_moderation,
        learning_outcomes: data.learning_outcomes,
      } as any);
      // Optionally link rubric on edit
      if (data.rubric_id) {
        try { await linkRubric.mutateAsync({ assessment_id: editingAssessment.id, rubric_id: data.rubric_id }); } catch {}
      }
      toast.success("Assessment updated");
      setEditingAssessment(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAssessment.mutateAsync(deleteTarget.id);
      toast.success("Assessment deleted");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const isLoading = assessmentsLoading || submissionsLoading;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground">Assessment Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, configure, and manage assessment instruments across programmes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <ExportButton
            data={(filtered).map(a => ({
              title: a.title,
              type: typeLabel[a.assessment_type] || a.assessment_type,
              category: a.assessment_category,
              max_score: a.max_score,
              pass_mark: a.pass_mark,
              due_date: a.due_date,
            }))}
            filename="assessments-export"
            columns={[
              { key: "title", label: "Title" },
              { key: "type", label: "Type" },
              { key: "category", label: "Category" },
              { key: "max_score", label: "Max Score" },
              { key: "pass_mark", label: "Pass Mark" },
              { key: "due_date", label: "Due Date" },
            ]}
          />
          <Button onClick={() => setCreateOpen((v) => !v)} className="gap-2">
            <Plus className="w-4 h-4" />
            {createOpen ? "Close Form" : "Create Assessment"}
          </Button>
        </div>
      </div>

      {/* Inline Create Assessment Form (full-width) */}
      {createOpen && createProgrammeId && (
        <InlineCreateAssessmentForm
          programmeId={createProgrammeId}
          modules={createModules as any}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          isPending={createAssessment.isPending}
        />
      )}
      {createOpen && !createProgrammeId && (
        <div className="w-full bg-card rounded-xl border border-warning/30 p-4 text-xs text-warning">
          Please create or select a programme before creating an assessment.
        </div>
      )}


      {/* Inline Edit Assessment Form (full-width) */}
      {editingAssessment && (
        <InlineCreateAssessmentForm
          mode="edit"
          programmeId={editingAssessment.programme_id}
          modules={editModules as any}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingAssessment(null)}
          isPending={updateAssessment.isPending}
          initialData={{
            title: editingAssessment.title,
            description: editingAssessment.description,
            assessment_type: editingAssessment.assessment_type,
            assessment_category: editingAssessment.assessment_category,
            module_id: editingAssessment.module_id,
            max_score: editingAssessment.max_score,
            pass_mark: editingAssessment.pass_mark,
            due_date: editingAssessment.due_date,
            weighting: editingAssessment.weighting,
            requires_moderation: (editingAssessment as any).requires_moderation ?? false,
            learning_outcomes: ((editingAssessment as any).learning_outcomes as any) ?? [],
          }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assessments", value: filtered.length, icon: <FileCheck className="w-4 h-4 text-info" /> },
          { label: "Pending Reviews", value: pendingCount, icon: <Clock className="w-4 h-4 text-warning" /> },
          { label: "Total Submissions", value: submissions?.length ?? 0, icon: <CheckCircle2 className="w-4 h-4 text-success" /> },
          { label: "Graded", value: (submissions ?? []).filter(s => s.status === "graded").length, icon: <BarChart3 className="w-4 h-4 text-accent" /> },
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

      {/* Tabs row */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto -mb-px">
          {([
            { key: "assessments" as const, label: "Assessments" },
            { key: "queue" as const, label: `Grading Queue (${pendingCount})` },
            { key: "question_bank" as const, label: "Question Bank" },
            { key: "rubrics" as const, label: "Rubrics" },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row */}
      {tab === "assessments" && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assessments..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56"
              />
            </div>
            <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="All Programmes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programmes</SelectItem>
                {(programmes ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 w-fit">
            {[
              { key: "all", label: "All" },
              { key: "diagnostic", label: "Diagnostic" },
              { key: "formative", label: "Formative" },
              { key: "summative", label: "Summative" },
              { key: "transfer", label: "Transfer" },
            ].map(c => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors",
                  selectedCategory === c.key
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      )}

      {/* Assessments Tab */}
      {!isLoading && tab === "assessments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => {
            const aSubmissions = (submissions ?? []).filter(s => s.assessment_id === a.id);
            const graded = aSubmissions.filter(s => s.status === "graded").length;
            const avgScore = graded > 0
              ? Math.round(aSubmissions.filter(s => s.score != null).reduce((acc, s) => acc + (s.score ?? 0), 0) / graded)
              : 0;
            const pending = aSubmissions.length - graded;
            const programme = (programmes ?? []).find(p => p.id === a.programme_id);

            return (
              <div
                key={a.id}
                onClick={() => { window.location.href = `/assessments/${a.id}/builder-v2`; }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") window.location.href = `/assessments/${a.id}/builder-v2`; }}
                className="group bg-card rounded-xl shadow-card border border-border/50 hover:border-accent/30 hover:shadow-card-hover transition-all duration-300 overflow-hidden cursor-pointer"
              >
                <div className={cn("h-1", typeStrip[a.assessment_type] || "bg-info")} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", typeBg[a.assessment_type] || "bg-info/10", typeColor[a.assessment_type] || "text-info")}>
                        {typeLabel[a.assessment_type] || a.assessment_type}
                      </span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary capitalize", categoryColor[a.assessment_category] || "text-muted-foreground")}>
                        {categoryLabel[a.assessment_category] || a.assessment_category}
                      </span>
                      {(() => {
                        const status = (a as any).status || "draft";
                        const styles: Record<string, string> = {
                          draft: "bg-warning/10 text-warning",
                          published: "bg-success/10 text-success",
                          active: "bg-primary/10 text-primary",
                          archived: "bg-muted text-muted-foreground",
                        };
                        return (
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", styles[status])}>
                            {status}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {((a as any).status || "draft") === "draft" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPublishTarget(a as Assessment); }}
                          className="p-1.5 rounded-lg hover:bg-success/10 transition-colors"
                          title="Publish (run integrity check)"
                        >
                          <ShieldCheck className="w-3 h-3 text-success" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/assessments/${a.id}/builder-v2`; }}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                        title="Edit in Builder"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(a as Assessment); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">{a.title}</h3>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    {(a as Assessment).programme_modules?.title ?? "Unlinked"}
                  </p>
                  {programme && (
                    <p className="text-[10px] text-muted-foreground/70 mb-4 truncate">{programme.title}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className="text-sm font-bold text-foreground">{aSubmissions.length}</p>
                      <p className="text-[9px] text-muted-foreground">Submitted</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className="text-sm font-bold text-foreground">{graded}</p>
                      <p className="text-[9px] text-muted-foreground">Graded</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className="text-sm font-bold text-foreground">{avgScore > 0 ? `${avgScore}%` : "—"}</p>
                      <p className="text-[9px] text-muted-foreground">Avg Score</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t border-border/50">
                    <span>Pass: {a.pass_mark}/{a.max_score}</span>
                    {pending > 0 && <span className="text-warning font-medium">{pending} pending</span>}
                    {pending === 0 && aSubmissions.length > 0 && <span className="text-success font-medium">All graded ✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20">
              <FileCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No assessments found.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Create your first assessment to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Grading Queue Tab */}
      {!isLoading && tab === "queue" && (
        <div className="flex gap-4">
          <div className={cn("bg-card rounded-xl shadow-card border border-border/50 overflow-hidden transition-all", selectedSubmission ? "flex-1" : "w-full")}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Submission Queue</h3>
            </div>
            {(submissions ?? []).length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">No submissions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assessment</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(submissions ?? []).map(s => {
                      const ss = submissionStatusStyle[s.status as keyof typeof submissionStatusStyle] || submissionStatusStyle.pending;
                      const isSelected = selectedSubmission?.id === s.id;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => openGradingPanel(s as Submission)}
                          className={cn(
                            "border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer",
                            isSelected && "bg-accent/5 border-l-2 border-l-accent"
                          )}
                        >
                          <td className="px-5 py-3 text-xs text-foreground font-medium">
                            {(s as Submission).assessments?.title ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {s.submitted_at ? format(new Date(s.submitted_at), "MMM dd, yyyy") : "—"}
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-foreground">
                            {s.score != null ? `${s.score}/${(s as Submission).assessments?.max_score ?? "?"}` : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium capitalize", ss.text)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", ss.dot)} />
                              {s.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grading Detail Panel */}
          {selectedSubmission && (
            <div className="w-[400px] shrink-0 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden flex flex-col animate-fade-in">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Grade Submission</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedSubmission.assessments?.title ?? "Submission"}
                  </p>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max Score</span>
                    <span className="font-medium text-foreground">{selectedSubmission.assessments?.max_score ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pass Mark</span>
                    <span className="font-medium text-foreground">{selectedSubmission.assessments?.pass_mark ?? "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-medium text-foreground">
                      {selectedSubmission.submitted_at ? format(new Date(selectedSubmission.submitted_at), "MMM dd, yyyy") : "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</label>
                  <input
                    type="number"
                    value={gradingScore}
                    onChange={e => setGradingScore(e.target.value)}
                    placeholder={`Max: ${selectedSubmission.assessments?.max_score ?? 100}`}
                    className="w-full p-3 text-sm bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground"
                    disabled={selectedSubmission.status === "graded"}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Feedback</label>
                  <textarea
                    value={gradingFeedback}
                    onChange={e => setGradingFeedback(e.target.value)}
                    placeholder="Enter feedback for the learner..."
                    className="w-full h-24 p-3 text-xs bg-secondary rounded-lg border-0 outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted-foreground resize-none"
                    disabled={selectedSubmission.status === "graded"}
                  />
                </div>
              </div>

              {(selectedSubmission.status === "pending" || selectedSubmission.status === "submitted") && (
                <div className="px-5 py-4 border-t border-border flex items-center gap-2">
                  <button
                    onClick={() => handleGrade("graded")}
                    disabled={updateSubmission.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {updateSubmission.isPending ? "Saving..." : "Submit Grade"}
                  </button>
                  <button
                    onClick={() => handleGrade("resubmit")}
                    disabled={updateSubmission.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resubmit
                  </button>
                </div>
              )}
              {selectedSubmission.status === "graded" && (
                <div className="px-5 py-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">Graded · Score: {selectedSubmission.score}</span>
                  </div>
                </div>
              )}
              {selectedSubmission.status === "resubmit" && (
                <div className="px-5 py-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Resubmission requested</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Question Bank Tab */}
      {!isLoading && tab === "question_bank" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <QuestionBankPanel programmeId={selectedProgramme !== "all" ? selectedProgramme : undefined} />
        </div>
      )}

      {/* Rubrics Tab */}
      {!isLoading && tab === "rubrics" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <RubricBuilder programmeId={selectedProgramme !== "all" ? selectedProgramme : undefined} />
        </div>
      )}

      {/* Create + Advanced Create flows render inline at the top of the page (full-width, not popups). */}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}" and all associated submissions and links. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssessment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishAssessmentDialog
        assessment={publishTarget}
        onOpenChange={(open) => { if (!open) setPublishTarget(null); }}
      />
    </div>
  );
}