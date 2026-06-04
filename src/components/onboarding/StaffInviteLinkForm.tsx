import { useState } from "react";
import { ArrowLeft, Send, Copy, CheckCircle2, Clock, Link2, Mail, QrCode } from "lucide-react";
import { useProgrammesList } from "@/hooks/useProgrammesList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function StaffInviteLinkForm({ onBack, onClose }: Props) {
  const { toast } = useToast();
  const { data: programmes = [], isLoading: programmesLoading } = useProgrammesList();
  const [step, setStep] = useState<"form" | "generated">("form");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    programme: "",
    expiresIn: "48",
  });
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleGenerate = () => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const link = `${window.location.origin}/register/invite/${token}`;
    setGeneratedLink(link);
    setStep("generated");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ title: "Link copied!", description: "Invite link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = () => {
    toast({ title: "Invite sent!", description: `Invitation email sent to ${formData.email}.` });
  };

  if (step === "generated") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[520px] mx-4 animate-slide-up">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Invite Link Generated</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
          </div>

          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Invite ready for {formData.fullName}</h3>
              <p className="text-xs text-muted-foreground mt-1">{formData.programme}</p>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label className="text-xs">Secure Registration Link</Label>
              <div className="flex gap-2">
                <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2.5 text-xs font-mono text-foreground break-all border border-border">
                  {generatedLink}
                </div>
                <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</span>
                <span className="font-medium text-foreground">{formData.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Expires in</span>
                <span className="font-medium text-foreground">{formData.expiresIn} hours</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><Link2 className="w-3 h-3" /> Usage</span>
                <span className="font-medium text-foreground">Single-use</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 text-xs" onClick={handleSendEmail}>
                <Mail className="w-3.5 h-3.5" /> Send via Email
              </Button>
              <Button variant="outline" className="flex-1 gap-2 text-xs" disabled>
                <QrCode className="w-3.5 h-3.5" /> Generate QR Code
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              The learner will complete their profile, upload documents, and set a password using this link.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end">
            <Button size="sm" onClick={onClose} className="bg-primary text-primary-foreground text-xs">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[520px] mx-4 animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Options
            </button>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-info/10">
                <Send className="w-4 h-4 text-info" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Send Invite Link</h2>
            </div>
            <p className="text-xs text-muted-foreground">Capture minimal details and generate a secure invite link for the learner to self-complete registration.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter learner's name" value={formData.fullName} onChange={(e) => update("fullName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="learner@email.com" value={formData.email} onChange={(e) => update("email", e.target.value)} />
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
            <div className="space-y-1.5">
              <Label className="text-xs">Link Expiry</Label>
              <Select value={formData.expiresIn} onValueChange={(v) => update("expiresIn", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">The invite link will expire after this period. It can only be used once.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs gap-1">
            <ArrowLeft className="w-3 h-3" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!formData.fullName || !formData.email || !formData.programme}
            className="bg-info text-info-foreground gap-1.5 text-xs"
          >
            <Link2 className="w-3.5 h-3.5" /> Generate Invite Link
          </Button>
        </div>
      </div>
    </div>
  );
}
