import { useState, useMemo } from "react";
import {
  Users, Search, History, AlertTriangle,
  CheckCircle2, Settings2, MoreHorizontal,
  Plus, XCircle, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { WelcomeBanner, KpiGrid } from "@/components/dashboard/DashboardShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isPast, parseISO } from "date-fns";
import {
  useLdPoolMembers, useLdPoolRoles, useUpdateLdPoolMember, useLdPoolAuditLog,
  useLdAllocations, LdPoolMember, LdAllocation,
} from "@/hooks/useLdPool";
import LdAllocateDialog from "@/components/ld-pool/LdAllocateDialog";
import LdRevokeDialog   from "@/components/ld-pool/LdRevokeDialog";
import { useAuth } from "@/hooks/useAuth";

// ── Role colour map ────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  facilitator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  assessor:    "bg-sky-500/10 text-sky-600 border-sky-500/20",
  moderator:   "bg-violet-500/10 text-violet-600 border-violet-500/20",
  mentor:      "bg-green-500/10 text-green-600 border-green-500/20",
};

const AUDIT_LABELS: Record<string, string> = {
  added_to_ld_pool:   "Added to pool",
  member_suspended:   "Suspended",
  member_removed:     "Removed",
  member_active:      "Reactivated",
  assessor_assigned:  "Assessor assigned to submission",
  moderator_assigned: "Moderator assigned to submission",
};

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border", ROLE_COLORS[role] ?? "bg-secondary text-foreground border-border")}>
      {initials}
    </div>
  );
}

// ── Workload bar ───────────────────────────────────────────────────────────────
function WorkloadBar({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className={cn("font-medium", count >= max ? "text-orange-500" : count >= max * 0.75 ? "text-yellow-500" : "text-green-600")}>
          {count}/{max} cohorts
        </span>
        {count >= max && <span className="text-orange-500 font-medium">At capacity</span>}
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", count >= max ? "bg-orange-500" : count >= max * 0.75 ? "bg-yellow-400" : "bg-green-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:    { label: "Active",    color: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  revoked:   { label: "Revoked",   color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

type Tab = "pool" | "allocations" | "audit";

export default function LdPractitionerPool() {
  const { roles } = useAuth();
  const canManage = roles.some(r => ["super_admin","systems_admin","operations","programme_manager"].includes(r as string));

  const [tab, setTab]               = useState<Tab>("pool");
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [allocFilter, setAllocFilter] = useState("all");
  const [allocatingMember, setAllocatingMember] = useState<LdPoolMember | null>(null);
  const [revokingAlloc, setRevokingAlloc]       = useState<LdAllocation | null>(null);

  const { data: poolRoles = [] }           = useLdPoolRoles();
  const { data: members = [], isLoading }  = useLdPoolMembers();
  const { data: allocations = [] }         = useLdAllocations({ status: allocFilter !== "all" ? allocFilter : undefined });
  const { data: auditLog = [] }            = useLdPoolAuditLog();
  const updateMember                       = useUpdateLdPoolMember();

  const filtered = useMemo(() => members.filter(m => {
    const name = m.profile?.full_name?.toLowerCase() ?? "";
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || m.role_key === roleFilter;
    return matchSearch && matchRole;
  }), [members, search, roleFilter]);

  const kpiItems = useMemo(() => {
    const active      = members.filter(m => m.pool_status === "active").length;
    const atCapacity  = members.filter(m => (m.active_cohort_count ?? 0) >= (m.max_cohorts ?? 4)).length;
    const available   = members.filter(m => m.pool_status === "active" && (m.active_cohort_count ?? 0) < (m.max_cohorts ?? 4)).length;
    const suspended   = members.filter(m => m.pool_status === "suspended").length;
    return [
      { label: "Active Practitioners", value: active,     sub: `${members.length} total`, trend: true,  icon: Users,        iconBg: "bg-blue-500/10",   iconColor: "text-blue-500" },
      { label: "Available Now",        value: available,  sub: "under capacity",          trend: true,  icon: CheckCircle2, iconBg: "bg-green-500/10",  iconColor: "text-green-500" },
      { label: "At Capacity",          value: atCapacity, sub: "max cohorts reached",     trend: atCapacity === 0, icon: AlertTriangle, iconBg: atCapacity > 0 ? "bg-orange-500/10" : "bg-green-500/10", iconColor: atCapacity > 0 ? "text-orange-500" : "text-green-500" },
      { label: "Suspended",            value: suspended,  sub: "from pool",               trend: suspended === 0, icon: Settings2,    iconBg: suspended > 0 ? "bg-rose-500/10" : "bg-green-500/10", iconColor: suspended > 0 ? "text-rose-500" : "text-green-500" },
    ];
  }, [members]);

  return (
    <div className="space-y-6">
      <WelcomeBanner
        subtitle="Manage the L&D Practitioner Pool — source for all cohort facilitation, assessment, moderation, and mentoring assignments."
      />
      {isLoading
        ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        : <KpiGrid items={kpiItems} />
      }

      <FadeIn>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-4 border-b border-border">
            {([
              { key: "pool"        as Tab, label: "Practitioner Pool", icon: Users,          badge: members.filter(m => m.pool_status === "active").length },
              { key: "allocations" as Tab, label: "Allocations",       icon: ClipboardList,  badge: allocations.filter(a => a.status === "active").length },
              { key: "audit"       as Tab, label: "Audit Log",         icon: History },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 transition-colors",
                  tab === t.key ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ── Pool Tab ── */}
            {tab === "pool" && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">L&D Practitioner Pool</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} practitioner{filtered.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
                      <option value="all">All Roles</option>
                      {poolRoles.map(r => <option key={r.role_key} value={r.role_key}>{r.display_name}</option>)}
                    </select>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search practitioners…"
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground">No practitioners in the pool</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Approve Facilitator, Assessor, Moderator, or Mentor staff in Staff Onboarding to populate this pool.
                    </p>
                  </div>
                ) : (
                  /* Group by role */
                  poolRoles.filter(r => roleFilter === "all" || r.role_key === roleFilter).map(roleRow => {
                    const roleMembers = filtered.filter(m => m.role_key === roleRow.role_key);
                    if (roleMembers.length === 0) return null;
                    return (
                      <div key={roleRow.role_key} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", ROLE_COLORS[roleRow.role_key])}>
                            {roleRow.display_name}s
                          </span>
                          <span className="text-[10px] text-muted-foreground">{roleMembers.length}</span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>

                        <div className="divide-y divide-border/30 rounded-xl border border-border/40 overflow-hidden">
                          {roleMembers.map(m => {
                            const name      = m.profile?.full_name ?? "—";
                            const cohorts   = m.active_cohort_count ?? 0;
                            const maxC      = m.max_cohorts ?? 4;
                            const sc = m.pool_status === "active" ? "bg-green-500/10 text-green-600" :
                                       m.pool_status === "suspended" ? "bg-orange-500/10 text-orange-600" :
                                       "bg-rose-500/10 text-rose-600";

                            return (
                              <div key={m.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/20 transition-colors">
                                <Avatar name={name} role={m.role_key} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold text-foreground truncate">{name}</p>
                                  <p className="text-[10px] text-muted-foreground">{m.profile?.job_title || m.display_role}</p>
                                  {m.specialisation && <p className="text-[10px] text-muted-foreground/70">{m.specialisation}</p>}
                                </div>

                                <div className="w-32 hidden sm:block">
                                  <WorkloadBar count={cohorts} max={maxC} />
                                </div>

                                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0", sc)}>
                                  {m.pool_status}
                                </span>

                                {canManage && m.pool_status === "active" && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shrink-0"
                                    onClick={() => setAllocatingMember(m)}>
                                    <Plus className="w-3 h-3" /> Allocate
                                  </Button>
                                )}
                                {canManage && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      {m.pool_status !== "active" && (
                                        <DropdownMenuItem onClick={() => updateMember.mutate({ id: m.id, pool_status: "active" })} className="text-xs">
                                          ✓ Reactivate
                                        </DropdownMenuItem>
                                      )}
                                      {m.pool_status === "active" && (
                                        <DropdownMenuItem onClick={() => updateMember.mutate({ id: m.id, pool_status: "suspended" })} className="text-xs">
                                          ⏸ Suspend
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => updateMember.mutate({ id: m.id, pool_status: "removed" })} className="text-xs text-destructive focus:text-destructive">
                                        ✕ Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Allocations Tab ── */}
            {tab === "allocations" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Practitioner Allocations</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{allocations.length} allocation record{allocations.length !== 1 ? "s" : ""}</p>
                  </div>
                  <select value={allocFilter} onChange={e => setAllocFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>

                {allocations.length === 0 ? (
                  <div className="py-12 text-center">
                    <ClipboardList className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No allocations yet.</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Click <strong>Allocate</strong> on a pool member to create the first one.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Practitioner</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scope</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocated by</th>
                          <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {allocations.map(a => {
                          const memberName    = (a.member as any)?.profile?.full_name ?? "—";
                          const allocatorName = (a.allocator_profile as any)?.full_name ?? "—";
                          const sc            = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.active;
                          const overdue       = a.status === "active" && isPast(parseISO(a.end_date));
                          const canRevoke     = a.status === "active" && canManage;

                          return (
                            <tr key={a.id} className={cn("hover:bg-secondary/20 transition-colors", overdue && "bg-rose-500/5")}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                    {memberName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-medium text-foreground">{memberName}</p>
                                    <p className="text-[10px] text-muted-foreground capitalize">{a.role_key}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-foreground capitalize mr-1.5">{a.scope_type}</span>
                                <span className="text-sm text-foreground">{a.scope_label}</span>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                                {format(parseISO(a.start_date), "d MMM yy")} →{" "}
                                <span className={overdue ? "text-rose-500 font-medium" : ""}>
                                  {format(parseISO(a.end_date), "d MMM yy")}
                                </span>
                                {overdue && <span className="ml-1 text-[9px] font-bold text-rose-500 uppercase">Overdue</span>}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-muted-foreground">{allocatorName}</td>
                              <td className="px-4 py-3">
                                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", sc.color)}>{sc.label}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {canRevoke ? (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                                    onClick={() => setRevokingAlloc(a)}>
                                    <XCircle className="w-3 h-3" /> Revoke
                                  </Button>
                                ) : <span className="text-[10px] text-muted-foreground">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Audit Tab ── */}
            {tab === "audit" && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">All pool membership and assignment events</p>
                </div>
                {auditLog.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No events recorded yet.</div>
                ) : (
                  <div className="space-y-0 relative">
                    <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border/40" />
                    {auditLog.map((e: any) => (
                      <div key={e.id} className="flex gap-4 pb-4 pl-1">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10 ring-2 ring-background">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-[13px] font-medium text-foreground">
                            {AUDIT_LABELS[e.action] ?? e.action.replace(/_/g, " ")}
                          </p>
                          {e.details?.full_name && <p className="text-[10px] text-muted-foreground">{e.details.full_name}</p>}
                        </div>
                        <time className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {format(new Date(e.created_at), "d MMM · HH:mm")}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </FadeIn>

      {/* Dialogs */}
      {allocatingMember && (
        <LdAllocateDialog
          member={allocatingMember}
          open={!!allocatingMember}
          onOpenChange={v => { if (!v) setAllocatingMember(null); }}
        />
      )}
      {revokingAlloc && (
        <LdRevokeDialog
          allocation={revokingAlloc}
          open={!!revokingAlloc}
          onOpenChange={v => { if (!v) setRevokingAlloc(null); }}
        />
      )}
    </div>
  );
}
