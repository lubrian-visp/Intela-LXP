import { 
  LayoutDashboard, GraduationCap, Route, Users, BookOpen, 
  FileCheck, Award, Settings, BarChart3, Building2, 
  ChevronLeft, ChevronRight, Shield, LogOut, Bell, Cog, User, Menu, X, Briefcase, Handshake,
  ClipboardCheck, Heart, FolderKanban, Activity, UserPlus, Video,
  Layers, Flag, History, Plug, FileBarChart, Inbox, CheckSquare, UserCheck, MessagesSquare,
  TrendingUp, Target, Calendar, Star, Lock, Gauge, AlertTriangle, HelpCircle,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type AppRole = "super_admin" | "systems_admin" | "programme_manager" | "facilitator" | "assessor" | "moderator" | "mentor" | "learner" | "sponsor" | "operations" | "talent_manager";

interface NavItem {
  label: string;
  icon: any;
  path: string;
  roles?: AppRole[];
}

interface NavSection {
  title: string;
  domainColor: string;
  items: NavItem[];
}

// ── Technical / Admin ──
const technicalSection: NavSection = {
  title: "Technical / Admin",
  domainColor: "hsl(0, 84%, 60%)",
  items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/", roles: ["super_admin"] },
    { label: "Systems Admin", icon: Cog, path: "/systems-admin", roles: ["systems_admin", "super_admin"] },
    { label: "User Directory", icon: Users, path: "/admin/users", roles: ["super_admin", "systems_admin"] },
    { label: "Roles & Permissions", icon: Shield, path: "/admin/roles", roles: ["super_admin"] },
    { label: "Audit Logs", icon: History, path: "/admin/audit-logs", roles: ["super_admin", "systems_admin"] },
    { label: "Platform Settings", icon: Settings, path: "/admin/settings", roles: ["super_admin"] },
    { label: "Programme Types", icon: Cog, path: "/admin/programme-types", roles: ["super_admin"] },
    { label: "Multi-Tenancy", icon: Building2, path: "/admin/tenants", roles: ["super_admin"] },
    { label: "Integrations", icon: Plug, path: "/admin/integrations", roles: ["super_admin", "systems_admin"] },
    { label: "PoPIA Compliance", icon: Shield, path: "/admin/popia", roles: ["super_admin"] },
  ],
};

// ── Operations ──
const operationsSection: NavSection = {
  title: "Operations",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    { label: "Operations Control", icon: Activity, path: "/operations", roles: ["operations", "super_admin"] },
    { label: "Approval Queue", icon: CheckSquare, path: "/approvals", roles: ["operations", "programme_manager", "super_admin"] },
    { label: "Learner Onboarding", icon: UserPlus, path: "/learner/onboarding", roles: ["super_admin", "programme_manager", "operations", "facilitator"] },
    { label: "Staff Onboarding", icon: Briefcase, path: "/staff/onboarding", roles: ["super_admin", "operations", "systems_admin"] },
    { label: "Announcements", icon: Bell, path: "/announcements", roles: ["super_admin", "operations", "programme_manager"] },
  ],
};

// ── Programmes & Learning Design ──
const programmeSection: NavSection = {
  title: "Programmes & Design",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    { label: "Programme Manager", icon: GraduationCap, path: "/programme-manager", roles: ["programme_manager"] },
    { label: "Programme Hub", icon: GraduationCap, path: "/programmes", roles: ["super_admin", "programme_manager", "operations"] },
    { label: "Cohort Management", icon: Layers, path: "/cohort-management", roles: ["super_admin", "programme_manager", "facilitator", "operations"] },
    { label: "Learning Tracks", icon: Route, path: "/pathways", roles: ["super_admin", "programme_manager"] },
    { label: "Learning Hub", icon: BookOpen, path: "/modules", roles: ["super_admin", "programme_manager", "facilitator"] },
    { label: "Assessments", icon: ClipboardCheck, path: "/assessments", roles: ["super_admin", "programme_manager", "assessor", "moderator"] },
    { label: "Credentials", icon: Award, path: "/credentials", roles: ["super_admin", "programme_manager"] },
    { label: "Timetable", icon: Calendar, path: "/sessions", roles: ["super_admin", "programme_manager"] },
    { label: "Analytics", icon: BarChart3, path: "/analytics", roles: ["super_admin", "programme_manager", "operations"] },
  ],
};

// ── Talent & Sponsors ──
const talentSponsorSection: NavSection = {
  title: "Talent & Sponsors",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    { label: "Talent Manager", icon: Briefcase, path: "/talent-manager", roles: ["talent_manager"] },
    { label: "Talent Management", icon: TrendingUp, path: "/talent", roles: ["super_admin", "operations", "talent_manager"] },
    { label: "Sponsor Portal", icon: Building2, path: "/sponsor-portal", roles: ["sponsor"] },
    { label: "Sponsor Management", icon: Building2, path: "/sponsors", roles: ["super_admin", "operations", "programme_manager"] },
    { label: "Sponsor Onboarding", icon: UserPlus, path: "/sponsor/onboarding", roles: ["super_admin", "operations", "programme_manager"] },
    { label: "Sponsor Linking", icon: Handshake, path: "/sponsor/linking", roles: ["super_admin", "operations", "programme_manager"] },
  ],
};

// ── Learning & Development ──
const learningSection: NavSection = {
  title: "Learning & Development",
  domainColor: "hsl(210, 80%, 55%)",
  items: [
    { label: "Learner Dashboard", icon: User, path: "/learner", roles: ["learner"] },
    { label: "Facilitator", icon: Users, path: "/facilitator", roles: ["facilitator"] },
    { label: "Assessor Portal", icon: ClipboardCheck, path: "/assessor", roles: ["assessor"] },
    { label: "Moderator Portal", icon: Flag, path: "/moderator", roles: ["moderator"] },
    { label: "Mentor Portal", icon: Heart, path: "/mentor", roles: ["mentor"] },
    { label: "Discussions", icon: MessagesSquare, path: "/discussions" },
    { label: "Portfolio of Evidence", icon: FolderKanban, path: "/portfolio", roles: ["learner", "assessor", "moderator"] },
  ],
};

// ── Account ──
const accountSection: NavSection = {
  title: "Account",
  domainColor: "hsl(var(--muted-foreground))",
  items: [
    { label: "My Profile", icon: User, path: "/profile/me" },
    { label: "Help Centre", icon: HelpCircle, path: "/help" },
  ],
};

function filterByRole(items: NavItem[], userRoles: AppRole[]): NavItem[] {
  if (userRoles.includes("super_admin")) return items;
  if (userRoles.length === 0) return items.filter(i => !i.roles || i.roles.length === 0);
  return items.filter(i => !i.roles || i.roles.some(r => userRoles.includes(r)));
}

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const { headerLogo, headerLogoWidth } = useBrandingLogos();

  const typedRoles = roles as AppRole[];

  const allSections = [
    technicalSection,
    operationsSection,
    programmeSection,
    talentSponsorSection,
    learningSection,
    accountSection,
  ];

  const sections: NavSection[] = allSections
    .map(s => ({ ...s, items: filterByRole(s.items, typedRoles) }))
    .filter(s => s.items.length > 0);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const roleBadge = roles.length > 0
    ? roles[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "User";

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
    return (
      <NavLink
        key={item.path + item.label}
        to={item.path}
        className={cn(
          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-sidebar-primary")} />
        {!collapsed && <span className="animate-fade-in truncate">{item.label}</span>}
        {isActive && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 h-12 border-b border-sidebar-border">
        {headerLogo ? (
          <img src={headerLogo} alt="Intela SkillChain logo" className="h-8 object-contain" style={{ maxWidth: `${headerLogoWidth}px` }} />
        ) : (
          <>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary">
              <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">INTELA SKILLCHAIN</h1>
                <p className="text-[10px] text-sidebar-foreground opacity-60 uppercase tracking-widest">Enterprise</p>
              </div>
            )}
          </>
        )}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto p-1 rounded-lg hover:bg-sidebar-accent/30 transition-colors">
          <X className="w-5 h-5 text-sidebar-foreground" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sections.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <div className="my-2 border-t border-sidebar-border" />}
            <div className={cn("flex items-center gap-2 mb-2", collapsed ? "px-1 justify-center" : "px-3")}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section.domainColor }} />
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold truncate">
                  {section.title}
                </p>
              )}
            </div>
            {section.items.map(renderNavItem)}
          </div>
        ))}
      </nav>

      <div className="px-2 pb-4 space-y-2">
        <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/30", collapsed && "justify-center")}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground shrink-0">
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">{profile?.full_name || "User"}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{roleBadge}</p>
            </div>
          )}
        </div>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors text-sm",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="animate-fade-in">Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center py-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
        "lg:hidden fixed left-0 top-0 z-50 h-screen w-[280px] flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </aside>

      <aside className={cn(
        "hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-sidebar transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
