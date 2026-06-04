import { useState } from "react";
import { User, Mail, Phone, Briefcase, Building2, FileText, ShieldCheck, Calendar, Pencil, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStaffRoleAssignments, useAssignStaffRole, useRemoveStaffRole, L_AND_D_ROLES } from "@/hooks/useStaffRoleAssignments";

interface StaffRegistration {
  id: string; full_name: string; email: string; phone: string | null;
  role_requested: string; department: string | null; status: string;
  document_verification_status: string; rejection_reason: string | null;
  notes: string | null; portal_access_granted: boolean; credentials_sent: boolean;
  created_at: string; approved_at: string | null; documents: any;
}

interface Props {
  staff: StaffRegistration | null;
  open: boolean;
  onClose: () => void;
  mode: "view" | "edit";
}

const roleColorMap: Record<string, string> = {
  "Facilitator": "bg-primary/10 text-primary border-primary/20",
  "Assessor": "bg-info/10 text-info border-info/20",
  "Moderator": "bg-accent/10 text-accent border-accent/20",
  "Mentor": "bg-success/10 text-success border-success/20",
  "Skills Development Facilitator": "bg-warning/10 text-warning border-warning/20",
  "Learning Material Developer": "bg-destructive/10 text-destructive border-destructive/20",
  "Instructional Designer": "bg-secondary text-foreground border-border",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_verification: { label: "Pending Verification", color: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", color: "bg-success/10 text-success border-success/20" },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20" },
  active: { label: "Active", color: "bg-success/10 text-success border-success/20" },
};

export default function StaffProfileDialog({ staff, open, onClose, mode: initialMode }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: roleAssignments = [] } = useStaffRoleAssignments();
  const assignRole = useAssignStaffRole();
  const removeRole = useRemoveStaffRole();

  // Reset form when staff changes
  const resetForm = () => {
    if (staff) {
      setFullName(staff.full_name);
      setPhone(staff.phone || "");
      setDepartment(staff.department || "");
      setNotes(staff.notes || "");
    }
  };

  // Initialize on open
  if (staff && open && fullName === "" && mode === "edit") {
    resetForm();
  }

  if (!staff) return null;

  const staffRoles = roleAssignments.filter(r => r.staff_registration_id === staff.id).map(r => r.role_name);
  const allDisplayRoles = staffRoles.length > 0 ? staffRoles : staff.role_requested.split(", ").filter(Boolean);
  const sc = statusConfig[staff.status] || statusConfig.pending_verification;
  const docEntries = staff.documents && typeof staff.documents === "object" ? Object.entries(staff.documents) : [];

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const db = supabase as any;

      // 1. Update staff_registrations (DB trigger will sync → profiles + auth.users)
      const { error } = await db.from("staff_registrations").update({
        full_name: fullName.trim(),
        phone: phone || null,
        department: department || null,
        notes: notes || null,
      }).eq("id", staff.id);
      if (error) throw error;

      // 2. Also update profiles directly for instant UI feedback
      //    (trigger handles it too, but this ensures React Query cache is warm)
      const { data: poolMember } = await db
        .from("admin_pool_members")
        .select("user_id")
        .eq("staff_registration_id", staff.id)
        .maybeSingle();

      if (poolMember?.user_id) {
        await db.from("profiles")
          .update({ full_name: fullName.trim() })
          .eq("user_id", poolMember.user_id);
      }

      // 3. Audit log
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff",
        entity_id: staff.id,
        action: "profile_updated",
        performed_by: user?.id || null,
        details: {
          full_name: fullName.trim(),
          department,
          updated_fields: ["full_name", "phone", "department", "notes"],
        },
      });

      // 4. Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ["staff_registrations"] });
      queryClient.invalidateQueries({ queryKey: ["admin_pool_members"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-facilitator"] });
      // Force auth profile re-fetch so sidebar name updates immediately
      await supabase.auth.refreshSession();

      toast.success("Staff profile updated successfully.");
      setMode("view");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    resetForm();
    setMode("edit");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setMode(initialMode); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            {mode === "edit" ? "Edit Staff Profile" : "Staff Profile"}
          </DialogTitle>
        </DialogHeader>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-5 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {staff.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                {mode === "edit" ? (
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="text-lg font-bold h-9 mb-1" />
                ) : (
                  <h3 className="text-lg font-bold text-foreground">{staff.full_name}</h3>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {staff.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full border", sc.color)}>{sc.label}</span>
              {mode === "view" && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleStartEdit}>
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Department */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
            {mode === "edit" ? (
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            ) : (
              <p className="text-sm text-foreground">{staff.phone || "—"}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Department</Label>
            {mode === "edit" ? (
              <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" />
            ) : (
              <p className="text-sm text-foreground">{staff.department || "—"}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Roles Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Roles</h4>
          {mode === "edit" ? (
            <div className="grid grid-cols-2 gap-1.5 p-3 border border-border rounded-lg bg-secondary/10">
              {L_AND_D_ROLES.map(role => {
                const hasRole = staffRoles.includes(role);
                return (
                  <label key={role} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/40 cursor-pointer">
                    <Checkbox
                      checked={hasRole}
                      onCheckedChange={(checked) => {
                        if (checked) assignRole.mutate({ staff_registration_id: staff.id, role_name: role });
                        else removeRole.mutate({ staff_registration_id: staff.id, role_name: role });
                      }}
                    />
                    <span className="text-xs text-foreground">{role}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allDisplayRoles.map(role => (
                <span key={role} className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", roleColorMap[role] || "bg-primary/10 text-primary border-primary/20")}>
                  {role}
                </span>
              ))}
              {allDisplayRoles.length === 0 && <p className="text-xs text-muted-foreground">No roles assigned.</p>}
            </div>
          )}
        </div>

        <Separator />

        {/* Verification & Access */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Document Status</Label>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border inline-block",
              staff.document_verification_status === "verified" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
            )}>
              {staff.document_verification_status === "verified" ? "Verified" : "Pending"}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Portal Access</Label>
            {staff.portal_access_granted
              ? <span className="text-xs text-success flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Granted</span>
              : <span className="text-xs text-muted-foreground">Not granted</span>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Credentials Sent</Label>
            <span className="text-xs text-foreground">{staff.credentials_sent ? "Yes" : "No"}</span>
          </div>
        </div>

        {/* Documents */}
        {docEntries.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3" /> Uploaded Documents</h4>
              <div className="space-y-1">
                {docEntries.map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/20 text-xs">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}:</span>
                    <span className="text-foreground font-medium truncate">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          {mode === "edit" ? (
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." className="text-xs h-20" />
          ) : (
            <p className="text-sm text-foreground">{staff.notes || "—"}</p>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Registered: {new Date(staff.created_at).toLocaleDateString("en-ZA")}</span>
          {staff.approved_at && <span>Approved: {new Date(staff.approved_at).toLocaleDateString("en-ZA")}</span>}
        </div>

        {/* Footer Actions */}
        {mode === "edit" && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setMode("view")} className="text-xs gap-1">
              <X className="w-3 h-3" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs gap-1 bg-primary text-primary-foreground">
              <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
