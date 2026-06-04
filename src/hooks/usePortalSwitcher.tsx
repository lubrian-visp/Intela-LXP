import { createContext, useContext, useState, ReactNode } from "react";
import { DomainKey, AppRole } from "@/lib/portalNavConfig";

interface PortalSwitcherContextType {
  overrideDomain: DomainKey | null;
  overrideRole: AppRole | null;
  setOverrideDomain: (domain: DomainKey | null) => void;
  setOverrideRole: (role: AppRole | null) => void;
}

const PortalSwitcherContext = createContext<PortalSwitcherContextType | undefined>(undefined);

export function PortalSwitcherProvider({ children }: { children: ReactNode }) {
  const [overrideDomain, setOverrideDomain] = useState<DomainKey | null>(null);
  const [overrideRole, setOverrideRole] = useState<AppRole | null>(null);
  return (
    <PortalSwitcherContext.Provider value={{ overrideDomain, setOverrideDomain, overrideRole, setOverrideRole }}>
      {children}
    </PortalSwitcherContext.Provider>
  );
}

export function usePortalSwitcher() {
  const ctx = useContext(PortalSwitcherContext);
  if (!ctx) throw new Error("usePortalSwitcher must be used within PortalSwitcherProvider");
  return ctx;
}
