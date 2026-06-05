import { useState, useMemo, useEffect } from "react";
import {
  UserPlus, Users, TrendingUp, Clock, CheckCircle2,
  Search, XCircle, ThumbsUp, ThumbsDown, FileText,
  ChevronRight, AlertTriangle, RefreshCw, Settings2, ToggleLeft,
  History, CheckSquare, Square, Shield, Lock, Unlock,
  ArrowRight, RotateCcw, Eye, Plus, Trash2, GraduationCap,
  ClipboardCheck, Send, Timer, MoreVertical, Pencil, UserCheck, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import RegistrationMethodSelector, { RegistrationMethod } from "@/components/onboarding/RegistrationMethodSelector";
import AdminPasswordResetButton from "@/components/admin/AdminPasswordResetButton";
import LearnerRegistrationForm from "@/components/onboarding/LearnerRegistrationForm";
import StaffInviteLinkForm from "@/components/onboarding/StaffInviteLinkForm";
import SelfRegistrationForm from "@/components/onboarding/SelfRegistrationForm";
import SuperAdminOverrideForm from "@/components/onboarding/SuperAdminOverrideForm";
import VerificationChecklistDialog from "@/components/onboarding/VerificationChecklistDialog";
import DocumentVerificationPanel from "@/components/onboarding/DocumentVerificationPanel";
import BulkLearnerImportDialog from "@/components/onboarding/BulkLearnerImportDialog";
import ApproveEnrolDialog from "@/components/onboarding/ApproveEnrolDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAutoStartWorkflow } from "@/hooks/useWorkflowIntegration";
import WorkflowStatusBadge from "@/components/workflow/WorkflowStatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { maskNationalId } from "@/lib/privacyUtils";
import {
  useEnrolmentToggles, useUpsertEnrolmentToggle, useIsEnrolmentEnabled,
  useApprovalRoutingRules, useCreateApprovalRoutingRule, useDeleteApprovalRoutingRule,
  useEligibilityChecks, useRunEligibilityChecks, useEnrolLearner
} from "@/hooks/useLearnerLifecycle";
import { useProgrammes, useCohorts, useEnrolments } from "@/hooks/useCoreData";
import { useCohortAssignmentMode, useAutoAssignCohort } from "@/hooks/useCohortAssignment";
import { useDocumentVerificationStatus } from "@/hooks/useLearnerDocuments";
import {
  useChecklistSummary,
  useValidationMode,
  useSLAConfig,
  getSLAStatus,
} from "@/hooks/useVerificationChecklist";

interface Registration {
  id: string; full_name: string; email: string; phone: string | null;
  programme_name: string | null; programme_id: string | null; registration_method: string;
  status: string; rejection_reason: string | null; reviewed_by: string | null;
  reviewed_at: string | null; created_at: string; documents: any; notes: string | null;
  learner_number?: string | null; national_id?: string | null; date_of_birth?: string | null;
  gender?: string | null; country?: string | null; education_level?: string | null;
  sla_started_at?: string | null; sla_deadline_at?: string | null; sla_paused_at?: string | null;
  sla_breached?: boolean; is_archived?: boolean; registered_by?: string | null;
}

interface AuditEntry {
  id: string; entity_type: string; entity_id: string; action: string;
  performed_by: string | null; details: any; created_at: string;
}

function useRegistrations() {
  return useQuery({
    queryKey: ["learner_registrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learner_registrations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Registration[];
    },
  });
}

function useLearnerAuditLog() {
  return useQuery({
    queryKey: ["onboarding_audit_log", "learner"],
    queryFn: async () => {
      const { data, error } = await supabase.from("onboarding_audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted/50 text-muted-foreground border-border", icon: FileText },
  submitted: { label: "Submitted", color: "bg-info/10 text-info border-info/20", icon: ArrowRight },
  verified: { label: "Verified", color: "bg-accent/10 text-accent border-accent/20", icon: Shield },
  pending_approval: { label: "Pending Approval", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  approved: { label: "Approved", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  returned_for_revision: { label: "Returned", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: RotateCcw },
  resubmitted: { label: "Resubmitted", color: "bg-info/10 text-info border-info/20", icon: RefreshCw },
  enrolled: { label: "Enrolled", color: "bg-primary/10 text-primary border-primary/20", icon: GraduationCap },
};

const methodLabels: Record<string, string> = {
  "staff-direct": "Staff Direct", "staff-invite": "Invite Link",
  "self-registration": "Self-Registration", "admin-override": "Admin Override",
};

const auditActionLabels: Record<string, string> = {
  registered: "Registered", approved: "Approved", rejected: "Rejected",
  approved_and_enrolled: "Approved & Enrolled",
  returned: "Returned for Revision", enrolled: "Enrolled",
  cohort_assigned: "Cohort Assigned", toggle_enabled: "Toggle Enabled",
  toggle_disabled: "Toggle Disabled", documents_requested: "Documents Requested",
  document_uploaded: "Document Uploaded", document_verified: "Document Verified",
  document_rejected: "Document Rejected", check_passed: "Check Passed",
  check_failed: "Check Failed", check_flagged: "Check Flagged",
  validation_mode_changed: "Validation Mode Changed",
};

type TabKey = "repository" | "directory" | "documents" | "toggles" | "approvals" | "audit";

export default function LearnerOnboarding() {
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<RegistrationMethod | null>(null);
  const [tab, setTab] = useState<TabKey>("repository");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrolModalOpen, setEnrolModalOpen] = useState(false);
  const [enrolTarget, setEnrolTarget] = useState<Registration | null>(null);
  const [enrolCohortId, setEnrolCohortId] = useState("");
  // New: Approve & Enrol combined dialog
  const [approveEnrolTarget, setApproveEnrolTarget] = useState<Registration | null>(null);
  const [toggleReasonDialog, setToggleReasonDialog] = useState<{ scopeLevel: string; scopeId: string | null; newState: boolean } | null>(null);
  const [toggleReason, setToggleReason] = useState("");
  const [docViewRegistration, setDocViewRegistration] = useState<Registration | null>(null);
  const [checklistRegistration, setChecklistRegistration] = useState<Registration | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<Registration | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Registration | null>(null);
  const [viewTarget, setViewTarget] = useState<Registration | null>(null);

  // Approval rule form
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({ rule_name: "", scope_type: "programme", scope_value: "", approver_role: "", step_order: 1 });

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: registrations, isLoading } = useRegistrations();
  const { data: auditLog } = useLearnerAuditLog();
  const { data: toggles = [] } = useEnrolmentToggles();
  const { data: routingRules = [] } = useApprovalRoutingRules();
  const { data: programmes = [] } = useProgrammes();
  const { data: validationMode } = useValidationMode();
  const { data: slaConfig } = useSLAConfig();
  const upsertToggle = useUpsertEnrolmentToggle();
  const createRule = useCreateApprovalRoutingRule();
  const deleteRule = useDeleteApprovalRoutingRule();
  const runChecks = useRunEligibilityChecks();
  const enrolLearner = useEnrolLearner();
  const { isAutomatic: isAutoAssign } = useCohortAssignmentMode();
  const { data: allCohorts = [] } = useCohorts();
  const { data: allEnrolments = [] } = useEnrolments();
  const autoStartWorkflow = useAutoStartWorkflow();

  // Helper: get assigned cohort code for a learner registration
  const getCohortCode = (registration: Registration) => {
    if (registration.status !== "enrolled") return null;
    const learnerId = (registration as any).user_id || registration.id;
    // Only match enrolments for this learner AND the same programme
    const enrolment = allEnrolments.find(e => {
      if ((e as any).learner_id !== learnerId) return false;
      if (!e.cohort_id) return false;
      const cohort = allCohorts.find(c => c.id === e.cohort_id);
      return cohort && cohort.programme_id === registration.programme_id;
    });
    if (!enrolment) return null;
    const cohort = allCohorts.find(c => c.id === enrolment.cohort_id);
    return cohort?.code || cohort?.name || null;
  };

  const approveRegistration = useMutation({
    mutationFn: async ({ id, reason, authoritySource }: { id: string; reason: string; authoritySource?: string }) => {
      const { error } = await supabase.from("learner_registrations").update({
        status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null,
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "learner", entity_id: id, action: "approved",
        performed_by: user?.id || null, details: { reason, authority_source: authoritySource || "unknown" },
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
      toast.success("Registration approved.");
      // Trigger workflow on status change
      autoStartWorkflow.mutate({
        entityType: "learner_registration",
        entityId: vars.id,
        triggerEvent: "on_status_change",
        metadata: { new_status: "approved" },
      });
    },
    onError: () => toast.error("Failed to approve"),
  });

  const rejectRegistration = useMutation({
    mutationFn: async ({ id, reason, authoritySource }: { id: string; reason: string; authoritySource?: string }) => {
      const { error } = await supabase.from("learner_registrations").update({
        status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null,
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "learner", entity_id: id, action: "rejected",
        performed_by: user?.id || null, details: { reason, authority_source: authoritySource || "unknown" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
      toast.success("Registration rejected.");
    },
    onError: () => toast.error("Failed to reject"),
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("learner_registrations").update({
        status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null,
      }).in("id", ids);
      if (error) throw error;
      const logs = ids.map(id => ({
        entity_type: "learner", entity_id: id, action: "approved",
        performed_by: user?.id || null, details: { bulk: true, reason: "Bulk approval" },
      }));
      await supabase.from("onboarding_audit_log").insert(logs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
      toast.success(`${selectedIds.size} registrations approved.`);
      setSelectedIds(new Set());
    },
  });

  const pending = useMemo(() => (registrations ?? []).filter(r => ["pending_approval", "submitted", "resubmitted"].includes(r.status)), [registrations]);
  // Directory: ONLY enrolled learners (those with a cohort assignment)
  const directoryLearners = useMemo(() => (registrations ?? []).filter(r => r.status === "enrolled"), [registrations]);
  // Repository: everything that isn't enrolled (including any "approved" that slipped through)
  const repositoryRegistrations = useMemo(() => (registrations ?? []).filter(r => r.status !== "enrolled" && !r.is_archived), [registrations]);
  const approved = useMemo(() => (registrations ?? []).filter(r => r.status === "approved"), [registrations]);
  const enrolled = useMemo(() => (registrations ?? []).filter(r => r.status === "enrolled"), [registrations]);
  const slaBreached = useMemo(() => (registrations ?? []).filter(r => r.sla_breached), [registrations]);

  const filteredRegistrations = useMemo(() => {
    const list = tab === "directory" ? directoryLearners : repositoryRegistrations;
    return list.filter(r => {
      const matchSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        (r.learner_number || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [registrations, directoryLearners, repositoryRegistrations, tab, search, statusFilter]);

  const globalToggle = toggles.find((t: any) => t.scope_level === "global" && !t.scope_id);
  const enrolmentGlobalEnabled = globalToggle?.is_enabled ?? false;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAllPending = () => {
    const pendingIds = pending.map(r => r.id);
    setSelectedIds(prev => prev.size === pendingIds.length ? new Set() : new Set(pendingIds));
  };

  const stats = useMemo(() => [
    { label: "Total Registered", value: String((registrations ?? []).length), change: `${pending.length} pending`, icon: Users },
    { label: "Pending Approval", value: String(pending.length), change: slaBreached.length > 0 ? `${slaBreached.length} SLA breached` : "Under control", icon: Clock },
    { label: "Approved (Directory)", value: String(approved.length), change: `${enrolled.length} enrolled`, icon: CheckCircle2 },
    { label: "Validation Mode", value: (validationMode || "manual") === "manual" ? "Manual" : "AI-Assisted", change: "Document validation", icon: ClipboardCheck },
  ], [registrations, pending, approved, enrolled, enrolmentGlobalEnabled, validationMode, slaBreached]);

  const handleClose = () => { setShowMethodSelector(false); setSelectedMethod(null); queryClient.invalidateQueries({ queryKey: ["learner_registrations"] }); };

  const handleToggleChange = (scopeLevel: string, scopeId: string | null, newState: boolean) => {
    setToggleReasonDialog({ scopeLevel, scopeId, newState });
    setToggleReason("");
  };

  const confirmToggle = () => {
    if (!toggleReasonDialog || !toggleReason.trim()) return;
    upsertToggle.mutate({
      scopeLevel: toggleReasonDialog.scopeLevel,
      scopeId: toggleReasonDialog.scopeId,
      isEnabled: toggleReasonDialog.newState,
      reason: toggleReason,
    }, {
      onSuccess: () => {
        toast.success(`Enrolment ${toggleReasonDialog.newState ? "enabled" : "disabled"}.`);
        setToggleReasonDialog(null);
        setToggleReason("");
      },
    });
  };

  const openEnrolModal = (reg: Registration) => {
    setEnrolTarget(reg);
    setEnrolCohortId("");
    setEnrolModalOpen(true);
    runChecks.mutate({ registrationId: reg.id, registration: reg, toggles });
  };

  const confirmEnrol = () => {
    if (!enrolTarget || !enrolCohortId) return;
    // Use the auth user_id if available, otherwise fall back to registration ID
    const authUserId = (enrolTarget as any).user_id || enrolTarget.id;
    enrolLearner.mutate({
      registrationId: enrolTarget.id,
      learnerId: authUserId,
      cohortId: enrolCohortId,
      programmeId: enrolTarget.programme_id || "",
    }, {
      onSuccess: () => {
        toast.success(`${enrolTarget.full_name} enrolled successfully.`);
        setEnrolModalOpen(false);
        setEnrolTarget(null);
      },
      onError: (err: any) => {
        console.error("Enrolment failed:", err);
        toast.error(`Enrolment failed: ${err?.message || "Unknown error"}`);
      },
    });
  };

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: "repository", label: "Registration Repository", badge: pending.length || undefined },
    { key: "directory", label: "Learner Directory", badge: directoryLearners.length || undefined },
    { key: "documents", label: "Document Verification" },
    { key: "toggles", label: "Enrolment Toggles" },
    { key: "approvals", label: "Approval Rules" },
    { key: "audit", label: "Audit Trail" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learner Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Registration → Verification → Approval → Enrolment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(true)} className="gap-2 text-xs">
            <Upload className="w-4 h-4" /> Bulk Import
          </Button>
          <Button onClick={() => setShowMethodSelector(true)} className="bg-accent text-accent-foreground gap-2 text-xs">
            <UserPlus className="w-4 h-4" /> Register New Learner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10"><s.icon className="w-4 h-4 text-primary" /></div>
              <span className="text-[10px] text-muted-foreground">{s.change}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setStatusFilter("all"); setSearch(""); setSelectedIds(new Set()); }}
            className={cn("px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            {t.label}
            {t.badge && t.badge > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-warning/15 text-warning">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ═══ Repository & Directory ═══ */}
      {(tab === "repository" || tab === "directory") && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {tab === "repository" ? "Registration Repository" : "Approved Learner Directory"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {tab === "repository"
                  ? "Click a learner row to open the Verification Checklist. Approve only after all checks pass."
                  : "Only approved learners appear here. Enrol from this directory."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {tab === "repository" && selectedIds.size > 0 && (
                <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => bulkApprove.mutate(Array.from(selectedIds))}>
                  <UserCheck className="w-3 h-3" /> Approve & Enrol {selectedIds.size}
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search name, email, LRN..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-52 h-8 text-xs" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="resubmitted">Resubmitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="returned_for_revision">Returned</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No registrations found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {tab === "repository" && (
                      <th className="px-3 py-3 w-8">
                        <button onClick={selectAllPending}>
                          {selectedIds.size === pending.length && pending.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      </th>
                    )}
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">LRN #</th>
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Learner</th>
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Verification</th>
                    {tab === "repository" && <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">SLA</th>}
                    {tab === "directory" && <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Eligibility</th>}
                    {tab === "directory" && <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cohort</th>}
                    <th className="text-right px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredRegistrations.map(r => {
                    const sc = statusConfig[r.status] || statusConfig.pending_approval;
                    return (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        {tab === "repository" && (
                          <td className="px-3 py-3">
                            {["pending_approval", "submitted", "resubmitted"].includes(r.status) && (
                              <button onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}>
                                {selectedIds.has(r.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                              </button>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3">
                          <span className="text-[10px] font-mono font-semibold text-primary">{r.learner_number || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-medium text-foreground">{r.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.email}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{r.programme_name || "—"}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", sc.color)}>{sc.label}</span>
                            <WorkflowStatusBadge entityType="learner_registration" entityId={r.id} compact />
                          </div>
                          {(r.status === "rejected" || r.status === "returned_for_revision") && r.rejection_reason && (
                            <p className="text-[10px] text-destructive mt-1 max-w-[140px] truncate" title={r.rejection_reason}>Reason: {r.rejection_reason}</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <VerificationProgressBadge registrationId={r.id} />
                        </td>
                        {tab === "repository" && (
                          <td className="px-3 py-3">
                            <SLABadge registration={r} amberPercent={slaConfig?.amberPercent || 75} />
                          </td>
                        )}
                        {tab === "directory" && (
                          <td className="px-3 py-3">
                            <EligibilityIndicator registration={r} toggles={toggles} />
                          </td>
                        )}
                        {tab === "directory" && (
                          <td className="px-3 py-3">
                            {getCohortCode(r) ? (
                              <span className="text-[10px] font-mono font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">{getCohortCode(r)}</span>
                            ) : r.status === "enrolled" ? (
                              <span className="text-[10px] font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">No Cohort</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3 text-right">
                          {tab === "repository" && (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                                onClick={() => setChecklistRegistration(r)}>
                                <ClipboardCheck className="w-3 h-3" /> Verify
                              </Button>
                              {/* Only show Approve & Enrol when all checks are ready */}
                              {["pending_approval", "submitted", "resubmitted"].includes(r.status) && (
                                <Button size="sm" className="h-7 px-2.5 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => setApproveEnrolTarget(r)}>
                                  <UserCheck className="w-3 h-3" /> Approve & Enrol
                                </Button>
                              )}
                              {/* Fallback for previously approved-but-not-enrolled */}
                              {r.status === "approved" && (
                                <Button size="sm" className="h-7 px-2.5 text-xs gap-1 bg-primary text-primary-foreground"
                                  onClick={() => setApproveEnrolTarget(r)}>
                                  <GraduationCap className="w-3 h-3" /> Enrol
                                </Button>
                              )}
                            </div>
                          )}
                          {tab === "directory" && (
                            <div className="flex items-center justify-end gap-1">
                              {r.status === "approved" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button size="sm" variant="outline" className="h-7 px-3 text-[10px] gap-1"
                                          disabled={!enrolmentGlobalEnabled}
                                          onClick={() => openEnrolModal(r)}>
                                          {enrolmentGlobalEnabled ? <GraduationCap className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                          Enrol
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {!enrolmentGlobalEnabled && (
                                      <TooltipContent><p className="text-xs">Global enrolment toggle is OFF.</p></TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setViewTarget(r)}>
                                    <Eye className="w-3.5 h-3.5 mr-2" /> View Learner Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setChecklistRegistration(r)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Learner
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setStatusChangeTarget(r); setNewStatus(r.status); }}>
                                    <UserCheck className="w-3.5 h-3.5 mr-2" /> Change Status
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <AdminPasswordResetButton email={r.email} userName={r.full_name} variant="dropdown" />
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(r)}>
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Learner
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Document Verification ═══ */}
      {tab === "documents" && (
        <div className="space-y-6">
          {/* Validation Mode Indicator */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Document Validation Mode</p>
                <p className="text-[10px] text-muted-foreground">
                  {validationMode === "ai_assisted"
                    ? "AI-Assisted: Documents auto-validated with confidence scoring. Low-confidence items flagged for manual review."
                    : "Manual: All documents require human reviewer verification."}
                </p>
              </div>
            </div>
            <span className={cn("text-xs font-semibold px-3 py-1 rounded-full border",
              validationMode === "ai_assisted"
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-secondary text-foreground border-border"
            )}>
              {validationMode === "ai_assisted" ? "AI-Assisted" : "Manual"}
            </span>
          </div>

          {docViewRegistration ? (
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{docViewRegistration.full_name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {docViewRegistration.learner_number && <span className="font-mono font-semibold mr-2">{docViewRegistration.learner_number}</span>}
                    {docViewRegistration.email} • {docViewRegistration.programme_name || "No programme"}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setDocViewRegistration(null)}>← Back to List</Button>
              </div>
              <DocumentVerificationPanel registrationId={docViewRegistration.id} learnerName={docViewRegistration.full_name} />
            </div>
          ) : (
            <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Document Verification Queue</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Upload and verify documents. All documents must be verified before approval.</p>
              </div>
              <div className="divide-y divide-border/50">
                {(registrations ?? []).filter(r => ["pending_approval", "submitted", "verified", "resubmitted"].includes(r.status)).map(r => (
                  <div key={r.id} className="px-6 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono font-semibold text-primary">{r.learner_number || "—"}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{r.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.email} • {r.programme_name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DocumentStatusBadge registrationId={r.id} />
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setDocViewRegistration(r)}>
                        <Eye className="w-3 h-3" /> Review
                      </Button>
                    </div>
                  </div>
                ))}
                {(registrations ?? []).filter(r => ["pending_approval", "submitted", "verified", "resubmitted"].includes(r.status)).length === 0 && (
                  <div className="p-12 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No registrations requiring document review.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Enrolment Toggles ═══ */}
      {tab === "toggles" && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2"><ToggleLeft className="w-4 h-4" /> Global Enrolment Toggle</h3>
            <p className="text-[11px] text-muted-foreground mb-4">When OFF, no enrolments can be processed.</p>
            <div className="flex items-center gap-4">
              <Switch checked={enrolmentGlobalEnabled} onCheckedChange={(checked) => handleToggleChange("global", null, checked)} />
              <span className={cn("text-xs font-semibold", enrolmentGlobalEnabled ? "text-success" : "text-destructive")}>
                {enrolmentGlobalEnabled ? "ENABLED" : "DISABLED"}
              </span>
              {globalToggle?.reason && <span className="text-[10px] text-muted-foreground">Reason: {globalToggle.reason}</span>}
            </div>
          </div>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
            <h3 className="text-sm font-semibold text-foreground mb-1">Programme-Level Toggles</h3>
            <p className="text-[11px] text-muted-foreground mb-4">Override enrolment per programme.</p>
            <div className="space-y-3">
              {programmes.map((p: any) => {
                const progToggle = toggles.find((t: any) => t.scope_level === "programme" && t.scope_id === p.id);
                const isOn = progToggle ? progToggle.is_enabled : true;
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-foreground">{p.title}</p>
                      {progToggle?.reason && <p className="text-[10px] text-muted-foreground">Reason: {progToggle.reason}</p>}
                    </div>
                    <Switch checked={isOn} onCheckedChange={(checked) => handleToggleChange("programme", p.id, checked)} />
                  </div>
                );
              })}
              {programmes.length === 0 && <p className="text-xs text-muted-foreground">No programmes found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Approval Rules ═══ */}
      {tab === "approvals" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Approval Routing Rules</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Define who approves registrations and in what order.</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setShowRuleForm(true)}>
              <Plus className="w-3 h-3" /> Add Rule
            </Button>
          </div>
          {routingRules.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No routing rules defined.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routingRules.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/30">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{rule.rule_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Step {rule.step_order} • Scope: {rule.scope_type}{rule.scope_value ? ` (${rule.scope_value})` : ""} • Role: {rule.approver_role || "Any"}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Audit Trail ═══ */}
      {tab === "audit" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><History className="w-4 h-4" /> Learner Lifecycle Audit Trail</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Complete log of registration, verification, approval, and enrolment events.</p>
          </div>
          {!auditLog || auditLog.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
              {auditLog.map(entry => (
                <div key={entry.id} className="px-6 py-3 flex items-start gap-4 hover:bg-secondary/20 transition-colors">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                    ["approved", "toggle_enabled", "check_passed", "document_verified"].includes(entry.action) ? "bg-success/10 text-success" :
                    ["rejected", "check_failed", "document_rejected"].includes(entry.action) ? "bg-destructive/10 text-destructive" :
                    entry.action === "enrolled" ? "bg-primary/10 text-primary" :
                    ["returned", "check_flagged", "documents_requested"].includes(entry.action) ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {entry.entity_type === "enrolment_toggle" ? "T" :
                     entry.entity_type === "verification_checklist" ? "V" :
                     entry.entity_type === "learner_document" ? "D" :
                     entry.entity_type === "document_request" ? "R" : "L"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{auditActionLabels[entry.action] || entry.action}</span>
                    {entry.details && typeof entry.details === "object" && Object.keys(entry.details).length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {Object.entries(entry.details).filter(([k]) => k !== "bulk").map(([k, v]) => `${k}: ${v}`).join(" • ")}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Modals ═══ */}
      <BulkLearnerImportDialog open={showBulkImport} onClose={() => setShowBulkImport(false)} />
      {showMethodSelector && <RegistrationMethodSelector onSelect={(m: RegistrationMethod) => { setSelectedMethod(m); setShowMethodSelector(false); }} onClose={handleClose} />}
      {selectedMethod === "staff-direct" && <LearnerRegistrationForm onBack={() => { setSelectedMethod(null); setShowMethodSelector(true); }} onClose={handleClose} />}
      {selectedMethod === "staff-invite" && <StaffInviteLinkForm onBack={() => { setSelectedMethod(null); setShowMethodSelector(true); }} onClose={handleClose} />}
      {selectedMethod === "self-registration" && <SelfRegistrationForm onBack={() => { setSelectedMethod(null); setShowMethodSelector(true); }} onClose={handleClose} />}
      {selectedMethod === "admin-override" && <SuperAdminOverrideForm onBack={() => { setSelectedMethod(null); setShowMethodSelector(true); }} onClose={handleClose} />}

      {/* Verification Checklist Dialog */}
      {checklistRegistration && (
        <VerificationChecklistDialog
          registration={checklistRegistration}
          open={!!checklistRegistration}
          onClose={() => setChecklistRegistration(null)}
          onApprove={(id, _reason, _authoritySource) => {
            // Instead of directly approving, open the combined Approve & Enrol dialog
            const reg = (registrations ?? []).find(r => r.id === id);
            if (reg) {
              setChecklistRegistration(null);
              setApproveEnrolTarget(reg);
            }
          }}
          onReject={(id, reason, authoritySource) => rejectRegistration.mutate({ id, reason, authoritySource })}
          slaAmberPercent={slaConfig?.amberPercent || 75}
        />
      )}

      {/* ══ Approve & Enrol Dialog — Repository → Directory gateway ══ */}
      <ApproveEnrolDialog
        registration={approveEnrolTarget}
        open={!!approveEnrolTarget}
        onOpenChange={v => { if (!v) setApproveEnrolTarget(null); }}
      />

      {/* Toggle Reason Dialog */}
      <Dialog open={!!toggleReasonDialog} onOpenChange={() => setToggleReasonDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">{toggleReasonDialog?.newState ? "Enable" : "Disable"} Enrolment</DialogTitle>
            <DialogDescription className="text-xs">All toggle changes are audited. Please provide a reason.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for change (required)..." value={toggleReason} onChange={e => setToggleReason(e.target.value)} className="text-xs" />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setToggleReasonDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!toggleReason.trim()} onClick={confirmToggle}>
              {toggleReasonDialog?.newState ? "Enable" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrolment Modal */}
      <Dialog open={enrolModalOpen} onOpenChange={setEnrolModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Enrol Learner</DialogTitle>
            <DialogDescription className="text-xs">
              {isAutoAssign
                ? `Auto-assign ${enrolTarget?.full_name} to the next available cohort.`
                : `Assign ${enrolTarget?.full_name} to a programme cohort.`}
            </DialogDescription>
          </DialogHeader>
          {enrolTarget && (
            <EnrolModalContent
              registration={enrolTarget}
              toggles={toggles}
              cohortId={enrolCohortId}
              onCohortChange={setEnrolCohortId}
              isAutoAssign={isAutoAssign}
            />
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEnrolModalOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={(!enrolCohortId && !isAutoAssign) || enrolLearner.isPending}
              onClick={confirmEnrol}
              className="bg-success text-success-foreground"
            >
              <GraduationCap className="w-3 h-3 mr-1" /> Confirm Enrolment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={showRuleForm} onOpenChange={setShowRuleForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Add Approval Routing Rule</DialogTitle>
            <DialogDescription className="text-xs">Define who approves specific types of registrations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Rule Name</Label>
              <Input value={ruleForm.rule_name} onChange={e => setRuleForm(f => ({ ...f, rule_name: e.target.value }))} placeholder="e.g. MBA Programme Approval" className="text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Scope Type</Label>
                <Select value={ruleForm.scope_type} onValueChange={v => setRuleForm(f => ({ ...f, scope_type: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="programme">Programme</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Approver Role</Label>
                <Select value={ruleForm.approver_role} onValueChange={v => setRuleForm(f => ({ ...f, approver_role: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programme_manager">Programme Manager</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="facilitator">Facilitator</SelectItem>
                    <SelectItem value="assessor">Assessor</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Step Order</Label>
              <Input type="number" min={1} value={ruleForm.step_order} onChange={e => setRuleForm(f => ({ ...f, step_order: parseInt(e.target.value) || 1 }))} className="text-xs w-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRuleForm(false)}>Cancel</Button>
            <Button size="sm" disabled={!ruleForm.rule_name.trim() || !ruleForm.approver_role} onClick={() => {
              createRule.mutate(ruleForm, { onSuccess: () => { setShowRuleForm(false); setRuleForm({ rule_name: "", scope_type: "programme", scope_value: "", approver_role: "", step_order: 1 }); toast.success("Rule created."); } });
            }}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ View Learner Profile Dialog ═══ */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Learner Profile</DialogTitle>
            <DialogDescription className="text-xs">Details for {viewTarget?.full_name}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted-foreground">Full Name</p><p className="font-medium">{viewTarget.full_name}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Email</p><p className="font-medium">{viewTarget.email}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Phone</p><p className="font-medium">{viewTarget.phone || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Learner #</p><p className="font-medium">{viewTarget.learner_number || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">National ID</p><p className="font-medium font-mono tracking-wider">{maskNationalId(viewTarget.national_id)}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Date of Birth</p><p className="font-medium">{viewTarget.date_of_birth || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Gender</p><p className="font-medium">{viewTarget.gender || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Country</p><p className="font-medium">{viewTarget.country || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Programme</p><p className="font-medium">{viewTarget.programme_name || "—"}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Status</p><p className="font-medium capitalize">{viewTarget.status}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Registration Method</p><p className="font-medium">{methodLabels[viewTarget.registration_method] || viewTarget.registration_method}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Registered</p><p className="font-medium">{new Date(viewTarget.created_at).toLocaleDateString("en-ZA")}</p></div>
              </div>
              {viewTarget.notes && (
                <div><p className="text-[10px] text-muted-foreground">Notes</p><p className="text-xs">{viewTarget.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Change Status Dialog ═══ */}
      <Dialog open={!!statusChangeTarget} onOpenChange={(o) => !o && setStatusChangeTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Change Learner Status</DialogTitle>
            <DialogDescription className="text-xs">Update status for {statusChangeTarget?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="returned_for_revision">Returned for Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusChangeTarget(null)}>Cancel</Button>
            <Button size="sm" disabled={!newStatus || newStatus === statusChangeTarget?.status} onClick={async () => {
              if (!statusChangeTarget) return;
              const { error } = await supabase.from("learner_registrations").update({ status: newStatus }).eq("id", statusChangeTarget.id);
              if (error) { toast.error("Failed to update status"); return; }
              await supabase.from("onboarding_audit_log").insert({
                entity_type: "learner", entity_id: statusChangeTarget.id, action: "status_changed",
                performed_by: user?.id || null, details: { from: statusChangeTarget.status, to: newStatus },
              });
              queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
              queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
              toast.success("Status updated.");
              setStatusChangeTarget(null);
            }}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Learner Dialog ═══ */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Delete Learner</DialogTitle>
            <DialogDescription className="text-xs">Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={async () => {
              if (!deleteTarget) return;
              const { error } = await supabase.from("learner_registrations").delete().eq("id", deleteTarget.id);
              if (error) { toast.error("Failed to delete learner"); return; }
              await supabase.from("onboarding_audit_log").insert({
                entity_type: "learner", entity_id: deleteTarget.id, action: "deleted",
                performed_by: user?.id || null, details: { full_name: deleteTarget.full_name },
              });
              queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
              queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
              toast.success("Learner deleted.");
              setDeleteTarget(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SLA Badge ──
function SLABadge({ registration, amberPercent }: { registration: Registration; amberPercent: number }) {
  const sla = getSLAStatus(registration, amberPercent);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
            sla.color === "green" ? "bg-success/10 text-success border-success/20" :
            sla.color === "amber" ? "bg-warning/10 text-warning border-warning/20" :
            sla.color === "red" ? "bg-destructive/10 text-destructive border-destructive/20" :
            "bg-muted text-muted-foreground border-border"
          )}>
            <Timer className="w-3 h-3" />
            {sla.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-[10px]">
            {sla.hoursRemaining !== null ? `${sla.hoursRemaining} hours remaining` : sla.label}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Verification Progress Badge ──
function VerificationProgressBadge({ registrationId }: { registrationId: string }) {
  const { progress, passedChecks, totalChecks, isLoading, allPassed } = useChecklistSummary(registrationId);

  if (isLoading) return <span className="text-[10px] text-muted-foreground">...</span>;
  if (totalChecks === 0) return <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">No checks</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all",
                allPassed ? "bg-success" : progress >= 50 ? "bg-warning" : "bg-destructive"
              )} style={{ width: `${progress}%` }} />
            </div>
            <span className={cn("text-[10px] font-medium",
              allPassed ? "text-success" : "text-muted-foreground"
            )}>
              {passedChecks}/{totalChecks}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-[10px]">{progress}% verified ({passedChecks} of {totalChecks} checks passed)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Document Status Badge ──
function DocumentStatusBadge({ registrationId }: { registrationId: string }) {
  const docStatus = useDocumentVerificationStatus(registrationId);

  if (docStatus.status === "loading") return <span className="text-[10px] text-muted-foreground">...</span>;
  if (!docStatus.hasDocuments) return <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border">No docs</span>;

  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
      docStatus.allVerified ? "bg-success/10 text-success border-success/20" :
      docStatus.rejected > 0 ? "bg-destructive/10 text-destructive border-destructive/20" :
      "bg-warning/10 text-warning border-warning/20"
    )}>
      {docStatus.allVerified ? `✅ ${docStatus.verified} verified` :
       docStatus.rejected > 0 ? `❌ ${docStatus.rejected} rejected` :
       `⏳ ${docStatus.pending} pending`}
    </span>
  );
}

// ── Eligibility Indicator ──
function EligibilityIndicator({ registration, toggles }: { registration: Registration; toggles: any[] }) {
  const globalToggle = toggles.find((t: any) => t.scope_level === "global" && !t.scope_id);
  const docStatus = useDocumentVerificationStatus(registration.id);
  const { allPassed: checklistPassed } = useChecklistSummary(registration.id);
  const isApproved = ["approved", "enrolled"].includes(registration.status);
  const hasProfile = !!(registration.full_name && registration.email);
  const toggleOn = globalToggle?.is_enabled ?? false;
  const docsVerified = docStatus.allVerified || !docStatus.hasDocuments;

  const checks = [
    { label: "Approved", passed: isApproved },
    { label: "Profile", passed: hasProfile },
    { label: "Documents", passed: docsVerified },
    { label: "Checklist", passed: checklistPassed },
    { label: "Toggle", passed: toggleOn },
  ];
  const allPassed = checks.every(c => c.passed);
  const somePassed = checks.some(c => c.passed);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            allPassed ? "bg-success/10 text-success border-success/20" :
            somePassed ? "bg-warning/10 text-warning border-warning/20" :
            "bg-destructive/10 text-destructive border-destructive/20"
          )}>
            {allPassed ? "✅ Eligible" : somePassed ? "⚠️ Partial" : "❌ Ineligible"}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {checks.map(c => (
              <p key={c.label} className="text-[10px]">{c.passed ? "✅" : "❌"} {c.label}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Enrol Modal Content ──
function EnrolModalContent({ registration, toggles, cohortId, onCohortChange, isAutoAssign }: {
  registration: Registration; toggles: any[]; cohortId: string; onCohortChange: (v: string) => void; isAutoAssign: boolean;
}) {
  // Load cohorts for the registration's programme; fallback to all cohorts if none found
  const { data: programmeCohorts = [] } = useCohorts(registration.programme_id ?? undefined);
  const { data: allCohorts = [] } = useCohorts();
  const cohorts = programmeCohorts.length > 0 ? programmeCohorts : allCohorts;
  const showingAllCohorts = programmeCohorts.length === 0 && allCohorts.length > 0;
  const { data: checks = [] } = useEligibilityChecks(registration.id);
  const docStatus = useDocumentVerificationStatus(registration.id);
  const { allPassed: checklistPassed } = useChecklistSummary(registration.id);
  const { data: autoCohort, isLoading: autoLoading } = useAutoAssignCohort(
    isAutoAssign ? (registration.programme_id || undefined) : undefined
  );

  const globalToggle = toggles.find((t: any) => t.scope_level === "global" && !t.scope_id);
  const isApproved = ["approved", "enrolled"].includes(registration.status);
  const toggleOn = globalToggle?.is_enabled ?? false;
  const docsVerified = docStatus.allVerified || !docStatus.hasDocuments;

  // Auto-set cohort when in auto mode
  useEffect(() => {
    if (isAutoAssign && autoCohort?.id && cohortId !== autoCohort.id) {
      onCohortChange(autoCohort.id);
    }
  }, [isAutoAssign, autoCohort?.id]);

  const eligibility = [
    { label: "Registration Approved", passed: isApproved },
    { label: "Profile Complete", passed: !!(registration.full_name && registration.email) },
    { label: "Documents Verified", passed: docsVerified },
    { label: "Verification Checklist Complete", passed: checklistPassed },
    { label: "Enrolment Toggle ON", passed: toggleOn },
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
        <p className="text-xs font-semibold text-foreground mb-2">Eligibility Checks</p>
        <div className="space-y-1.5">
          {eligibility.map(c => (
            <div key={c.label} className="flex items-center gap-2">
              {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
              <span className="text-[11px] text-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Programme</Label>
        <Input value={registration.programme_name || "Not assigned"} readOnly className="text-xs bg-secondary/50" />
      </div>

      {isAutoAssign ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Cohort Assignment</Label>
          {autoLoading ? (
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
              <p className="text-[11px] text-muted-foreground">Finding available cohort...</p>
            </div>
          ) : autoCohort ? (
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{autoCohort.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {autoCohort.remainingCapacity} spot{autoCohort.remainingCapacity !== 1 ? "s" : ""} remaining
                    {autoCohort.start_date ? ` · Starts ${autoCohort.start_date}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-5">Auto-assigned based on capacity and start date</p>
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive">No cohorts with available capacity found for this programme.</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs">Select Cohort</Label>
          {showingAllCohorts && (
            <p className="text-[10px] text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              No cohorts found for this programme. Showing all available cohorts.
            </p>
          )}
          <Select value={cohortId} onValueChange={onCohortChange}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Choose a cohort..." /></SelectTrigger>
            <SelectContent>
              {cohorts.map((c: any) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name} ({c.status}){c.programmes?.title ? ` — ${c.programmes.title}` : ""}
                </SelectItem>
              ))}
              {cohorts.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No cohorts available. Create a cohort first.</div>}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}