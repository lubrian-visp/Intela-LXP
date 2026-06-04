import { useMemo } from "react";
import { useParams, NavLink, useLocation, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────
interface MenuItem { label: string; icon: string; path: string; }
interface MenuSection { title: string; items: MenuItem[]; }
interface Widget {
  id: string;
  type: "welcome_card" | "stat_card" | "recent_activity" | "quick_actions";
  title: string;
  metric?: string;
  icon?: string;
  col_span?: number;
}

interface RoleDef {
  id: string;
  role_key: string;
  display_name: string;
  description: string | null;
  domain: string;
  portal_title: string | null;
  portal_subtitle: string | null;
  dashboard_path: string | null;
  menu_config: MenuSection[] | null;
  widget_config: Widget[] | null;
  is_active: boolean;
}

// ─── Helpers ───────────────────────────────────────────────
function getIcon(name?: string) {
  if (!name) return Icons.Circle;
  return (Icons as any)[name] ?? Icons.Circle;
}

// ─── Hook: load role definition ────────────────────────────
function useRoleDefinition(roleKey: string | undefined) {
  return useQuery({
    queryKey: ["role_definition", roleKey],
    enabled: !!roleKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_definitions")
        .select("id, role_key, display_name, description, domain, portal_title, portal_subtitle, dashboard_path, menu_config, widget_config, is_active")
        .eq("role_key", roleKey!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as RoleDef | null;
    },
  });
}

// ─── Hook: simple metric values ────────────────────────────
function usePortalMetrics(_userId: string | undefined) {
  const { data: unread = 0 } = useUnreadCount();
  return {
    pending_tasks_count: 0,
    unread_notifications: unread as number,
    events_today: 0,
  };
}

// ─── Sidebar (custom-portal scoped) ────────────────────────
function CustomPortalSidebar({ role }: { role: RoleDef }) {
  const { pathname } = useLocation();
  const sections = (role.menu_config ?? []) as MenuSection[];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[260px] flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-4 py-3.5 border-b border-sidebar-border">
        <p className="text-[13px] font-bold text-sidebar-accent-foreground truncate leading-tight">
          {role.portal_title || `${role.display_name} Portal`}
        </p>
        <p className="text-[10px] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
          {role.portal_subtitle || "Custom Role"}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sections.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <div className="my-3 border-t border-sidebar-border" />}
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-3 mb-2">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = getIcon(item.icon);
              const active = pathname === item.path;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

// ─── Widget renderers ──────────────────────────────────────
function WidgetRenderer({ widget, metrics, role, userName }: {
  widget: Widget;
  metrics: ReturnType<typeof usePortalMetrics>;
  role: RoleDef;
  userName: string;
}) {
  const Icon = getIcon(widget.icon);
  const span = widget.col_span ?? 1;
  const spanClass = span >= 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "md:col-span-1";

  switch (widget.type) {
    case "welcome_card":
      return (
        <Card className={cn(spanClass, "bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20")}>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Welcome, {userName} 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              You're signed in to the <span className="font-semibold">{role.display_name}</span> portal.
              {role.description ? ` ${role.description}` : ""}
            </p>
          </CardContent>
        </Card>
      );

    case "stat_card": {
      const value =
        widget.metric === "pending_tasks_count" ? metrics.pending_tasks_count
          : widget.metric === "unread_notifications" ? metrics.unread_notifications
          : widget.metric === "events_today" ? metrics.events_today
          : 0;
      return (
        <Card className={spanClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {widget.title}
              </p>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </CardContent>
        </Card>
      );
    }

    case "recent_activity":
      return (
        <Card className={spanClass}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity. Items relevant to your role will appear here.
            </p>
          </CardContent>
        </Card>
      );

    case "quick_actions":
      return (
        <Card className={spanClass}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <NavLink to="/calendar"><Icons.Calendar className="w-4 h-4 mr-2" />Open Calendar</NavLink>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <NavLink to="/my-profile"><Icons.User className="w-4 h-4 mr-2" />My Profile</NavLink>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <NavLink to="/my-settings"><Icons.Settings className="w-4 h-4 mr-2" />Settings</NavLink>
            </Button>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

// ─── Main page ─────────────────────────────────────────────
export default function DynamicRolePortal() {
  const { roleKey } = useParams<{ roleKey: string }>();
  const { profile, user, loading } = useAuth();
  const { data: role, isLoading } = useRoleDefinition(roleKey);
  const metrics = usePortalMetrics(user?.id);

  const widgets = useMemo(() => (role?.widget_config ?? []) as Widget[], [role]);
  const userName = profile?.full_name?.split(" ")[0] || "there";

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!role.is_active) {
    return (
      <div className="p-8">
        <Card className="max-w-xl mx-auto">
          <CardContent className="p-8 text-center">
            <Icons.Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1">Portal Inactive</h2>
            <p className="text-sm text-muted-foreground">
              The "{role.display_name}" role is currently disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomPortalSidebar role={role} />
      <div className="lg:pl-[260px]">
        <main className="p-4 sm:p-6">
          <FadeIn>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {role.portal_title || `${role.display_name} Portal`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {role.portal_subtitle || "Your custom workspace"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {widgets.map((w) => (
                <WidgetRenderer
                  key={w.id}
                  widget={w}
                  metrics={metrics}
                  role={role}
                  userName={userName}
                />
              ))}
            </div>

            {widgets.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Icons.LayoutDashboard className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">No Widgets Configured</h3>
                  <p className="text-xs text-muted-foreground">
                    An administrator can configure dashboard widgets in the Design Manager.
                  </p>
                </CardContent>
              </Card>
            )}
          </FadeIn>
        </main>
      </div>
    </div>
  );
}
