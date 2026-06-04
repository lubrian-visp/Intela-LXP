import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText, Save, Download, Plus, Trash2, ChevronDown,
  CheckCircle2, Clock, Users, BarChart3, Shield, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammes, useCohorts } from "@/hooks/useCoreData";
import {
  useModeratorReports,
  useCreateModeratorReport,
  useUpdateModeratorReport,
  useDeleteModeratorReport,
  calculateReportMetrics,
  type AssessorPerformanceEntry,
} from "@/hooks/useModeratorReports";

// ── Section Components ──────────────────────────────────────────────

function ModerationSummarySection({
  data, onChange
}: {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}) {
  const stats = [
    { label: "Items Reviewed", value: data.total_items_reviewed ?? 0, icon: FileText, color: "text-foreground" },
    { label: "Approved", value: data.approved_count ?? 0, icon: CheckCircle2, color: "text-success" },
    { label: "Rejected", value: data.rejected_count ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Avg Turnaround (hrs)", value: data.avg_turnaround_hours ?? 0, icon: Clock, color: "text-info" },
  ];

  return (
    <Card className="overflow-hidden border-border/50">
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground">Section 1: Moderation Summary</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Auto-populated metrics from moderation activity</p>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-secondary/30 rounded-lg p-4 text-center">
              <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1.5" />
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Sampling Target %</label>
            <Input type="number" value={data.sampling_target_pct ?? 25} onChange={e => onChange("sampling_target_pct", Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Sampling Achieved %</label>
            <Input type="number" value={data.sampling_achieved_pct ?? 0} readOnly className="mt-1 bg-secondary/30" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Summary Notes</label>
          <Textarea value={data.summary_notes ?? ""} onChange={e => onChange("summary_notes", e.target.value)} placeholder="Additional observations about the moderation cycle..." rows={3} className="mt-1" />
        </div>
      </div>
    </Card>
  );
}

function AssessorPerformanceSection({
  data, onChange
}: {
  data: AssessorPerformanceEntry[];
  onChange: (entries: AssessorPerformanceEntry[]) => void;
}) {
  return (
    <Card className="overflow-hidden border-border/50">
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground">Section 2: Assessor Performance</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Per-assessor quality breakdown — auto-populated from moderation data</p>
      </div>
      <div className="overflow-x-auto">
        {data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No assessor data available. Auto-populate by selecting a programme.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/20">
                <TableHead className="text-[11px]">Assessor</TableHead>
                <TableHead className="text-[11px] text-center">Reviewed</TableHead>
                <TableHead className="text-[11px] text-center">Approved</TableHead>
                <TableHead className="text-[11px] text-center">Rejected</TableHead>
                <TableHead className="text-[11px] text-center">Rejection Rate</TableHead>
                <TableHead className="text-[11px] text-center">Consistency</TableHead>
                <TableHead className="text-[11px]">Common Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{entry.assessor_name}</TableCell>
                  <TableCell className="text-xs text-center">{entry.items_reviewed}</TableCell>
                  <TableCell className="text-xs text-center text-success">{entry.approved}</TableCell>
                  <TableCell className="text-xs text-center text-destructive">{entry.rejected}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={entry.rejection_rate > 30 ? "destructive" : "secondary"} className="text-[10px]">
                      {entry.rejection_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={entry.consistency_score < 70 ? "destructive" : "secondary"} className="text-[10px]">
                      {entry.consistency_score}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {entry.common_rejection_categories.join(", ") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}

function FindingsSection({
  data, onChange
}: {
  data: Record<string, any>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-border/50">
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground">Section 3: Findings & Recommendations</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Document systemic issues, patterns, and improvement actions</p>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Systemic Issues Identified</label>
          <Textarea value={data.systemic_issues ?? ""} onChange={e => onChange("systemic_issues", e.target.value)} placeholder="Describe any recurring or systemic issues observed..." rows={3} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Patterns Observed</label>
          <Textarea value={data.patterns_observed ?? ""} onChange={e => onChange("patterns_observed", e.target.value)} placeholder="Note any patterns in grading, rubric application, or assessment quality..." rows={3} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Recommendations</label>
          <Textarea value={data.recommendations ?? ""} onChange={e => onChange("recommendations", e.target.value)} placeholder="Recommendations for improving assessment quality and compliance..." rows={3} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Improvement Actions Required</label>
          <Textarea value={data.improvement_actions ?? ""} onChange={e => onChange("improvement_actions", e.target.value)} placeholder="Specific actions to be taken by assessors, programme managers, or other stakeholders..." rows={3} className="mt-1" />
        </div>
      </div>
    </Card>
  );
}

function ComplianceDeclarationSection({
  data, onChange
}: {
  data: Record<string, any>;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <Card className="overflow-hidden border-border/50">
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground">Section 4: Compliance Declaration</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Sign-off confirming moderation was conducted per policy</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
          <Textarea
            value={data.declaration_text ?? ""}
            onChange={e => onChange("declaration_text", e.target.value)}
            rows={3}
            className="italic text-sm bg-transparent border-none resize-none p-0 focus-visible:ring-0"
          />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Moderator Signature Date</label>
            <Input type="date" value={data.moderator_signature_date ?? ""} onChange={e => onChange("moderator_signature_date", e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">QA Manager Signature Date</label>
            <Input type="date" value={data.qa_manager_signature_date ?? ""} onChange={e => onChange("qa_manager_signature_date", e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function ModeratorQAReport() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { data: programmes = [] } = useProgrammes();
  const { data: cohorts = [] } = useCohorts();
  const { data: reports = [], isLoading: reportsLoading } = useModeratorReports();
  const createReport = useCreateModeratorReport();
  const updateReport = useUpdateModeratorReport();
  const deleteReport = useDeleteModeratorReport();

  const [activeReportId, setActiveReportId] = useState<string | null>(searchParams.get("id"));
  const [reportMode, setReportMode] = useState<"cohort" | "programme">("cohort");
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [form, setForm] = useState<Record<string, any>>({
    declaration_text: "I hereby declare that this moderation was conducted in accordance with organisational quality assurance policies, the Four-Eyes Principle was observed, and no conflicts of interest were present.",
  });
  const [assessorPerf, setAssessorPerf] = useState<AssessorPerformanceEntry[]>([]);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  const activeReport = reports.find((r: any) => r.id === activeReportId);

  // Load active report into form
  useEffect(() => {
    if (activeReport) {
      setForm({
        total_items_reviewed: activeReport.total_items_reviewed,
        approved_count: activeReport.approved_count,
        rejected_count: activeReport.rejected_count,
        avg_turnaround_hours: activeReport.avg_turnaround_hours,
        sampling_target_pct: activeReport.sampling_target_pct,
        sampling_achieved_pct: activeReport.sampling_achieved_pct,
        summary_notes: activeReport.summary_notes,
        systemic_issues: activeReport.systemic_issues,
        patterns_observed: activeReport.patterns_observed,
        recommendations: activeReport.recommendations,
        improvement_actions: activeReport.improvement_actions,
        declaration_text: activeReport.declaration_text,
        moderator_signature_date: activeReport.moderator_signature_date,
        qa_manager_signature_date: activeReport.qa_manager_signature_date,
        report_date: activeReport.report_date,
        period_start: activeReport.period_start,
        period_end: activeReport.period_end,
      });
      setAssessorPerf((activeReport.assessor_performance as AssessorPerformanceEntry[]) || []);
      setSelectedProgramme(activeReport.programme_id);
      setSelectedCohort(activeReport.cohort_id || "");
      setReportMode(activeReport.report_mode as any);
    }
  }, [activeReportId, activeReport]);

  const filteredCohorts = useMemo(
    () => (cohorts as any[]).filter(c => c.programme_id === selectedProgramme),
    [cohorts, selectedProgramme]
  );

  const updateField = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Auto-populate metrics
  const handleAutoPopulate = useCallback(async () => {
    if (!selectedProgramme) {
      toast.error("Select a programme first");
      return;
    }
    setIsAutoPopulating(true);
    try {
      const metrics = await calculateReportMetrics(selectedProgramme, selectedCohort || undefined);
      setForm(prev => ({
        ...prev,
        total_items_reviewed: metrics.total_items_reviewed,
        approved_count: metrics.approved_count,
        rejected_count: metrics.rejected_count,
        avg_turnaround_hours: metrics.avg_turnaround_hours,
        sampling_achieved_pct: metrics.sampling_achieved_pct,
      }));
      setAssessorPerf(metrics.assessor_performance);
      toast.success("Metrics populated from moderation data");
    } catch {
      toast.error("Failed to load metrics");
    } finally {
      setIsAutoPopulating(false);
    }
  }, [selectedProgramme, selectedCohort]);

  // Create new report
  const handleCreate = useCallback(async () => {
    if (!selectedProgramme) {
      toast.error("Select a programme");
      return;
    }
    try {
      const result = await createReport.mutateAsync({
        moderator_id: user?.id,
        programme_id: selectedProgramme,
        cohort_id: selectedCohort || null,
        report_mode: reportMode,
        report_date: new Date().toISOString().slice(0, 10),
        ...form,
        assessor_performance: assessorPerf,
      });
      setActiveReportId(result.id);
      toast.success("Report created");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [selectedProgramme, selectedCohort, reportMode, form, assessorPerf, user]);

  // Save existing report
  const handleSave = useCallback(async () => {
    if (!activeReportId) return;
    try {
      await updateReport.mutateAsync({
        id: activeReportId,
        ...form,
        programme_id: selectedProgramme,
        cohort_id: selectedCohort || null,
        report_mode: reportMode,
        assessor_performance: assessorPerf,
      });
      toast.success("Report saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [activeReportId, form, selectedProgramme, selectedCohort, reportMode, assessorPerf]);

  // Submit report
  const handleSubmit = useCallback(async () => {
    if (!activeReportId) return;
    try {
      await updateReport.mutateAsync({
        id: activeReportId,
        status: "submitted",
        ...form,
        assessor_performance: assessorPerf,
      });
      toast.success("Report submitted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [activeReportId, form, assessorPerf]);

  // Export
  const handleExport = useCallback(async (format: "pdf" | "xlsx" | "docx") => {
    if (!activeReportId) return;
    try {
      const { data, error } = await supabase.functions.invoke("export-moderator-report", {
        body: { reportId: activeReportId, format },
      });
      if (error) throw error;
      if (data?.base64) {
        const decoded = decodeURIComponent(escape(atob(data.base64)));
        const blob = new Blob([decoded], {
          type: format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : format === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "text/html",
        });
        const url = URL.createObjectURL(blob);
        if (format === "pdf") {
          const w = window.open(url, "_blank");
          if (w) setTimeout(() => w.print(), 600);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = `moderator-qa-report.${format === "xlsx" ? "xls" : format}`;
          a.click();
        }
        URL.revokeObjectURL(url);
        toast.success(`${format.toUpperCase()} export ready`);
      }
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    }
  }, [activeReportId]);

  // Delete
  const handleDelete = useCallback(async () => {
    if (!activeReportId) return;
    try {
      await deleteReport.mutateAsync(activeReportId);
      setActiveReportId(null);
      setForm({ declaration_text: form.declaration_text });
      setAssessorPerf([]);
      toast.success("Report deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [activeReportId]);

  if (reportsLoading) return <Skeleton className="h-64 rounded-xl" />;

  const isEditing = !!activeReportId;
  const isSubmitted = activeReport?.status === "submitted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Moderator QA Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate structured quality assurance reports for moderation cycles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>PDF (Print)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("docx")}>Word (.docx)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {!isSubmitted && (
                  <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Report Selector + New */}
      <Card className="p-5 border-border/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">Existing Reports</label>
            <Select value={activeReportId ?? ""} onValueChange={v => setActiveReportId(v || null)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a report or create new" /></SelectTrigger>
              <SelectContent>
                {reports.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    {(r as any).programmes?.title ?? "Programme"} — {r.report_date ?? "Draft"} ({r.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={() => {
              setActiveReportId(null);
              setForm({ declaration_text: "I hereby declare that this moderation was conducted in accordance with organisational quality assurance policies, the Four-Eyes Principle was observed, and no conflicts of interest were present." });
              setAssessorPerf([]);
              setSelectedProgramme("");
              setSelectedCohort("");
            }} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Config: Programme, Cohort, Mode, Period */}
      <Card className="p-5 border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Report Mode</label>
            <Tabs value={reportMode} onValueChange={v => setReportMode(v as any)} className="mt-1">
              <TabsList className="w-full"><TabsTrigger value="cohort" className="flex-1">Cohort</TabsTrigger><TabsTrigger value="programme" className="flex-1">Programme</TabsTrigger></TabsList>
            </Tabs>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Programme *</label>
            <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select programme" /></SelectTrigger>
              <SelectContent>
                {(programmes as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {reportMode === "cohort" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cohort</label>
              <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select cohort" /></SelectTrigger>
                <SelectContent>
                  {filteredCohorts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Period Start</label>
              <Input type="date" value={form.period_start ?? ""} onChange={e => updateField("period_start", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Period End</label>
              <Input type="date" value={form.period_end ?? ""} onChange={e => updateField("period_end", e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleAutoPopulate} disabled={isAutoPopulating || !selectedProgramme} className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            {isAutoPopulating ? "Loading..." : "Auto-Populate Metrics"}
          </Button>
        </div>
      </Card>

      {/* Section 1: Summary */}
      <ModerationSummarySection data={form} onChange={updateField} />

      {/* Section 2: Assessor Performance */}
      <AssessorPerformanceSection data={assessorPerf} onChange={setAssessorPerf} />

      {/* Section 3: Findings */}
      <FindingsSection data={form} onChange={updateField} />

      {/* Section 4: Declaration */}
      <ComplianceDeclarationSection data={form} onChange={updateField} />

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 pb-8">
        {!isEditing ? (
          <Button onClick={handleCreate} disabled={createReport.isPending || !selectedProgramme} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Report
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleSave} disabled={updateReport.isPending || isSubmitted} className="gap-1.5">
              <Save className="w-4 h-4" /> Save Draft
            </Button>
            {!isSubmitted && (
              <Button onClick={handleSubmit} disabled={updateReport.isPending} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Submit Report
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
