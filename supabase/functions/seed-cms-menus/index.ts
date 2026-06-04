import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All existing platform menus from portalNavConfig
const PLATFORM_MENUS = [
  {
    name: "Technical Portal - Super Admin",
    slug: "technical-super-admin",
    description: "Super Admin navigation menu",
    items: [
      { label: "System Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Platform Health", path: "/admin/system-health", icon: "Activity" },
      { label: "Executive Dashboard", path: "/executive-dashboard", icon: "TrendingUp" },
      { label: "Audit Logs", path: "/admin/audit-logs", icon: "History" },
      { label: "Unified Audit Trail", path: "/admin/unified-audit", icon: "History" },
      { label: "User Directory", path: "/admin/users", icon: "Users" },
      { label: "Roles & Permissions", path: "/admin/roles", icon: "Shield" },
      { label: "Staff Onboarding", path: "/staff/onboarding", icon: "Briefcase" },
      { label: "Approval Queue", path: "/approvals", icon: "CheckSquare" },
      { label: "Delegation Management", path: "/admin/settings?tab=delegation", icon: "UserCheck" },
      { label: "Override Controls", path: "/admin/settings?tab=override", icon: "Lock" },
      { label: "Feature Flags", path: "/admin/settings?tab=flags", icon: "ToggleLeft" },
      { label: "Workflow Engine", path: "/admin/workflows", icon: "Workflow" },
      { label: "Platform Settings", path: "/admin/settings", icon: "Settings" },
      { label: "Programme Types", path: "/admin/programme-types", icon: "Layers" },
      { label: "Typography", path: "/admin/typography", icon: "Type" },
      { label: "Multi-Tenancy", path: "/admin/tenants", icon: "Building2" },
      { label: "Integrations", path: "/admin/integrations", icon: "Plug" },
      { label: "Email Configuration", path: "/admin/settings?tab=email", icon: "Bell" },
      { label: "POPIA Compliance", path: "/admin/popia", icon: "ShieldCheck" },
      { label: "Design Manager", path: "/admin/design-manager", icon: "Palette" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["super_admin"],
  },
  {
    name: "Technical Portal - Systems Admin",
    slug: "technical-systems-admin",
    description: "Systems Admin navigation menu",
    items: [
      { label: "System Health", path: "/systems-admin", icon: "Activity" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Services Monitor", path: "/admin/system-health", icon: "Server" },
      { label: "Event Logs", path: "/admin/audit-logs", icon: "History" },
      { label: "Unified Audit Trail", path: "/admin/unified-audit", icon: "History" },
      { label: "Database Management", path: "/admin/settings?tab=database", icon: "Database" },
      { label: "Integrations", path: "/admin/integrations", icon: "Plug" },
      { label: "Security Settings", path: "/admin/settings?tab=security", icon: "Lock" },
      { label: "Feature Flags", path: "/admin/settings?tab=flags", icon: "ToggleLeft" },
      { label: "Design Manager", path: "/admin/design-manager", icon: "Palette" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["systems_admin"],
  },
  {
    name: "Business Portal - Operations",
    slug: "business-operations",
    description: "Operations Control navigation menu",
    items: [
      { label: "Dashboard", path: "/operations", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "KPI Dashboard", path: "/analytics", icon: "Gauge" },
      { label: "Executive Dashboard", path: "/executive-dashboard", icon: "TrendingUp" },
      { label: "Reports & Analytics", path: "/analytics", icon: "BarChart3" },
      { label: "Approval Queue", path: "/approvals", icon: "CheckSquare" },
      { label: "SLA Tracking", path: "/operations", icon: "AlertTriangle" },
      { label: "Escalations", path: "/operations", icon: "Flag" },
      { label: "Announcements", path: "/announcements", icon: "Bell" },
      { label: "Workflow Engine", path: "/admin/workflows", icon: "Workflow" },
      { label: "Programme Hub", path: "/programmes", icon: "Layers" },
      { label: "Learner Onboarding", path: "/learner/onboarding", icon: "UserPlus" },
      { label: "Funded Learners", path: "/sponsor/learners", icon: "Users" },
      { label: "Credential Oversight", path: "/credentials", icon: "Award" },
      { label: "SD & ED Compliance", path: "/sponsor/compliance", icon: "Shield" },
      { label: "Sponsor Management", path: "/sponsors", icon: "Building2" },
      { label: "Sponsor Onboarding", path: "/sponsor/onboarding", icon: "UserPlus" },
      { label: "Sponsor Linking", path: "/sponsor/linking", icon: "Handshake" },
      { label: "Quote Management", path: "/provider/quotes", icon: "FileText" },
      { label: "Invoice Overview", path: "/sponsor/invoices", icon: "DollarSign" },
      { label: "User Directory", path: "/admin/users", icon: "Users" },
      { label: "Roles & Permissions", path: "/admin/roles", icon: "Shield" },
      { label: "Staff Onboarding", path: "/staff/onboarding", icon: "Briefcase" },
      { label: "Staff Allocation", path: "/staff/onboarding", icon: "Users" },
      { label: "Staff Compliance", path: "/sponsor/compliance", icon: "ShieldCheck" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["operations"],
  },
  {
    name: "Business Portal - Programme Manager",
    slug: "business-programme-manager",
    description: "Programme Manager navigation menu",
    items: [
      { label: "Dashboard", path: "/programme-manager", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Programme Hub", path: "/programmes", icon: "GraduationCap" },
      { label: "Programme Types", path: "/admin/programme-types", icon: "Layers" },
      { label: "Cohort Management", path: "/cohort-management", icon: "Users" },
      { label: "Cohorts", path: "/cohorts", icon: "Layers" },
      { label: "Timetable", path: "/sessions", icon: "Calendar" },
      { label: "Learning Tracks", path: "/pathways", icon: "Route" },
      { label: "Learning Hub", path: "/modules", icon: "BookOpen" },
      { label: "Assessment Builder", path: "/assessments", icon: "ClipboardCheck" },
      { label: "Portfolio of Evidence", path: "/portfolio", icon: "FolderKanban" },
      { label: "Assessment Analytics", path: "/assessment-analytics", icon: "BarChart3" },
      { label: "Coverage Report", path: "/assessment-coverage", icon: "Target" },
      { label: "Learner Comparison", path: "/learner-comparison", icon: "Users" },
      { label: "Programme Analytics", path: "/analytics", icon: "PieChart" },
      { label: "LXP Analytics", path: "/lxp-analytics", icon: "Sparkles" },
      { label: "Credential Issuance", path: "/credentials", icon: "Award" },
      { label: "Transcript Viewer", path: "/transcript", icon: "FileText" },
      { label: "Attendance Compliance", path: "/attendance-compliance", icon: "CalendarCheck" },
      { label: "Skills Architecture", path: "/skills", icon: "Target" },
      { label: "Content Library", path: "/content-library", icon: "Globe" },
      { label: "Content Contributions", path: "/content-contributions", icon: "Upload" },
      { label: "Shared Content Library", path: "/shared-content", icon: "FolderKanban" },
      { label: "Challenge Exams", path: "/challenge-exams", icon: "Trophy" },
      { label: "Quote Management", path: "/provider/quotes", icon: "FileText" },
      { label: "Learner Onboarding", path: "/learner/onboarding", icon: "UserPlus" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["programme_manager"],
  },
  {
    name: "Business Portal - Talent Manager",
    slug: "business-talent-manager",
    description: "Talent Manager navigation menu",
    items: [
      { label: "Talent Dashboard", path: "/talent-manager", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Workforce Analytics", path: "/analytics", icon: "BarChart3" },
      { label: "Talent Pipeline", path: "/talent", icon: "TrendingUp" },
      { label: "Skills Gap Analysis", path: "/talent", icon: "PieChart" },
      { label: "Succession Planning", path: "/talent", icon: "Users" },
      { label: "Learner Progress", path: "/analytics", icon: "BarChart3" },
      { label: "Completion Reports", path: "/analytics", icon: "FileBarChart" },
      { label: "Credential Verification", path: "/credentials", icon: "Award" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["talent_manager"],
  },
  {
    name: "Business Portal - Sponsor",
    slug: "business-sponsor",
    description: "Sponsor navigation menu",
    items: [
      { label: "Sponsor Dashboard", path: "/sponsor-portal", icon: "Target" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Notifications", path: "/sponsor/notifications", icon: "Bell" },
      { label: "Investment Summary", path: "/sponsor/reports", icon: "BarChart3" },
      { label: "Sponsored Learners", path: "/sponsor/learners", icon: "Users" },
      { label: "Progress Tracking", path: "/sponsor/learners", icon: "TrendingUp" },
      { label: "Completion Reports", path: "/sponsor/reports", icon: "FileBarChart" },
      { label: "Messages", path: "/sponsor/messages", icon: "MessagesSquare" },
      { label: "Quotes & Agreements", path: "/sponsor/quotes", icon: "FileText" },
      { label: "Invoices & Payments", path: "/sponsor/invoices", icon: "DollarSign" },
      { label: "SD & ED Reports", path: "/sponsor/compliance", icon: "Shield" },
      { label: "B-BBEE Scorecard", path: "/sponsor/compliance", icon: "FileBarChart" },
      { label: "Evidence Upload", path: "/sponsor/compliance", icon: "Upload" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "Sponsor Profile", path: "/sponsor/profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["sponsor"],
  },
  {
    name: "L&D Portal - Facilitator",
    slug: "ld-facilitator",
    description: "Facilitator navigation menu",
    items: [
      { label: "My Dashboard", path: "/facilitator", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Upcoming Sessions", path: "/sessions", icon: "Video" },
      { label: "Cohort Management", path: "/cohort-management", icon: "Users" },
      { label: "Learner Progress", path: "/facilitator/learner-progress", icon: "TrendingUp" },
      { label: "Learner Engagement", path: "/facilitator/engagement", icon: "Heart" },
      { label: "Attendance Tracking", path: "/sessions", icon: "ListChecks" },
      { label: "Attendance Compliance", path: "/attendance-compliance", icon: "CalendarCheck" },
      { label: "Submission Review", path: "/assessments", icon: "ClipboardCheck" },
      { label: "Grade Entry", path: "/assessments", icon: "FileCheck" },
      { label: "Discussion Forums", path: "/discussions", icon: "MessagesSquare" },
      { label: "Session Room", path: "/sessions", icon: "Video" },
      { label: "Quote Management", path: "/provider/quotes", icon: "FileText" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["facilitator"],
  },
  {
    name: "L&D Portal - Assessor",
    slug: "ld-assessor",
    description: "Assessor navigation menu",
    items: [
      { label: "My Dashboard", path: "/assessor", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Upcoming Sessions", path: "/learner/sessions", icon: "Calendar" },
      { label: "My Cohorts", path: "/cohorts", icon: "Users" },
      { label: "Cohort Management", path: "/cohort-management", icon: "Users" },
      { label: "Learner Engagement", path: "/facilitator/engagement", icon: "TrendingUp" },
      { label: "Attendance Tracking", path: "/facilitator/learner-progress", icon: "CheckSquare" },
      { label: "Submission Review", path: "/assessor/queue", icon: "FileCheck" },
      { label: "Grade Entry", path: "/assessor/queue", icon: "ClipboardCheck" },
      { label: "Queue Summary", path: "/assessor/queue", icon: "Inbox" },
      { label: "Pending Reviews", path: "/assessor/queue", icon: "Inbox" },
      { label: "Assessment History", path: "/assessor/history", icon: "History" },
      { label: "Rubric Library", path: "/assessments", icon: "BookOpen" },
      { label: "Assessor Report", path: "/assessor/report", icon: "FileBarChart" },
      { label: "Report Templates", path: "/assessor/report-templates", icon: "FileText" },
      { label: "Quote Management", path: "/provider/quotes", icon: "FileText" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["assessor"],
  },
  {
    name: "L&D Portal - Moderator",
    slug: "ld-moderator",
    description: "Moderator navigation menu",
    items: [
      { label: "Moderation Dashboard", path: "/moderator", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Quality Metrics", path: "/moderator/reports", icon: "BarChart3" },
      { label: "Pending Items", path: "/moderator/queue", icon: "Flag" },
      { label: "Moderation History", path: "/moderator/queue?tab=history", icon: "History" },
      { label: "QA Reports", path: "/moderator/reports", icon: "FileBarChart" },
      { label: "QA Report Generator", path: "/moderator/qa-report", icon: "FileText" },
      { label: "Discussion Forums", path: "/discussions", icon: "MessagesSquare" },
      { label: "Session Room", path: "/sessions", icon: "Video" },
      { label: "Announcements", path: "/announcements", icon: "Bell" },
      { label: "My Credentials", path: "/credentials", icon: "Award" },
      { label: "Quote Management", path: "/provider/quotes", icon: "FileText" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["moderator"],
  },
  {
    name: "L&D Portal - Mentor",
    slug: "ld-mentor",
    description: "Mentor navigation menu",
    items: [
      { label: "Mentor Dashboard", path: "/mentor", icon: "LayoutDashboard" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Mentee List", path: "/mentor/mentees", icon: "Users" },
      { label: "Goals & Plans", path: "/mentor/goals", icon: "Target" },
      { label: "Evidence Review", path: "/mentor/evidence", icon: "UserCheck" },
      { label: "Sessions", path: "/mentor/sessions", icon: "Calendar" },
      { label: "Messages", path: "/mentor/messages", icon: "MessagesSquare" },
      { label: "Assessor Feedback", path: "/mentor/feedback", icon: "FileText" },
      { label: "Quote Management", path: "/provider/quotes", icon: "FileText" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["mentor"],
  },
  {
    name: "L&D Portal - Learner",
    slug: "ld-learner",
    description: "Learner navigation menu",
    items: [
      { label: "Dashboard", path: "/learner", icon: "LayoutDashboard" },
      { label: "My Programmes", path: "/learner/programmes", icon: "BookOpen" },
      { label: "My Sessions", path: "/learner/sessions", icon: "Calendar" },
      { label: "Content Library", path: "/content-library", icon: "Globe" },
      { label: "Skills Profile", path: "/skills", icon: "Target" },
      { label: "Contribute Content", path: "/content-contributions", icon: "Upload" },
      { label: "My Assessments", path: "/learner/assessments", icon: "FileCheck" },
      { label: "Portfolio of Evidence", path: "/portfolio", icon: "FolderKanban" },
      { label: "Transcript", path: "/transcript", icon: "FileText" },
      { label: "Calendar", path: "/calendar", icon: "Calendar" },
      { label: "Announcements", path: "/announcements", icon: "Bell" },
      { label: "Discussion Forums", path: "/discussions", icon: "MessagesSquare" },
      { label: "My Credentials", path: "/credentials", icon: "Award" },
      { label: "Achievements", path: "/achievements", icon: "Trophy" },
      { label: "My Profile", path: "/my-profile", icon: "User" },
      { label: "My Settings", path: "/my-settings", icon: "Settings" },
    ],
    roles: ["learner"],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    for (const menuDef of PLATFORM_MENUS) {
      // Check if menu already exists
      const { data: existing } = await supabase
        .from("cms_menus")
        .select("id")
        .eq("slug", menuDef.slug)
        .maybeSingle();

      if (existing) {
        results.push(`Skipped "${menuDef.name}" (already exists)`);
        continue;
      }

      // Create menu
      const { data: menu, error: menuErr } = await supabase
        .from("cms_menus")
        .insert({
          name: menuDef.name,
          slug: menuDef.slug,
          description: menuDef.description,
          is_active: true,
        })
        .select()
        .single();

      if (menuErr) {
        results.push(`Error creating "${menuDef.name}": ${menuErr.message}`);
        continue;
      }

      // Create menu items
      const itemInserts = menuDef.items.map((item, idx) => ({
        menu_id: menu.id,
        label: item.label,
        item_type: "built_in",
        target_path: item.path,
        icon_name: item.icon,
        sort_order: idx,
        is_active: true,
      }));

      const { error: itemsErr } = await supabase
        .from("cms_menu_items")
        .insert(itemInserts);

      if (itemsErr) {
        results.push(`Error adding items for "${menuDef.name}": ${itemsErr.message}`);
        continue;
      }

      // Create role permissions
      for (const role of menuDef.roles) {
        await supabase
          .from("cms_role_menu_permissions")
          .insert({
            menu_id: menu.id,
            role,
            is_visible: true,
          });
      }

      results.push(`Created "${menuDef.name}" with ${menuDef.items.length} items`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
