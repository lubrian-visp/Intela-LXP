import { Users, Shield, UserCheck, Briefcase, GraduationCap, Eye, Landmark, Award, BookOpen, HeartHandshake, Building2, UserCircle } from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS, DirectoryUser } from "@/hooks/useUserDirectory";

const ROLE_ICONS: Record<string, any> = {
  super_admin: Shield,
  systems_admin: Landmark,
  administrator: Building2,
  operations: Briefcase,
  programme_manager: BookOpen,
  talent_manager: Award,
  facilitator: UserCheck,
  assessor: Eye,
  moderator: Users,
  mentor: HeartHandshake,
  sponsor: Building2,
  learner: GraduationCap,
};

interface RoleCardsProps {
  users: DirectoryUser[];
  visibleRoles: string[];
  selectedRole: string | null;
  onSelectRole: (role: string | null) => void;
}

export default function RoleCards({ users, visibleRoles, selectedRole, onSelectRole }: RoleCardsProps) {
  const roleCounts = visibleRoles.reduce<Record<string, number>>((acc, role) => {
    acc[role] = users.filter((u) => u.roles.includes(role)).length;
    return acc;
  }, {});

  // Sort by authority descending
  const sortedRoles = [...visibleRoles].sort(
    (a, b) => (ROLE_ICONS[b] ? 1 : 0) - (ROLE_ICONS[a] ? 1 : 0)
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {/* All Users card */}
      <button
        onClick={() => onSelectRole(null)}
        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center ${
          selectedRole === null
            ? "border-primary bg-primary/10 shadow-md"
            : "border-border/50 bg-card hover:bg-secondary/30"
        }`}
      >
        <Users className="w-6 h-6 text-primary" />
        <span className="text-xs font-semibold text-foreground">All Users</span>
        <span className="text-lg font-bold text-foreground">{users.length}</span>
      </button>

      {sortedRoles.map((role) => {
        const Icon = ROLE_ICONS[role] ?? UserCircle;
        const isActive = selectedRole === role;
        return (
          <button
            key={role}
            onClick={() => onSelectRole(isActive ? null : role)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center ${
              isActive
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border/50 bg-card hover:bg-secondary/30"
            }`}
          >
            <Icon className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">{ROLE_LABELS[role] ?? role}</span>
            <span className="text-lg font-bold text-foreground">{roleCounts[role] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
