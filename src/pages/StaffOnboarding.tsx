import { useState, useMemo } from "react";
import {
  Briefcase, Users, Clock, CheckCircle2, Search, ThumbsUp, ThumbsDown,
  ShieldCheck, History, FileText, XCircle, UserPlus, FolderOpen, ClipboardCheck,
  Plus, X, Filter, Eye, Pencil, Trash2, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

function useStaffRegistrations() {
  return useQuery({
    queryKey: ["staff_registrations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_registrations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as StaffRegistration[];
    },
  });
}

function useStaffAuditLog() {
  return useQuery({
    queryKey: ["onboarding_audit_log", "staff"],
    queryFn: async () => {
      const { data, error } = await supabase.from("onboarding_audit_log").select("*").eq("entity_type", "staff").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_verification: { label: "Pending Verification", color: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", color: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20" },
  active: { label: "Active", color: "bg-success/10 text-success border-success/20" },
};

const auditActionLabels: Record<string, string> = {
  registered: "Registered", approved: "Approved", rejected: "Rejected",
  documents_verified: "Docs Verified", portal_access_granted: "Portal Access",
};

type TabKey = "repository" | "directory" | "audit";

const roleColorMap: Record<string, string> = {
  "Facilitator": "bg-primary/10 text-primary border-primary/20",
  "Assessor": "bg-info/10 text-info border-info/20",
  "Moderator": "bg-accent/10 text-accent border-accent/20",
  "Mentor": "bg-success/10 text-success border-success/20",
  "Skills Development Facilitator": "bg-warning/10 text-warning border-warning/20",
  "Learning Material Developer": "bg-destructive/10 text-destructive border-destructive/20",
  "Instructional Designer": "bg-secondary text-foreground border-border",
};

export default function StaffOnboarding() {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<TabKey>("repository");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [verifyingStaff, setVerifyingStaff] = useState<StaffRegistration | null>(null);
  const [managingRolesFor, setManagingRolesFor] = useState<string | null>(null);
  const [profileStaff, setProfileStaff] = useState<StaffRegistration | null>(null);
  const [profileMode, setProfileMode] = useState<"view" | "edit">("view");
  const [deletingStaff, setDeletingStaff] = useState<StaffRegistration | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: staffRegs, isLoading } = useStaffRegistrations();
  const { data: auditLog } = useStaffAuditLog();
  const { data: roleAssignments = [] } = useStaffRoleAssignments();
  const assignRole = useAssignStaffRole();
  const removeRole = useRemoveStaffRole();

  const getRolesForStaff = (staffId: string) =>
    roleAssignments.filter(r => r.staff_registration_id === staffId).map(r => r.role_name);

  const pendingStaff = useMemo(() => (staffRegs ?? []).filter(r => r.status === "pending_verification"), [staffRegs]);
  const approvedStaff = useMemo(() => (staffRegs ?? []).filter(r => ["approved", "active"].includes(r.status)), [staffRegs]);
  const rejectedStaff = useMemo(() => (staffRegs ?? []).filter(r => r.status === "rejected"), [staffRegs]);

  // For repository tab: show pending + rejected
  const repositoryStaff = useMemo(() => {
    return (staffRegs ?? []).filter(r => ["pending_verification", "rejected"].includes(r.status)).filter(r => {
      const matchSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [staffRegs, search]);

  // For directory tab: show approved/active only, with role filter
  const directoryStaff = useMemo(() => {
    return approvedStaff.filter(r => {
      const matchSearch = r.full_name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (roleFilter !== "all") {
        const staffRoles = getRolesForStaff(r.id);
        // Also check the initial role_requested as fallback
        if (!staffRoles.includes(roleFilter) && r.role_requested !== roleFilter) return false;
      }
      return true;
    });
  }, [approvedStaff, search, roleFilter, roleAssignments]);

  const approveStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_registrations").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id || null, portal_access_granted: true, credentials_sent: true, document_verification_status: "verified", document_verified_at: new Date().toISOString(), document_verified_by: user?.id || null }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({ entity_type: "staff", entity_id: id, action: "approved", performed_by: user?.id || null, details: { verification_complete: true, portal_access: true, notification: "onboarding_email_sent" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff_registrations"] }); queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] }); toast.success("Staff verified & approved. Portal access granted. Onboarding email queued."); setReviewingId(null); setVerifyingStaff(null); },
  });

  const rejectStaff = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from("staff_registrations").update({ status: "rejected", rejection_reason: reason }).eq("id", id);
      if (error) throw error;
      await supabase.from("onboarding_audit_log").insert({ entity_type: "staff", entity_id: id, action: "rejected", performed_by: user?.id || null, details: { reason } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff_registrations"] }); queryClient.invalidateQueries({ queryKey: ["onboarding_audit_log"] }); toast.success("Staff registration rejected."); setReviewingId(null); setRejectionReason(""); },
  });

  const handleClose = () => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["staff_registrations"] }); };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    setDeleting(true);
    try {
      // Delete role assignments first
      await (supabase as any).from("staff_role_assignments").delete().eq("staff_registration_id", deletingStaff.id);
      // Delete staff registration
      const { error } = await (supabase as any).from("staff_registrations").delete().eq("id", deletingStaff.id);
      if (error) throw error;

      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff", entity_id: deletingStaff.id, action: "deleted",
        performed_by: user?.id || null, details: { full_name: deletingStaff.full_name, email: deletingStaff.email },
      });

      queryClient.invalidateQueries({ queryKey: ["staff_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["staff_role_assignments"] });
      toast.success(`${deletingStaff.full_name} has been removed.`);
      setDeletingStaff(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete staff member.");
    } finally {
      setDeleting(false);
    }
  };

  const stats = [
    { label: "Total Staff", value: String((staffRegs ?? []).length), change: `${pendingStaff.length} pending`, icon: Briefcase },
    { label: "Pending Verification", value: String(pendingStaff.length), change: pendingStaff.length > 3 ? "Action required" : "Under control", icon: Clock },
    { label: "Approved & Active", value: String(approvedStaff.length), change: `${Math.round((approvedStaff.length / Math.max((staffRegs ?? []).length, 1)) * 100)}% rate`, icon: CheckCircle2 },
    { label: "Portal Access", value: String((staffRegs ?? []).filter(s => s.portal_access_granted).length), change: "Auto-granted on approval", icon: ShieldCheck },
  ];

  const renderStaffRow = (s: StaffRegistration, showActions: boolean, isDirectory: boolean = false) => {
    const sc = statusConfig[s.status] || statusConfig.pending_verification;
    const isReviewing = reviewingId === s.id;
    const staffRoles = getRolesForStaff(s.id);
    const allRoles = staffRoles.length > 0 ? staffRoles : [s.role_requested];
    const isManagingRoles = managingRolesFor === s.id;
    return (
      <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-foreground">{s.full_name}</p>
          <p className="text-[10px] text-muted-foreground">{s.email}</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1 items-center">
            {allRoles.map(role => (
              <span key={role} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", roleColorMap[role] || "bg-primary/10 text-primary border-primary/20")}>
                {role}
              </span>
            ))}
            {isDirectory && (
              <Popover open={isManagingRoles} onOpenChange={open => setManagingRolesFor(open ? s.id : null)}>
                <PopoverTrigger asChild>
                  <button className="w-5 h-5 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <p className="text-xs font-semibold text-foreground mb-2">Manage L&D Roles</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {L_AND_D_ROLES.map(role => {
                      const hasRole = staffRoles.includes(role);
                      return (
                        <label key={role} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/50 cursor-pointer">
                          <Checkbox
                            checked={hasRole}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                assignRole.mutate({ staff_registration_id: s.id, role_name: role });
                              } else {
                                removeRole.mutate({ staff_registration_id: s.id, role_name: role });
                              }
                            }}
                          />
                          <span className="text-xs text-foreground">{role}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{s.department || "—"}</td>
        <td className="px-4 py-3">
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
            s.document_verification_status === "verified" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
          )}>
            {s.document_verification_status === "verified" ? "Verified" : "Pending"}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", sc.color)}>{sc.label}</span>
        </td>
        <td className="px-4 py-3">
          {s.portal_access_granted
            ? <span className="text-[10px] text-success flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Granted</span>
            : <span className="text-[10px] text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {/* Directory actions: View, Edit, Delete */}
          {isDirectory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
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
                  <Trash2 className="w-3.5 h-3.5" /> Delete Staff
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Repository actions: Verify, Approve, Reject */}
          {showActions && s.status === "pending_verification" && (
            <div className="flex items-center justify-end gap-1.5">
              {!isReviewing ? (
                 <>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-info hover:bg-info/10 gap-1" onClick={() => setVerifyingStaff(s)}>
                      <ClipboardCheck className="w-3 h-3" /> Verify
                    </Button>
                    {s.document_verification_status === "verified" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-success hover:bg-success/10 gap-1" onClick={() => approveStaff.mutate(s.id)}>
                        <ThumbsUp className="w-3 h-3" /> Approve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1" onClick={() => setReviewingId(s.id)}>
                      <ThumbsDown className="w-3 h-3" /> Reject
                    </Button>
                  </>
              ) : (
                <div className="flex items-center gap-2 min-w-[280px]">
                  <Textarea placeholder="Rejection reason (required)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="text-xs h-16 min-h-0" />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" disabled={!rejectionReason.trim()} onClick={() => rejectStaff.mutate({ id: s.id, reason: rejectionReason })}>Confirm</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => { setReviewingId(null); setRejectionReason(""); }}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {showActions && s.status === "rejected" && s.rejection_reason && (
            <span className="text-[10px] text-destructive flex items-center justify-end gap-1"><XCircle className="w-3 h-3" /> {s.rejection_reason}</span>
          )}
        </td>
      </tr>
    );
  };

  const tableHeader = (
    <thead>
      <tr className="border-b border-border bg-secondary/30">
        <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Staff Member</th>
        <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
        <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
        <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Docs</th>
        <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
        <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Portal</th>
        <th className="text-right px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Onboarding</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff registration, document verification, approvals, and portal access management.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-accent text-accent-foreground gap-2 text-xs">
          <UserPlus className="w-4 h-4" /> Register Staff
        </Button>
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
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
        {([
          { key: "repository" as const, label: "Staff Repository", icon: FolderOpen, badge: pendingStaff.length },
          { key: "directory" as const, label: "Staff Directory", icon: Users, badge: approvedStaff.length },
          { key: "audit" as const, label: "Audit Trail", icon: History },
        ]).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); setReviewingId(null); setRejectionReason(""); }}
            className={cn("px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
              tab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {"badge" in t && typeof t.badge === "number" && t.badge > 0 && (
              <span className={cn("ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full",
                t.key === "repository" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
              )}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Staff Repository — Pending Verification */}
      {tab === "repository" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FolderOpen className="w-4 h-4" /> Staff Repository — Pending Approval</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Staff registrations awaiting document verification and approval. Approve to grant portal access.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search pending staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-52 h-8 text-xs" />
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : repositoryStaff.length === 0 ? (
            <div className="p-12 text-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No pending staff registrations.</p>
              <p className="text-xs text-muted-foreground mt-1">All staff registrations have been processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeader}
                <tbody className="divide-y divide-border/50">
                  {repositoryStaff.map(s => renderStaffRow(s, true))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Staff Directory — Approved & Active */}
      {tab === "directory" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4" /> Staff Directory — Approved & Active</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Approved staff members with active portal access and role assignments.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <Filter className="w-3 h-3 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {L_AND_D_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search active staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-52 h-8 text-xs" />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading...</div>
          ) : directoryStaff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No approved staff members yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Approve pending registrations in the Staff Repository.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeader}
                <tbody className="divide-y divide-border/50">
                  {directoryStaff.map(s => renderStaffRow(s, false, true))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Trail */}
      {tab === "audit" && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><History className="w-4 h-4" /> Staff Onboarding Audit Trail</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Log of all staff registration, verification, and approval events.</p>
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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold bg-accent/10 text-accent">S</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{auditActionLabels[entry.action] || entry.action}</span>
                    {entry.details && typeof entry.details === "object" && Object.keys(entry.details).length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(" • ")}
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

      {showForm && <StaffRegistrationForm onBack={() => setShowForm(false)} onClose={handleClose} />}
      {verifyingStaff && (
        <StaffVerificationPanel
          registrationId={verifyingStaff.id}
          staffName={verifyingStaff.full_name}
          onVerificationComplete={() => approveStaff.mutate(verifyingStaff.id)}
          onClose={() => setVerifyingStaff(null)}
        />
      )}

      {/* Staff Profile View/Edit Dialog */}
      <StaffProfileDialog
        staff={profileStaff}
        open={!!profileStaff}
        onClose={() => setProfileStaff(null)}
        mode={profileMode}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingStaff} onOpenChange={v => { if (!v) setDeletingStaff(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Staff Member
            </DialogTitle>
            <DialogDescription className="text-sm">
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">{deletingStaff?.full_name}</span>?
              This will remove their registration, role assignments, and portal access. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeletingStaff(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteStaff} disabled={deleting} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
