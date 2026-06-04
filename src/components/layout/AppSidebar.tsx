import {
  LayoutDashboard, GraduationCap, Route, Users, BookOpen,
  FileCheck, Award, Settings, BarChart3, Building2,
  ChevronLeft, ChevronRight, Shield, LogOut, Bell, Cog, User, Menu, X, Briefcase, Handshake,
  ClipboardCheck, Heart, FolderKanban, Activity, UserPlus, Video,
  Layers, Flag, History, Plug, FileBarChart, Inbox, CheckSquare, UserCheck, MessagesSquare,
  TrendingUp, Target, Calendar, Star, Lock, Gauge, AlertTriangle, HelpCircle, ChevronDown,
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
  badge?: string;
}

interface NavSection {
  title: string;
  domainColor: string;
  items: NavItem[];
}

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

const operationsSection: NavSection = {
  title: "Operations",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    { label: "Operations Control", icon: Activity, path: "/operations", roles: ["operations", "super_admin"] },
    { label: "Approval Queue", icon: CheckSquare, path: "/approvals", roles: ["operations", "programme_manager", "super_admin"] },
    { label: "Admin Staff Pool", icon: Users, path: "/admin/staff-pool", roles: ["super_admin", "systems_admin", "operations", "programme_manager", "talent_manager"] },
    { label: "Learner Onboarding", icon: UserPlus, path: "/learner/onboarding", roles: ["super_admin", "programme_manager", "operations", "facilitator"] },
    { label: "Staff Onboarding", icon: Briefcase, path: "/staff/onboarding", roles: ["super_admin", "operations", "systems_admin"] },
    { label: "Announcements", icon: Bell, path: "/announcements", roles: ["super_admin", "operations", "programme_manager"] },
  ],
};

const programmeSection: NavSection = {
  title: "Programme Setup",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/programme-manager", roles: ["programme_manager"] },
    { label: "Programme Hub", icon: GraduationCap, path: "/programmes", roles: ["super_admin", "programme_manager", "operations"] },
    { label: "Programme Types", icon: Cog, path: "/admin/programme-types", roles: ["programme_manager"] },
    { label: "Cohort Management", icon: Layers, path: "/cohort-management", roles: ["super_admin", "programme_manager", "facilitator", "operations"] },
    { label: "Timetable", icon: Calendar, path: "/sessions", roles: ["super_admin", "programme_manager"] },
  ],
};

const learningDesignSection: NavSection = {
  title: "Learning Design",
  domainColor: "hsl(210, 80%, 55%)",
  items: [
    { label: "Learning Tracks", icon: Route, path: "/pathways", roles: ["super_admin", "programme_manager"] },
    { label: "Learning Hub", icon: BookOpen, path: "/modules", roles: ["super_admin", "programme_manager", "facilitator"] },
    { label: "Assessment Builder", icon: ClipboardCheck, path: "/assessments", roles: ["super_admin", "programme_manager", "assessor", "moderator"] },
    { label: "Portfolio of Evidence", icon: FolderKanban, path: "/portfolio", roles: ["super_admin", "programme_manager", "assessor", "moderator"] },
  ],
};

const deliverySection: NavSection = {
  title: "Delivery & Monitoring",
  domainColor: "hsl(142, 71%, 45%)",
  items: [
    { label: "Gradebook", icon: FileCheck, path: "/gradebook", roles: ["super_admin", "programme_manager", "facilitator", "assessor"] },
    { label: "Analytics", icon: BarChart3, path: "/analytics", roles: ["super_admin", "programme_manager", "operations"] },
    { label: "Credentials", icon: Award, path: "/credentials", roles: ["super_admin", "programme_manager"] },
  ],
};

const lxpSection: NavSection = {
  title: "LXP Management",
  domainColor: "hsl(270, 70%, 60%)",
  items: [
    { label: "Shared Content Library", icon: Layers, path: "/content-library", roles: ["super_admin", "programme_manager"] },
    { label: "Challenge Exams", icon: Star, path: "/challenge-exams", roles: ["super_admin", "programme_manager"] },
  ],
};

const learnerPipelineSection: NavSection = {
  title: "Learner Pipeline",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    { label: "Learner Onboarding", icon: UserPlus, path: "/learner/onboarding", roles: ["super_admin", "programme_manager", "operations", "facilitator"] },
    { label: "Approval Queue", icon: CheckSquare, path: "/approvals", roles: ["operations", "programme_manager", "super_admin"] },
    { label: "Admin Staff Pool", icon: Users, path: "/admin/staff-pool", roles: ["programme_manager"] },
    { label: "Sponsor Management", icon: Building2, path: "/sponsors", roles: ["super_admin", "operations", "programme_manager"] },
  ],
};

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

const accountSection: NavSection = {
  title: "Account",
  domainColor: "hsl(var(--muted-foreground))",
  items: [
    { label: "My Profile", icon: User, path: "/profile/me" },
    { label: "Help Centre", icon: HelpCircle, path: "/help" },
  ],
};

// ── Dedicated Staff Pool section — shown explicitly in every relevant role nav ──
const staffManagementSection: NavSection = {
  title: "Staff Management",
  domainColor: "hsl(38, 92%, 50%)",
  items: [
    {
      label: "Admin Staff Pool",
      icon: Users,
      path: "/admin/staff-pool",
      roles: ["super_admin", "systems_admin", "operations", "programme_manager", "talent_manager"],
    },
    {
      label: "Staff Onboarding",
      icon: Briefcase,
      path: "/staff/onboarding",
      roles: ["super_admin", "systems_admin", "operations"],
    },
  ],
};

// ── Per-role curated navigation ───────────────────────────────────────────────
// Every role that can access Admin Staff Pool gets an explicit section map
// so the item is always visible — no relying on fallback filtering.

const superAdminSections: NavSection[] = [
  {
    title: "Technical / Admin",
    domainColor: "hsl(0, 84%, 60%)",
    items: [
      { label: "Dashboard",          icon: LayoutDashboard, path: "/" },
      { label: "Systems Admin",      icon: Cog,             path: "/systems-admin" },
      { label: "User Directory",     icon: Users,           path: "/admin/users" },
      { label: "Roles & Permissions",icon: Shield,          path: "/admin/roles" },
      { label: "Audit Logs",         icon: History,         path: "/admin/audit-logs" },
      { label: "Platform Settings",  icon: Settings,        path: "/admin/settings" },
      { label: "Programme Types",    icon: Cog,             path: "/admin/programme-types" },
      { label: "Multi-Tenancy",      icon: Building2,       path: "/admin/tenants" },
      { label: "Integrations",       icon: Plug,            path: "/admin/integrations" },
      { label: "PoPIA Compliance",   icon: Shield,          path: "/admin/popia" },
    ],
  },
  {
    title: "Operations",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Operations Control", icon: Activity,    path: "/operations" },
      { label: "Approval Queue",     icon: CheckSquare, path: "/approvals" },
      { label: "Learner Onboarding", icon: UserPlus,    path: "/learner/onboarding" },
      { label: "Announcements",      icon: Bell,        path: "/announcements" },
    ],
  },
  staffManagementSection,
  programmeSection,
  learningDesignSection,
  deliverySection,
  talentSponsorSection,
  learningSection,
  accountSection,
];

const systemsAdminSections: NavSection[] = [
  {
    title: "Technical / Admin",
    domainColor: "hsl(0, 84%, 60%)",
    items: [
      { label: "Systems Admin",       icon: Cog,     path: "/systems-admin" },
      { label: "User Directory",      icon: Users,   path: "/admin/users" },
      { label: "Audit Logs",          icon: History, path: "/admin/audit-logs" },
      { label: "Integrations",        icon: Plug,    path: "/admin/integrations" },
    ],
  },
  staffManagementSection,
  {
    title: "Operations",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Approval Queue",     icon: CheckSquare, path: "/approvals" },
      { label: "Announcements",      icon: Bell,        path: "/announcements" },
    ],
  },
  accountSection,
];

const operationsSections: NavSection[] = [
  {
    title: "Operations",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Operations Control", icon: Activity,    path: "/operations" },
      { label: "Approval Queue",     icon: CheckSquare, path: "/approvals" },
      { label: "Learner Onboarding", icon: UserPlus,    path: "/learner/onboarding" },
      { label: "Announcements",      icon: Bell,        path: "/announcements" },
    ],
  },
  staffManagementSection,
  {
    title: "Programmes",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Programme Hub",    icon: GraduationCap, path: "/programmes" },
      { label: "Cohort Management",icon: Layers,        path: "/cohort-management" },
      { label: "Analytics",        icon: BarChart3,     path: "/analytics" },
    ],
  },
  {
    title: "Talent & Sponsors",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Talent Management",  icon: TrendingUp, path: "/talent" },
      { label: "Sponsor Management", icon: Building2,  path: "/sponsors" },
      { label: "Sponsor Onboarding", icon: UserPlus,   path: "/sponsor/onboarding" },
    ],
  },
  accountSection,
];

const talentManagerSections: NavSection[] = [
  {
    title: "Talent Manager",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Dashboard",         icon: LayoutDashboard, path: "/talent-manager" },
      { label: "Talent Management", icon: TrendingUp,      path: "/talent" },
    ],
  },
  staffManagementSection,
  accountSection,
];

const programmManagerSections: NavSection[] = [
  programmeSection,
  learningDesignSection,
  deliverySection,
  lxpSection,
  {
    title: "Learner Pipeline",
    domainColor: "hsl(38, 92%, 50%)",
    items: [
      { label: "Learner Onboarding", icon: UserPlus,    path: "/learner/onboarding" },
      { label: "Approval Queue",     icon: CheckSquare, path: "/approvals" },
      { label: "Sponsor Management", icon: Building2,   path: "/sponsors" },
    ],
  },
  staffManagementSection,
  accountSection,
];

// ── Role → sections lookup ─────────────────────────────────────────────────────
const roleSectionMap: Partial<Record<AppRole, NavSection[]>> = {
  super_admin:       superAdminSections,
  systems_admin:     systemsAdminSections,
  operations:        operationsSections,
  talent_manager:    talentManagerSections,
  programme_manager: programmManagerSections,
  facilitator: [
    {
      title: "My Workspace",
      domainColor: "hsl(210, 80%, 55%)",
      items: [
        { label: "Dashboard",          icon: LayoutDashboard, path: "/facilitator" },
        { label: "Cohort Management",  icon: Layers,          path: "/cohort-management" },
        { label: "Timetable",          icon: Calendar,        path: "/sessions" },
        { label: "Learner Onboarding", icon: UserPlus,        path: "/learner/onboarding" },
        { label: "Gradebook",          icon: FileCheck,       path: "/gradebook" },
        { label: "Discussions",        icon: MessagesSquare,  path: "/discussions" },
      ],
    },
    accountSection,
  ],
  assessor: [
    {
      title: "My Workspace",
      domainColor: "hsl(210, 80%, 55%)",
      items: [
        { label: "Assessor Portal",      icon: ClipboardCheck, path: "/assessor" },
        { label: "Assessment Builder",   icon: ClipboardCheck, path: "/assessments" },
        { label: "Portfolio of Evidence",icon: FolderKanban,   path: "/portfolio" },
      ],
    },
    accountSection,
  ],
  moderator: [
    {
      title: "My Workspace",
      domainColor: "hsl(142, 71%, 45%)",
      items: [
        { label: "Moderator Portal",     icon: Flag,       path: "/moderator" },
        { label: "Portfolio of Evidence",icon: FolderKanban,path: "/portfolio" },
        { label: "Discussions",          icon: MessagesSquare, path: "/discussions" },
      ],
    },
    accountSection,
  ],
  mentor: [
    {
      title: "My Workspace",
      domainColor: "hsl(270, 70%, 60%)",
      items: [
        { label: "Mentor Portal", icon: Heart,          path: "/mentor" },
        { label: "Discussions",   icon: MessagesSquare, path: "/discussions" },
        { label: "Timetable",     icon: Calendar,       path: "/sessions" },
      ],
    },
    accountSection,
  ],
  learner: [
    {
      title: "My Learning",
      domainColor: "hsl(210, 80%, 55%)",
      items: [
        { label: "Dashboard",            icon: LayoutDashboard, path: "/learner" },
        { label: "Portfolio of Evidence",icon: FolderKanban,    path: "/portfolio" },
        { label: "Discussions",          icon: MessagesSquare,  path: "/discussions" },
        { label: "Credentials",          icon: Award,           path: "/credentials" },
      ],
    },
    accountSection,
  ],
  sponsor: [
    {
      title: "Sponsor",
      domainColor: "hsl(38, 92%, 50%)",
      items: [
        { label: "Sponsor Portal", icon: Building2, path: "/sponsor-portal" },
      ],
    },
    accountSection,
  ],
};

// ── Role display labels and portal subtitles ──────────────────────────────────
const roleDisplayConfig: Partial<Record<AppRole, { label: string; subtitle: string; color: string }>> = {
  super_admin:       { label: "Super Admin",        subtitle: "Platform Control",      color: "hsl(0,84%,60%)" },
  systems_admin:     { label: "Systems Admin",       subtitle: "System Management",     color: "hsl(0,84%,60%)" },
  programme_manager: { label: "Programme Manager",   subtitle: "Programme Oversight",   color: "hsl(38,92%,50%)" },
  facilitator:       { label: "Facilitator",         subtitle: "Session Delivery",      color: "hsl(210,80%,55%)" },
  assessor:          { label: "Assessor",            subtitle: "Assessment & Marking",  color: "hsl(210,80%,55%)" },
  moderator:         { label: "Moderator",           subtitle: "Quality Assurance",     color: "hsl(142,71%,45%)" },
  mentor:            { label: "Mentor",              subtitle: "Learner Mentoring",     color: "hsl(270,70%,60%)" },
  learner:           { label: "Learner",             subtitle: "My Learning Journey",   color: "hsl(210,80%,55%)" },
  sponsor:           { label: "Sponsor",             subtitle: "Sponsorship Overview",  color: "hsl(38,92%,50%)" },
  operations:        { label: "Operations",          subtitle: "Operational Control",   color: "hsl(38,92%,50%)" },
  talent_manager:    { label: "Talent Manager",      subtitle: "Talent Pipeline",       color: "hsl(38,92%,50%)" },
};

// Fallback for any role not in the map above
const allSectionsDefault: NavSection[] = [
  technicalSection,
  operationsSection,
  staffManagementSection,
  programmeSection,
  learningDesignSection,
  deliverySection,
  talentSponsorSection,
  learningSection,
  accountSection,
];

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
  const primaryRole = typedRoles[0] ?? null;
  const roleConfig = primaryRole ? roleDisplayConfig[primaryRole] : null;

  // Use role-specific section set if available, otherwise fall back to full set
  const baseSections = (primaryRole && roleSectionMap[primaryRole]) ?? allSectionsDefault;

  const sections: NavSection[] = baseSections
    .map(s => ({ ...s, items: filterByRole(s.items, typedRoles) }))
    .filter(s => s.items.length > 0);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : (primaryRole ? primaryRole[0].toUpperCase() : "U");

  const displayName = profile?.full_name || "User";
  const roleLabel = roleConfig?.label ?? (primaryRole ? primaryRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "User");
  const roleSubtitle = roleConfig?.subtitle ?? "";
  const roleAccentColor = roleConfig?.color ?? "hsl(var(--primary))";

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
          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 group",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className={cn(
          "w-4 h-4 shrink-0 transition-colors",
          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
        )} />
        {!collapsed && (
          <span className="animate-fade-in truncate flex-1">{item.label}</span>
        )}
        {isActive && !collapsed && (
          <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
        )}
        {item.badge && !collapsed && (
          <span className="ml-auto text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Header / Branding */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        {headerLogo ? (
          <img src={headerLogo} alt="Logo" className="h-8 object-contain" style={{ maxWidth: `${headerLogoWidth}px` }} />
        ) : (
          <>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sidebar-primary shrink-0">
              <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0">
                <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight truncate">INTELA SKILLCHAIN</h1>
                <p className="text-[9px] text-sidebar-foreground/40 uppercase tracking-widest truncate">Enterprise LXP</p>
              </div>
            )}
          </>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-sidebar-accent/30 transition-colors shrink-0"
        >
          <X className="w-4 h-4 text-sidebar-foreground" />
        </button>
      </div>

      {/* Role context chip */}
      {!collapsed && roleConfig && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg border border-sidebar-border/50 bg-sidebar-accent/20 flex items-center gap-2.5 animate-fade-in">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: roleAccentColor }} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-sidebar-accent-foreground truncate">{roleLabel}</p>
            <p className="text-[9px] text-sidebar-foreground/50 uppercase tracking-wider truncate">{roleSubtitle}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 min-h-0">
        {sections.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <div className="my-2 border-t border-sidebar-border/40" />}
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section.domainColor }} />
                <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/35 font-semibold truncate">
                  {section.title}
                </p>
              </div>
            )}
            {section.items.map(renderNavItem)}
          </div>
        ))}
      </nav>

      {/* User card + Sign out */}
      <div className="px-2 pb-3 pt-2 border-t border-sidebar-border/50 shrink-0 space-y-1">
        <button
          onClick={() => navigate("/profile/me")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sidebar-accent/40 transition-colors group",
            collapsed && "justify-center"
          )}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-sidebar-primary/30" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-offset-1 ring-offset-sidebar transition-colors"
              style={{ backgroundColor: roleAccentColor, color: "white", ringColor: roleAccentColor }}
            >
              {initials}
            </div>
          )}
          {!collapsed && (
            <div className="animate-fade-in min-w-0 text-left flex-1">
              <p className="text-[13px] font-semibold text-sidebar-accent-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{roleLabel}</p>
            </div>
          )}
        </button>

        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors text-[13px] font-medium",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="animate-fade-in">Sign Out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center py-1.5 rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
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

      <aside className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-[56px]" : "w-[230px]"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
}
