import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { DomainKey, AppRole, getDomainForRole, getDashboardPath } from "@/lib/portalNavConfig";

interface PortalSwitcherContextType {
  /** Domain override — set by Super Admin role preview */
  overrideDomain: DomainKey | null;
  /** Role override — set by Super Admin OR by the multi-role switcher */
  overrideRole: AppRole | null;
  /** True when the override was set by the user's own role switcher (not SA impersonation) */
  isSelfSwitch: boolean;
  setOverrideDomain: (domain: DomainKey | null) => void;
  setOverrideRole: (role: AppRole | null) => void;
  /**
   * Switch the logged-in user (who holds multiple roles) to a different portal.
   * Computes the correct domain automatically and persists to localStorage.
   * Returns the dashboard path so the caller can navigate.
   */
  switchRole: (role: AppRole) => string;
  /** Reset to the user's primary / auto-detected role */
  clearRoleOverride: () => void;
}

const PortalSwitcherContext = createContext<PortalSwitcherContextType | undefined>(undefined);

const STORAGE_KEY = "intela_active_role";

export function PortalSwitcherProvider({ children }: { children: ReactNode }) {
  const [overrideDomain, setOverrideDomainState] = useState<DomainKey | null>(null);
  const [overrideRole,   setOverrideRoleState]   = useState<AppRole | null>(null);
  const [isSelfSwitch,   setIsSelfSwitch]         = useState(false);

  // Re-hydrate the last self-switched role from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as AppRole | null;
      if (stored) {
        const domain = getDomainForRole(stored);
        setOverrideDomainState(domain);
        setOverrideRoleState(stored);
        setIsSelfSwitch(true);
      }
    } catch {
      // localStorage not available (e.g. private browsing with strict settings)
    }
  }, []);

  /** SA impersonation helpers — these clear the self-switch flag */
  const setOverrideDomain = useCallback((domain: DomainKey | null) => {
    setOverrideDomainState(domain);
    setIsSelfSwitch(false);
  }, []);

  const setOverrideRole = useCallback((role: AppRole | null) => {
    setOverrideRoleState(role);
    setIsSelfSwitch(false);
  }, []);

  /** User's own role switcher */
  const switchRole = useCallback((role: AppRole): string => {
    const domain = getDomainForRole(role);
    const path   = getDashboardPath(role);
    setOverrideDomainState(domain);
    setOverrideRoleState(role);
    setIsSelfSwitch(true);
    try { localStorage.setItem(STORAGE_KEY, role); } catch {}
    return path;
  }, []);

  const clearRoleOverride = useCallback(() => {
    setOverrideDomainState(null);
    setOverrideRoleState(null);
    setIsSelfSwitch(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return (
    <PortalSwitcherContext.Provider value={{
      overrideDomain, overrideRole, isSelfSwitch,
      setOverrideDomain, setOverrideRole,
      switchRole, clearRoleOverride,
    }}>
      {children}
    </PortalSwitcherContext.Provider>
  );
}

export function usePortalSwitcher() {
  const ctx = useContext(PortalSwitcherContext);
  if (!ctx) throw new Error("usePortalSwitcher must be used within PortalSwitcherProvider");
  return ctx;
}
