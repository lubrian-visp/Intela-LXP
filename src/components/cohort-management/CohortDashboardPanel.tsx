import { useState } from "react";
import MoveLearnerCohortDialog from "@/components/cohort-management/MoveLearnerCohortDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { X, Users, BookOpen, FileCheck, ClipboardList, BarChart3, CalendarCheck, Award, Briefcase, UserPlus, GraduationCap, Shield, Heart, Eye, RefreshCw, Search, Filter, Download, AlertCircle, UserCheck, Clock, Layers, Wrench, FlaskConical, Trash2, ArrowRightLeft } from "lucide-react";
import AssignStaffModal from "@/components/cohort-management/AssignStaffModal";
import AssignLearnersModal from "@/components/cohort-management/AssignLearnersModal";
import { useCohortStaffAssignments, useRemoveCohortStaff } from "@/hooks/useCohortStaffAssignments";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEnrolments, useProgrammeModules, useAssessments, useSubmissions, useTrainingSessions, useSessionAttendance, usePathways, useCohortLearnerDetails, useDeleteEnrolment } from "@/hooks/useCoreData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  cohort: any;
  open: boolean;
  onClose: () => void;
}

const statusBadge: Record<string, string> = {
  active: "bg-success/15 text-success",
  planned: "bg-info/15 text-info",
  completed: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/15 text-destructive",
};

export default function CohortDashboardPanel({ cohort, open, onClose }: Props) {
  const navigate = useNavigate();
  const [showAssignLearners, setShowAssignLearners] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [learnerStatusFilter, setLearnerStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string } | null>(null);
  const programmeId = cohort?.programme_id;
  const { data: enrolments } = useEnrolments({ cohortId: cohort?.id });
  const { data: modules } = useProgrammeModules(programmeId);
  const { data: assessments } = useAssessments(programmeId);
  const { data: sessions } = useTrainingSessions(cohort?.id);
  const { data: pathways } = usePathways(programmeId);
  const deleteEnrolment = useDeleteEnrolment();

  const learnerIds = enrolments?.map(e => e.learner_id) ?? [];
  const { data: learnerDetails } = useCohortLearnerDetails(learnerIds);

  const learnerCount = enrolments?.length ?? 0;

  if (!cohort) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-bold">{cohort.name}</SheetTitle>
              <Badge className={cn("text-[10px] capitalize", statusBadge[cohort.status])}>
                {cohort.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{cohort.code} · {cohort.programmes?.title ?? "Programme"}</p>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="px-6 py-4">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary/50">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="learners" className="text-xs">Learners</TabsTrigger>
            <TabsTrigger value="courses" className="text-xs">Courses</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
            <TabsTrigger value="assessments" className="text-xs">Assessments</TabsTrigger>
            <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Enrolled", value: learnerCount },
                { icon: BookOpen, label: "Modules", value: modules?.length ?? 0 },
                { icon: FileCheck, label: "Assessments", value: assessments?.length ?? 0 },
                { icon: CalendarCheck, label: "Sessions", value: sessions?.length ?? 0 },
              ].map(s => (
                <div key={s.label} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
                  <s.icon className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Duration:</strong> {cohort.start_date ? format(new Date(cohort.start_date), "dd MMM yyyy") : "—"} – {cohort.end_date ? format(new Date(cohort.end_date), "dd MMM yyyy") : "—"}</p>
              <p><strong>Max Learners:</strong> {cohort.max_learners ?? "Unlimited"}</p>
            </div>
          </TabsContent>

          {/* Learners */}
          <TabsContent value="learners" className="mt-4 space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Users, label: "Total Learners", value: learnerCount, color: "text-info" },
                { icon: UserCheck, label: "Active", value: enrolments?.filter(e => e.status === "active" || e.status === "enrolled").length ?? 0, color: "text-success" },
                { icon: AlertCircle, label: "Deferred", value: enrolments?.filter(e => e.status === "suspended").length ?? 0, color: "text-warning" },
                { icon: X, label: "Withdrawn", value: enrolments?.filter(e => e.status === "rejected").length ?? 0, color: "text-destructive" },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
                  <s.icon className={cn("w-5 h-5", s.color)} />
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Learner Assignment header */}
            <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Learner Assignment</p>
                    <p className="text-xs text-muted-foreground">Manage learners enrolled in {cohort.code ?? cohort.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary/50 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    Bulk Import
                  </button>
                  <button
                    onClick={() => setShowAssignLearners(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add Learners
                  </button>
                </div>
              </div>

              {/* Search & filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, LN, or email..."
                    value={learnerSearch}
                    onChange={e => setLearnerSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Select value={learnerStatusFilter} onValueChange={setLearnerStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Deferred</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Learner list or empty state */}
              <div className="border border-border/50 rounded-xl min-h-[180px]">
                {learnerCount === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-foreground">No learners enrolled</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Add learners to this cohort to get started</p>
                    <button
                      onClick={() => setShowAssignLearners(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Learners
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {enrolments
                      ?.filter(e => learnerStatusFilter === "all" || e.status === learnerStatusFilter)
                      .filter(e => {
                        if (!learnerSearch) return true;
                        const details = learnerDetails?.[e.learner_id];
                        const search = learnerSearch.toLowerCase();
                        return (
                          details?.full_name?.toLowerCase().includes(search) ||
                          details?.learner_number?.toLowerCase().includes(search) ||
                          details?.email?.toLowerCase().includes(search) ||
                          e.learner_id.toLowerCase().includes(search)
                        );
                      })
                      .map(e => {
                        const details = learnerDetails?.[e.learner_id];
                        const displayName = details?.full_name || e.learner_id.slice(0, 8) + "…";
                        const initials = details?.full_name
                          ? details.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                          : "L";
                        return (
                          <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {details?.learner_number ?? "—"} · Progress: {e.progress_percentage ?? 0}%
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => navigate(`/profile/${e.learner_id}`)}
                                      className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>View Profile</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setMoveTarget({ id: e.id, name: displayName })}
                                      className="p-1.5 rounded-md hover:bg-info/10 text-muted-foreground hover:text-info transition-colors"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Move to Another Cohort</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setDeleteTarget({ id: e.id, name: displayName })}
                                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Remove from Cohort</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <AssignLearnersModal
              cohortId={cohort.id}
              open={showAssignLearners}
              onClose={() => setShowAssignLearners(false)}
            />
            <MoveLearnerCohortDialog
              enrolmentId={moveTarget?.id ?? ""}
              learnerName={moveTarget?.name ?? ""}
              currentCohortId={cohort.id}
              programmeId={programmeId}
              open={!!moveTarget}
              onClose={() => setMoveTarget(null)}
            />
          </TabsContent>

          {/* Courses & Learning Tracks */}
          <TabsContent value="courses" className="mt-4 space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: BookOpen, label: "Modules", value: modules?.length ?? 0, color: "text-info" },
                { icon: Layers, label: "Pathways", value: pathways?.length ?? 0, color: "text-accent" },
                { icon: Clock, label: "Total Hours", value: modules?.reduce((sum, m) => sum + (m.duration_hours ?? 0), 0) ?? 0, color: "text-success" },
                { icon: Award, label: "Credits", value: modules?.reduce((sum, m) => sum + (m.credits ?? 0), 0) ?? 0, color: "text-warning" },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
                  <s.icon className={cn("w-5 h-5", s.color)} />
                  <div>
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Learning Pathway Phases */}
            {(pathways?.length ?? 0) > 0 && (
              <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Learning Pathways</p>
                    <p className="text-xs text-muted-foreground">Three-phase structure: Knowledge → Practical → Workplace</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["knowledge", "practical", "workplace"].map(phase => {
                    const phasePathways = pathways?.filter(p => p.phase === phase) ?? [];
                    const phaseIcon = phase === "knowledge" ? BookOpen : phase === "practical" ? FlaskConical : Wrench;
                    const PhaseIcon = phaseIcon;
                    const phaseColor = phase === "knowledge" ? "text-info border-info/20 bg-info/5" :
                      phase === "practical" ? "text-accent border-accent/20 bg-accent/5" :
                      "text-success border-success/20 bg-success/5";
                    return (
                      <div key={phase} className={cn("rounded-xl border p-3 text-center", phaseColor)}>
                        <PhaseIcon className={cn("w-5 h-5 mx-auto mb-1", phase === "knowledge" ? "text-info" : phase === "practical" ? "text-accent" : "text-success")} />
                        <p className="text-xs font-semibold capitalize">{phase}</p>
                        <p className="text-lg font-bold">{phasePathways.length}</p>
                        <p className="text-[10px] text-muted-foreground">pathway{phasePathways.length !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Curriculum Modules */}
            <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Curriculum Modules</p>
                    <p className="text-xs text-muted-foreground">Programme modules and content structure</p>
                  </div>
                </div>
              </div>

              {(modules?.length ?? 0) === 0 ? (
                <div className="border border-border/50 rounded-xl min-h-[160px] flex flex-col items-center justify-center py-8">
                  <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No modules configured</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Modules are defined in the Programme Builder</p>
                </div>
              ) : (
                <div className="border border-border/50 rounded-xl divide-y divide-border/30">
                  {modules?.map((m, idx) => {
                    const typeColor = m.module_type === "theory" ? "bg-info/10 text-info" :
                      m.module_type === "practical" ? "bg-accent/10 text-accent" :
                      m.module_type === "workplace" ? "bg-success/10 text-success" :
                      "bg-muted text-muted-foreground";
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold", typeColor)}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.credits ?? 0} credits · {m.duration_hours ?? 0}h
                            {m.is_mandatory === false && " · Elective"}
                            {m.prerequisite_module_id && " · Has prerequisite"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{m.module_type ?? "theory"}</Badge>
                          {m.credential_label && (
                            <Badge className="bg-warning/15 text-warning text-[10px]">{m.credential_label}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="staff" className="mt-4 space-y-5">
            <StaffTabContent cohort={cohort} />
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance" className="mt-4 space-y-4">
            <AttendanceTabContent cohort={cohort} sessions={sessions} enrolments={enrolments} learnerDetails={learnerDetails} learnerCount={learnerCount} />
          </TabsContent>

          {/* Assessments & Submissions (unified) */}
          <TabsContent value="assessments" className="mt-4 space-y-4">
            {/* Assessment type summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(() => {
                const types = ["formative", "summative", "homework", "project"];
                return types.map(t => {
                  const count = assessments?.filter(a => a.assessment_type === t).length ?? 0;
                  return (
                    <div key={t} className="bg-card rounded-xl border border-border/50 p-3 text-center">
                      <p className="text-lg font-bold text-foreground">{count}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{t}</p>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Assessments & Submissions</p>
                    <p className="text-xs text-muted-foreground">All assessment types for this programme, including formative, summative, homework, projects, and more.</p>
                  </div>
                </div>
              </div>

              {(assessments?.length ?? 0) === 0 ? (
                <div className="border border-border/50 rounded-xl min-h-[160px] flex flex-col items-center justify-center py-8">
                  <FileCheck className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No assessments configured</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Assessments are inherited from the programme configuration</p>
                </div>
              ) : (
                <div className="border border-border/50 rounded-xl divide-y divide-border/30">
                  {assessments?.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
                          a.assessment_type === "summative" ? "bg-destructive/10 text-destructive" :
                          a.assessment_type === "formative" ? "bg-info/10 text-info" :
                          a.assessment_type === "homework" ? "bg-warning/10 text-warning" :
                          "bg-accent/10 text-accent"
                        )}>
                          {a.assessment_type?.charAt(0).toUpperCase() ?? "A"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {a.assessment_type} · Weight: {a.weighting ?? 0}% · Pass: {a.pass_mark}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {a.due_date && <p className="text-[11px] text-muted-foreground">Due: {format(new Date(a.due_date), "dd MMM yyyy")}</p>}
                        <Badge variant="outline" className="text-[10px] capitalize">{a.max_score} pts</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="mt-4 space-y-3">
            <ToolsTabContent cohort={cohort} navigate={navigate} enrolments={enrolments} sessions={sessions} />
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="mt-4 space-y-3">
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground mb-1">Tools & Utilities</p>
              <p className="text-xs text-muted-foreground mb-4">Additional management tools for this cohort</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Award, label: "Logbook & PoE", desc: "Manage learner logbooks and portfolio of evidence" },
                  { icon: Download, label: "Export Data", desc: "Download cohort data, attendance, and results" },
                  { icon: BarChart3, label: "Analytics", desc: "View cohort performance trends and insights" },
                  { icon: ClipboardList, label: "Audit Trail", desc: "Review cohort activity and change history" },
                ].map(t => (
                  <div key={t.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer">
                    <t.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Learner from Cohort</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from this cohort? This will delete their enrolment record.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteTarget) {
                deleteEnrolment.mutate(deleteTarget.id, {
                  onSuccess: () => {
                    toast.success(`${deleteTarget.name} removed from cohort`);
                    setDeleteTarget(null);
                  },
                  onError: (err: any) => toast.error(`Failed to remove: ${err?.message || "Unknown error"}`),
                });
              }
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function StaffTabContent({ cohort }: { cohort: any }) {
  const [showAssignStaff, setShowAssignStaff] = useState(false);
  const { data: staffAssignments, refetch } = useCohortStaffAssignments(cohort?.id);
  const removeStaff = useRemoveCohortStaff();

  const roleConfig = [
    { role: "facilitator", label: "Facilitators", icon: GraduationCap, color: "text-info", bgColor: "bg-info/10", borderColor: "border-info/20" },
    { role: "assessor", label: "Assessors", icon: Shield, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/20" },
    { role: "moderator", label: "Moderators", icon: Eye, color: "text-accent", bgColor: "bg-accent/10", borderColor: "border-accent/20" },
    { role: "mentor", label: "Mentors", icon: Heart, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/20" },
  ];

  const totalAssigned = staffAssignments?.length ?? 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
            <Briefcase className="w-4.5 h-4.5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Staff Assignments</p>
            <p className="text-xs text-muted-foreground">Manage facilitators, assessors, moderators, and mentors for this cohort</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowAssignStaff(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign Staff
          </button>
        </div>
      </div>

      {/* Role cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roleConfig.map(r => {
          const roleStaff = staffAssignments?.filter(s => s.role === r.role) ?? [];
          return (
            <div key={r.role} className={cn("rounded-xl border p-4 space-y-3", r.borderColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <r.icon className={cn("w-4 h-4", r.color)} />
                  <span className="text-sm font-semibold text-foreground">{r.label}</span>
                </div>
                <Badge className={cn("text-[10px] font-medium", roleStaff.length > 0 ? "bg-success/15 text-success" : "bg-info/15 text-info")}>
                  {roleStaff.length} assigned
                </Badge>
              </div>
              {roleStaff.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No {r.label.toLowerCase()} assigned
                </p>
              ) : (
                <div className="space-y-1">
                  {roleStaff.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", r.bgColor, r.color)}>
                          {(s.profile?.full_name ?? "S").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground truncate">{s.profile?.full_name || "Unnamed"}</span>
                      </div>
                      <button
                        onClick={() => removeStaff.mutate({ id: s.id, cohort_id: cohort.id })}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state footer */}
      {totalAssigned === 0 && (
        <div className="text-center py-6 border-t border-border/30">
          <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No staff members assigned yet</p>
          <p className="text-xs text-info mt-0.5 cursor-pointer hover:underline" onClick={() => setShowAssignStaff(true)}>
            Click "Assign Staff" to add facilitators, assessors, and more
          </p>
        </div>
      )}

      <AssignStaffModal
        cohortId={cohort.id}
        open={showAssignStaff}
        onClose={() => setShowAssignStaff(false)}
      />
    </>
  );
}

function AttendanceTabContent({ cohort, sessions, enrolments, learnerDetails, learnerCount }: {
  cohort: any; sessions: any[] | undefined; enrolments: any[] | undefined; learnerDetails: any; learnerCount: number;
}) {
  const sessionIds = sessions?.map(s => s.id) ?? [];

  // Fetch all attendance records for this cohort's sessions
  const { data: allAttendance } = useQuery({
    queryKey: ["cohort_attendance_all", cohort?.id, sessionIds],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_attendance")
        .select("*")
        .in("session_id", sessionIds);
      if (error) throw error;
      return data;
    },
  });

  // Compute average attendance rate
  const completedSessions = sessions?.filter(s => s.status === "completed") ?? [];
  let avgAttendance = "0%";
  if (completedSessions.length > 0 && learnerCount > 0) {
    const totalPresent = completedSessions.reduce((sum, s) => {
      const present = (allAttendance ?? []).filter(
        a => a.session_id === s.id && a.status === "present"
      ).length;
      return sum + present;
    }, 0);
    const rate = Math.round((totalPresent / (completedSessions.length * learnerCount)) * 100);
    avgAttendance = `${rate}%`;
  }

  // Compute at-risk learners (below 75% attendance across completed sessions)
  const atRiskLearners: { id: string; name: string; rate: number }[] = [];
  if (completedSessions.length > 0 && enrolments) {
    for (const e of enrolments) {
      const attended = completedSessions.filter(s =>
        (allAttendance ?? []).some(a => a.session_id === s.id && a.learner_id === e.learner_id && a.status === "present")
      ).length;
      const rate = Math.round((attended / completedSessions.length) * 100);
      if (rate < 75) {
        const details = learnerDetails?.[e.learner_id];
        atRiskLearners.push({
          id: e.learner_id,
          name: details?.full_name || e.learner_id.slice(0, 8) + "…",
          rate,
        });
      }
    }
  }

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CalendarCheck, label: "Total Sessions", value: sessions?.length ?? 0, color: "text-info" },
          { icon: Users, label: "Avg Attendance", value: avgAttendance, color: "text-success" },
          { icon: AlertCircle, label: "At-Risk Learners", value: atRiskLearners.length, color: "text-destructive" },
          { icon: CalendarCheck, label: "Upcoming", value: sessions?.filter(s => s.status === "scheduled").length ?? 0, color: "text-accent" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border/50 p-3 flex items-center gap-3">
            <s.icon className={cn("w-5 h-5", s.color)} />
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance Manager */}
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-foreground">Attendance Manager</p>
              <p className="text-xs text-muted-foreground">Mark attendance, track trends, and identify at-risk learners</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary/50 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>

        {(sessions?.length ?? 0) === 0 ? (
          <div className="border border-border/50 rounded-xl min-h-[160px] flex flex-col items-center justify-center py-8">
            <CalendarCheck className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-foreground">No sessions scheduled</p>
            <p className="text-xs text-muted-foreground mt-0.5">Create training sessions to start tracking attendance</p>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl divide-y divide-border/30">
            {sessions?.map(s => {
              const isPast = new Date(s.scheduled_start) < new Date();
              const presentCount = (allAttendance ?? []).filter(a => a.session_id === s.id && a.status === "present").length;
              const statusColor = s.status === "completed" ? "bg-success/15 text-success" :
                s.status === "in_progress" ? "bg-info/15 text-info" :
                s.status === "cancelled" ? "bg-destructive/15 text-destructive" :
                "bg-muted text-muted-foreground";
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold", statusColor)}>
                      {s.session_type?.charAt(0).toUpperCase() ?? "S"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(s.scheduled_start), "dd MMM yyyy · HH:mm")} · {s.session_type}
                        {s.status === "completed" && ` · ${presentCount}/${learnerCount} present`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPast && s.status !== "completed" && (
                      <Badge className="bg-warning/15 text-warning text-[10px]">Needs marking</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* At-Risk Learners */}
      {learnerCount > 0 && (
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">At-Risk Learners</p>
              <p className="text-xs text-muted-foreground">Learners with attendance below 75% threshold</p>
            </div>
          </div>
          {atRiskLearners.length === 0 ? (
            <div className="border border-border/50 rounded-xl min-h-[80px] flex flex-col items-center justify-center py-6">
              <UserCheck className="w-8 h-8 text-success/40 mb-1" />
              <p className="text-xs text-muted-foreground">
                {completedSessions.length === 0 ? "No completed sessions to analyse yet" : "No at-risk learners detected"}
              </p>
            </div>
          ) : (
            <div className="border border-border/50 rounded-xl divide-y divide-border/30">
              {atRiskLearners.map(l => (
                <div key={l.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-bold text-destructive">
                      {l.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{l.name}</span>
                  </div>
                  <Badge className="bg-destructive/15 text-destructive text-[10px]">{l.rate}% attendance</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ToolsTabContent({ cohort, navigate, enrolments, sessions }: {
  cohort: any; navigate: (path: string) => void; enrolments: any[] | undefined; sessions: any[] | undefined;
}) {
  const exportData = (enrolments ?? []).map(e => ({
    learner_id: e.learner_id,
    status: e.status,
    progress: e.progress_percentage ?? 0,
    enrolled_at: e.enrolled_at,
  }));

  const tools = [
    { icon: Award, label: "Logbook & PoE", desc: "Manage learner logbooks and portfolio of evidence", onClick: () => navigate("/portfolio-of-evidence") },
    { icon: Download, label: "Export Data", desc: "Download cohort data, attendance, and results", isExport: true },
    { icon: BarChart3, label: "Analytics", desc: "View cohort performance trends and insights", onClick: () => navigate("/analytics") },
    { icon: ClipboardList, label: "Audit Trail", desc: "Review cohort activity and change history", onClick: () => navigate("/audit-logs") },
  ];

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4">
      <p className="text-sm font-semibold text-foreground mb-1">Tools & Utilities</p>
      <p className="text-xs text-muted-foreground mb-4">Additional management tools for this cohort</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map(t => (
          <div
            key={t.label}
            onClick={t.onClick}
            className="flex items-start gap-3 p-3 rounded-lg border border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer"
          >
            <t.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">{t.label}</p>
              <p className="text-[11px] text-muted-foreground">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTab({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-10">
      <Icon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
