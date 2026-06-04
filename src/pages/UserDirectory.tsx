import { useState, useEffect } from "react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import ExportButton from "@/components/ExportButton";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useDirectoryProfiles,
  getVisibleRoles,
  ROLE_LABELS,
} from "@/hooks/useUserDirectory";
import RoleCards from "@/components/user-directory/RoleCards";
import UserListPanel from "@/components/user-directory/UserListPanel";
import UserDetailPanel from "@/components/user-directory/UserDetailPanel";
import OversightControls from "@/components/user-directory/OversightControls";
import RoleUserTable from "@/components/user-directory/RoleUserTable";
import TestUserManagement from "@/components/admin/TestUserManagement";

export default function UserDirectory() {
  const { roles } = useAuth();
  const { data: allUsers = [], isLoading } = useDirectoryProfiles();
  const isMobile = useIsMobile();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showRoleTable, setShowRoleTable] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const handleRoleCardClick = (role: string | null) => {
    setSelectedRole(role);
    setShowRoleTable(true);
  };

  const handleTableSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowRoleTable(false);
    if (isMobile) setMobileDetailOpen(true);
  };

  const visibleRoles = getVisibleRoles(roles);
  // Show users who either (a) have at least one visible (lower-authority) role,
  // or (b) have no roles assigned yet — so admins can spot & assign them.
  // Users whose ONLY roles are at or above the viewer's authority are hidden.
  const visibleUsers = allUsers.filter(
    (u) =>
      u.roles.length === 0 || u.roles.some((r) => visibleRoles.includes(r))
  );
  const selectedUser = visibleUsers.find((u) => u.user_id === selectedUserId) ?? null;

  // Auto-select first user on load
  useEffect(() => {
    if (visibleUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(visibleUsers[0].user_id);
    }
  }, [visibleUsers.length]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    if (isMobile) setMobileDetailOpen(true);
  };

  const exportData = visibleUsers.map((u) => ({
    name: u.full_name || "—",
    email: u.email || "—",
    roles: u.roles
      .filter((r) => visibleRoles.includes(r))
      .map((r) => ROLE_LABELS[r] ?? r)
      .join(", ") || "No roles",
    status: u.status || "active",
    job_title: u.job_title || "—",
    department: u.department || "—",
    joined: u.created_at ? format(new Date(u.created_at), "dd MMM yyyy") : "—",
  }));

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">User Directory</h1>
            <p className="text-sm text-muted-foreground">
              Manage platform users, view profiles, and control role-based access.
            </p>
          </div>
          <ExportButton
            data={exportData}
            filename="user-directory-export"
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "roles", label: "Roles" },
              { key: "status", label: "Status" },
              { key: "job_title", label: "Job Title" },
              { key: "department", label: "Department" },
              { key: "joined", label: "Joined" },
            ]}
          />
        </div>
      </FadeIn>

      {/* Role Cards */}
      <FadeIn delay={0.05}>
        <RoleCards
          users={visibleUsers}
          visibleRoles={visibleRoles}
          selectedRole={selectedRole}
          onSelectRole={handleRoleCardClick}
        />
      </FadeIn>

      {/* Role User Table — shown when a card is clicked */}
      {showRoleTable && (
        <FadeIn>
          <RoleUserTable
            users={visibleUsers}
            role={selectedRole ?? "__all__"}
            visibleRoles={visibleRoles}
            onSelectUser={handleTableSelectUser}
            onClose={() => setShowRoleTable(false)}
          />
        </FadeIn>
      )}

      <Separator />

      {/* Split Screen — Desktop */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-border rounded-xl overflow-hidden bg-card shadow-card min-h-[520px]">
          {/* Left Panel */}
          <div className="lg:col-span-4 border-r border-border">
            <UserListPanel
              users={visibleUsers}
              visibleRoles={visibleRoles}
              selectedRole={selectedRole}
              selectedUserId={selectedUserId}
              onSelectUser={handleSelectUser}
              search={search}
              onSearchChange={setSearch}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
            />
          </div>

          {/* Right Panel — Desktop */}
          <div className="hidden lg:flex lg:col-span-8 flex-col">
            <div className="flex-1">
              <UserDetailPanel user={selectedUser} visibleRoles={visibleRoles} />
            </div>
            <div className="border-t border-border p-4">
              <OversightControls />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Mobile Detail Sheet */}
      {isMobile && (
        <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0 overflow-auto">
            <UserDetailPanel user={selectedUser} visibleRoles={visibleRoles} />
            <div className="border-t border-border p-4">
              <OversightControls />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Test User Management — Super Admin only */}
      {roles.includes("super_admin") && (
        <FadeIn delay={0.15}>
          <TestUserManagement />
        </FadeIn>
      )}
    </div>
  );
}
