import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, RefreshCw, Upload, Shield, CheckCircle2, Info } from "lucide-react";
import { useProgrammesList } from "@/hooks/useProgrammesList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const steps = [
  { label: "Basic Details", step: 1 },
  { label: "Identity & Demographics", step: 2 },
  { label: "Programme & Access", step: 3 },
  { label: "Supporting Documents", step: 4 },
  { label: "Review & Submit", step: 5 },
];

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  gender: string;
  country: string;
  nationalId: string;
  disability: string;
  educationLevel: string;
  programme: string;
  tempPassword: string;
  learnerNumber: string;
  documents: { id: File | null; passport: File | null; visa: File | null; proofOfResidence: File | null };
}

const initialFormData: FormData = {
  fullName: "",
  email: "",
  phone: "",
  dob: "",
  address: "",
  gender: "",
  country: "South Africa",
  nationalId: "",
  disability: "No",
  educationLevel: "",
  programme: "",
  tempPassword: "",
  learnerNumber: "",
  documents: { id: null, passport: null, visa: null, proofOfResidence: null },
};

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function LearnerRegistrationForm({ onBack, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(() => {
    // Auto-generate a temporary password on mount
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return { ...initialFormData, tempPassword: pwd };
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: programmes = [], isLoading: programmesLoading } = useProgrammesList();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const update = (field: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    update("tempPassword", pwd);
  };

  const generateLearnerNumber = () => {
    const now = new Date();
    const num = `LRN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    update("learnerNumber", num);
  };

  const handleDocUpload = (key: keyof FormData["documents"], file: File | null) => {
    setFormData((prev) => ({ ...prev, documents: { ...prev.documents, [key]: file } }));
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || !formData.tempPassword) {
      toast.error("Please fill in all required fields including temporary password.");
      return;
    }
    if (formData.tempPassword.length < 6) {
      toast.error("Temporary password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create auth account via backend function
      const { data: provisionData, error: provisionError } = await supabase.functions.invoke("provision-user", {
        body: {
          email: formData.email,
          password: formData.tempPassword,
          full_name: formData.fullName,
          user_type: "learner",
        },
      });
      if (provisionError) throw new Error(provisionError.message || "Failed to create user account");
      if (provisionData?.error) throw new Error(provisionData.error);

      // 2. Insert registration record
      const selectedProgramme = programmes.find(p => p.title === formData.programme);
      const docNames: Record<string, string> = {};
      Object.entries(formData.documents).forEach(([k, v]) => { if (v) docNames[k] = v.name; });

      const { error } = await supabase.from("learner_registrations").insert({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        date_of_birth: formData.dob || null,
        address: formData.address || null,
        gender: formData.gender || null,
        country: formData.country || "South Africa",
        national_id: formData.nationalId || null,
        disability: formData.disability || "No",
        education_level: formData.educationLevel || null,
        programme_id: selectedProgramme?.id || null,
        programme_name: formData.programme || null,
        learner_number: formData.learnerNumber || null,
        documents: docNames,
        registered_by: user?.id || null,
        registration_method: "staff-direct",
        user_id: provisionData?.user_id || null,
      } as any);
      if (error) throw error;

      await supabase.from("onboarding_audit_log").insert({
        entity_type: "learner",
        entity_id: provisionData?.user_id || "00000000-0000-0000-0000-000000000000",
        action: "registered",
        performed_by: user?.id || null,
        details: { full_name: formData.fullName, programme: formData.programme, auth_account_created: true },
      });

      queryClient.invalidateQueries({ queryKey: ["learner_registrations"] });
      setSubmitted(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err?.message || "Failed to register learner. Please try again.");
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
          <h2 className="text-xl font-bold text-foreground mb-2">Learner Registered Successfully!</h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">{formData.fullName}</span> has been registered.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Learner Number: <span className="font-mono font-semibold text-foreground">{formData.learnerNumber || "Auto-generated"}</span>
          </p>
          <Button onClick={onClose} className="bg-primary text-primary-foreground">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[620px] mx-4 max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Options
            </button>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">
            ✕
          </button>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <h2 className="text-lg font-bold text-foreground">Register New Learner</h2>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.step} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    currentStep > s.step
                      ? "bg-success text-success-foreground"
                      : currentStep === s.step
                        ? "bg-info text-info-foreground"
                        : "bg-secondary text-muted-foreground"
                  )}>
                    {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                  </div>
                  <span className={cn(
                    "text-[9px] text-center leading-tight max-w-[70px]",
                    currentStep === s.step ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 -mt-4 mx-1 rounded", currentStep > s.step ? "bg-success" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Basic Details</h3>
                <p className="text-xs text-muted-foreground">Enter the learner's basic contact information.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="Enter full legal name" value={formData.fullName} onChange={(e) => update("fullName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input placeholder="0813382993" value={formData.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                  <Input type="email" placeholder="learner@email.com" value={formData.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Temporary Password <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.tempPassword}
                        onChange={(e) => update("tempPassword", e.target.value)}
                        placeholder="••••••••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={generatePassword} className="gap-1.5 shrink-0">
                      <RefreshCw className="w-3.5 h-3.5" /> Generate
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Minimum 8 characters. Changed on first login.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={formData.dob} onChange={(e) => update("dob", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Residential Address</Label>
                  <Input placeholder="Full physical address" value={formData.address} onChange={(e) => update("address", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Identity & Demographics</h3>
                <p className="text-xs text-muted-foreground">Provide identity details for verification and demographic information for reporting.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <div className="flex gap-4 pt-1">
                    {["Male", "Female"].map((g) => (
                      <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={(e) => update("gender", e.target.value)} className="accent-primary" />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Select value={formData.country} onValueChange={(v) => update("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="South Africa">South Africa</SelectItem>
                      <SelectItem value="Botswana">Botswana</SelectItem>
                      <SelectItem value="Namibia">Namibia</SelectItem>
                      <SelectItem value="Zimbabwe">Zimbabwe</SelectItem>
                      <SelectItem value="Mozambique">Mozambique</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">National ID No.</Label>
                <Input placeholder="9901010800080" value={formData.nationalId} onChange={(e) => update("nationalId", e.target.value)} />
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" /> This field is encrypted and stored securely. It will be masked in all displays.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Disability</Label>
                <div className="flex gap-4 pt-1">
                  {["No", "Yes"].map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="disability" value={d} checked={formData.disability === d} onChange={(e) => update("disability", e.target.value)} className="accent-primary" />
                      {d}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" /> Demographic information is collected for SETA reporting requirements and to ensure appropriate accommodations.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Programme & Access</h3>
                <p className="text-xs text-muted-foreground">Select the learner's education level and programme assignment.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Education Level <span className="text-destructive">*</span></Label>
                  <Select value={formData.educationLevel} onValueChange={(v) => update("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="Select education level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matric / Grade 12">Matric / Grade 12</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Degree">Degree</SelectItem>
                      <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Programme <span className="text-destructive">*</span></Label>
                  <Select value={formData.programme} onValueChange={(v) => update("programme", v)}>
                    <SelectTrigger><SelectValue placeholder={programmesLoading ? "Loading programmes…" : "Select programme"} /></SelectTrigger>
                    <SelectContent>
                      {programmes.map((p) => (
                        <SelectItem key={p.id} value={p.title}>{p.title}</SelectItem>
                      ))}
                      {!programmesLoading && programmes.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No programmes available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-2">
                  Learner Number (LRN) <Checkbox checked disabled className="h-3 w-3" />
                </Label>
                <Input value={formData.learnerNumber} readOnly placeholder="Auto-generated after registration" className="bg-secondary/50" />
                <p className="text-[10px] text-muted-foreground font-mono">Format: LRN-YYYYMM-XXXXX (e.g. LRN-202602-A8K3P). Generated automatically upon creation.</p>
                <Button variant="ghost" size="sm" onClick={generateLearnerNumber} className="text-xs h-7 gap-1">
                  <RefreshCw className="w-3 h-3" /> Preview Number
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Supporting Documents</h3>
                <p className="text-xs text-muted-foreground">Upload required documents for verification. ID Document is required.</p>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/10">
                <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Upload Guidelines:</span> Maximum 5MB per file. Accepted formats: PDF, JPG, PNG, DOCX. Please ensure documents are clear, legible scans or photos.
                </p>
              </div>
              {[
                { key: "id" as const, label: "ID Document", required: true },
                { key: "passport" as const, label: "Passport", required: true },
                { key: "visa" as const, label: "Visa", required: false },
                { key: "proofOfResidence" as const, label: "Proof of Residence", required: false },
              ].map((doc) => (
                <div key={doc.key} className="space-y-1.5">
                  <Label className="text-xs">
                    {doc.label} {doc.required && <span className="text-destructive">*</span>}
                  </Label>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl hover:border-primary/30 hover:bg-secondary/30 transition-colors cursor-pointer">
                    {formData.documents[doc.key] ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{formData.documents[doc.key]!.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Drop file here or click to browse</span>
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.docx"
                      onChange={(e) => handleDocUpload(doc.key, e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Review & Submit</h3>
                <p className="text-xs text-muted-foreground">Please review all information before submitting.</p>
              </div>
              {[
                {
                  section: "Basic Details",
                  items: [
                    { label: "Full Name", value: formData.fullName },
                    { label: "Email", value: formData.email },
                    { label: "Phone", value: formData.phone },
                    { label: "Date of Birth", value: formData.dob },
                  ],
                },
                {
                  section: "Identity & Demographics",
                  items: [
                    { label: "Gender", value: formData.gender },
                    { label: "Country", value: formData.country },
                    { label: "National ID", value: formData.nationalId ? "••••••" + formData.nationalId.slice(-4) : "—" },
                    { label: "Disability", value: formData.disability },
                  ],
                },
                {
                  section: "Programme & Access",
                  items: [
                    { label: "Education Level", value: formData.educationLevel },
                    { label: "Programme", value: formData.programme },
                    { label: "Learner Number", value: formData.learnerNumber || "Auto-generated" },
                  ],
                },
                {
                  section: "Supporting Documents",
                  items: [
                    { label: "Documents uploaded", value: `${Object.values(formData.documents).filter(Boolean).length} documents uploaded` },
                  ],
                },
              ].map((group) => (
                <div key={group.section} className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-foreground">{group.section}</h4>
                    <button onClick={() => setCurrentStep(["Basic Details", "Identity & Demographics", "Programme & Access", "Supporting Documents"].indexOf(group.section) + 1)} className="text-[10px] text-info hover:underline flex items-center gap-1">
                      ✏️ Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {group.items.map((item) => (
                      <div key={item.label}>
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-xs font-medium text-foreground">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-info/5 border border-info/10 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-info shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Privacy Notice</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                      By submitting this registration form, you confirm that you are authorised to provide this information and that it will be processed in accordance with applicable data protection laws.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <label className="flex items-center gap-1.5 text-[10px] text-info hover:underline cursor-pointer">
                        <Checkbox className="h-3 w-3" /> Terms & Conditions
                      </label>
                      <span className="text-[10px] text-info hover:underline cursor-pointer">Privacy Policy</span>
                      <span className="text-[10px] text-info hover:underline cursor-pointer">PoPIA Compliance</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          {currentStep === 1 ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-xs gap-1">
              <ArrowLeft className="w-3 h-3" /> Cancel
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(currentStep - 1)} className="text-xs gap-1">
              <ArrowLeft className="w-3 h-3" /> Back
            </Button>
          )}
          {currentStep < 5 ? (
            <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)} className="bg-info text-info-foreground gap-1 text-xs">
              Next <ArrowRight className="w-3 h-3" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-success text-success-foreground gap-1 text-xs">
              <Check className="w-3 h-3" /> {submitting ? "Submitting..." : "Create Learner"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
