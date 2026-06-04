import { UserPlus, Send, Globe, Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RegistrationMethod = "staff-direct" | "staff-invite" | "self-registration" | "admin-override";

interface Props {
  onSelect: (method: RegistrationMethod) => void;
  onClose: () => void;
}

const methods = [
  {
    id: "staff-direct" as const,
    step: 1,
    icon: UserPlus,
    title: "Staff Registers Learner Directly",
    description: "Complete the full registration form on behalf of the learner. All details are captured immediately.",
    bestFor: "Walk-in registrations, phone-based enrollment, or when learner details are already collected.",
    color: "text-primary",
    bg: "bg-primary/5 hover:bg-primary/10 border-primary/10",
  },
  {
    id: "staff-invite" as const,
    step: 2,
    icon: Send,
    title: "Staff Registers Learner & Sends Invite Link",
    description: "Capture minimal details (name, email, programme), then send a secure, single-use, time-limited invite link for the learner to complete registration.",
    bestFor: "Remote learners who can self-complete their registration with supporting documents.",
    color: "text-info",
    bg: "bg-info/5 hover:bg-info/10 border-info/10",
  },
  {
    id: "self-registration" as const,
    step: 3,
    icon: Globe,
    title: "Self-Registration (Public Form)",
    description: "Generate a public registration link or QR code that learners can use to register themselves directly.",
    bestFor: "Open enrollment periods, marketing campaigns, or public recruitment drives.",
    color: "text-success",
    bg: "bg-success/5 hover:bg-success/10 border-success/10",
  },
  {
    id: "admin-override" as const,
    step: 4,
    icon: Zap,
    title: "Super Admin Override",
    description: "Bypass registration review and instantly enroll learner (Super Admin only).",
    bestFor: null,
    warning: "Skips all validation and approval steps. Use with caution.",
    color: "text-accent",
    bg: "bg-accent/5 hover:bg-accent/10 border-accent/10",
  },
];

export default function RegistrationMethodSelector({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[560px] mx-4 animate-slide-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-accent">Register New Learner</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select a registration method to add a new learner to the system</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all duration-200 group",
                m.bg
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg bg-card border border-border shrink-0", m.color)}>
                  <m.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-info bg-info/10 px-1.5 py-0.5 rounded">{m.step}</span>
                    <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                  {m.bestFor && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      <span className="font-semibold text-foreground">Best for:</span> {m.bestFor}
                    </p>
                  )}
                  {m.warning && (
                    <p className="text-[11px] text-warning mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> <span className="font-semibold">Warning:</span> {m.warning}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
