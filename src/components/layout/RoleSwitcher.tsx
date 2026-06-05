/**
 * RoleSwitcher — lets a user who holds multiple roles switch between portals
 * without logging out. Only renders when the user has 2+ roles.
 *
 * Placement: TopBar, between NotificationBell and the user avatar.
 *
 * Behaviour:
 *  - Reads `roles` from useAuth (the user's ACTUAL roles in the DB)
 *  - Shows the currently active role as a pill/badge
 *  - Dropdown lists all of the user's roles with icons
 *  - Clicking a role calls switchRole(role) → updates usePortalSwitcher + navigates
 *  - Selection is persisted to localStorage so it survives refresh
 *  - "Reset to primary" option clears the override and returns to auto-detection
 */
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, CheckCircle2, ArrowLeftRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePortalSwitcher } from "@/hooks/usePortalSwitcher";
import { AppRole, getDashboardPath } from "@/lib/portalNavConfig";

// ─── Role metadata (icon + label + colour) ────────────────────────────────────
const ROLE_META: Record<AppRole, { label: string; emoji: string; color: string; bg: string }> = {
  super_admin:       { label: "Super Admin",       emoji: "🛡️",  color: "text-violet-600",  bg: "bg-violet-500/10" },
  systems_admin:     { label: "Systems Admin",     emoji: "⚙️",  color: "text-slate-600",   bg: "bg-slate-500/10"  },
  programme_manager: { label: "Programme Manager", emoji: "📋",  color: "text-blue-600",    bg: "bg-blue-500/10"   },
  operations:        { label: "Operations",        emoji: "🏗️",  color: "text-orange-600",  bg: "bg-orange-500/10" },
  talent_manager:    { label: "Talent Manager",    emoji: "🌟",  color: "text-yellow-600",  bg: "bg-yellow-500/10" },
  sponsor:           { label: "Sponsor",           emoji: "🤝",  color: "text-emerald-600", bg: "bg-emerald-500/10"},
  facilitator:       { label: "Facilitator",       emoji: "🎓",  color: "text-indigo-600",  bg: "bg-indigo-500/10" },
  assessor:          { label: "Assessor",          emoji: "✅",  color: "text-green-600",   bg: "bg-green-500/10"  },
  moderator:         { label: "Moderator",         emoji: "⚖️",  color: "text-teal-600",    bg: "bg-teal-500/10"   },
  mentor:            { label: "Mentor",            emoji: "💡",  color: "text-amber-600",   bg: "bg-amber-500/10"  },
  learner:           { label: "Learner",           emoji: "📚",  color: "text-pink-600",    bg: "bg-pink-500/10"   },
  ld_support_officer:{ label: "L&D Support Officer",emoji: "🔧", color: "text-cyan-600",    bg: "bg-cyan-500/10"   },
};

// Roles that should NOT appear in the self-switcher (admin-only roles managed separately)
const EXCLUDED_FROM_SWITCHER: AppRole[] = ["super_admin", "systems_admin"];

export default function RoleSwitcher() {
  const { roles } = useAuth();
  const { overrideRole, isSelfSwitch, switchRole, clearRoleOverride } = usePortalSwitcher();
  const navigate  = useNavigate();
  const ref       = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Only show switcher roles (exclude super_admin / systems_admin — they have their own impersonation tool)
  const switchableRoles = (roles as AppRole[]).filter(r => !EXCLUDED_FROM_SWITCHER.includes(r));

  // Don't render at all if user has only one switchable role
  if (switchableRoles.length < 2) return null;

  // Determine the currently displayed role
  const activeRole: AppRole = (isSelfSwitch && overrideRole)
    ? overrideRole
    : switchableRoles[0];

  const activeMeta = ROLE_META[activeRole] ?? {
    label: activeRole.replace(/_/g, " "),
    emoji: "👤",
    color: "text-muted-foreground",
    bg: "bg-secondary",
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSwitch = (role: AppRole) => {
    setOpen(false);
    const path = switchRole(role);
    navigate(path);
  };

  const handleReset = () => {
    setOpen(false);
    clearRoleOverride();
    // Navigate to primary role's dashboard
    navigate(getDashboardPath(switchableRoles[0]));
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-lg border transition-all text-[11px] font-semibold",
          "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          open
            ? "border-primary/40 bg-primary/5 text-foreground shadow-sm"
            : "border-border bg-secondary/60 text-foreground hover:bg-secondary"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Active portal: ${activeMeta.label}. Click to switch role.`}
        title="Switch portal"
      >
        {/* Pulse indicator when overridden */}
        {isSelfSwitch && (
          <span className="relative flex w-1.5 h-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
        )}

        <span className="text-sm leading-none">{activeMeta.emoji}</span>
        <span className={cn("hidden sm:inline", activeMeta.color)}>{activeMeta.label}</span>
        <ArrowLeftRight className="w-3 h-3 text-muted-foreground hidden sm:block" />
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Switch portal"
          className="absolute right-0 top-full mt-1.5 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/60 bg-secondary/30">
            <div className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Switch Portal
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              You have {switchableRoles.length} roles. Each has its own dashboard and navigation.
            </p>
          </div>

          {/* Role list */}
          <div className="py-1">
            {switchableRoles.map(role => {
              const meta    = ROLE_META[role] ?? { label: role, emoji: "👤", color: "text-muted-foreground", bg: "bg-secondary" };
              const isActive = role === activeRole;
              return (
                <button
                  key={role}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSwitch(role)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group",
                    isActive
                      ? "bg-primary/5 text-foreground"
                      : "hover:bg-secondary/60 text-foreground"
                  )}
                >
                  {/* Role icon */}
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-transform group-hover:scale-110", meta.bg)}>
                    {meta.emoji}
                  </div>

                  {/* Role info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold truncate", isActive ? meta.color : "text-foreground")}>
                      {meta.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {isActive ? "Current portal" : "Click to switch"}
                    </p>
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <CheckCircle2 className={cn("w-4 h-4 shrink-0", meta.color)} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Reset to primary — only show if currently overriding */}
          {isSelfSwitch && overrideRole && overrideRole !== switchableRoles[0] && (
            <>
              <div className="border-t border-border/60" />
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] text-muted-foreground hover:bg-secondary/60 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to primary role ({ROLE_META[switchableRoles[0]]?.label ?? switchableRoles[0]})
              </button>
            </>
          )}

          {/* Footer tip */}
          <div className="border-t border-border/60 px-4 py-2 bg-secondary/20">
            <p className="text-[9px] text-muted-foreground">
              💡 Your data and permissions update instantly when you switch.
              Your last selection is remembered between sessions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
