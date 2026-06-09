import {
  LayoutDashboard, User, BookOpen, FileCheck, Award, Video,
  GraduationCap, Users, Route, BarChart3, Briefcase, Handshake,
  ClipboardCheck, ShieldCheck, Heart, FolderKanban, Activity,
  Cog, Settings, Shield, Building2, UserPlus, Layers,
  Bell, Calendar, TrendingUp, Target, Star,
  Flag, ListChecks, History, Database,
  Plug, FileBarChart, Inbox, CheckSquare, UserCheck, MessagesSquare,
  AlertTriangle, Gauge, Lock, ToggleLeft, FileText, PieChart,
  Upload, Server, Eye, Type, Workflow, QrCode, CalendarCheck,
  DollarSign, Sparkles, Globe, Trophy, Palette, FlaskConical,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

export type AppRole =
  | "super_admin" | "systems_admin"
  | "programme_manager" | "operations" | "talent_manager" | "sponsor"
  | "facilitator" | "assessor" | "moderator" | "mentor" | "learner"
  | "ld_support_officer";

export type DomainKey = "technical" | "business" | "learning_development";

export interface DomainNavItem {
  label: string;
  icon: any;
  path: string;
  roles?: AppRole[];
  /** Optional feature flag key — if set and the flag is disabled for the active tenant, the item is hidden. */
  flag?: string;
}

/**
 * Path-prefix → feature flag map. Lets us gate items in the nav without
 * tagging every single entry in the giant config below. The most-specific
 * prefix wins (longest match).
 */
const PATH_FLAG_MAP: Array<[string, string]> = [
  ["/programmes",              "module_programmes"],
  ["/programme-builder",       "module_programmes"],
  ["/admin/programme-types",   "module_programmes"],
  ["/assessments",             "module_assessments"],
  ["/assessment-analytics",    "module_assessments"],
  ["/assessment-coverage",     "module_assessments"],
  ["/cohort-management",       "module_cohorts"],
  ["/cohorts",                 "module_cohorts"],
  ["/credentials",             "module_credentials"],
  ["/wbt",                     "module_wbt"],
  ["/agile-wbt",               "module_wbt"],
  ["/sponsors",                "module_sponsors"],
  ["/sponsor",                 "module_sponsors"],
  ["/sponsor-portal",          "module_sponsors"],
  ["/provider/quotes",         "module_sponsors"],
  ["/mentor",                  "module_mentors"],
  ["/mentors",                 "module_mentors"],
  ["/lxp",                     "module_lxp"],
  ["/lxp-analytics",           "module_lxp"],
  ["/content-library",         "module_lxp"],
  ["/shared-content",          "module_lxp"],
  ["/content-contributions",   "module_lxp"],
  ["/gamification",            "module_gamification"],
  ["/admin/workflows",         "module_workflow_engine"],
  ["/analytics",               "module_analytics"],
  ["/admin/popia",             "compliance_popia"],
];

/** Resolve the implicit feature flag for a path, if any. */
export function resolveFlagForPath(path: string): string | undefined {
  // strip query
  const clean = path.split("?")[0];
  let best: { len: number; flag: string } | null = null;
  for (const [prefix, flag] of PATH_FLAG_MAP) {
    if (clean === prefix || clean.startsWith(prefix + "/")) {
      if (!best || prefix.length > best.len) best = { len: prefix.length, flag };
    }
  }
  return best?.flag;
}

export interface DomainNavSection {
  title: string;
  items: DomainNavItem[];
}

export interface DomainPortalConfig {
  portalTitle: string;
  subtitle: string;
  domainColor: string;
  sections: DomainNavSection[];
}

// ─── Role → Domain mapping ──────────────────────────────────────────

const roleToDomain: Record<AppRole, DomainKey> = {
  super_admin:        "technical",
  systems_admin:      "technical",
  programme_manager:  "business",
  operations:         "business",
  talent_manager:     "business",
  sponsor:            "business",
  facilitator:        "learning_development",
  assessor:           "learning_development",
  moderator:          "learning_development",
  mentor:             "learning_development",
  learner:            "learning_development",
  ld_support_officer: "learning_development",
};

// ─── Dashboard path per role ────────────────────────────────────────

const roleDashboardPath: Record<AppRole, string> = {
  super_admin:        "/dashboard",
  systems_admin:      "/systems-admin",
  programme_manager:  "/programme-manager",
  operations:         "/operations",
  talent_manager:     "/talent-manager",
  sponsor:            "/sponsor-portal",
  facilitator:        "/facilitator",
  assessor:           "/assessor",
  moderator:          "/moderator",
  mentor:             "/mentor",
  learner:            "/learner",
  ld_support_officer: "/ld-support",
};

// ══════════════════════════════════════════════════════════════════════
// DOMAIN PORTAL CONFIGURATIONS
// ══════════════════════════════════════════════════════════════════════

export const domainPortals: Record<DomainKey, DomainPortalConfig> = {

  // ══════════════════════════════════════════════════════════════════
  // 🔴 TECHNICAL DOMAIN
  // ══════════════════════════════════════════════════════════════════
  technical: {
    portalTitle: "TECHNICAL PORTAL",
    subtitle: "Platform Administration",
    domainColor: "hsl(0, 84%, 60%)",
    sections: [
      // ── Super Admin ──
      {
        title: "Overview",
        items: [
          { label: "System Dashboard", icon: LayoutDashboard, path: "__DASHBOARD__", roles: ["super_admin"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["super_admin"] },
          { label: "Platform Health", icon: Activity, path: "/admin/system-health", roles: ["super_admin"] },
          { label: "Executive Dashboard", icon: TrendingUp, path: "/executive-dashboard", roles: ["super_admin", "operations"] },
          { label: "Audit Logs", icon: History, path: "/admin/audit-logs", roles: ["super_admin"] },
          { label: "Unified Audit Trail", icon: History, path: "/admin/unified-audit", roles: ["super_admin"] },
        ],
      },
      {
        title: "User Management",
        items: [
          { label: "User Directory",   icon: Users,     path: "/admin/users",       roles: ["super_admin"] },
          { label: "Roles & Permissions", icon: Shield, path: "/admin/roles",       roles: ["super_admin"] },
          { label: "Staff Onboarding", icon: Briefcase, path: "/staff/onboarding",  roles: ["super_admin"] },
          { label: "Admin Staff Pool",      icon: Users,    path: "/admin/staff-pool", roles: ["super_admin"] },
          { label: "L&D Practitioner Pool", icon: BookOpen, path: "/ld-pool",          roles: ["super_admin"] },
        ],
      },
      {
        title: "Governance",
        items: [
          { label: "Approval Queue", icon: CheckSquare, path: "/approvals", roles: ["super_admin"] },
          { label: "Delegation Management", icon: UserCheck, path: "/admin/settings?tab=delegation", roles: ["super_admin"] },
          { label: "Override Controls", icon: Lock, path: "/admin/settings?tab=override", roles: ["super_admin"] },
          { label: "Feature Flags", icon: ToggleLeft, path: "/admin/settings?tab=flags", roles: ["super_admin"] },
          { label: "Workflow Engine", icon: Workflow, path: "/admin/workflows", roles: ["super_admin"] },
        ],
      },
      {
        title: "System Configuration",
        items: [
          { label: "Platform Settings", icon: Settings, path: "/admin/settings", roles: ["super_admin"] },
          { label: "Programme Types", icon: Layers, path: "/admin/programme-types", roles: ["super_admin"] },
          { label: "Typography", icon: Type, path: "/admin/typography", roles: ["super_admin"] },
          { label: "Multi-Tenancy", icon: Building2, path: "/admin/tenants", roles: ["super_admin"] },
          { label: "Tenant Admin Portal", icon: ShieldCheck, path: "/tenant-admin", roles: ["super_admin"] },
          { label: "Platform Analytics", icon: BarChart3, path: "/admin/platform-analytics", roles: ["super_admin"] },
          { label: "Integrations", icon: Plug, path: "/admin/integrations", roles: ["super_admin"] },
          { label: "Email Configuration", icon: Bell, path: "/admin/settings?tab=email", roles: ["super_admin"] },
          { label: "POPIA Compliance", icon: ShieldCheck, path: "/admin/popia", roles: ["super_admin"] },
          { label: "Design Manager",  icon: Palette,     path: "/admin/design-manager", roles: ["super_admin"] },
          { label: "Test Data Manager", icon: FlaskConical, path: "/admin/test-data",  roles: ["super_admin"] },
        ],
      },

      // ── Systems Admin ──
      {
        title: "Overview",
        items: [
          { label: "System Health", icon: Activity, path: "__DASHBOARD__", roles: ["systems_admin"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["systems_admin"] },
          { label: "Services Monitor", icon: Server, path: "/admin/system-health", roles: ["systems_admin"] },
          { label: "Event Logs", icon: History, path: "/admin/audit-logs", roles: ["systems_admin"] },
          { label: "Unified Audit Trail", icon: History, path: "/admin/unified-audit", roles: ["systems_admin"] },
        ],
      },
      {
        title: "Infrastructure",
        items: [
          { label: "Database Management", icon: Database,    path: "/admin/settings?tab=database", roles: ["systems_admin"] },
          { label: "Integrations",        icon: Plug,        path: "/admin/integrations",          roles: ["systems_admin"] },
          { label: "Security Settings",   icon: Lock,        path: "/admin/settings?tab=security", roles: ["systems_admin"] },
          { label: "Feature Flags",       icon: ToggleLeft,  path: "/admin/settings?tab=flags",    roles: ["systems_admin"] },
          { label: "Design Manager",      icon: Palette,     path: "/admin/design-manager",        roles: ["systems_admin"] },
        ],
      },
      {
        title: "Staff Management",
        items: [
          { label: "Staff Onboarding", icon: Briefcase, path: "/staff/onboarding",  roles: ["systems_admin"] },
          { label: "Admin Staff Pool", icon: Users,     path: "/admin/staff-pool",  roles: ["systems_admin"] },
        ],
      },

      // ── Shared ──
      {
        title: "Account",
        items: [
          { label: "My Profile", icon: User, path: "/my-profile" },
          { label: "My Settings", icon: Settings, path: "/my-settings" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 🟠 BUSINESS / OPERATIONAL DOMAIN
  // ══════════════════════════════════════════════════════════════════
  business: {
    portalTitle: "BUSINESS PORTAL",
    subtitle: "Operations & Management",
    domainColor: "hsl(38, 92%, 50%)",
    sections: [
      // ── Operations Control ──
      {
        title: "Overview",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, path: "__DASHBOARD__", roles: ["operations"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["operations"] },
          { label: "KPI Dashboard", icon: Gauge, path: "/analytics", roles: ["operations"] },
          { label: "Executive Dashboard", icon: TrendingUp, path: "/executive-dashboard", roles: ["operations"] },
          { label: "Reports & Analytics", icon: BarChart3, path: "/analytics", roles: ["operations"] },
          { label: "Gradebook", icon: GraduationCap, path: "/gradebook", roles: ["operations"] },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Approval Queue", icon: CheckSquare, path: "/approvals", roles: ["operations"] },
          { label: "SLA Tracking", icon: AlertTriangle, path: "/operations", roles: ["operations"] },
          { label: "Escalations", icon: Flag, path: "/operations", roles: ["operations"] },
          { label: "Announcements", icon: Bell, path: "/announcements", roles: ["operations"] },
          { label: "Workflow Engine", icon: Workflow, path: "/admin/workflows", roles: ["operations"] },
        ],
      },
      {
        title: "Programme Oversight",
        items: [
          { label: "Programme Hub", icon: Layers, path: "/programmes", roles: ["operations"] },
          { label: "Programme Types", icon: Cog, path: "/programme-types", roles: ["operations"] },
        ],
      },
      {
        title: "Learner Pipeline",
        items: [
          { label: "Learner Onboarding", icon: UserPlus, path: "/learner/onboarding", roles: ["operations"] },
          { label: "Funded Learners", icon: Users, path: "/sponsor/learners", roles: ["operations"] },
          { label: "Credential Oversight", icon: Award, path: "/credentials", roles: ["operations"] },
        ],
      },
      {
        title: "Compliance & Sponsors",
        items: [
          { label: "SD & ED Compliance", icon: Shield, path: "/sponsor/compliance", roles: ["operations"] },
          { label: "Sponsor Management", icon: Building2, path: "/sponsors", roles: ["operations"] },
          { label: "Sponsor Onboarding", icon: UserPlus, path: "/sponsor/onboarding", roles: ["operations"] },
          { label: "Sponsor Linking", icon: Handshake, path: "/sponsor/linking", roles: ["operations"] },
        ],
      },
      {
        title: "Financial",
        items: [
          { label: "Quote Management", icon: FileText, path: "/provider/quotes", roles: ["operations"] },
          { label: "Invoice Overview", icon: DollarSign, path: "/sponsor/invoices", roles: ["operations"] },
        ],
      },
      {
        title: "User Management",
        items: [
          { label: "User Directory", icon: Users, path: "/admin/users", roles: ["operations"] },
          { label: "Roles & Permissions", icon: Shield, path: "/admin/roles", roles: ["operations"] },
          { label: "Staff Onboarding", icon: Briefcase, path: "/staff/onboarding", roles: ["operations"] },
        ],
      },
      {
        title: "Staff Management",
        items: [
          { label: "Admin Staff Pool",      icon: Users,       path: "/admin/staff-pool", roles: ["operations"] },
          { label: "L&D Practitioner Pool", icon: BookOpen,    path: "/ld-pool",          roles: ["operations"] },
          { label: "Staff Onboarding",      icon: Briefcase,   path: "/staff/onboarding", roles: ["operations"] },
          { label: "Staff Compliance",      icon: ShieldCheck, path: "/sponsor/compliance",roles: ["operations"] },
        ],
      },

      // ── Programme Manager ──
      {
        title: "Programme Setup",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, path: "__DASHBOARD__", roles: ["programme_manager"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["programme_manager"] },
          { label: "Programme Hub", icon: GraduationCap, path: "/programmes", roles: ["programme_manager"] },
          { label: "Programme Types", icon: Layers, path: "/programme-types", roles: ["programme_manager"] },
          { label: "Cohort Management", icon: Users, path: "/cohort-management", roles: ["programme_manager"] },
          { label: "Cohorts", icon: Layers, path: "/cohorts", roles: ["programme_manager"] },
          { label: "Timetable", icon: Calendar, path: "/sessions", roles: ["programme_manager"] },
        ],
      },
      {
        title: "Learning Design",
        items: [
          { label: "Learning Tracks", icon: Route, path: "/pathways", roles: ["programme_manager"] },
          { label: "Learning Hub", icon: BookOpen, path: "/modules", roles: ["programme_manager"] },
          { label: "Assessment Builder", icon: ClipboardCheck, path: "/assessments", roles: ["programme_manager"] },
          { label: "Portfolio of Evidence", icon: FolderKanban, path: "/portfolio", roles: ["programme_manager"] },
        ],
      },
      {
        title: "Delivery & Monitoring",
        items: [
          { label: "Assessment Analytics", icon: BarChart3, path: "/assessment-analytics", roles: ["programme_manager"] },
          { label: "Coverage Report", icon: Target, path: "/assessment-coverage", roles: ["programme_manager"] },
          { label: "Learner Comparison", icon: Users, path: "/learner-comparison", roles: ["programme_manager"] },
          { label: "Programme Analytics", icon: PieChart, path: "/analytics", roles: ["programme_manager"] },
          { label: "LXP Analytics", icon: Sparkles, path: "/lxp-analytics", roles: ["programme_manager"] },
          { label: "Credential Issuance", icon: Award, path: "/credentials", roles: ["programme_manager"] },
          { label: "Gradebook", icon: GraduationCap, path: "/gradebook", roles: ["programme_manager"] },
          { label: "Transcript Viewer", icon: FileText, path: "/transcript", roles: ["programme_manager"] },
          { label: "Attendance Compliance", icon: CalendarCheck, path: "/attendance-compliance", roles: ["programme_manager"] },
        ],
      },
      {
        title: "LXP Management",
        items: [
          { label: "Skills Architecture", icon: Target, path: "/skills", roles: ["programme_manager"] },
          { label: "Content Library", icon: Globe, path: "/content-library", roles: ["programme_manager"] },
          { label: "Content Contributions", icon: Upload, path: "/content-contributions", roles: ["programme_manager"] },
          { label: "Shared Content Library", icon: FolderKanban, path: "/shared-content", roles: ["programme_manager"] },
          { label: "Challenge Exams", icon: Trophy, path: "/challenge-exams", roles: ["programme_manager"] },
        ],
      },
      {
        title: "Financial",
        items: [
          { label: "Quote Management", icon: FileText, path: "/provider/quotes", roles: ["programme_manager"] },
        ],
      },
      {
        title: "Learner Pipeline",
        items: [
          { label: "Learner Onboarding", icon: UserPlus, path: "/learner/onboarding", roles: ["programme_manager"] },
        ],
      },
      {
        title: "Staff Management",
        items: [
          { label: "Admin Staff Pool",      icon: Users,    path: "/admin/staff-pool", roles: ["programme_manager"] },
          { label: "L&D Practitioner Pool", icon: BookOpen, path: "/ld-pool",          roles: ["programme_manager"] },
        ],
      },

      // ── Talent Manager ──
      {
        title: "Overview",
        items: [
          { label: "Talent Dashboard",    icon: LayoutDashboard, path: "__DASHBOARD__",  roles: ["talent_manager"] },
          { label: "Calendar",            icon: Calendar,         path: "/calendar",      roles: ["talent_manager"] },
          { label: "Workforce Analytics", icon: BarChart3,        path: "/analytics",     roles: ["talent_manager"] },
        ],
      },
      {
        title: "Workforce",
        items: [
          { label: "Talent Pipeline",     icon: TrendingUp,  path: "/talent",           roles: ["talent_manager"] },
          { label: "Skills Gap Analysis", icon: PieChart,    path: "/talent",           roles: ["talent_manager"] },
          { label: "Succession Planning", icon: Users,       path: "/talent",           roles: ["talent_manager"] },
          { label: "Admin Staff Pool",    icon: Briefcase,   path: "/admin/staff-pool", roles: ["talent_manager"] },
          { label: "L&D Practitioner Pool", icon: UserCheck, path: "/ld-pool",          roles: ["talent_manager"] },
        ],
      },
      {
        title: "Learner Tracking",
        items: [
          { label: "Learner Progress",        icon: BarChart3,   path: "/analytics",    roles: ["talent_manager"] },
          { label: "Completion Reports",      icon: FileBarChart,path: "/analytics",    roles: ["talent_manager"] },
          { label: "Credential Verification", icon: Award,       path: "/credentials",  roles: ["talent_manager"] },
        ],
      },
      {
        title: "Governance",
        items: [
          // Talent Manager now has visibility of approval queue (read-only, for programme oversight)
          { label: "Approval Queue",          icon: CheckSquare, path: "/approvals",    roles: ["talent_manager"] },
          { label: "Learner Onboarding",      icon: UserPlus,    path: "/learner/onboarding", roles: ["talent_manager"] },
        ],
      },

      // ── Sponsor ──
      {
        title: "Overview",
        items: [
          { label: "Sponsor Dashboard", icon: Target, path: "__DASHBOARD__", roles: ["sponsor"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["sponsor"] },
          { label: "Notifications", icon: Bell, path: "/sponsor/notifications", roles: ["sponsor"] },
          { label: "Investment Summary", icon: BarChart3, path: "/sponsor/reports", roles: ["sponsor"] },
        ],
      },
      {
        title: "My Learners",
        items: [
          { label: "Sponsored Learners", icon: Users, path: "/sponsor/learners", roles: ["sponsor"] },
          { label: "Progress Tracking", icon: TrendingUp, path: "/sponsor/learners", roles: ["sponsor"] },
          { label: "Completion Reports", icon: FileBarChart, path: "/sponsor/reports", roles: ["sponsor"] },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Messages", icon: MessagesSquare, path: "/sponsor/messages", roles: ["sponsor"] },
        ],
      },
      {
        title: "Funding",
        items: [
          { label: "Quotes & Agreements", icon: FileText, path: "/sponsor/quotes", roles: ["sponsor"] },
          { label: "Invoices & Payments", icon: DollarSign, path: "/sponsor/invoices", roles: ["sponsor"] },
        ],
      },
      {
        title: "Compliance",
        items: [
          { label: "SD & ED Reports", icon: Shield, path: "/sponsor/compliance", roles: ["sponsor"] },
          { label: "B-BBEE Scorecard", icon: FileBarChart, path: "/sponsor/compliance", roles: ["sponsor"] },
          { label: "Evidence Upload", icon: Upload, path: "/sponsor/compliance", roles: ["sponsor"] },
        ],
      },

      // ── Shared ──
      {
        title: "Account",
        items: [
          { label: "My Profile", icon: User, path: "/my-profile" },
          { label: "Sponsor Profile", icon: User, path: "/sponsor/profile", roles: ["sponsor"] },
          { label: "My Settings", icon: Settings, path: "/my-settings" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // 🔵 LEARNING & DEVELOPMENT DOMAIN
  // ══════════════════════════════════════════════════════════════════
  learning_development: {
    portalTitle: "L&D PORTAL",
    subtitle: "Learning & Development",
    domainColor: "hsl(210, 80%, 55%)",
    sections: [
      // ── Facilitator ──
      {
        title: "Overview",
        items: [
          { label: "My Dashboard", icon: LayoutDashboard, path: "__DASHBOARD__", roles: ["facilitator"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["facilitator"] },
          { label: "Upcoming Sessions", icon: Video, path: "/sessions", roles: ["facilitator"] },
        ],
      },
      {
        title: "My Cohorts",
        items: [
          { label: "Cohort Management", icon: Users, path: "/cohort-management", roles: ["facilitator"] },
          { label: "Learner Progress", icon: TrendingUp, path: "/facilitator/learner-progress", roles: ["facilitator"] },
          { label: "Learner Engagement", icon: Heart, path: "/facilitator/engagement", roles: ["facilitator"] },
          { label: "Attendance Tracking", icon: ListChecks, path: "/sessions", roles: ["facilitator"] },
          { label: "Attendance Compliance", icon: CalendarCheck, path: "/attendance-compliance", roles: ["facilitator"] },
        ],
      },
      {
        title: "Assessments",
        items: [
          // Fixed: was both pointing to /assessments (admin bulk page).
          // Facilitator → Gradebook for submission review & grade entry
          { label: "Gradebook & Grading", icon: GraduationCap, path: "/gradebook",    roles: ["facilitator"] },
          { label: "Attendance Compliance",icon: CalendarCheck, path: "/attendance-compliance", roles: ["facilitator"] },
        ],
      },
      {
        title: "Collaboration",
        items: [
          { label: "Announcements",    icon: Bell,          path: "/announcements",    roles: ["facilitator"] },
          { label: "Discussion Forums",icon: MessagesSquare, path: "/discussions",      roles: ["facilitator"] },
          { label: "Session Room",     icon: Video,         path: "/sessions",          roles: ["facilitator"] },
        ],
      },
      {
        title: "Financial",
        items: [
          { label: "Quote Management", icon: FileText, path: "/provider/quotes", roles: ["facilitator", "assessor", "moderator", "mentor"] },
        ],
      },

      // ── Assessor ──
      {
        title: "Overview",
        items: [
          { label: "My Dashboard",      icon: LayoutDashboard, path: "__DASHBOARD__",   roles: ["assessor"] },
          { label: "Calendar",          icon: Calendar,        path: "/calendar",        roles: ["assessor"] },
          { label: "Upcoming Sessions", icon: Video,           path: "/sessions",        roles: ["assessor"] },
        ],
      },
      {
        title: "Grading",
        items: [
          // Fixed: Assessment Queue points to /assessor/queue (was correct already)
          { label: "Assessment Queue",  icon: FileCheck,     path: "/assessor/queue",          roles: ["assessor"] },
          { label: "Gradebook",         icon: GraduationCap, path: "/gradebook",               roles: ["assessor"] },
          { label: "Assessment History",icon: History,       path: "/assessor/history",        roles: ["assessor"] },
        ],
      },
      {
        title: "Learners",
        items: [
          // Assessor can view learner progress and engagement (shared pages from facilitator)
          { label: "Learner Progress",  icon: TrendingUp,    path: "/facilitator/learner-progress", roles: ["assessor"] },
          { label: "Learner Engagement",icon: Heart,         path: "/facilitator/engagement",       roles: ["assessor"] },
          { label: "Cohort Management", icon: Users,         path: "/cohort-management",            roles: ["assessor"] },
        ],
      },
      {
        title: "Reports",
        items: [
          { label: "Assessor Report",   icon: FileBarChart, path: "/assessor/report",          roles: ["assessor"] },
          { label: "Report Templates",  icon: FileText,     path: "/assessor/report-templates", roles: ["assessor", "super_admin", "systems_admin"] },
        ],
      },

      // ── Moderator ──
      {
        title: "Overview",
        items: [
          { label: "Moderation Dashboard", icon: LayoutDashboard, path: "__DASHBOARD__", roles: ["moderator"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["moderator"] },
          { label: "Quality Metrics", icon: BarChart3, path: "/moderator/reports", roles: ["moderator"] },
        ],
      },
      {
        title: "Moderation Queue",
        items: [
          { label: "Pending Items", icon: Flag, path: "/moderator/queue", roles: ["moderator"] },
          { label: "Moderation History", icon: History, path: "/moderator/queue?tab=history", roles: ["moderator"] },
          { label: "Gradebook Review", icon: GraduationCap, path: "/gradebook", roles: ["moderator"] },
          { label: "QA Reports", icon: FileBarChart, path: "/moderator/reports", roles: ["moderator"] },
          { label: "QA Report Generator", icon: FileText, path: "/moderator/qa-report", roles: ["moderator"] },
        ],
      },
      {
        title: "Collaboration",
        items: [
          { label: "Discussion Forums", icon: MessagesSquare, path: "/discussions", roles: ["moderator"] },
          { label: "Session Room", icon: Video, path: "/sessions", roles: ["moderator"] },
        ],
      },
      {
        title: "Resources",
        items: [
          { label: "Announcements", icon: Bell, path: "/announcements", roles: ["moderator"] },
        ],
      },
      {
        title: "Credentials",
        items: [
          { label: "My Credentials", icon: Award, path: "/credentials", roles: ["moderator"] },
        ],
      },

      // ── Mentor ──
      {
        title: "Overview",
        items: [
          { label: "Mentor Dashboard", icon: LayoutDashboard, path: "__DASHBOARD__", roles: ["mentor"] },
          { label: "Calendar", icon: Calendar, path: "/calendar", roles: ["mentor"] },
        ],
      },
      {
        title: "My Mentees",
        items: [
          { label: "Mentee List", icon: Users, path: "/mentor/mentees", roles: ["mentor"] },
          { label: "Goals & Plans", icon: Target, path: "/mentor/goals", roles: ["mentor"] },
          { label: "Evidence Review", icon: UserCheck, path: "/mentor/evidence", roles: ["mentor"] },
        ],
      },
      {
        title: "Communication",
        items: [
          { label: "Sessions", icon: Calendar, path: "/mentor/sessions", roles: ["mentor"] },
          { label: "Messages", icon: MessagesSquare, path: "/mentor/messages", roles: ["mentor"] },
          { label: "Assessor Feedback", icon: FileText, path: "/mentor/feedback", roles: ["mentor"] },
        ],
      },

      // ── Learner ──
      {
        title: "My Learning",
        items: [
          { label: "Dashboard",      icon: LayoutDashboard, path: "__DASHBOARD__",        roles: ["learner"] },
          { label: "My Programmes",  icon: BookOpen,         path: "/learner/programmes",  roles: ["learner"] },
          { label: "My Sessions",    icon: Video,            path: "/learner/sessions",    roles: ["learner"] },
        ],
      },
      {
        title: "Assessments & Progress",
        items: [
          { label: "My Assessments",        icon: FileCheck,    path: "/learner/assessments", roles: ["learner"] },
          { label: "My Grades",             icon: GraduationCap,path: "/learner/grades",      roles: ["learner"] },
          { label: "Portfolio of Evidence", icon: FolderKanban, path: "/portfolio",            roles: ["learner"] },
          { label: "Transcript",            icon: FileText,     path: "/transcript",           roles: ["learner"] },
        ],
      },
      {
        title: "Credentials & Badges",
        items: [
          { label: "My Credentials", icon: Award,  path: "/credentials",  roles: ["learner"] },
          { label: "Achievements",   icon: Trophy, path: "/achievements", roles: ["learner"] },
        ],
      },
      {
        title: "Discover",
        items: [
          { label: "Content Library",   icon: Globe,   path: "/content-library",       roles: ["learner"] },
          { label: "Skills Profile",    icon: Target,  path: "/skills",                roles: ["learner"] },
          { label: "Contribute Content",icon: Upload,  path: "/content-contributions", roles: ["learner"] },
        ],
      },
      {
        title: "Community",
        items: [
          // Fix: was /announcements (admin AnnouncementsManager) — must be /learner/announcements
          { label: "Announcements",    icon: Bell,          path: "/learner/announcements", roles: ["learner"] },
          { label: "Discussion Forums",icon: MessagesSquare,path: "/discussions",            roles: ["learner"] },
          { label: "Calendar",         icon: Calendar,      path: "/calendar",               roles: ["learner"] },
        ],
      },
      {
        title: "Account",
        items: [
          { label: "My Profile",  icon: User,     path: "/learner/profile/me", roles: ["learner"] },
          { label: "My Settings", icon: Settings, path: "/my-settings",        roles: ["learner"] },
        ],
      },

      // ── L&D Support Officer ──
      {
        title: "Overview",
        items: [
          { label: "Dashboard",          icon: LayoutDashboard, path: "__DASHBOARD__",           roles: ["ld_support_officer"] },
          { label: "Calendar",           icon: Calendar,        path: "/calendar",               roles: ["ld_support_officer"] },
          { label: "Upcoming Sessions",  icon: Video,           path: "/sessions",               roles: ["ld_support_officer"] },
          { label: "Announcements",      icon: Bell,            path: "/announcements",          roles: ["ld_support_officer"] },
        ],
      },
      {
        title: "Programme Support",
        items: [
          { label: "Cohort Overview",    icon: Users,           path: "/cohort-management",      roles: ["ld_support_officer"] },
          { label: "Timetable",          icon: Calendar,        path: "/sessions",               roles: ["ld_support_officer"] },
          { label: "Learner List",       icon: GraduationCap,   path: "/learner/onboarding",     roles: ["ld_support_officer"] },
          { label: "Attendance Sheets",  icon: ListChecks,      path: "/sessions",               roles: ["ld_support_officer"] },
        ],
      },
      {
        title: "Administrative Tasks",
        items: [
          { label: "Documents & Files",  icon: FileText,        path: "/portfolio",              roles: ["ld_support_officer"] },
          { label: "Discussion Forums",  icon: MessagesSquare,  path: "/discussions",            roles: ["ld_support_officer"] },
          { label: "Quote Management",   icon: FileText,        path: "/provider/quotes",        roles: ["ld_support_officer"] },
        ],
      },

      // ── Shared ──
      {
        title: "Account",
        items: [
          { label: "My Profile", icon: User,     path: "/my-profile" },
          { label: "My Settings", icon: Settings, path: "/my-settings" },
        ],
      },
    ],
  },
};

// ─── Helper functions ───────────────────────────────────────────────

export function getDomainForRole(role: AppRole): DomainKey {
  return roleToDomain[role];
}

export function getDashboardPath(role: AppRole): string {
  return roleDashboardPath[role];
}

export function getRoleBadge(role: AppRole): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function getDomainPortalForUser(roles: string[]): {
  config: DomainPortalConfig;
  domain: DomainKey;
  userRoles: AppRole[];
} | null {
  if (roles.length === 0) return null;

  const typedRoles = roles as AppRole[];
  const domains = new Set(typedRoles.map(r => roleToDomain[r]).filter(Boolean));

  if (domains.size !== 1) return null;

  const domain = [...domains][0];
  return {
    config: domainPortals[domain],
    domain,
    userRoles: typedRoles,
  };
}

const rolePortalOverrides: Partial<Record<AppRole, { portalTitle: string; subtitle: string }>> = {
  super_admin:        { portalTitle: "SUPER ADMIN",           subtitle: "Platform Oversight" },
  systems_admin:      { portalTitle: "SYSTEMS ADMIN",         subtitle: "Infrastructure Management" },
  programme_manager:  { portalTitle: "PROGRAMME MANAGER",     subtitle: "Content & Delivery Management" },
  operations:         { portalTitle: "OPERATIONS CONTROL",    subtitle: "Operational Oversight" },
  talent_manager:     { portalTitle: "TALENT MANAGEMENT",     subtitle: "Workforce Development" },
  learner:            { portalTitle: "LEARNER PORTAL",        subtitle: "My Learning Journey" },
  facilitator:        { portalTitle: "FACILITATOR PORTAL",    subtitle: "Teaching & Facilitation" },
  assessor:           { portalTitle: "ASSESSOR PORTAL",       subtitle: "Assessment & Grading" },
  moderator:          { portalTitle: "MODERATOR PORTAL",      subtitle: "Quality Assurance" },
  mentor:             { portalTitle: "MENTOR PORTAL",         subtitle: "Guidance & Support" },
  sponsor:            { portalTitle: "SPONSOR PORTAL",        subtitle: "Investment & Oversight" },
  ld_support_officer: { portalTitle: "L&D SUPPORT",          subtitle: "Learning & Development Administration" },
};

export function getPersonalizedPortalConfig(
  config: DomainPortalConfig,
  userRoles: AppRole[]
): DomainPortalConfig {
  if (userRoles.length === 1) {
    const override = rolePortalOverrides[userRoles[0]];
    if (override) {
      return { ...config, ...override };
    }
  }
  return config;
}

export function detectRoleFromPath(
  config: DomainPortalConfig,
  pathname: string,
  search: string,
  candidateRoles: AppRole[]
): AppRole | null {
  const fullPath = pathname + search;
  for (const role of candidateRoles) {
    for (const section of config.sections) {
      for (const item of section.items) {
        if (!item.roles || !item.roles.includes(role)) continue;
        const resolved = item.path === "__DASHBOARD__" ? getDashboardPath(role) : item.path;
        const hasQuery = resolved.includes("?");
        if (hasQuery && fullPath === resolved) return role;
        if (!hasQuery && (pathname === resolved || (resolved !== "/" && resolved.length > 1 && pathname.startsWith(resolved + "/")))) return role;
      }
    }
  }
  return null;
}

/**
 * Detect which domain a multi-domain user is currently in, based on the URL path.
 */
const pathToDomain: Record<string, DomainKey> = {
  // Technical
  "/dashboard": "technical",
  "/executive-dashboard": "technical",
  "/admin": "technical",
  "/admin/staff-pool":   "technical",
  "/ld-pool":            "business",
  "/programme-types":   "business",
  "/systems-admin": "technical",
  // Business
  "/programme-manager": "business",
  "/operations": "business",
  "/talent-manager": "business",
  "/talent": "business",
  "/sponsor-portal": "business",
  "/sponsor": "business",
  "/sponsors": "business",
  "/programmes": "business",
  "/cohort-management": "business",
  "/approvals": "business",
  "/provider": "business",
  // L&D
  "/learner": "learning_development",
  "/ld-support":          "learning_development",
  "/learner/profile":     "learning_development",
  "/facilitator": "learning_development",
  "/assessor": "learning_development",
  "/moderator": "learning_development",
  "/mentor": "learning_development",
  "/portfolio": "learning_development",
  "/discussions": "learning_development",
  "/sessions": "learning_development",
  "/credentials": "learning_development",
  "/transcript": "learning_development",
  "/calendar": "learning_development",
  "/skills": "learning_development",
  "/content-contributions": "learning_development",
  "/content-library": "learning_development",
  "/lxp-analytics": "business",
};

export function detectDomainFromPath(pathname: string, userRoles: AppRole[]): DomainKey | null {
  // Try exact matches first, then prefix matches
  for (const [prefix, domain] of Object.entries(pathToDomain)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      // Only return this domain if the user actually has roles in it
      const hasRoleInDomain = userRoles.some(r => roleToDomain[r] === domain);
      if (hasRoleInDomain) return domain;
    }
  }
  return null;
}

export function getFilteredSections(
  config: DomainPortalConfig,
  userRoles: AppRole[]
): DomainNavSection[] {
  const dashboardPath = getDashboardPath(userRoles[0]);

  return config.sections
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => {
          if (!item.roles) return true;
          return item.roles.some(r => userRoles.includes(r));
        })
        .map(item => ({
          ...item,
          path: item.path === "__DASHBOARD__" ? dashboardPath : item.path,
        })),
    }))
    .filter(section => section.items.length > 0);
}
