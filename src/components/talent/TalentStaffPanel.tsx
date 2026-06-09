import { useState, useMemo } from "react";
import { Search, MapPin, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  data: any;
  isLoading: boolean;
  onViewStaff?: (userId: string) => void;
}

const statusStyles: Record<string, string> = {
  approved: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
};

const roleColors: Record<string, string> = {
  Facilitator: "bg-primary/10 text-primary",
  Assessor: "bg-info/10 text-info",
  Moderator: "bg-accent/10 text-accent-foreground",
  Mentor: "bg-success/10 text-success",
};

export default function TalentStaffPanel({ data, isLoading, onViewStaff }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const enrichedStaff = useMemo(() => {
    if (!data) return [];
    const { staff, roleAssignments, cohortStaff } = data;

    return staff.map((s: any) => {
      const roles = roleAssignments
        .filter((ra: any) => ra.staff_registration_id === s.id)
        .map((ra: any) => ra.role_name);
      const assignments = cohortStaff.filter((cs: any) => cs.user_id === s.id);
      return { ...s, roles, assignments };
    });
  }, [data]);

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    enrichedStaff.forEach((s: any) => s.roles.forEach((r: string) => set.add(r)));
    return Array.from(set).sort();
  }, [enrichedStaff]);

  const filtered = enrichedStaff.filter((s: any) => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || s.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });

  // Role distribution
  const roleCounts = useMemo(() => {
    const map: Record<string, number> = {};
    enrichedStaff.forEach((s: any) => s.roles.forEach((r: string) => { map[r] = (map[r] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [enrichedStaff]);

  const maxRoleCount = Math.max(...roleCounts.map(([, c]) => c), 1);

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Role Distribution */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Staff by Role</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{enrichedStaff.length} total staff</p>
        </div>
        <div className="p-4 space-y-3">
          {roleCounts.length === 0 && <p className="text-xs text-muted-foreground">No staff roles assigned yet.</p>}
          {roleCounts.map(([role, count]) => (
            <div key={role} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{role}</span>
                <span className="text-[10px] text-muted-foreground">{count}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(count / maxRoleCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="lg:col-span-2 bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Staff Directory</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} staff members</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="pl-8 h-8 text-xs w-48" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                {allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Roles</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assignments</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">No staff found.</td></tr>
              )}
              {filtered.map((s: any) => (
                <tr
                  key={s.id}
                  className={cn("hover:bg-secondary/20 transition-colors", onViewStaff && "cursor-pointer group")}
                  onClick={() => onViewStaff?.(s.user_id ?? s.id)}
                  role={onViewStaff ? "button" : undefined}
                  tabIndex={onViewStaff ? 0 : undefined}
                  onKeyDown={onViewStaff ? (k => k.key === "Enter" && onViewStaff(s.user_id ?? s.id)) : undefined}
                  aria-label={onViewStaff ? `View profile for ${s.full_name}` : undefined}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                        {s.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{s.full_name}</span>
                        <p className="text-[10px] text-muted-foreground">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {s.roles.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                      {s.roles.map((r: string) => (
                        <span key={r} className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded", roleColors[r] || "bg-secondary text-foreground")}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{s.department || "—"}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{s.assignments.length} cohort{s.assignments.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[s.status] || "bg-muted text-muted-foreground")}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
