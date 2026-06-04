import { useState } from "react";
import { ArrowLeft, Zap, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { useProgrammesList } from "@/hooks/useProgrammesList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function SuperAdminOverrideForm({ onBack, onClose }: Props) {
  const { toast } = useToast();
  const { data: programmes = [], isLoading: programmesLoading } = useProgrammesList();
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    programme: "",
    cohort: "",
    reason: "",
  });

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const learnerNumber = `LRN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const handleSubmit = () => {
    toast({ title: "Learner enrolled instantly", description: `${formData.fullName} has been enrolled via Super Admin Override.` });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[480px] mx-4 p-8 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Learner Enrolled Instantly</h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-semibold text-foreground">{formData.fullName}</span> has been enrolled via Super Admin Override.
          </p>
          <p className="text-xs text-muted-foreground mb-1">Programme: <span className="font-medium text-foreground">{formData.programme}</span></p>
          <p className="text-xs text-muted-foreground mb-4">Learner Number: <span className="font-mono font-semibold text-foreground">{learnerNumber}</span></p>
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 mb-6">
            <p className="text-[10px] text-warning flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> All validation and approval steps were bypassed. This action has been logged.
            </p>
          </div>
          <Button onClick={onClose} className="bg-primary text-primary-foreground">Done</Button>
        </div>
      </div>
    );
  }

  const canSubmit = formData.fullName && formData.email && formData.programme && formData.reason && confirmed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[520px] mx-4 max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Options
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warning Banner */}
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent/10 shrink-0">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-accent">Super Admin Override</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Bypass registration review and instantly enroll a learner. This action is restricted to Super Admin only.</p>
              <div className="flex items-center gap-1.5 mt-2 text-warning">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Skips all validation and approval steps. Use with caution.</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                <Input placeholder="Enter learner's name" value={formData.fullName} onChange={(e) => update("fullName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="learner@email.com" value={formData.email} onChange={(e) => update("email", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Cohort (optional)</Label>
                <Select value={formData.cohort} onValueChange={(v) => update("cohort", v)}>
                  <SelectTrigger><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-assign to next available</SelectItem>
                    <SelectItem value="DS-2025-A">DS-2025-A</SelectItem>
                    <SelectItem value="SD-2025-A">SD-2025-A</SelectItem>
                    <SelectItem value="BA-2025-B">BA-2025-B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Override <span className="text-destructive">*</span></Label>
              <textarea
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20"
                placeholder="Provide justification for bypassing the standard registration process..."
                value={formData.reason}
                onChange={(e) => update("reason", e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">This reason will be recorded in the audit trail.</p>
            </div>

            {/* What gets skipped */}
            <div className="bg-secondary/30 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-foreground mb-2">Steps Being Bypassed</h4>
              <div className="space-y-1.5">
                {[
                  "Identity & demographics verification",
                  "Supporting document upload & validation",
                  "Manager/sponsor approval workflow",
                  "PoPIA consent collection",
                  "Temporary password setup (auto-generated)",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">I confirm this override action</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    I understand that this bypasses all validation, approval, and compliance steps. This action will be logged with my admin credentials and the reason provided above.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs gap-1">
            <ArrowLeft className="w-3 h-3" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-accent text-accent-foreground gap-1.5 text-xs"
          >
            <Zap className="w-3.5 h-3.5" /> Enroll Instantly
          </Button>
        </div>
      </div>
    </div>
  );
}
