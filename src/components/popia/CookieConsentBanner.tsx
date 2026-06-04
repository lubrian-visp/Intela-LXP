import { useState } from "react";
import { Shield, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const consentPurposes = [
  { id: "essential", label: "Essential Cookies", description: "Required for the platform to function. Cannot be disabled.", required: true },
  { id: "analytics", label: "Analytics & Performance", description: "Help us understand how you use the platform to improve your experience.", required: false },
  { id: "marketing", label: "Marketing Communications", description: "Allow us to send you relevant programme updates and opportunities.", required: false },
  { id: "thirdparty", label: "Third-Party Sharing", description: "Share progress data with your sponsor/employer for reporting purposes.", required: false },
  { id: "profiling", label: "Automated Profiling", description: "Personalised learning recommendations based on your activity.", required: false },
];

interface CookieConsentBannerProps {
  onAcceptAll?: () => void;
  onSavePreferences?: (consents: Record<string, boolean>) => void;
  onDeclineAll?: () => void;
}

export default function CookieConsentBanner({ onAcceptAll, onSavePreferences, onDeclineAll }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [consents, setConsents] = useState<Record<string, boolean>>(
    Object.fromEntries(consentPurposes.map(p => [p.id, p.required]))
  );

  if (!visible) return null;

  const handleAcceptAll = () => {
    const all = Object.fromEntries(consentPurposes.map(p => [p.id, true]));
    setConsents(all);
    onAcceptAll?.();
    setVisible(false);
  };

  const handleDeclineAll = () => {
    const minimal = Object.fromEntries(consentPurposes.map(p => [p.id, p.required]));
    setConsents(minimal);
    onDeclineAll?.();
    setVisible(false);
  };

  const handleSave = () => {
    onSavePreferences?.(consents);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-slide-up">
      <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-lg border border-border p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Your Privacy Matters</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              In accordance with the Protection of Personal Information Act (PoPIA), we need your consent to process your personal data. 
              You can manage your preferences below.
            </p>

            {showDetails && (
              <div className="mt-4 space-y-2">
                {consentPurposes.map(p => (
                  <label key={p.id} className={cn("flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors", consents[p.id] ? "border-primary/30 bg-primary/5" : "border-border")}>
                    <input
                      type="checkbox"
                      checked={consents[p.id]}
                      disabled={p.required}
                      onChange={e => setConsents(prev => ({ ...prev, [p.id]: e.target.checked }))}
                      className="mt-0.5 rounded border-border accent-primary"
                    />
                    <div>
                      <span className="text-xs font-medium text-foreground">{p.label}</span>
                      {p.required && <span className="text-[10px] text-muted-foreground ml-1">(Required)</span>}
                      <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleAcceptAll} className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Accept All
              </button>
              <button onClick={handleDeclineAll} className="px-4 py-2 text-xs font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
                Decline Optional
              </button>
              {showDetails && (
                <button onClick={handleSave} className="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">
                  Save Preferences
                </button>
              )}
              <button onClick={() => setShowDetails(!showDetails)} className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Less options" : "Manage preferences"}
              </button>
            </div>
          </div>
          <button onClick={() => setVisible(false)} className="p-1 rounded hover:bg-secondary transition-colors shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
