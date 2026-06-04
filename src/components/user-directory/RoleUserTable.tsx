import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirectoryUser, ROLE_LABELS, ROLE_COLORS } from "@/hooks/useUserDirectory";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  suspended: "bg-destructive/15 text-destructive",
  verified: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

interface RoleUserTableProps {
  users: DirectoryUser[];
  role: string;
  visibleRoles: string[];
  onSelectUser: (userId: string) => void;
  onClose: () => void;
}

export default function RoleUserTable({ users, role, visibleRoles, onSelectUser, onClose }: RoleUserTableProps) {
  const filtered = role === "__all__"
    ? users
    : users.filter((u) => u.roles.includes(role));

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const title = role === "__all__" ? "All Users" : ROLE_LABELS[role] ?? role;

  return (
    <div className="border border-border rounded-xl bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant="outline" className="text-[10px]">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/10 sticky top-0 z-10">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">User</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Email</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Roles</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                  No users found for this role.
                </td>
              </tr>
            )}
            {filtered.map((user) => (
              <tr
                key={user.id}
                onClick={() => onSelectUser(user.user_id)}
                className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? ""} />}
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground truncate max-w-[180px]">
                      {user.full_name || "Unnamed User"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground truncate max-w-[200px]">
                  {user.email || "—"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles
                      .filter((r) => visibleRoles.includes(r))
                      .slice(0, 2)
                      .map((r) => (
                        <Badge key={r} variant="secondary" className={`text-[9px] px-1.5 py-0 ${ROLE_COLORS[r] ?? ""}`}>
                          {ROLE_LABELS[r] ?? r}
                        </Badge>
                      ))}
                    {user.roles.filter((r) => visibleRoles.includes(r)).length > 2 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        +{user.roles.filter((r) => visibleRoles.includes(r)).length - 2}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${STATUS_STYLES[user.status] ?? STATUS_STYLES.active}`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
