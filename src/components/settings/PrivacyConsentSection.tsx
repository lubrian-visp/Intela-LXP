import { useState } from "react";
import { Shield, Info, Download, Clock, FileText, AlertTriangle, CheckCircle2, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyConsents, useUpdateConsent } from "@/hooks/useConsentRecords";
import { format } from "date-fns";

interface ConsentItem {
  id: string;
  label: string;
  description: string;
  category: "required" | "analytics" | "marketing" | "optional";
  enabled: boolean;
  grantedAt?: string;
  isLocked: boolean;
}

const defaultConsents: Omit<ConsentItem, "id" | "enabled" | "grantedAt">[] = [
  { label: "Essential data processing for platform functionality", description: "This consent is required and cannot be withdrawn", category: "required", isLocked: true },
  { label: "Agreement to privacy policy and data protection terms", description: "This consent is required and cannot be withdrawn", category: "required", isLocked: true },
  { label: "Agreement to terms of service", description: "This consent is required and cannot be withdrawn", category: "required", isLocked: true },
  { label: "Analytics and performance monitoring", description: "Help us improve by allowing anonymous usage analytics", category: "analytics", isLocked: false },
  { label: "Marketing communications and newsletters", description: "Receive updates about new features and programmes", category: "marketing", isLocked: false },
  { label: "Sharing data with approved third parties", description: "Allow data sharing with accreditation bodies", category: "optional", isLocked: false },
];

const popiaConsents: Omit<ConsentItem, "id" | "enabled" | "grantedAt">[] = [
  { label: "Collection of personal information (Section 11)", description: "Consent to collect personal data for legitimate platform purposes as defined by PoPIA", category: "required", isLocked: true },
  { label: "Processing for contract performance (Section 11(1)(b))", description: "Processing necessary for the performance of a contract to which the data subject is party", category: "required", isLocked: true },
  { label: "Cross-border data transfer (Section 72)", description: "Consent for personal data to be transferred to countries with adequate data protection", category: "optional", isLocked: false },
  { label: "Direct marketing communications (Section 69)", description: "Opt-in for direct marketing via email, SMS, or other channels", category: "marketing", isLocked: false },
  { label: "Special personal information processing (Section 26)", description: "Processing of race, health, biometric, or other special categories of information", category: "optional", isLocked: false },
  { label: "Automated decision-making (Section 71)", description: "Allow automated processing that may affect you, including profiling for skills matching", category: "analytics", isLocked: false },
];

const popiaRights = [
  { title: "Right of Access (Section 23)", description: "Request a copy of your personal information held by the platform", icon: Download },
  { title: "Right to Rectification (Section 24)", description: "Request correction or deletion of inaccurate personal information", icon: CheckCircle2 },
  { title: "Right to Object (Section 11(3)(a))", description: "Object to processing of your personal information on reasonable grounds", icon: AlertTriangle },
  { title: "Right to Complain (Section 74)", description: "Lodge a complaint with the Information Regulator if your rights are violated", icon: FileText },
];

const categoryStyles: Record<string, { bg: string; text: string }> = {
  required: { bg: "bg-destructive", text: "text-destructive-foreground" },
  analytics: { bg: "bg-accent", text: "text-accent-foreground" },
  marketing: { bg: "bg-primary", text: "text-primary-foreground" },
  optional: { bg: "bg-secondary", text: "text-secondary-foreground" },
};

function ConsentList({ items, consents, grantDates, onToggle }: {
  items: typeof defaultConsents;
  consents: Record<number, boolean>;
  grantDates: Record<number, string>;
  onToggle: (index: number, checked: boolean) => void;
}) {
  return (
    <div className="p-5 space-y-3">
      {items.map((consent, index) => {
        const style = categoryStyles[consent.category];
        return (
          <div
            key={index}
            className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{consent.label}</p>
                <Badge className={`${style.bg} ${style.text} text-[9px] px-2 py-0 h-5 capitalize`}>
                  {consent.category}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {consent.description}
              </p>
              {grantDates[index] && (
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Granted on {grantDates[index]}
                </p>
              )}
            </div>
            <Switch
              checked={consents[index] ?? false}
              onCheckedChange={(checked) => onToggle(index, checked)}
              disabled={consent.isLocked}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function PrivacyConsentSection() {
  const { data: settings } = usePlatformSettings("general");
  const { data: liveConsents = [], isLoading: consentsLoading } = useMyConsents();
  const updateConsent = useUpdateConsent();
  const [dsarOpen, setDsarOpen] = useState(false);

  const handleLiveToggle = async (purposeKey: string, checked: boolean) => {
    await updateConsent.mutateAsync({ purposeKey, consented: checked });
  };

  // Keep legacy local state for GDPR tab (international display only)
  const [gdprConsents, setGdprConsents] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: false, 4: false, 5: false });
  const [gdprDates, setGdprDates] = useState<Record<number, string>>({});
  const handleGdprToggle = (index: number, checked: boolean) => {
    if (defaultConsents[index].isLocked) return;
    setGdprConsents((prev) => ({ ...prev, [index]: checked }));
    if (checked) setGdprDates(prev => ({ ...prev, [index]: new Date().toLocaleDateString("en-GB") }));
    else setGdprDates(prev => { const c = { ...prev }; delete c[index]; return c; });
    toast({ title: checked ? "Consent granted" : "Consent withdrawn" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">Privacy & Consent Management</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Manage data protection consents across GDPR and PoPIA regulatory frameworks
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px] text-muted-foreground">GDPR</Badge>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">PoPIA</Badge>
          </div>
        </div>

        <div className="p-5">
          <Tabs defaultValue="popia">
            <TabsList className="bg-secondary/30 p-1 h-auto">
              <TabsTrigger value="popia" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <FileText className="w-3.5 h-3.5" /> PoPIA (South Africa)
              </TabsTrigger>
              <TabsTrigger value="gdpr" className="text-xs gap-1.5 data-[state=active]:bg-card">
                <Shield className="w-3.5 h-3.5" /> GDPR (International)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="popia" className="mt-4 space-y-4">
              {/* PoPIA info banner */}
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-foreground">Protection of Personal Information Act (PoPIA)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    South Africa's data protection law regulates how personal information is processed. The Information Regulator oversees compliance.
                  </p>
                </div>
              </div>

              {/* Live PoPIA consent toggles from DB */}
              {consentsLoading ? (
                <div className="flex items-center gap-2 p-4 text-muted-foreground text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your consent records…
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  {liveConsents.map(c => (
                    <div key={c.key} className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 hover:bg-secondary/10 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-medium text-foreground">{c.label}</p>
                          {c.required && <Badge className="text-[8px] bg-destructive/10 text-destructive border-0 shrink-0">Required</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{c.description}</p>
                        {c.consented && c.consented_at && (
                          <p className="text-[9px] text-success mt-1">
                            ✓ Granted {format(new Date(c.consented_at), "d MMM yyyy")}
                          </p>
                        )}
                        {!c.consented && c.withdrawn_at && (
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Withdrawn {format(new Date(c.withdrawn_at), "d MMM yyyy")}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={c.required ? true : c.consented}
                        disabled={c.required || updateConsent.isPending}
                        onCheckedChange={checked => handleLiveToggle(c.key, checked)}
                        aria-label={c.label}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* PoPIA Data Subject Rights */}
              <div className="border-t border-border/30 pt-4">
                <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-accent" /> Data Subject Rights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {popiaRights.map((right) => (
                    <div key={right.title} className="p-3 rounded-lg border border-border/50 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <right.icon className="w-3.5 h-3.5 text-accent" />
                        <p className="text-xs font-medium text-foreground">{right.title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{right.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setDsarOpen(true)}>
                  <Download className="w-3 h-3" /> Submit Data Request (DSAR)
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => window.open("mailto:privacy@intela.co.za")}>
                  <FileText className="w-3 h-3" /> Contact Information Officer
                </Button>
              </div>
              {/* Inline DSAR mini-form */}
              {dsarOpen && (
                <div className="mt-3 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Quick DSAR Submission
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Under POPIA Section 23, you may request access to, correction of, or deletion of your personal information.
                    We will respond within <strong>30 days</strong>.
                  </p>
                  <Button size="sm" className="text-xs gap-1.5" onClick={() => {
                    window.open("/admin/popia", "_blank");
                    setDsarOpen(false);
                  }}>
                    <CheckCircle2 className="w-3 h-3" /> Go to DSAR Portal →
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDsarOpen(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gdpr" className="mt-4 space-y-4">
              {/* GDPR info banner */}
              <div className="p-3 rounded-lg bg-info/5 border border-info/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">
                  Your privacy matters. You can withdraw optional consents at any time. Required consents are necessary for platform functionality.
                </p>
              </div>

              <ConsentList
                items={defaultConsents}
                consents={gdprConsents}
                grantDates={gdprDates}
                onToggle={handleGdprToggle}
              />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Download className="w-3 h-3" /> Download My Data
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Clock className="w-3 h-3" /> View Consent History
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
