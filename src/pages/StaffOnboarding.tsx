import { useState, useMemo } from "react";
import {
  Briefcase, Users, Clock, CheckCircle2, Search,
  ShieldCheck, History, FolderOpen, ClipboardCheck,
  Plus, Eye, Pencil, Trash2, MoreHorizontal,
  UserPlus, CheckSquare, XCircle,
  Mail, Phone, Building2, Calendar, Filter,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import StaffRegistrationForm from "@/components/onboarding/StaffRegistrationForm";
import AdminPasswordResetButton from "@/components/admin/AdminPasswordResetButton";
import StaffVerificationPanel from "@/components/onboarding/StaffVerificationPanel";
import StaffProfileDialog from "@/components/onboarding/StaffProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStaffRoleAssignments, useAssignStaffRole, useRemoveStaffRole, L_AND_D_ROLES } from "@/hooks/useStaffRoleAssignments";
import { WelcomeBanner, KpiGrid } from "@/components/dashboard/DashboardShell";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { format } from "date-fns";
import StaffRoleCatalogManager from "@/components/onboarding/StaffRoleCatalogManager";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffRegistration {
  id: string; full_name: string; email: string; phone: string | null;
  role_requested: string; department: string | null; status: string;
  document_verification_status: string; rejection_reason: string | null;
  notes: string | null; portal_access_granted: boolean; credentials_sent: boolean;
  created_at: string; approved_at: string | null; documents: any;
}

interface AuditEntry {
  id: string; entity_type: string; entity_id: string; action: string;
  performed_by: string | null; details: any; created_at: string;
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useStaffRegistrations() {
  return useQuery({
    queryKey: ["staff_registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_registrations").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StaffRegistration[];
    },
  });
}

function useStaffAuditLog() {
  return useQuery({
    queryKey: ["onboarding_audit_log", "staff"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_audit_log").select("*")
        .eq("entity_type", "staff")
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending_verification: { label: "Pending Verification", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", dot: "bg-orange-500" },
  approved:             { label: "Approved",              color: "bg-green-500/10 text-green-600 border-green-500/20",  dot: "bg-green-500" },
  rejected:             { label: "Rejected",              color: "bg-rose-500/10 text-rose-600 border-rose-500/20",    dot: "bg-rose-500" },
  active:               { label: "Active",                color: "bg-green-500/10 text-green-600 border-green-500/20",  dot: "bg-green-500" },
};

const ROLE_COLOR: Record<string, string> = {
  "Facilitator":                    "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Assessor":                       "bg-sky-500/10 text-sky-600 border-sky-500/20",
  "Moderator":                      "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Mentor":                         "bg-green-500/10 text-green-600 border-green-500/20",
  "L&D Support Officer":            "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Programme Manager":              "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Operations":                     "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Systems Admin":                  "bg-red-500/10 text-red-600 border-red-500/20",
  "Talent Manager":                 "bg-teal-500/10 text-teal-600 border-teal-500/20",
  "Skills Development Facilitator": "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  "Learning Material Developer":    "bg-rose-500/10 text-rose-600 border-rose-500/20",
  "Instructional Designer":         "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const AUDIT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  registered:             { label: "Registered",          color: "text-blue-500",   bg: "bg-blue-500/10" },
  approved:               { label: "Approved",             color: "text-green-500",  bg: "bg-green-500/10" },
  rejected:               { label: "Rejected",             color: "text-rose-500",   bg: "bg-rose-500/10" },
  documents_verified:     { label: "Docs Verified",        color: "text-sky-500",    bg: "bg-sky-500/10" },
  portal_access_granted:  { label: "Portal Access",        color: "text-violet-500", bg: "bg-violet-500/10" },
  profile_updated:        { label: "Profile Updated",      color: "text-orange-500", bg: "bg-orange-500/10" },
  deleted:                { label: "Deleted",              color: "text-rose-600",   bg: "bg-rose-500/10" },
  added_to_pool:          { label: "Added to Staff Pool",  color: "text-teal-500",   bg: "bg-teal-500/10" },
};

type TabKey = "repository" | "directory" | "audit";

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs";
  return (
    <div className={cn("rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0", sz)}>
      {initials}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffOnboarding() {
  const [showForm, setShowForm]               = useState(false);
  const [tab, setTab]                         = useState<TabKey>("repository");
  const [search, setSearch]                   = useState("");
  const [roleFilter, setRoleFilter]           = useState("all");
  const [verifyingStaff, setVerifyingStaff]   = useState<StaffRegistration | null>(null);
  const [rejectingStaff, setRejectingStaff]   = useState<StaffRegistration | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [managingRolesFor, setManagingRolesFor] = useState<string | null>(null);
  const [profileStaff, setProfileStaff]       = useState<StaffRegistration | null>(null);
  const [profileMode, setProfileMode]         = useState<"view" | "edit">("view");
  const [deletingStaff, setDeletingStaff]     = useState<StaffRegistration | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [managingCatalog, setManagingCatalog] = useState(false);

  const { user, roles } = useAuth();
  const isSuperOrSysAdmin = roles.some(r => ["super_admin", "systems_admin"].includes(r as string));
  const queryClient = useQueryClient();
  const { data: staffRegs, isLoading } = useStaffRegistrations();
  const { data: auditLog }             = useStaffAuditLog();
  const { data: roleAssignments = [] } = useStaffRoleAssignments();
  const assignRole  = useAssignStaffRole();
  const removeRole  = useRemoveStaffRole();

  const getRolesForStaff = (id: string) =>
    roleAssignments.filter(r => r.staff_registration_id === id).map(r => r.role_name);

  const pendingStaff   = useMemo(() => (staffRegs ?? []).filter(r => r.status === "pending_verification"), [staffRegs]);
  const approvedStaff  = useMemo(() => (staffRegs ?? []).filter(r => ["approved", "active"].includes(r.status)), [staffRegs]);
  const rejectedStaff  = useMemo(() => (staffRegs ?? []).filter(r => r.status === "rejected"), [staffRegs]);

  const repositoryStaff = useMemo(() =>
    (staffRegs ?? [])
      .filter(r => ["pending_verification", "rejected"].includes(r.status))
      .filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())),
    [staffRegs, search]);

  const directoryStaff = useMemo(() =>
    approvedStaff.filter(r => {
      const matchSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (roleFilter !== "all") {
        const staffRoles = getRolesForStaff(r.id);
        if (!staffRoles.includes(roleFilter) && r.role_requested !== roleFilter) return false;
      }
      return true;
    }),
    [approvedStaff, search, roleFilter, roleAssignments]);

  const approveStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_registrations").update({
        status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id || null,
        portal_access_granted: true, credentials_sent: true,
        document_verification_status: "verified",
        document_verified_at: new Date().toISOString(), document_verified_by: user?.id || null,
      }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff", entity_id: id, action: "approved", performed_by: user?.id || null,
        details: { verification_complete: true, portal_access: true, notification: "onboarding_email_sent" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
      toast.success("Staff approved — portal access granted.");
      setVerifyingStaff(null);
    },
  });

  const rejectStaff = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from("staff_registrations")
        .update({ status: "rejected", rejection_reason: reason }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff", entity_id: id, action: "rejected",
        performed_by: user?.id || null, details: { reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] });
      toast.success("Registration rejected.");
      setRejectingStaff(null);
      setRejectionReason("");
    },
  });

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    setDeleting(true);
    try {
      await (supabase as any).from("staff_role_assignments").delete().eq("staff_registration_id", deletingStaff.id);
      const { error } = await (supabase as any).from("staff_registrations").delete().eq("id", deletingStaff.id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff", entity_id: deletingStaff.id, action: "deleted",
        performed_by: user?.id || null,
        details: { full_name: deletingStaff.full_name, email: deletingStaff.email },
      });
      queryClient.invalidateQueries({ queryKey: ["staff_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["staff_role_assignments"] });
      toast.success(`${deletingStaff.full_name} removed.`);
      setDeletingStaff(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  // ── KPI items ──────────────────────────────────────────────────────────────

  const kpiItems = useMemo(() => {
    const total    = (staffRegs ?? []).length;
    const pending  = pendingStaff.length;
    const approved = approvedStaff.length;
    const withPortal = (staffRegs ?? []).filter(s => s.portal_access_granted).length;
    return [
      { label: "Total Staff",          value: total,    sub: `${rejectedStaff.length} rejected`,              trend: true,            icon: Briefcase,     iconBg: "bg-blue-500/10",   iconColor: "text-blue-500" },
      { label: "Pending Verification", value: pending,  sub: pending > 0 ? "action required" : "all clear",  trend: pending === 0,   icon: Clock,         iconBg: pending > 0 ? "bg-orange-500/10" : "bg-green-500/10", iconColor: pending > 0 ? "text-orange-500" : "text-green-500" },
      { label: "Approved & Active",    value: approved, sub: `${Math.round((approved / Math.max(total, 1)) * 100)}% approval rate`, trend: true, icon: CheckCircle2, iconBg: "bg-green-500/10",  iconColor: "text-green-500" },
      { label: "Portal Access",        value: withPortal, sub: "auto-granted on approval",                    trend: true,            icon: ShieldCheck,   iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ];
  }, [staffRegs, pendingStaff, approvedStaff, rejectedStaff]);

  const tabDefs = [
    { key: "repository" as const, label: "Staff Repository", icon: FolderOpen, badge: pendingStaff.length,  badgeColor: "bg-orange-500" },
    { key: "directory"  as const, label: "Staff Directory",  icon: Users,       badge: approvedStaff.length, badgeColor: "bg-green-500" },
    { key: "audit"      as const, label: "Audit Trail",      icon: History },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <WelcomeBanner
        subtitle="Staff registration, document verification, approvals, and portal access — all in one place."
        actions={
          <div className="flex items-center gap-2">
            {isSuperOrSysAdmin && (
              <Button variant="outline" size="sm" className="gap-2 text-sm" onClick={() => setManagingCatalog(true)}>
                <Settings2 className="w-4 h-4" /> Manage Roles
              </Button>
            )}
            <Button onClick={() => setShowForm(true)} className="gap-2 text-sm" size="sm">
              <UserPlus className="w-4 h-4" /> Register Staff
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      {isLoading
        ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        : <KpiGrid items={kpiItems} />
      }

      {/* Tab bar */}
      <FadeIn>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 px-4 pt-4 border-b border-border overflow-x-auto">
            {tabDefs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(""); setRoleFilter("all"); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                  tab === t.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={cn("text-[9px] font-bold text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center", t.badgeColor)}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ─────────────── REPOSITORY TAB ─────────────── */}
            {tab === "repository" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Pending Registrations</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {pendingStaff.length} awaiting verification · {rejectedStaff.length} rejected
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs w-52" />
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
                  </div>
                ) : repositoryStaff.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-green-500" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-1">No pending or rejected registrations.</p>
                    <Button size="sm" variant="outline" className="mt-4 gap-2 text-xs" onClick={() => setShowForm(true)}>
                      <UserPlus className="w-3.5 h-3.5" /> Register a staff member
                    </Button>
                  </div>
                ) : (
                  <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {repositoryStaff.map(s => {
                      const sc   = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending_verification;
                      const isPending = s.status === "pending_verification";
                      return (
                        <StaggerItem key={s.id}>
                          <div className={cn(
                            "rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow",
                            isPending ? "border-orange-500/20" : "border-rose-500/20"
                          )}>
                            {/* Card header */}
                            <div className="flex items-start gap-3">
                              <Avatar name={s.full_name} size="lg" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-foreground">{s.full_name}</p>
                                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", sc.color)}>
                                    {sc.label}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {s.email}
                                </p>
                                {s.phone && (
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {s.phone}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Role / Department / Date */}
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", ROLE_COLOR[s.role_requested] ?? "bg-primary/10 text-primary border-primary/20")}>
                                {s.role_requested}
                              </span>
                              {s.department && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Building2 className="w-3 h-3" /> {s.department}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(s.created_at), "d MMM yyyy")}
                              </span>
                            </div>

                            {/* Doc status */}
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40">
                              <span className="text-[11px] text-muted-foreground">Documents</span>
                              <span className={cn(
                                "text-[10px] font-semibold flex items-center gap-1",
                                s.document_verification_status === "verified" ? "text-green-600" : "text-orange-500"
                              )}>
                                {s.document_verification_status === "verified"
                                  ? <><CheckCircle2 className="w-3 h-3" /> Verified</>
                                  : <><Clock className="w-3 h-3" /> Pending</>}
                              </span>
                            </div>

                            {/* Rejection reason (if rejected) */}
                            {s.status === "rejected" && s.rejection_reason && (
                              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-rose-600">{s.rejection_reason}</p>
                              </div>
                            )}

                            {/* Actions */}
                            {isPending && (
                              <div className="flex items-center gap-2 pt-1">
                                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5 text-sky-600 border-sky-500/30 hover:bg-sky-500/10"
                                  onClick={() => setVerifyingStaff(s)}>
                                  <ClipboardCheck className="w-3.5 h-3.5" /> Verify Docs
                                </Button>
                                {s.document_verification_status === "verified" && (
                                  <Button size="sm" className="flex-1 h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => approveStaff.mutate(s.id)}
                                    disabled={approveStaff.isPending}>
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    {approveStaff.isPending ? "Approving…" : "Approve"}
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                  onClick={() => setRejectingStaff(s)}>
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </StaggerItem>
                      );
                    })}
                  </StaggerContainer>
                )}
              </div>
            )}

            {/* ─────────────── DIRECTORY TAB ─────────────── */}
            {tab === "directory" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Staff Directory</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {directoryStaff.length} approved staff member{directoryStaff.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {L_AND_D_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-8 text-xs w-48" />
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                ) : directoryStaff.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-blue-500" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">No staff members found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {roleFilter !== "all" ? "Try clearing the role filter." : "Approve registrations from the Staff Repository."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Staff Member</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Roles</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Docs</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Portal</th>
                          <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {directoryStaff.map(s => {
                          const staffRoles = getRolesForStaff(s.id);
                          const allRoles   = staffRoles.length > 0 ? staffRoles : [s.role_requested];
                          const isManaging = managingRolesFor === s.id;

                          return (
                            <tr key={s.id} className="hover:bg-secondary/20 transition-colors group">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <Avatar name={s.full_name} />
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{s.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1 items-center">
                                  {allRoles.map(role => (
                                    <span key={role} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", ROLE_COLOR[role] ?? "bg-primary/10 text-primary border-primary/20")}>
                                      {role}
                                    </span>
                                  ))}
                                  <Popover open={isManaging} onOpenChange={open => setManagingRolesFor(open ? s.id : null)}>
                                    <PopoverTrigger asChild>
                                      <button className="w-5 h-5 rounded-full bg-secondary hover:bg-primary/10 flex items-center justify-center transition-colors">
                                        <Plus className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-3" align="start">
                                      <p className="text-xs font-semibold text-foreground mb-2.5">Manage Roles</p>
                                      <div className="space-y-1 max-h-52 overflow-y-auto">
                                        {L_AND_D_ROLES.map(role => {
                                          const hasRole = staffRoles.includes(role);
                                          return (
                                            <label key={role} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-secondary/50 cursor-pointer">
                                              <Checkbox
                                                checked={hasRole}
                                                onCheckedChange={checked => {
                                                  if (checked) assignRole.mutate({ staff_registration_id: s.id, role_name: role });
                                                  else removeRole.mutate({ staff_registration_id: s.id, role_name: role });
                                                }}
                                              />
                                              <span className="text-xs text-foreground">{role}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                                {s.department || <span className="text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={cn("text-[10px] font-medium",
                                  s.document_verification_status === "verified" ? "text-green-600" : "text-orange-500"
                                )}>
                                  {s.document_verification_status === "verified" ? "✓ Verified" : "Pending"}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {s.portal_access_granted
                                  ? <span className="text-[10px] text-green-600 font-medium flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Active</span>
                                  : <span className="text-[10px] text-muted-foreground/40">—</span>}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem onClick={() => { setProfileStaff(s); setProfileMode("view"); }} className="text-xs gap-2">
                                      <Eye className="w-3.5 h-3.5" /> View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setProfileStaff(s); setProfileMode("edit"); }} className="text-xs gap-2">
                                      <Pencil className="w-3.5 h-3.5" /> Edit Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <AdminPasswordResetButton email={s.email} userName={s.full_name} variant="dropdown" />
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setDeletingStaff(s)} className="text-xs gap-2 text-destructive focus:text-destructive">
                                      <Trash2 className="w-3.5 h-3.5" /> Remove Staff
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

            {/* ─────────────── AUDIT TRAIL TAB ─────────────── */}
            {tab === "audit" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Audit Trail</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Immutable log of all staff registration, verification, and approval events.
                  </p>
                </div>

                {!auditLog || auditLog.length === 0 ? (
                  <div className="py-16 text-center">
                    <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative max-h-[560px] overflow-y-auto space-y-0">
                    {/* vertical timeline line */}
                    <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border/50" />
                    {auditLog.map((entry, idx) => {
                      const ac = AUDIT_CONFIG[entry.action] ?? { label: entry.action, color: "text-muted-foreground", bg: "bg-secondary" };
                      return (
                        <div key={entry.id} className="relative flex gap-4 pb-4 pl-1">
                          {/* dot */}
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ring-2 ring-background", ac.bg)}>
                            <span className={cn("text-[9px] font-bold", ac.color)}>●</span>
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[13px] font-semibold text-foreground">{ac.label}</p>
                                {entry.details && typeof entry.details === "object" && Object.keys(entry.details).length > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                    {Object.entries(entry.details)
                                      .filter(([, v]) => v && String(v).length < 60)
                                      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                                      .join(" · ")}
                                  </p>
                                )}
                              </div>
                              <time className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                {format(new Date(entry.created_at), "d MMM · HH:mm")}
                              </time>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </FadeIn>

      {/* ── Forms & Dialogs ── */}

      {showForm && (
        <StaffRegistrationForm
          onBack={() => setShowForm(false)}
          onClose={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["staff_registrations"] }); }}
        />
      )}

      {verifyingStaff && (
        <StaffVerificationPanel
          registrationId={verifyingStaff.id}
          staffName={verifyingStaff.full_name}
          onVerificationComplete={() => approveStaff.mutate(verifyingStaff.id)}
          onClose={() => setVerifyingStaff(null)}
        />
      )}

      <StaffProfileDialog
        staff={profileStaff}
        open={!!profileStaff}
        onClose={() => setProfileStaff(null)}
        mode={profileMode}
      />

      {/* Reject dialog */}
      <Dialog open={!!rejectingStaff} onOpenChange={v => { if (!v) { setRejectingStaff(null); setRejectionReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4 text-rose-500" /> Reject Registration
            </DialogTitle>
            <DialogDescription className="text-sm">
              Rejecting <strong>{rejectingStaff?.full_name}</strong>. Please provide a reason — this will be recorded in the audit log and shown to the manager.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (required)…"
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setRejectingStaff(null); setRejectionReason(""); }}>Cancel</Button>
            <Button variant="destructive" size="sm"
              disabled={!rejectionReason.trim() || rejectStaff.isPending}
              onClick={() => rejectingStaff && rejectStaff.mutate({ id: rejectingStaff.id, reason: rejectionReason })}>
              {rejectStaff.isPending ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Catalog Manager */}
      <StaffRoleCatalogManager
        open={managingCatalog}
        onOpenChange={setManagingCatalog}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingStaff} onOpenChange={v => { if (!v) setDeletingStaff(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4 text-destructive" /> Remove Staff Member
            </DialogTitle>
            <DialogDescription className="text-sm">
              Permanently remove <strong className="text-foreground">{deletingStaff?.full_name}</strong>? This will delete their registration, role assignments, and portal access. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeletingStaff(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteStaff} disabled={deleting} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Removing…" : "Remove Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
