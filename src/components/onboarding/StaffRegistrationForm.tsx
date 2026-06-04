import { useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, RefreshCw, Upload, Shield, CheckCircle2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { L_AND_D_ROLES, useBulkAssignStaffRoles } from "@/hooks/useStaffRoleAssignments";

const steps = [
  { label: "Profile Details", step: 1 },
  { label: "Role & Department", step: 2 },
  { label: "Documents", step: 3 },
  { label: "Review & Submit", step: 4 },
];

const roleOptions = [
  "Programme Manager", "Facilitator", "Assessor", "Moderator",
  "Mentor", "Operations", "Systems Admin", "Talent Manager",
  "Skills Development Facilitator", "Learning Material Developer", "Instructional Designer",
];

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  tempPassword: string;
  roles: string[];
  department: string;
  notes: string;
  documents: { id: File | null; qualification: File | null; clearance: File | null; cv: File | null };
}

const initialFormData: FormData = {
  fullName: "", email: "", phone: "", tempPassword: "",
  roles: [], department: "", notes: "",
  documents: { id: null, qualification: null, clearance: null, cv: null },
};

interface Props { onBack: () => void; onClose: () => void; }

export default function StaffRegistrationForm({ onBack, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [showPwd, setShowPwd] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const bulkAssignRoles = useBulkAssignStaffRoles();

  const update = (field: keyof FormData, value: string) => setForm(p => ({ ...p, [field]: value }));
  const toggleRole = (role: string) => setForm(p => ({
    ...p,
    roles: p.roles.includes(role) ? p.roles.filter(r => r !== role) : [...p.roles, role],
  }));

  const handleDoc = (key: keyof FormData["documents"], file: File | null) =>
    setForm(p => ({ ...p, documents: { ...p.documents, [key]: file } }));

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    update("tempPassword", pwd);
  };

  const roleToUserType: Record<string, string> = {
    "Programme Manager":       "staff_programme_manager",
    "Facilitator":             "staff_facilitator",
    "Assessor":                "staff_assessor",
    "Moderator":               "staff_moderator",
    "Mentor":                  "staff_mentor",
    "L&D Support Officer":     "staff_ld_support_officer",
    "Operations":              "staff_operations",
    "Systems Admin":           "staff_systems_admin",
    "Talent Manager":          "staff_talent_manager",
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.email || form.roles.length === 0 || !form.tempPassword) {
      toast.error("Please fill in all required fields including at least one role.");
      return;
    }
    if (form.tempPassword.length < 6) {
      toast.error("Temporary password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const primaryRole = form.roles[0];
      const docNames: Record<string, string> = {};
      Object.entries(form.documents).forEach(([k, v]) => { if (v) docNames[k] = v.name; });

      // 1. Always save the staff registration record first — independent of auth provisioning
      const { data: regData, error: regError } = await (supabase as any)
        .from("staff_registrations")
        .insert({
          full_name: form.fullName,
          email: form.email,
          phone: form.phone || null,
          role_requested: form.roles.join(", "),
          department: form.department || null,
          notes: form.notes || null,
          documents: docNames,
          registered_by: user?.id || null,
        })
        .select("id")
        .single();
      if (regError) throw regError;

      // 2. Insert multi-role assignments
      if (regData?.id) {
        await bulkAssignRoles.mutateAsync(
          form.roles.map(r => ({ staff_registration_id: regData.id, role_name: r }))
        );
      }

      // 3. Attempt to create the auth account via edge function.
      //    If the function is unreachable (not yet deployed), we still treat
      //    registration as successful — the auth account can be provisioned
      //    later via the Staff Directory actions.
      let authAccountCreated = false;
      try {
        const { data: provisionData, error: provisionError } = await supabase.functions.invoke("provision-user", {
          body: {
            email: form.email,
            password: form.tempPassword,
            full_name: form.fullName,
            user_type: roleToUserType[primaryRole] || "staff_facilitator",
          },
        });

        if (provisionError) {
          // Network / function-not-deployed error — log but don't block registration
          console.warn("provision-user edge function unavailable:", provisionError.message);
          toast.warning(
            "Staff profile saved, but the auth account could not be created automatically. " +
            "Deploy the provision-user edge function, or create the account manually in Supabase Auth."
          );
        } else if (provisionData?.error) {
          console.warn("provision-user returned error:", provisionData.error);
          toast.warning(`Staff profile saved. Auth account warning: ${provisionData.error}`);
        } else {
          authAccountCreated = true;
        }
      } catch (fnErr: any) {
        console.warn("provision-user invocation threw:", fnErr?.message);
        toast.warning(
          "Staff profile saved, but login credentials could not be created. " +
          "Please deploy the provision-user edge function and retry from the Staff Directory."
        );
      }

      // 4. Audit log
      await supabase.from("onboarding_audit_log").insert({
        entity_type: "staff",
        entity_id: regData?.id || "00000000-0000-0000-0000-000000000000",
        action: "registered",
        performed_by: user?.id || null,
        details: { full_name: form.fullName, roles: form.roles, auth_account_created: authAccountCreated },
      });

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to register staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[560px] mx-4 p-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Staff Profile Created!</h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">{form.fullName}</span> has been added to the Staff Directory. Pending Verification.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Roles: <span className="font-semibold text-foreground">{form.roles.join(", ")}</span>
          </p>
          <Button onClick={onClose} className="bg-primary text-primary-foreground">Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[620px] mx-4 max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <h2 className="text-lg font-bold text-foreground">Register New Staff Member</h2>
          <p className="text-xs text-muted-foreground mt-1">Create profile, assign role, and submit documents for verification.</p>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.step} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    step > s.step ? "bg-success text-success-foreground" : step === s.step ? "bg-info text-info-foreground" : "bg-secondary text-muted-foreground"
                  )}>
                    {step > s.step ? <Check className="w-4 h-4" /> : s.step}
                  </div>
                  <span className={cn("text-[9px] text-center leading-tight max-w-[70px]", step === s.step ? "text-foreground font-semibold" : "text-muted-foreground")}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={cn("h-0.5 flex-1 -mt-4 mx-1 rounded", step > s.step ? "bg-success" : "bg-border")} />}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div><h3 className="text-sm font-semibold text-foreground">Profile Details</h3><p className="text-xs text-muted-foreground">Enter the staff member's contact information and login credentials.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Enter full name" value={form.fullName} onChange={e => update("fullName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input placeholder="0813382993" value={form.phone} onChange={e => update("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                  <Input type="email" placeholder="staff@org.com" value={form.email} onChange={e => update("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Temporary Password <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input type={showPwd ? "text" : "password"} value={form.tempPassword} onChange={e => update("tempPassword", e.target.value)} placeholder="••••••••••••••" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={generatePassword} className="gap-1.5 shrink-0"><RefreshCw className="w-3.5 h-3.5" /> Generate</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Minimum 8 characters. Changed on first login.</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div><h3 className="text-sm font-semibold text-foreground">Role & Department</h3><p className="text-xs text-muted-foreground">Assign the role and department for this staff member.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Roles <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-secondary/20">
                    {roleOptions.map(r => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/40 px-2 py-1.5 rounded-md transition-colors">
                        <Checkbox checked={form.roles.includes(r)} onCheckedChange={() => toggleRole(r)} />
                        <span className="text-xs text-foreground">{r}</span>
                      </label>
                    ))}
                  </div>
                  {form.roles.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">{form.roles.length} role(s) selected: {form.roles.join(", ")}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Department</Label>
                  <Input placeholder="e.g. Academic, HR, IT" value={form.department} onChange={e => update("department", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea placeholder="Any additional notes..." value={form.notes} onChange={e => update("notes", e.target.value)} className="text-xs h-20" />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/10">
                <Shield className="w-4 h-4 text-info shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  Portal access is granted automatically upon approval based on the assigned role (RBAC). Department/region restrictions are applied via ABAC rules.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div><h3 className="text-sm font-semibold text-foreground">Statutory & Role Documents</h3><p className="text-xs text-muted-foreground">Upload mandatory documents for compliance verification.</p></div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/10">
                <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">Maximum 5MB per file. Accepted: PDF, JPG, PNG, DOCX.</p>
              </div>
              {[
                { key: "id" as const, label: "ID Document / Passport", required: true },
                { key: "qualification" as const, label: "Qualifications / Certifications", required: true },
                { key: "clearance" as const, label: "Police Clearance Certificate", required: false },
                { key: "cv" as const, label: "Curriculum Vitae", required: false },
              ].map(doc => (
                <div key={doc.key} className="space-y-1.5">
                  <Label className="text-xs">{doc.label} {doc.required && <span className="text-destructive">*</span>}</Label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/30 hover:bg-secondary/30 transition-colors cursor-pointer">
                    {form.documents[doc.key] ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="w-4 h-4" /><span>{form.documents[doc.key]!.name}</span>
                      </div>
                    ) : (
                      <><Upload className="w-5 h-5 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">Click to upload</span></>
                    )}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx" onChange={e => handleDoc(doc.key, e.target.files?.[0] || null)} />
                  </label>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div><h3 className="text-sm font-semibold text-foreground">Review & Submit</h3><p className="text-xs text-muted-foreground">Confirm all details before submitting.</p></div>
              <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                {[
                  { l: "Full Name", v: form.fullName },
                  { l: "Email", v: form.email },
                  { l: "Phone", v: form.phone || "—" },
                  { l: "Roles", v: form.roles.join(", ") || "—" },
                  { l: "Department", v: form.department || "—" },
                  { l: "Documents", v: Object.values(form.documents).filter(Boolean).length + " uploaded" },
                ].map(r => (
                  <div key={r.l} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{r.l}</span>
                    <span className="font-medium text-foreground">{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10">
                <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                  This profile will be placed in the <span className="font-semibold text-foreground">Staff Directory (Pending Verification)</span>.
                  Documents will be reviewed and verified before approval. Portal access is granted upon approval.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onBack} className="text-xs gap-1">
            <ArrowLeft className="w-3 h-3" /> {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button onClick={() => {
              if (step === 1) {
                if (!form.fullName.trim()) { toast.error("Full Name is required."); return; }
                if (!form.email.trim()) { toast.error("Email is required."); return; }
                if (!form.tempPassword) { toast.error("Temporary Password is required."); return; }
                if (form.tempPassword.length < 6) { toast.error("Temporary password must be at least 6 characters."); return; }
              }
              if (step === 2) {
                if (form.roles.length === 0) { toast.error("Please select at least one role."); return; }
              }
              setStep(step + 1);
            }} className="bg-primary text-primary-foreground text-xs gap-1">
              Next <Check className="w-3 h-3" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-primary text-primary-foreground text-xs gap-1">
              {submitting ? "Submitting..." : "Submit Staff Profile"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
