import { Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { ReactNode } from "react";

function getGreeting(name: string | null) {
  const hour = new Date().getHours();
  const first = name?.split(" ")[0] ?? "there";
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

interface WelcomeBannerProps {
  subtitle: string;
  actions?: ReactNode;
}

export function WelcomeBanner({ subtitle, actions }: WelcomeBannerProps) {
  const { profile } = useAuth();
  return (
    <FadeIn>
      <div className="bg-gradient-to-br from-sidebar via-sidebar/95 to-sidebar/80 rounded-2xl p-6 border border-sidebar-border/50 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-2xl font-bold text-foreground">{getGreeting(profile?.full_name ?? null)}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          {actions && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

export interface KpiItem {
  label: string;
  value: string | number;
  sub?: string;
  trend?: boolean;
  icon: any;
  iconBg: string;
  iconColor: string;
}

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(s => (
        <StaggerItem key={s.label}>
          <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={cn("p-2 rounded-lg", s.iconBg)}>
                <s.icon className={cn("w-4 h-4", s.iconColor)} />
              </div>
              {s.sub && (
                <span className={cn("text-[11px] font-medium flex items-center gap-0.5", s.trend !== false ? "text-green-600" : "text-rose-500")}>
                  {s.trend !== false ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.sub}
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

interface ActionButtonProps {
  onClick?: () => void;
  icon: any;
  label: string;
  primary?: boolean;
}

export function ActionButton({ onClick, icon: Icon, label, primary }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-card border border-border/50 text-foreground hover:bg-secondary/50"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
