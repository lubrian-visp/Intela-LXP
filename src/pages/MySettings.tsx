import { useState, useMemo, useEffect } from "react";
import { Settings, User, Palette, Shield, Eye, Bell, Mail, Building2, Monitor, Users, Pencil, Key, MapPin, Database, FileText, CreditCard, Globe, Search, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileSettingsNav from "@/components/settings/MobileSettingsNav";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import ProfilePersonalTab from "@/components/settings/ProfilePersonalTab";
import ProfileLearningTab from "@/components/settings/ProfileLearningTab";
import ProfileSecurityTab from "@/components/settings/ProfileSecurityTab";
import ProfileAuditTab from "@/components/settings/ProfileAuditTab";
import NotificationPreferencesSection from "@/components/settings/NotificationPreferencesSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import BrandingSection from "@/components/settings/BrandingSection";
import SecurityTabSection from "@/components/settings/SecurityTabSection";
import PrivacyConsentSection from "@/components/settings/PrivacyConsentSection";
import EmailConfigSection from "@/components/settings/EmailConfigSection";
import MultiTenantSection from "@/components/settings/MultiTenantSection";
import SystemSection from "@/components/settings/SystemSection";
import DelegationManagement from "@/components/governance/DelegationManagement";
import AuthSection from "@/components/settings/AuthSection";

import CountryFrameworkSection from "@/components/settings/CountryFrameworkSection";
import DatabaseSection from "@/components/settings/DatabaseSection";
import ComplianceSection from "@/components/settings/ComplianceSection";
import PaymentGatewayDashboard from "@/components/settings/PaymentGatewayDashboard";
import GeneralSection from "@/components/settings/GeneralSection";

interface SettingsItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  group: string;
  adminOnly?: boolean;
}

const settingsItems: SettingsItem[] = [
  // Account
  { id: "profile", label: "Profile", icon: User, description: "Personal info, avatar, and role badges", group: "Account" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Email and in-app alert preferences", group: "Account" },
  // Platform
  { id: "branding", label: "Branding", icon: Palette, description: "Logo, colours, and landing page", group: "Platform", adminOnly: true },
  { id: "general", label: "General", icon: Globe, description: "Platform name, timezone, and locale", group: "Platform", adminOnly: true },
  { id: "system", label: "System", icon: Monitor, description: "Registration, feature flags, and health", group: "Platform", adminOnly: true },
  // Security & Access
  { id: "auth", label: "Authentication", icon: Key, description: "Login methods, SSO, and sessions", group: "Security & Access", adminOnly: true },
  { id: "security", label: "Security", icon: Shield, description: "MFA, password rules, and rate limits", group: "Security & Access", adminOnly: true },
  { id: "access-control", label: "Access Control", icon: Users, description: "Delegated approvers and SoD controls", group: "Security & Access", adminOnly: true },
  // Data & Compliance
  { id: "privacy", label: "Privacy", icon: Eye, description: "PoPIA, GDPR, and consent management", group: "Data & Compliance", adminOnly: true },
  { id: "compliance", label: "Compliance", icon: FileText, description: "ISO 19796 and data retention policies", group: "Data & Compliance", adminOnly: true },
  { id: "country-framework", label: "Country Framework", icon: MapPin, description: "Countries, regulatory bodies, NQF", group: "Data & Compliance", adminOnly: true },
  // Infrastructure
  { id: "email", label: "Email", icon: Mail, description: "SMTP, Resend, and email templates", group: "Infrastructure", adminOnly: true },
  { id: "database", label: "Database", icon: Database, description: "Connection pooling and backups", group: "Infrastructure", adminOnly: true },
  { id: "payments", label: "Payments", icon: CreditCard, description: "Gateway config, routing, webhooks", group: "Infrastructure", adminOnly: true },
  { id: "multi-tenant", label: "Multi-Tenant", icon: Building2, description: "Tenant routing and RLS isolation", group: "Infrastructure", adminOnly: true },
];

const sectionComponents: Record<string, React.FC<any>> = {
  profile: ProfileSection,
  notifications: NotificationsSection,
  branding: BrandingSection,
  general: GeneralSection,
  system: SystemSection,
  auth: AuthSection,
  security: SecurityTabSection,
  "access-control": DelegationManagement,
  privacy: PrivacyConsentSection,
  compliance: ComplianceSection,
  "country-framework": CountryFrameworkSection,
  email: EmailConfigSection,
  database: DatabaseSection,
  payments: PaymentGatewayDashboard,
  "multi-tenant": MultiTenantSection,
};

const groupConfig: Record<string, { color: string; bgLight: string; border: string }> = {
  "Account": { color: "text-info", bgLight: "bg-info/10", border: "border-info/20" },
  "Platform": { color: "text-accent", bgLight: "bg-accent/10", border: "border-accent/20" },
  "Security & Access": { color: "text-warning", bgLight: "bg-warning/10", border: "border-warning/20" },
  "Data & Compliance": { color: "text-success", bgLight: "bg-success/10", border: "border-success/20" },
  "Infrastructure": { color: "text-primary", bgLight: "bg-primary/10", border: "border-primary/20" },
};

const groupOrder = ["Account", "Platform", "Security & Access", "Data & Compliance", "Infrastructure"];

export default function MySettings() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("super_admin") || hasRole("systems_admin");
  const [searchParams] = useSearchParams();
  
  // Map sidebar tab query params to settings section IDs
  const tabMapping: Record<string, string> = {
    delegation: "access-control",
    override: "access-control",
    flags: "system",
    email: "email",
    database: "database",
    security: "security",
  };
  
  const initialTab = tabMapping[searchParams.get("tab") || ""] || "profile";
  const [activeSection, setActiveSection] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Update active section when query params change
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabMapping[tab]) {
      setActiveSection(tabMapping[tab]);
    }
  }, [searchParams]);

  const visibleItems = useMemo(() => {
    return settingsItems.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
    });
  }, [isAdmin, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SettingsItem[]> = {};
    visibleItems.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [visibleItems]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const activeItem = settingsItems.find((i) => i.id === activeSection);
  const ActiveComponent = sectionComponents[activeSection];

  // For non-admin notification tab
  const notificationsComponent = isAdmin ? NotificationsSection : NotificationPreferencesSection;
  const FinalComponent = activeSection === "notifications" && !isAdmin ? notificationsComponent : ActiveComponent;

  return (
    <div className="animate-slide-up h-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-accent/15">
            <Settings className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Manage your account, security, and system preferences"
                : "Manage your profile and notification preferences"}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <MobileSettingsNav
        items={visibleItems}
        groupedItems={groupedItems}
        groupOrder={groupOrder}
        groupConfig={groupConfig}
        activeSection={activeSection}
        onSelect={setActiveSection}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeLabel={activeItem?.label}
      />

      <div className="flex gap-6 min-h-[calc(100vh-12rem)]">
        {/* Sidebar - hidden on mobile */}
        <div
          className={cn(
            "shrink-0 transition-all duration-300 ease-in-out hidden lg:block",
            sidebarCollapsed ? "w-16" : "w-72"
          )}
        >
          <div className="sticky top-4 bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
            {/* Sidebar header with collapse toggle */}
            <div className="p-3 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5">
              {!sidebarCollapsed && (
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Navigation</span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronRight className={cn("w-4 h-4 transition-transform", !sidebarCollapsed && "rotate-180")} />
              </button>
            </div>

            {/* Search */}
            {!sidebarCollapsed && (
              <div className="p-3 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search settings…"
                    className="h-8 pl-8 text-xs bg-secondary/30 border-border/30"
                  />
                </div>
              </div>
            )}

            {/* Nav items */}
            <div className="p-2 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-hide">
              {groupOrder.map((group) => {
                const items = groupedItems[group];
                if (!items || items.length === 0) return null;
                const isGroupCollapsed = collapsedGroups[group];
                const gc = groupConfig[group] || groupConfig["Account"];

                return (
                  <div key={group} className="mb-1">
                    {/* Group header */}
                    {!sidebarCollapsed && (
                      <button
                        onClick={() => toggleGroup(group)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors rounded-md",
                          gc.color
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", gc.bgLight.replace("/10", ""))} />
                          <span>{group}</span>
                        </div>
                        <ChevronDown className={cn("w-3 h-3 transition-transform", isGroupCollapsed && "-rotate-90")} />
                      </button>
                    )}

                    {sidebarCollapsed && (
                      <div className={cn("w-full h-px my-1.5", gc.bgLight.replace("/10", "/30"))} />
                    )}

                    {/* Items */}
                    {(!isGroupCollapsed || sidebarCollapsed) && items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg transition-all duration-200 mb-0.5",
                            sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 text-left",
                            isActive
                              ? cn(gc.bgLight, "border", gc.border, "shadow-sm")
                              : "hover:bg-secondary/50 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "shrink-0 p-1.5 rounded-md transition-colors",
                            isActive ? cn(gc.bgLight) : "bg-secondary/50"
                          )}>
                            <item.icon className={cn(
                              "w-4 h-4 transition-colors",
                              isActive ? gc.color : "text-muted-foreground"
                            )} />
                          </div>
                          {!sidebarCollapsed && (
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                "text-sm font-medium truncate transition-colors",
                                isActive ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {item.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 truncate">
                                {item.description}
                              </p>
                            </div>
                          )}
                          {!sidebarCollapsed && isActive && (
                            <div className={cn("w-1 h-6 rounded-full shrink-0", gc.bgLight.replace("/10", ""))} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {visibleItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No settings match your search</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          {activeItem && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 px-1">
              <span>Settings</span>
              <ChevronRight className="w-3 h-3" />
              <span className={cn("font-medium", groupConfig[activeItem.group]?.color || "text-muted-foreground")}>{activeItem.group}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{activeItem.label}</span>
            </div>
          )}

          <div className="animate-fade-in" key={activeSection}>
            {activeSection === "profile" ? (
              <ProfileSection isAdmin={isAdmin} />
            ) : activeSection === "notifications" && !isAdmin ? (
              <NotificationPreferencesSection />
            ) : FinalComponent ? (
              <FinalComponent />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Profile section with sub-tabs */
function ProfileSection({ isAdmin }: { isAdmin: boolean }) {
  const profileSubTabs = isAdmin
    ? [
        { id: "personal", label: "Personal", icon: User },
        { id: "learning", label: "Learning", icon: Pencil },
        { id: "security", label: "Security", icon: Shield },
        { id: "audit", label: "Audit", icon: Monitor },
      ]
    : [
        { id: "personal", label: "Personal", icon: User },
        { id: "security", label: "Security", icon: Shield },
      ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">My Profile</h2>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="bg-transparent p-0 h-auto gap-0 border-b border-border/30 rounded-none w-full justify-start">
          {profileSubTabs.map((st) => (
            <TabsTrigger
              key={st.id}
              value={st.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium gap-1.5"
            >
              <st.icon className="w-3.5 h-3.5" />
              {st.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="personal"><ProfilePersonalTab /></TabsContent>
          {isAdmin && <TabsContent value="learning"><ProfileLearningTab /></TabsContent>}
          <TabsContent value="security"><ProfileSecurityTab /></TabsContent>
          {isAdmin && <TabsContent value="audit"><ProfileAuditTab /></TabsContent>}
        </div>
      </Tabs>
    </div>
  );
}
