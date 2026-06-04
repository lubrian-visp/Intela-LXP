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
  learning_development: ["facilitator", "assessor", "moderator", "mentor", "learner"],
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
  const { roles, loading, rolesLoading } = useAuth();
  const { overrideDomain, overrideRole } = usePortalSwitcher();
  const location = useLocation();

  // Instant permission invalidation: refreshes roles in real-time when changed by admin
  useRealtimeRoleSync();

  // Only block on the very first auth bootstrap (no session yet decided).
  // Once we have either a session or roles (cached), render the shell immediately —
  // individual data hooks will manage their own loading states.
  if (loading) return null;

  // If admin has overridden to a specific role
  if (overrideDomain && overrideRole) {
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

  // No roles assigned — show a bare shell with a notice
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="p-8 max-w-md mx-auto mt-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">No role assigned</h2>
        <p className="text-sm text-muted-foreground">
          Your account exists but has not been assigned a role yet. Please contact your administrator.
        </p>
      </main>
    </div>
  );
}
