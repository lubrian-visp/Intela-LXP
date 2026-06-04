import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DirectoryUser, ROLE_LABELS, ROLE_COLORS } from "@/hooks/useUserDirectory";
import { useEffect } from "react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  suspended: "bg-destructive/15 text-destructive",
  verified: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

interface UserListPanelProps {
  users: DirectoryUser[];
  visibleRoles: string[];
  selectedRole: string | null;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  roleFilter: string;
  onRoleFilterChange: (val: string) => void;
}

export default function UserListPanel({
  users,
  visibleRoles,
  selectedRole,
  selectedUserId,
  onSelectUser,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: UserListPanelProps) {
  // Filter users by visible roles first
  let filtered = users.filter((u) => u.roles.some((r) => visibleRoles.includes(r)));

  // Then by selected role card
  if (selectedRole) {
    filtered = filtered.filter((u) => u.roles.includes(selectedRole));
  }

  // Then by role dropdown filter
  if (roleFilter && roleFilter !== "all") {
    filtered = filtered.filter((u) => u.roles.includes(roleFilter));
  }

  // Then by search (name or email)
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.job_title?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.organisation?.toLowerCase().includes(q)
    );
  }

  // Auto-select first user on initial load or when filters change
  useEffect(() => {
    if (filtered.length > 0 && !selectedUserId) {
      onSelectUser(filtered[0].user_id);
    }
  }, [filtered.length, selectedUserId]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search + Filter */}
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {visibleRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No users found.</div>
          )}
          {filtered.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.user_id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                selectedUserId === user.user_id
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : "hover:bg-secondary/30 border-l-2 border-l-transparent"
              }`}
            >
              <Avatar className="h-9 w-9 shrink-0">
                {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} />}
                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name || "Unnamed User"}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-[9px] px-1.5 py-0 shrink-0 ${STATUS_STYLES[user.status] ?? STATUS_STYLES.active}`}
                  >
                    {getStatusLabel(user.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user.email || "No email"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border text-[10px] text-muted-foreground text-center">
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
