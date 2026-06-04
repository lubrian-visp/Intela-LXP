import { GraduationCap, LogOut, Menu, X, ArrowLeftRight, ChevronRight, Crown, Briefcase, BookOpen } from "lucide-react";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSidebarWidth, MIN_WIDTH, MAX_WIDTH } from "@/hooks/useSidebarWidth";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePortalSwitcher } from "@/hooks/usePortalSwitcher";
import { useCmsMenuVisibility } from "@/hooks/useCmsMenuVisibility";
import {
  DomainPortalConfig,
  DomainNavSection,
  AppRole,
  DomainKey,
  getFilteredSections,
  getRoleBadge,
  getDashboardPath,
  domainPortals,
  resolveFlagForPath,
} from "@/lib/portalNavConfig";
import { useFeatureFlagMap } from "@/hooks/useFeatureFlags";

interface Props {
  config: DomainPortalConfig;
  userRoles: AppRole[];
}

const domainLabels: Record<DomainKey, string> = {
  technical: "Technical",
  business: "Business",
  learning_development: "L&D",
};

const domainDashboards: Record<DomainKey, string> = {
  technical: "/dashboard",
  business: "/programme-manager",
  learning_development: "/learner",
};

const domainRolesList: Record<DomainKey, AppRole[]> = {
  technical: ["super_admin", "systems_admin"],
  business: ["programme_manager", "operations", "talent_manager", "sponsor"],
  learning_development: ["facilitator", "assessor", "moderator", "mentor", "learner", "ld_support_officer"],
};

const cmsMenuSlugByRole: Record<AppRole, string> = {
  super_admin:        "technical-super-admin",
  systems_admin:      "technical-systems-admin",
  programme_manager:  "business-programme-manager",
  operations:         "business-operations",
  talent_manager:     "business-talent-manager",
  sponsor:            "business-sponsor",
  facilitator:        "ld-facilitator",
  assessor:           "ld-assessor",
  moderator:          "ld-moderator",
  mentor:             "ld-mentor",
  learner:            "ld-learner",
  ld_support_officer: "ld-support-officer",
};

const roleScopeLabels: Record<AppRole, string> = {
  super_admin:        "Global Control",
  systems_admin:      "System Operations",
  programme_manager:  "Programme Oversight",
  operations:         "Operational Control",
  talent_manager:     "Talent Strategy",
  sponsor:            "Sponsor Access",
  facilitator:        "Learning Delivery",
  assessor:           "Assessment & QA",
  moderator:          "Quality Assurance",
  mentor:             "Mentorship",
  learner:            "My Learning",
  ld_support_officer: "L&D Administration",
};

const roleDomainIcon: Record<DomainKey, typeof Crown> = {
  technical: Crown,
  business: Briefcase,
  learning_development: BookOpen,
};

export default function PortalSidebar({ config, userRoles }: Props) {
  const { width: sidebarWidth, setWidth: setSidebarWidth, isResizing, setIsResizing } = useSidebarWidth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<DomainKey | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, hasRole } = useAuth();
  const { headerLogo, headerLogoWidth } = useBrandingLogos();
  const { overrideDomain, setOverrideDomain } = usePortalSwitcher();

  const activeMenuSlugs = userRoles.map((role) => cmsMenuSlugByRole[role]);
  const { isPathActive, isItemActive, isLoading: cmsLoading } = useCmsMenuVisibility(activeMenuSlugs);
  const { data: flagMap, isLoading: flagsLoading } = useFeatureFlagMap();

  // Paths that must never be hidden via CMS toggles or flags (self-lockout protection)
  const PROTECTED_PATHS = ["/admin/design-manager", "/executive-dashboard", "/admin/tenants", "/admin/settings", "/tenant-admin", "/admin/platform-analytics"];

  const isFlagAllowed = (item: DomainNavSection["items"][0]) => {
    if (flagsLoading || !flagMap) return true;
    if (PROTECTED_PATHS.includes(item.path)) return true;
    const flag = (item as any).flag ?? resolveFlagForPath(item.path);
    if (!flag) return true;
    return flagMap[flag] ?? true;
  };

  const sections = getFilteredSections(config, userRoles).map(section => ({
    ...section,
    items: section.items.filter(item =>
      (PROTECTED_PATHS.includes(item.path) || cmsLoading || isItemActive(item.path, item.label)) &&
      isFlagAllowed(item)
    ),
  })).filter(section => section.items.length > 0);
  const canSwitch = hasRole("super_admin" as any) || hasRole("systems_admin" as any);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleBadge = userRoles.length === 1
    ? getRoleBadge(userRoles[0])
    : userRoles.length <= 3
      ? userRoles.map(getRoleBadge).join(" · ")
      : `${userRoles.length} roles`;

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const { overrideRole, setOverrideRole } = usePortalSwitcher();

  const handleSwitchPortal = (domain: DomainKey) => {
    setOverrideDomain(domain);
    setOverrideRole(null);
    setSwitcherOpen(false);
    navigate(domainDashboards[domain]);
  };

  const handleSwitchToRole = (domain: DomainKey, role: AppRole) => {
    setOverrideDomain(domain);
    setOverrideRole(role);
    setSwitcherOpen(false);
    setExpandedDomain(null);
    navigate(getDashboardPath(role));
  };

  const handleReturnToOwn = () => {
    setOverrideDomain(null);
    setOverrideRole(null);
    setSwitcherOpen(false);
    navigate("/dashboard");
  };

  const renderNavItem = (item: DomainNavSection["items"][0]) => {
    const itemHasQuery = item.path.includes("?");
    const fullCurrent = location.pathname + location.search;
    const isDashboardItem = item.label === "My Dashboard" || item.label === "Dashboard";
    const isActive = itemHasQuery
      ? fullCurrent === item.path
      : isDashboardItem
        ? location.pathname === item.path
        : (location.pathname === item.path && !location.search) ||
          (item.path !== "/" && item.path.length > 1 && !itemHasQuery && location.pathname.startsWith(item.path + "/"));
    return (
      <NavLink
        key={item.label}
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")} />
        <span className="truncate">{item.label}</span>
        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Header with integrated role context */}
      <div className="px-4 py-3.5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {/* Logo / Brand */}
          {headerLogo ? (
            <img src={headerLogo} alt="Intela SkillChain logo" className="h-8 object-contain shrink-0" style={{ maxWidth: `${headerLogoWidth}px` }} />
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary shrink-0">
              <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-8 bg-sidebar-border/60 shrink-0" />

          {/* Role indicator */}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-sidebar-accent-foreground truncate leading-tight">
              {userRoles.length === 1
                ? getRoleBadge(userRoles[0])
                : userRoles.map(getRoleBadge).join(" · ")}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
              {userRoles.length === 1
                ? roleScopeLabels[userRoles[0]]
                : config.subtitle}
            </p>
          </div>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto p-1 rounded-lg hover:bg-sidebar-accent/30 transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-sidebar-foreground" />
          </button>
        </div>
      </div>


      {canSwitch && (
        <div className="px-3 pt-3">
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-lg border border-sidebar-border bg-sidebar-accent/20 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
              <span>Switch Portal</span>
              {overrideDomain && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-sidebar-primary/20 text-sidebar-primary">
                  Preview
                </span>
              )}
            </button>
            {switcherOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-sidebar-border bg-sidebar shadow-lg py-1 max-h-[60vh] overflow-y-auto">
                {(Object.keys(domainLabels) as DomainKey[]).map(domain => (
                  <div key={domain}>
                    <button
                      onClick={() => setExpandedDomain(expandedDomain === domain ? null : domain)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
                        overrideDomain === domain && !overrideRole && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: domainPortals[domain].domainColor }}
                      />
                      <span className="flex-1 text-left">{domainLabels[domain]} Portal</span>
                      <ChevronRight className={cn(
                        "w-3 h-3 shrink-0 transition-transform duration-200",
                        expandedDomain === domain && "rotate-90"
                      )} />
                    </button>
                    {expandedDomain === domain && (
                      <div className="pl-4 py-0.5">
                        <button
                          onClick={() => handleSwitchPortal(domain)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-sidebar-foreground/70 hover:bg-sidebar-accent/40 rounded transition-colors",
                            overrideDomain === domain && !overrideRole && "text-sidebar-primary font-semibold"
                          )}
                        >
                          All Roles (Overview)
                        </button>
                        {domainRolesList[domain].map(role => (
                          <button
                            key={role}
                            onClick={() => handleSwitchToRole(domain, role)}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-sidebar-foreground/70 hover:bg-sidebar-accent/40 rounded transition-colors",
                              overrideDomain === domain && overrideRole === role && "text-sidebar-primary font-semibold bg-sidebar-accent/30"
                            )}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-sidebar-foreground/30 shrink-0" />
                            {getRoleBadge(role)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {overrideDomain && (
                  <>
                    <div className="my-1 border-t border-sidebar-border" />
                    <button
                      onClick={handleReturnToOwn}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                    >
                      ← Return to my portal
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sectioned Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sections.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <div className="my-3 border-t border-sidebar-border" />}
            <div className="flex items-center gap-2 mb-2 px-3">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: config.domainColor }}
              />
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold truncate">
                {section.title}
              </p>
            </div>
            {section.items.map(renderNavItem)}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/30">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">{roleBadge}</p>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-card border border-border"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-foreground/30 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "lg:hidden fixed left-0 top-0 z-50 h-screen w-[260px] flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          "hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-sidebar border-r border-sidebar-border",
          !isResizing && "transition-[width] duration-200"
        )}
        style={{ width: `${sidebarWidth}px` }}
      >
        {sidebarContent}
        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group hover:bg-accent/30 active:bg-accent/50 transition-colors z-50"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
            const startX = e.clientX;
            const startW = sidebarWidth;
            const onMove = (ev: MouseEvent) => {
              const newW = startW + (ev.clientX - startX);
              setSidebarWidth(newW);
            };
            const onUp = () => {
              setIsResizing(false);
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
              document.body.style.cursor = "";
              document.body.style.userSelect = "";
            };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-sidebar-border group-hover:bg-accent transition-colors" />
        </div>
      </aside>
    </>
  );
}
