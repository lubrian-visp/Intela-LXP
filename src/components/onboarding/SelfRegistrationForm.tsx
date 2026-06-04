import { useState } from "react";
import { ArrowLeft, Globe, Copy, CheckCircle2, Link2, QrCode, Settings2, Eye, ExternalLink } from "lucide-react";
import { useProgrammesList } from "@/hooks/useProgrammesList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  onBack: () => void;
  onClose: () => void;
}

export default function SelfRegistrationForm({ onBack, onClose }: Props) {
  const { toast } = useToast();
  const { data: programmes = [], isLoading: programmesLoading } = useProgrammesList();
  const [step, setStep] = useState<"config" | "generated">("config");
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    programme: "",
    expiresIn: "never",
    maxRegistrations: "",
    requireApproval: true,
    collectDocuments: true,
    customMessage: "",
  });
  const [generatedLink, setGeneratedLink] = useState("");

  const updateConfig = (field: string, value: string | boolean) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  const handleGenerate = () => {
    const slug = Math.random().toString(36).substring(2, 10);
    setGeneratedLink(`${window.location.origin}/register/public/${slug}`);
    setStep("generated");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ title: "Link copied!", description: "Public registration link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === "generated") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[560px] mx-4 animate-slide-up">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Public Registration Link</h2>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
          </div>

          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <Globe className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Registration Form Ready</h3>
              <p className="text-xs text-muted-foreground mt-1">{config.programme}</p>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label className="text-xs">Shareable Link</Label>
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

            {/* QR Code */}
            <div className="space-y-2">
              <Label className="text-xs">QR Code</Label>
              <div className="bg-secondary/30 rounded-xl p-6 flex flex-col items-center gap-3 border border-border">
                <div className="w-40 h-40 bg-card rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                  {/* Mock QR Code pattern */}
                  <div className="grid grid-cols-7 gap-[3px]">
                    {Array.from({ length: 49 }).map((_, i) => {
                      const row = Math.floor(i / 7);
                      const col = i % 7;
                      const isCorner = (row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3);
                      const isRandom = Math.random() > 0.5;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "w-4 h-4 rounded-sm",
                            isCorner || isRandom ? "bg-foreground" : "bg-transparent"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <Copy className="w-3 h-3" /> Copy QR
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <ExternalLink className="w-3 h-3" /> Download PNG
                  </Button>
                </div>
              </div>
            </div>

            {/* Config Summary */}
            <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-semibold text-foreground mb-2">Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium text-foreground">{config.expiresIn === "never" ? "Never" : `${config.expiresIn} hours`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Registrations</p>
                  <p className="font-medium text-foreground">{config.maxRegistrations || "Unlimited"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approval Required</p>
                  <p className="font-medium text-foreground">{config.requireApproval ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Document Upload</p>
                  <p className="font-medium text-foreground">{config.collectDocuments ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("config")} className="text-xs gap-1">
              <Settings2 className="w-3 h-3" /> Edit Settings
            </Button>
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
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[520px] mx-4 max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Options
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-success/10">
                <Globe className="w-4 h-4 text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Self-Registration Form</h2>
            </div>
            <p className="text-xs text-muted-foreground">Configure and generate a public registration link or QR code for learners to register themselves.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Programme <span className="text-destructive">*</span></Label>
              <Select value={config.programme} onValueChange={(v) => updateConfig("programme", v)}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Link Expiry</Label>
                <Select value={config.expiresIn} onValueChange={(v) => updateConfig("expiresIn", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Registrations</Label>
                <Input type="number" placeholder="Unlimited" value={config.maxRegistrations} onChange={(e) => updateConfig("maxRegistrations", e.target.value)} />
              </div>
            </div>

            <div className="space-y-3 bg-secondary/30 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-foreground">Form Settings</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Require Admin Approval</p>
                  <p className="text-[10px] text-muted-foreground">Registrations need admin approval before activation</p>
                </div>
                <Switch checked={config.requireApproval} onCheckedChange={(v) => updateConfig("requireApproval", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Collect Supporting Documents</p>
                  <p className="text-[10px] text-muted-foreground">Ask learners to upload ID, passport, proof of residence</p>
                </div>
                <Switch checked={config.collectDocuments} onCheckedChange={(v) => updateConfig("collectDocuments", v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Custom Welcome Message (optional)</Label>
              <textarea
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20"
                placeholder="Welcome! Please complete your registration to join the programme..."
                value={config.customMessage}
                onChange={(e) => updateConfig("customMessage", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs gap-1">
            <ArrowLeft className="w-3 h-3" /> Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" disabled>
              <Eye className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={!config.programme}
              className="bg-success text-success-foreground gap-1.5 text-xs"
            >
              <Link2 className="w-3.5 h-3.5" /> Generate Link & QR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
