import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useResolvedTemplate } from "@/hooks/useAssessorReportTemplates";
import {
  FileText, Save, Download, Plus, Trash2, ChevronDown,
  CheckCircle2, Clock, Printer, Users, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { maskNationalId } from "@/lib/privacyUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgrammes, useProgrammeModules, useCohorts, useEnrolments } from "@/hooks/useCoreData";
import {
  useAssessorReports,
  useAssessorReport,
  useCreateAssessorReport,
  useUpdateAssessorReport,
  useDeleteAssessorReport,
  defaultSection2Criteria,
  defaultSection3Criteria,
  type AssessorReportRow,
  type CriterionItem,
  type LearnerOutcome,
} from "@/hooks/useAssessorReports";

// ── Criteria Table Component ────────────────────────────────────────
function CriteriaTable({
  title,
  criteria,
  onChange,
  problems,
  strengths,
  onProblemsChange,
  onStrengthsChange,
  recommendations,
  onRecommendationsChange,
  evidence,
  onEvidenceChange,
}: {
  title: string;
  criteria: CriterionItem[];
  onChange: (criteria: CriterionItem[]) => void;
  problems: string;
  strengths: string;
  onProblemsChange: (v: string) => void;
  onStrengthsChange: (v: string) => void;
  recommendations?: string;
  onRecommendationsChange?: (v: string) => void;
  evidence?: string;
  onEvidenceChange?: (v: string) => void;
}) {
  const updateCriterion = (idx: number, field: keyof CriterionItem, value: any) => {
    const updated = [...criteria];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "yes" && value) updated[idx].no = false;
    if (field === "no" && value) updated[idx].yes = false;
    onChange(updated);
  };

  return (
    <Card className="overflow-hidden border-border/50">
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/20">
              <TableHead className="w-[45%] text-[11px]">CRITERIA</TableHead>
              <TableHead className="w-14 text-center text-[11px]">YES</TableHead>
              <TableHead className="w-14 text-center text-[11px]">NO</TableHead>
              <TableHead className="text-[11px]">COMMENTS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteria.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="align-top">
                  <p className="text-xs font-medium text-foreground">{c.criterion}</p>
                  {c.description && (
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                  )}
                </TableCell>
                <TableCell className="text-center align-top pt-4">
                  <Checkbox
                    checked={c.yes}
                    onCheckedChange={(v) => updateCriterion(i, "yes", !!v)}
                  />
                </TableCell>
                <TableCell className="text-center align-top pt-4">
                  <Checkbox
                    checked={c.no}
                    onCheckedChange={(v) => updateCriterion(i, "no", !!v)}
                  />
                </TableCell>
                <TableCell className="align-top pt-3">
                  <Textarea
                    value={c.comments}
                    onChange={(e) => updateCriterion(i, "comments", e.target.value)}
                    className="text-xs min-h-[60px]"
                    placeholder="Enter comments..."
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-5 space-y-4 border-t border-border">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">PROBLEMS & WEAKNESSES</label>
          <Textarea value={problems} onChange={(e) => onProblemsChange(e.target.value)} rows={3} className="text-xs" placeholder="Describe any problems or weaknesses identified..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">STRENGTHS</label>
          <Textarea value={strengths} onChange={(e) => onStrengthsChange(e.target.value)} rows={3} className="text-xs" placeholder="Describe strengths identified..." />
        </div>
        {onRecommendationsChange !== undefined && (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">RECOMMENDATIONS</label>
            <Textarea value={recommendations ?? ""} onChange={(e) => onRecommendationsChange(e.target.value)} rows={3} className="text-xs" placeholder="Enter recommendations..." />
          </div>
        )}
        {onEvidenceChange !== undefined && (
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">EVIDENCE AVAILABLE</label>
            <Textarea value={evidence ?? ""} onChange={(e) => onEvidenceChange(e.target.value)} rows={2} className="text-xs" placeholder="e.g. Assessment Tools, Registers..." />
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function AssessorReportPage() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = searchParams.get("id");

  const { data: programmes } = useProgrammes();
  const { data: reports, isLoading: reportsLoading } = useAssessorReports(user?.id);
  const { data: existingReport } = useAssessorReport(reportId ?? undefined);
  const createReport = useCreateAssessorReport();
  const updateReport = useUpdateAssessorReport();
  const deleteReport = useDeleteAssessorReport();

  // Report mode: cohort (default) or learner
  const [reportMode, setReportMode] = useState<"cohort" | "learner">("cohort");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");

  // Form state
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedCohortId, setSelectedCohortId] = useState("");

  // Resolve dynamic template for selected programme (falls back to global)
  const { data: resolvedTemplate } = useResolvedTemplate(selectedProgrammeId || undefined);
  const [header, setHeader] = useState({
    assessor_name: profile?.full_name ?? "",
    submission_date: "",
    client_name: "",
    venue: "",
    programme_name: "",
    module_us_covered: "",
    start_date: "",
    end_date: "",
  });

  // Auto-populate assessor name from profile when it loads (only if field is empty and not editing existing report)
  useEffect(() => {
    if (profile?.full_name && !header.assessor_name && !reportId) {
      setHeader(h => ({ ...h, assessor_name: profile.full_name ?? "" }));
    }
  }, [profile?.full_name]);
  const [section2Criteria, setSection2Criteria] = useState<CriterionItem[]>(defaultSection2Criteria);
  const [section2Problems, setSection2Problems] = useState("");
  const [section2Strengths, setSection2Strengths] = useState("");
  const [section3Criteria, setSection3Criteria] = useState<CriterionItem[]>(defaultSection3Criteria);
  const [section3Problems, setSection3Problems] = useState("");
  const [section3Strengths, setSection3Strengths] = useState("");
  const [section3Recommendations, setSection3Recommendations] = useState("");
  const [section3Evidence, setSection3Evidence] = useState("");
  const [templateApplied, setTemplateApplied] = useState(false);

  // Apply dynamic template criteria when resolved (only for new reports)
  useEffect(() => {
    if (resolvedTemplate && !reportId && !templateApplied) {
      const s2 = resolvedTemplate.section2_criteria?.length ? resolvedTemplate.section2_criteria : defaultSection2Criteria;
      const s3 = resolvedTemplate.section3_criteria?.length ? resolvedTemplate.section3_criteria : defaultSection3Criteria;
      setSection2Criteria(s2);
      setSection3Criteria(s3);
      setTemplateApplied(true);
    }
  }, [resolvedTemplate, reportId, templateApplied]);
  const [learnerOutcomes, setLearnerOutcomes] = useState<LearnerOutcome[]>([]);
  const [section5, setSection5] = useState({
    difficulties: "",
    conflicts: "",
    mentor_update: "",
    declaration: "All learners who submitted evidence were assessed as guided by outcome based Principles.",
  });
  const [assessorSignatureDate, setAssessorSignatureDate] = useState("");
  const [adminSignatureDate, setAdminSignatureDate] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dependent queries
  const { data: modules } = useProgrammeModules(selectedProgrammeId || undefined);
  const { data: cohorts } = useCohorts(selectedProgrammeId || undefined);
  const { data: enrolments } = useEnrolments(selectedCohortId ? { cohortId: selectedCohortId } : undefined);

  // Available learners from current cohort enrolments
  const [cohortLearners, setCohortLearners] = useState<{ id: string; name: string }[]>([]);

  // Fetch learner names when enrolments change
  useEffect(() => {
    if (!enrolments?.length) { setCohortLearners([]); return; }
    const ids = enrolments.map(e => e.learner_id);
    supabase.from("profiles").select("user_id, full_name").in("user_id", ids).then(({ data }) => {
      setCohortLearners((data ?? []).map(p => ({ id: p.user_id, name: p.full_name || "Unknown" })));
    });
  }, [enrolments]);

  // Load existing report
  useEffect(() => {
    if (existingReport) {
      setReportMode(existingReport.report_mode ?? "cohort");
      setSelectedLearnerId(existingReport.learner_id ?? "");
      setSelectedProgrammeId(existingReport.programme_id);
      setSelectedCohortId(existingReport.cohort_id ?? "");
      setHeader({
        assessor_name: existingReport.assessor_name ?? "",
        submission_date: existingReport.submission_date ?? "",
        client_name: existingReport.client_name ?? "",
        venue: existingReport.venue ?? "",
        programme_name: existingReport.programme_name ?? "",
        module_us_covered: existingReport.module_us_covered ?? "",
        start_date: existingReport.start_date ?? "",
        end_date: existingReport.end_date ?? "",
      });
      setSection2Criteria(existingReport.section2_criteria?.length ? existingReport.section2_criteria : defaultSection2Criteria);
      setSection2Problems(existingReport.section2_problems ?? "");
      setSection2Strengths(existingReport.section2_strengths ?? "");
      setSection3Criteria(existingReport.section3_criteria?.length ? existingReport.section3_criteria : defaultSection3Criteria);
      setSection3Problems(existingReport.section3_problems ?? "");
      setSection3Strengths(existingReport.section3_strengths ?? "");
      setSection3Recommendations(existingReport.section3_recommendations ?? "");
      setSection3Evidence(existingReport.section3_evidence ?? "");
      setLearnerOutcomes(existingReport.section4_learners?.length ? existingReport.section4_learners : []);
      setSection5({
        difficulties: existingReport.section5_difficulties ?? "",
        conflicts: existingReport.section5_conflicts ?? "",
        mentor_update: existingReport.section5_mentor_update ?? "",
        declaration: existingReport.section5_declaration ?? "All learners who submitted evidence were assessed as guided by outcome based Principles.",
      });
      setAssessorSignatureDate(existingReport.assessor_signature_date ?? "");
      setAdminSignatureDate(existingReport.admin_signature_date ?? "");
      setIsEditing(true);
    }
  }, [existingReport]);

  // Auto-populate programme name & module list when programme changes
  useEffect(() => {
    if (selectedProgrammeId && programmes && !isEditing) {
      const prog = programmes.find(p => p.id === selectedProgrammeId);
      if (prog) {
        setHeader(h => ({ ...h, programme_name: prog.title }));
      }
    }
  }, [selectedProgrammeId, programmes, isEditing]);

  // Auto-populate module_us_covered from modules
  useEffect(() => {
    if (modules?.length && !isEditing) {
      const usList = modules.map(m => (m as any).unit_standard_code || m.title).join(", ");
      setHeader(h => ({ ...h, module_us_covered: usList }));
    }
  }, [modules, isEditing]);

  // Populate learners from cohort
  const populateLearners = useCallback(async () => {
    if (!enrolments?.length) return;
    const learnerIds = enrolments.map(e => e.learner_id);

    // If per-learner mode, filter to just the selected learner
    const targetIds = reportMode === "learner" && selectedLearnerId
      ? learnerIds.filter(id => id === selectedLearnerId)
      : learnerIds;

    if (!targetIds.length) { toast.error("No learners to populate"); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", targetIds);
    const { data: regs } = await supabase.from("learner_registrations").select("user_id, full_name, gender, national_id").in("user_id", targetIds);

    const outcomes: LearnerOutcome[] = targetIds.map((id, idx) => {
      const profile = profiles?.find(p => p.user_id === id);
      const reg = regs?.find(r => r.user_id === id);
      const fullName = reg?.full_name || profile?.full_name || "";
      const parts = fullName.split(" ");
      const surname = parts.length > 1 ? parts[parts.length - 1] : fullName;
      const names = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
      return {
        no: idx + 1,
        surname,
        names,
        gender: reg?.gender ?? "",
        id_number: maskNationalId(reg?.national_id),
        outcome: "" as const,
        comments: "",
      };
    });
    setLearnerOutcomes(outcomes);
    toast.success(`Populated ${outcomes.length} learner${outcomes.length !== 1 ? "s" : ""}`);
  }, [enrolments, reportMode, selectedLearnerId]);

  // Unit standards from modules
  const unitStandards = useMemo(() => {
    if (!modules) return [];
    return modules.map(m => ({
      code: (m as any).unit_standard_code ?? m.credential_label ?? "",
      title: m.title,
      level: (m as any).nqf_level ?? 0,
      credits: m.credits ?? 0,
    }));
  }, [modules]);

  const totalCredits = useMemo(() => unitStandards.reduce((sum, u) => sum + u.credits, 0), [unitStandards]);

  // Save
  const handleSave = async (status: "draft" | "submitted" = "draft") => {
    if (!selectedProgrammeId || !user?.id) {
      toast.error("Please select a programme");
      return;
    }
    if (!selectedCohortId) {
      toast.error("Please select a cohort");
      return;
    }
    if (reportMode === "learner" && !selectedLearnerId) {
      toast.error("Please select a learner for per-learner report");
      return;
    }
    const payload: any = {
      assessor_id: user.id,
      programme_id: selectedProgrammeId,
      cohort_id: selectedCohortId || null,
      learner_id: reportMode === "learner" ? selectedLearnerId : null,
      report_mode: reportMode,
      status,
      assessor_name: header.assessor_name,
      submission_date: header.submission_date || null,
      client_name: header.client_name,
      venue: header.venue,
      programme_name: header.programme_name,
      module_us_covered: header.module_us_covered,
      start_date: header.start_date || null,
      end_date: header.end_date || null,
      section2_criteria: section2Criteria,
      section2_problems: section2Problems,
      section2_strengths: section2Strengths,
      section3_criteria: section3Criteria,
      section3_problems: section3Problems,
      section3_strengths: section3Strengths,
      section3_recommendations: section3Recommendations,
      section3_evidence: section3Evidence,
      section4_learners: learnerOutcomes,
      section5_difficulties: section5.difficulties,
      section5_conflicts: section5.conflicts,
      section5_mentor_update: section5.mentor_update,
      section5_declaration: section5.declaration,
      assessor_signature_date: assessorSignatureDate || null,
      admin_signature_date: adminSignatureDate || null,
    };

    try {
      if (reportId) {
        await updateReport.mutateAsync({ id: reportId, ...payload });
      } else {
        const result = await createReport.mutateAsync(payload);
        setSearchParams({ id: result.id });
        setIsEditing(true);
      }
      toast.success(status === "submitted" ? "Report submitted" : "Draft saved");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Export
  const handleExport = async (format: "pdf" | "docx" | "xlsx") => {
    if (!reportId) {
      toast.error("Please save the report first");
      return;
    }
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-assessor-report", {
        body: { reportId, format },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else if (data?.base64) {
        const mimeMap: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
        const blob = base64ToBlob(data.base64, mimeMap[format]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Assessor_Report_${header.programme_name || "report"}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleNewReport = () => {
    setSearchParams({});
    setReportMode("cohort");
    setSelectedLearnerId("");
    setSelectedProgrammeId("");
    setSelectedCohortId("");
    setHeader({ assessor_name: profile?.full_name ?? "", submission_date: "", client_name: "", venue: "", programme_name: "", module_us_covered: "", start_date: "", end_date: "" });
    const s2 = resolvedTemplate?.section2_criteria?.length ? resolvedTemplate.section2_criteria : defaultSection2Criteria;
    const s3 = resolvedTemplate?.section3_criteria?.length ? resolvedTemplate.section3_criteria : defaultSection3Criteria;
    setSection2Criteria(s2);
    setSection2Problems("");
    setSection2Strengths("");
    setSection3Criteria(s3);
    setSection3Problems("");
    setSection3Strengths("");
    setSection3Recommendations("");
    setSection3Evidence("");
    setLearnerOutcomes([]);
    setSection5({ difficulties: "", conflicts: "", mentor_update: "", declaration: "All learners who submitted evidence were assessed as guided by outcome based Principles." });
    setAssessorSignatureDate("");
    setAdminSignatureDate("");
    setIsEditing(false);
  };

  const updateLearnerOutcome = (idx: number, field: keyof LearnerOutcome, value: any) => {
    const updated = [...learnerOutcomes];
    updated[idx] = { ...updated[idx], [field]: value };
    setLearnerOutcomes(updated);
  };

  if (reportsLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" /> Assessor Feedback Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate structured assessment reports for learner outcomes validation.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleNewReport} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} className="gap-1.5 text-xs">
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("submitted")} className="gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Submit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={exporting}>
                  <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-xs gap-2">
                  <Printer className="w-3.5 h-3.5" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("docx")} className="text-xs gap-2">
                  <FileText className="w-3.5 h-3.5" /> Export Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="text-xs gap-2">
                  <FileText className="w-3.5 h-3.5" /> Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </FadeIn>

      {/* Report Mode Toggle */}
      <FadeIn>
        <Card className="p-4 border-border/50">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Report Mode</label>
              <Tabs value={reportMode} onValueChange={(v) => setReportMode(v as "cohort" | "learner")}>
                <TabsList className="h-9">
                  <TabsTrigger value="cohort" className="text-xs gap-1.5 px-4">
                    <Users className="w-3.5 h-3.5" /> Cohort Report
                  </TabsTrigger>
                  <TabsTrigger value="learner" className="text-xs gap-1.5 px-4">
                    <User className="w-3.5 h-3.5" /> Per Learner
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <p className="text-[10px] text-muted-foreground max-w-md">
              {reportMode === "cohort"
                ? "Generates a report covering all learners in the selected cohort."
                : "Generates an individual report for a specific learner within the cohort."}
            </p>
          </div>
        </Card>
      </FadeIn>

      {/* Saved reports list */}
      {!reportId && reports && reports.length > 0 && (
        <Card className="overflow-hidden border-border/50">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Saved Reports</h3>
          </div>
          <div className="divide-y divide-border/50">
            {reports.map(r => (
              <div
                key={r.id}
                className="px-6 py-3 flex items-center justify-between hover:bg-secondary/20 cursor-pointer transition-colors"
                onClick={() => setSearchParams({ id: r.id })}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-1.5 rounded-lg", r.report_mode === "learner" ? "bg-primary/10" : "bg-info/10")}>
                    {r.report_mode === "learner" ? <User className="w-3.5 h-3.5 text-primary" /> : <Users className="w-3.5 h-3.5 text-info" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.programme_name || "Untitled"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.report_mode === "learner" ? "Per Learner" : "Cohort"} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "submitted" ? "default" : "secondary"} className="text-[10px]">
                    {r.status === "submitted" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {r.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReport.mutate(r.id, { onSuccess: () => toast.success("Report deleted") });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Report Header ─────────────────────────────────────────── */}
      <StaggerContainer className="space-y-6">
        <StaggerItem>
          <Card className="overflow-hidden border-border/50">
            <div className="px-6 py-4 border-b border-border bg-primary/5">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Assessor Feedback Report</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Programme</label>
                <Select value={selectedProgrammeId} onValueChange={(v) => { setSelectedProgrammeId(v); setSelectedCohortId(""); setSelectedLearnerId(""); }}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select programme" /></SelectTrigger>
                  <SelectContent>
                    {programmes?.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Cohort</label>
                <Select value={selectedCohortId} onValueChange={(v) => { setSelectedCohortId(v); setSelectedLearnerId(""); }}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select cohort" /></SelectTrigger>
                  <SelectContent>
                    {cohorts?.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {reportMode === "learner" && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Learner</label>
                  <Select value={selectedLearnerId} onValueChange={setSelectedLearnerId}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select learner" /></SelectTrigger>
                    <SelectContent>
                      {cohortLearners.map(l => (
                        <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Assessor Name</label>
                <Input value={header.assessor_name} onChange={e => setHeader(h => ({ ...h, assessor_name: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Date of Submission</label>
                <Input type="date" value={header.submission_date} onChange={e => setHeader(h => ({ ...h, submission_date: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Client Name</label>
                <Input value={header.client_name} onChange={e => setHeader(h => ({ ...h, client_name: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Venue</label>
                <Input value={header.venue} onChange={e => setHeader(h => ({ ...h, venue: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Programme Name</label>
                <Input value={header.programme_name} onChange={e => setHeader(h => ({ ...h, programme_name: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Module (US Covered)</label>
                <Input value={header.module_us_covered} onChange={e => setHeader(h => ({ ...h, module_us_covered: e.target.value }))} className="text-xs" placeholder="Auto-populated from modules" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Start Date</label>
                <Input type="date" value={header.start_date} onChange={e => setHeader(h => ({ ...h, start_date: e.target.value }))} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">End Date</label>
                <Input type="date" value={header.end_date} onChange={e => setHeader(h => ({ ...h, end_date: e.target.value }))} className="text-xs" />
              </div>
            </div>
          </Card>
        </StaggerItem>

        {/* ── Section 1: Unit Standards ──────────────────────────── */}
        <StaggerItem>
          <Card className="overflow-hidden border-border/50">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-semibold text-foreground">1. CONTENT COVERED IN ASSESSMENT BLOCK</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">The following unit standards were covered in the block and should be communicated to relevant parties.</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/20">
                    <TableHead className="text-[11px]">UNIT STANDARD CODE</TableHead>
                    <TableHead className="text-[11px]">UNIT STANDARD TITLE</TableHead>
                    <TableHead className="text-center text-[11px]">LEVEL</TableHead>
                    <TableHead className="text-center text-[11px]">CREDITS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitStandards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                        {selectedProgrammeId ? "No modules found for this programme" : "Select a programme to populate unit standards"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {unitStandards.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{u.code || "—"}</TableCell>
                          <TableCell className="text-xs">{u.title}</TableCell>
                          <TableCell className="text-center text-xs">{u.level || "—"}</TableCell>
                          <TableCell className="text-center text-xs">{u.credits}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-secondary/30 font-semibold">
                        <TableCell className="text-xs">Total Credits</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-center text-xs font-bold">{totalCredits}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </StaggerItem>

        {/* ── Section 2 ─────────────────────────────────────────── */}
        <StaggerItem>
          <CriteriaTable
            title="2. DEMONSTRATE UNDERSTANDING OF OUTCOMES-BASED ASSESSMENT"
            criteria={section2Criteria}
            onChange={setSection2Criteria}
            problems={section2Problems}
            strengths={section2Strengths}
            onProblemsChange={setSection2Problems}
            onStrengthsChange={setSection2Strengths}
          />
        </StaggerItem>

        {/* ── Section 3 ─────────────────────────────────────────── */}
        <StaggerItem>
          <CriteriaTable
            title="3. PREPARE CANDIDATE FOR ASSESSMENTS"
            criteria={section3Criteria}
            onChange={setSection3Criteria}
            problems={section3Problems}
            strengths={section3Strengths}
            onProblemsChange={setSection3Problems}
            onStrengthsChange={setSection3Strengths}
            recommendations={section3Recommendations}
            onRecommendationsChange={setSection3Recommendations}
            evidence={section3Evidence}
            onEvidenceChange={setSection3Evidence}
          />
        </StaggerItem>

        {/* ── Section 4: Learner Outcomes ────────────────────────── */}
        <StaggerItem>
          <Card className="overflow-hidden border-border/50">
            <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">4. LEARNERS ASSESSED AND OUTCOME</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {learnerOutcomes.length} learner{learnerOutcomes.length !== 1 ? "s" : ""} · {reportMode === "cohort" ? "Full cohort" : "Individual learner"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={populateLearners} className="text-xs gap-1.5" disabled={!selectedCohortId}>
                <Plus className="w-3.5 h-3.5" />
                {reportMode === "cohort" ? "Populate from Cohort" : "Populate Learner"}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/20">
                    <TableHead className="w-12 text-[11px]">NO.</TableHead>
                    <TableHead className="text-[11px]">SURNAME</TableHead>
                    <TableHead className="text-[11px]">LEARNER NAMES</TableHead>
                    <TableHead className="w-20 text-[11px]">GENDER</TableHead>
                    <TableHead className="text-[11px]">ID NUMBER</TableHead>
                    <TableHead className="w-44 text-[11px]">OUTCOME</TableHead>
                    <TableHead className="text-[11px]">COMMENTS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learnerOutcomes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                        {reportMode === "cohort"
                          ? 'Select a cohort and click "Populate from Cohort"'
                          : 'Select a learner and click "Populate Learner"'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    learnerOutcomes.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{l.no}</TableCell>
                        <TableCell>
                          <Input value={l.surname} onChange={e => updateLearnerOutcome(i, "surname", e.target.value)} className="text-xs h-8" />
                        </TableCell>
                        <TableCell>
                          <Input value={l.names} onChange={e => updateLearnerOutcome(i, "names", e.target.value)} className="text-xs h-8" />
                        </TableCell>
                        <TableCell>
                          <Input value={l.gender} onChange={e => updateLearnerOutcome(i, "gender", e.target.value)} className="text-xs h-8" />
                        </TableCell>
                        <TableCell>
                          <Input value={l.id_number} onChange={e => updateLearnerOutcome(i, "id_number", e.target.value)} className="text-xs h-8" />
                        </TableCell>
                        <TableCell>
                          <Select value={l.outcome} onValueChange={v => updateLearnerOutcome(i, "outcome", v)}>
                            <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Competent" className="text-xs">Competent</SelectItem>
                              <SelectItem value="Not Yet Competent" className="text-xs">Not Yet Competent</SelectItem>
                              <SelectItem value="Remedial" className="text-xs">Remedial</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input value={l.comments} onChange={e => updateLearnerOutcome(i, "comments", e.target.value)} className="text-xs h-8" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </StaggerItem>

        {/* ── Section 5: Difficulties ────────────────────────────── */}
        <StaggerItem>
          <Card className="overflow-hidden border-border/50">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-semibold text-foreground">5. LEARNER WITH DIFFICULTIES</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Learner with Difficulties</label>
                  <Textarea value={section5.difficulties} onChange={e => setSection5(s => ({ ...s, difficulties: e.target.value }))} rows={3} className="text-xs" placeholder="Nil" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Conflict Arising</label>
                  <Textarea value={section5.conflicts} onChange={e => setSection5(s => ({ ...s, conflicts: e.target.value }))} rows={3} className="text-xs" placeholder="Nil" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Mentor Update</label>
                <Textarea value={section5.mentor_update} onChange={e => setSection5(s => ({ ...s, mentor_update: e.target.value }))} rows={3} className="text-xs" />
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs font-medium text-primary italic">"{section5.declaration}"</p>
              </div>
            </div>
          </Card>
        </StaggerItem>

        {/* ── Footer: Signatures ─────────────────────────────────── */}
        <StaggerItem>
          <Card className="overflow-hidden border-border/50">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-semibold text-foreground uppercase">Signatures</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Assessor Signature:</h4>
                <div className="h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground bg-secondary/10">
                  Signature area
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Date</label>
                  <Input type="date" value={assessorSignatureDate} onChange={e => setAssessorSignatureDate(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-foreground">Admin Signature:</h4>
                <div className="h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground bg-secondary/10">
                  Signature area
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Date</label>
                  <Input type="date" value={adminSignatureDate} onChange={e => setAdminSignatureDate(e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mime });
}
