import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalSwitcher } from "@/hooks/usePortalSwitcher";
import { useRealtimeRoleSync } from "@/hooks/useRealtimeRoleSync";
import PortalLayout from "@/components/layout/PortalLayout";
import TopBar from "@/components/layout/TopBar";
import {
  getDomainPortalForUser,
  domainPortals,
  DomainKey,
  AppRole,
  getPersonalizedPortalConfig,
  getDashboardPath,
  detectRoleFromPath,
  detectDomainFromPath,
  getDomainForRole,
} from "@/lib/portalNavConfig";

const allDomainRoles: Record<DomainKey, AppRole[]> = {
  technical: ["super_admin", "systems_admin"],
  business: ["programme_manager", "operations", "talent_manager", "sponsor"],
  learning_development: ["facilitator", "assessor", "moderator", "mentor", "learner", "ld_support_officer"],
};

/**
 * Map dashboard paths back to their primary role so we can detect
 * which role-specific nav to show based on the current route.
 */
const dashboardPathToRole: Record<string, AppRole> = {
  "/": "super_admin",
  "/systems-admin": "systems_admin",
  "/programme-manager": "programme_manager",
  "/operations": "operations",
  "/talent-manager": "talent_manager",
  "/sponsor-portal": "sponsor",
  "/facilitator": "facilitator",
  "/assessor": "assessor",
  "/moderator": "moderator",
  "/mentor": "mentor",
  "/learner": "learner",
};

export default function RoleBasedLayout({ children }: { children: ReactNode }) {
  const { roles, loading } = useAuth();
  const { overrideDomain, overrideRole, isSelfSwitch } = usePortalSwitcher();
  const location = useLocation();

  // Instant permission invalidation: refreshes roles in real-time when changed by admin
  useRealtimeRoleSync();

  if (loading) return null;

  // ── Self-switch: user chose their own role via the RoleSwitcher in TopBar ──
  // Validate the stored role actually belongs to this user (security check).
  if (isSelfSwitch && overrideRole && overrideDomain) {
    const typedRoles = roles as AppRole[];
    const userOwnsRole = typedRoles.includes(overrideRole);
    if (userOwnsRole) {
      const config = domainPortals[overrideDomain];
      const personalizedConfig = getPersonalizedPortalConfig(config, [overrideRole]);
      return (
        <PortalLayout config={personalizedConfig} userRoles={[overrideRole]}>
          {children}
        </PortalLayout>
      );
    }
    // Role no longer belongs to user (revoked) — fall through to normal resolution
  }

  // ── SA impersonation: admin overrode to a specific role ──
  if (!isSelfSwitch && overrideDomain && overrideRole) {
    const config = domainPortals[overrideDomain];
    const personalizedConfig = getPersonalizedPortalConfig(config, [overrideRole]);
    return (
      <PortalLayout config={personalizedConfig} userRoles={[overrideRole]}>
        {children}
      </PortalLayout>
    );
  }

  // If admin has overridden to a domain – detect which role's section to show from the URL
  if (overrideDomain) {
    const config = domainPortals[overrideDomain];
    const previewRoles = allDomainRoles[overrideDomain];
    const detectedRole = detectRoleFromPath(config, location.pathname, location.search, previewRoles);
    const activeRoles = detectedRole ? [detectedRole] : previewRoles;
    const personalizedConfig = getPersonalizedPortalConfig(config, activeRoles);
    return (
      <PortalLayout config={personalizedConfig} userRoles={activeRoles}>
        {children}
      </PortalLayout>
    );
  }

  const typedRoles = roles as AppRole[];

  // Determine which domain the user is currently in based on path
  const domainResult = getDomainPortalForUser(roles);

  if (domainResult) {
    const { config, domain, userRoles } = domainResult;
    // If user has multiple roles in this domain, narrow to the active one from the URL
    let activeRoles = userRoles;
    if (userRoles.length > 1) {
      const detectedRole = detectRoleFromPath(config, location.pathname, location.search, userRoles);
      if (detectedRole) {
        activeRoles = [detectedRole];
      }
    }
    const personalizedConfig = getPersonalizedPortalConfig(config, activeRoles);
    return (
      <PortalLayout config={personalizedConfig} userRoles={activeRoles}>
        {children}
      </PortalLayout>
    );
  }

  // Multi-domain user: detect domain from URL path
  if (typedRoles.length > 0) {
    const detectedDomain = detectDomainFromPath(location.pathname, typedRoles);
    if (detectedDomain) {
      const config = domainPortals[detectedDomain];
      const domainRoles = typedRoles.filter(r => getDomainForRole(r) === detectedDomain);
      // Narrow to specific role within that domain
      const detectedRole = detectRoleFromPath(config, location.pathname, location.search, domainRoles);
      const activeRoles = detectedRole ? [detectedRole] : domainRoles;
      const personalizedConfig = getPersonalizedPortalConfig(config, activeRoles);
      return (
        <PortalLayout config={personalizedConfig} userRoles={activeRoles}>
          {children}
        </PortalLayout>
      );
    }
    // Fallback: use primary role's domain
    const primaryDomain = getDomainForRole(typedRoles[0]);
    const config = domainPortals[primaryDomain];
    const domainRoles = typedRoles.filter(r => getDomainForRole(r) === primaryDomain);
    const personalizedConfig = getPersonalizedPortalConfig(config, domainRoles.length > 0 ? domainRoles : [typedRoles[0]]);
    return (
      <PortalLayout config={personalizedConfig} userRoles={domainRoles.length > 0 ? domainRoles : [typedRoles[0]]}>
        {children}
      </PortalLayout>
    );
  }

  // No roles assigned — clear onboarding guidance instead of a dead-end
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="p-8 max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Account setup in progress</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your account has been created successfully. A platform administrator needs to assign
            your role before you can access your portal.
          </p>
        </div>

        {/* What happens next */}
        <div className="text-left bg-card rounded-xl border border-border/50 p-5 space-y-3 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What happens next</p>
          {[
            { step: "1", text: "An administrator will review your account and assign your role (e.g. Learner, Facilitator, Assessor)." },
            { step: "2", text: "You will receive an email notification when your role is activated." },
            { step: "3", text: "Return here and sign in — your portal will load automatically." },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <p className="text-xs text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>Need help?</span>
          <a href="mailto:support@intela.co.za" className="text-primary hover:underline font-medium">
            Contact support
          </a>
          <span>·</span>
          <button
            onClick={() => { import("@/integrations/supabase/client").then(m => m.supabase.auth.signOut()); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
}
