import { useState, useMemo } from "react";
import {
  Users, Shield, ClipboardList, Settings2, Search, Plus,
  CheckCircle2, Clock, XCircle, AlertTriangle, ChevronDown,
  ToggleLeft, ToggleRight, UserMinus, UserCheck, Eye, History,
  Lock, Unlock, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { WelcomeBanner, KpiGrid } from "@/components/dashboard/DashboardShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  usePoolConfig, usePoolMembers, useAllocations, usePoolAuditLog,
  useMyPrivilegeLevel, useUpdatePoolConfig, useUpdatePoolMemberStatus,
  useApproveAllocation, PoolMember, AdminAllocation, PoolConfig,
} from "@/hooks/useAdminPool";
import AllocateDialog from "@/components/admin-pool/AllocateDialog";
import RevokeDialog from "@/components/admin-pool/RevokeDialog";
import { format, isPast, parseISO } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:           { label: "Active",           color: "bg-green-500/10 text-green-600 border-green-500/20" },
  pending_approval: { label: "Pending Approval",  color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  completed:        { label: "Completed",          color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  revoked:          { label: "Revoked",            color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

const POOL_STATUS_CONFIG = {
  active:    { label: "Active",    color: "bg-green-500/10 text-green-600" },
  suspended: { label: "Suspended", color: "bg-orange-500/10 text-orange-600" },
  removed:   { label: "Removed",   color: "bg-rose-500/10 text-rose-600" },
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  added_to_pool:             "Added to pool",
  member_suspended:          "Member suspended",
  member_removed:            "Member removed",
  member_active:             "Member reactivated",
  allocation_created:        "Allocation created",
  allocation_pending_approval: "Allocation submitted for approval",
  allocation_approved:       "Allocation approved",
  allocation_rejected:       "Allocation rejected",
  allocation_revoked:        "Allocation revoked",
  pool_config_updated:       "Pool config updated",
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, size = "sm" }: { name?: string | null; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return (
    <div className={cn("rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0", sz)}>
      {initials(name)}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "pool" | "allocations" | "pending" | "audit" | "settings";

export default function AdminStaffPool() {
  const { user, roles } = useAuth();
  const myLevel = useMyPrivilegeLevel();
  const isSuperAdmin = roles.includes("super_admin" as any);
  const isHighLevel  = myLevel >= 3;

  const [tab, setTab] = useState<Tab>("pool");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [allocatingMember, setAllocatingMember] = useState<PoolMember | null>(null);
  const [revokingAlloc, setRevokingAlloc]       = useState<AdminAllocation | null>(null);

  const { data: configs = [],  isLoading: configLoading }  = usePoolConfig();
  const { data: members = [],  isLoading: membersLoading } = usePoolMembers();
  const { data: allocations = [], isLoading: allocLoading }  = useAllocations({ status: statusFilter !== "all" ? statusFilter : undefined });
  const { data: pendingAllocations = [] }                    = useAllocations({ status: "pending_approval" });
  const { data: auditLog = [],  isLoading: auditLoading }  = usePoolAuditLog();

  const updateMemberStatus = useUpdatePoolMemberStatus();
  const updateConfig       = useUpdatePoolConfig();
  const approveAlloc       = useApproveAllocation();

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpiItems = useMemo(() => {
    const active    = members.filter(m => m.pool_status === "active").length;
    const suspended = members.filter(m => m.pool_status === "suspended").length;
    const activeAllocs  = allocations.filter(a => a.status === "active").length;
    const overdue   = allocations.filter(a => a.status === "active" && isPast(parseISO(a.end_date))).length;
    return [
      { label: "Active Pool Members", value: active,    sub: `${members.length} total`,        trend: true,  icon: Users,        iconBg: "bg-blue-500/10",   iconColor: "text-blue-500" },
      { label: "Active Allocations",  value: activeAllocs, sub: `${overdue} overdue`,          trend: overdue === 0, icon: ClipboardList, iconBg: "bg-green-500/10",  iconColor: "text-green-500" },
      { label: "Pending Approval",    value: pendingAllocations.length, sub: "awaiting review", trend: pendingAllocations.length === 0, icon: Clock, iconBg: pendingAllocations.length > 0 ? "bg-orange-500/10" : "bg-green-500/10", iconColor: pendingAllocations.length > 0 ? "text-orange-500" : "text-green-500" },
      { label: "Suspended",           value: suspended, sub: "from pool",                      trend: suspended === 0, icon: Shield, iconBg: suspended > 0 ? "bg-rose-500/10" : "bg-green-500/10", iconColor: suspended > 0 ? "text-rose-500" : "text-green-500" },
    ];
  }, [members, allocations, pendingAllocations]);

  // ── Filtered pool members ──────────────────────────────────────────────────
  const filteredMembers = useMemo(() => members.filter(m => {
    const name = m.profile?.full_name?.toLowerCase() ?? "";
    const role = m.config?.display_name?.toLowerCase() ?? m.role_key.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || role.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.pool_status === statusFilter;
    return matchSearch && matchStatus;
  }), [members, search, statusFilter]);

  // ── Filtered allocations ───────────────────────────────────────────────────
  const filteredAllocs = useMemo(() => allocations.filter(a => {
    const label = a.scope_label?.toLowerCase() ?? "";
    const memberName = (a.member as any)?.profile?.full_name?.toLowerCase() ?? "";
    return label.includes(search.toLowerCase()) || memberName.includes(search.toLowerCase());
  }), [allocations, search]);

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: "pool",        label: "Admin Pool",    icon: Users,        badge: members.filter(m => m.pool_status === "active").length },
    { key: "allocations", label: "Allocations",   icon: ClipboardList },
    { key: "pending",     label: "Pending",       icon: Clock,        badge: pendingAllocations.length },
    { key: "audit",       label: "Audit Log",     icon: History },
    ...(isSuperAdmin ? [{ key: "settings" as Tab, label: "Settings", icon: Settings2 }] : []),
  ];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        subtitle="Manage your admin staff pool — allocate, track, and audit all assignments in one place."
      />
      <KpiGrid items={kpiItems} />

      {/* ── Tabs ── */}
      <FadeIn>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-4 border-b border-border overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(""); setStatusFilter("all"); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                  tab === t.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── Pool Tab ── */}
            {tab === "pool" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Admin Staff Pool</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="removed">Removed</option>
                    </select>
                  </div>
                </div>

                {membersLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No pool members found.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Staff are automatically added when approved with an admin role.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 -mx-5">
                    {filteredMembers.map(m => {
                      const sc = POOL_STATUS_CONFIG[m.pool_status];
                      const memberLevel = configs.find(c => c.role_key === m.role_key)?.privilege_level ?? 0;
                      const canAllocate = myLevel > memberLevel && m.pool_status === "active";
                      const canManage   = myLevel >= 3;

                      return (
                        <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                          <Avatar name={m.profile?.full_name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{m.profile?.full_name ?? "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{m.config?.display_name ?? m.role_key}</span>
                              {m.profile?.job_title && (
                                <span className="text-[9px] text-muted-foreground/60">· {m.profile.job_title}</span>
                              )}
                            </div>
                          </div>

                          {/* Privilege badge */}
                          <div className="hidden sm:flex flex-col items-center gap-0.5">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Level</span>
                            <span className="text-lg font-bold text-foreground leading-none">{memberLevel}</span>
                          </div>

                          <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full border", sc.color)}>{sc.label}</span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {canAllocate && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                                onClick={() => setAllocatingMember(m)}>
                                <Plus className="w-3 h-3" /> Allocate
                              </Button>
                            )}
                            {!canAllocate && m.pool_status === "active" && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Insufficient level
                              </span>
                            )}
                            {canManage && (
                              <select
                                value={m.pool_status}
                                onChange={e => updateMemberStatus.mutate({ id: m.id, status: e.target.value as any })}
                                className="text-[11px] px-2 py-1 rounded-lg border border-border bg-background text-foreground focus:outline-none"
                              >
                                <option value="active">Active</option>
                                <option value="suspended">Suspend</option>
                                <option value="removed">Remove</option>
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Allocations Tab ── */}
            {tab === "allocations" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">All Allocations</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{filteredAllocs.length} record{filteredAllocs.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search allocations…"
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="completed">Completed</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                </div>

                {allocLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                ) : filteredAllocs.length === 0 ? (
                  <div className="py-12 text-center">
                    <ClipboardList className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No allocations found.</p>
                  </div>
                ) : (
                  <AllocationTable
                    allocations={filteredAllocs}
                    onRevoke={a => setRevokingAlloc(a)}
                    currentUserId={user?.id}
                    myLevel={myLevel}
                  />
                )}
              </div>
            )}

            {/* ── Pending Approval Tab ── */}
            {tab === "pending" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Pending Approval</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{pendingAllocations.length} allocation{pendingAllocations.length !== 1 ? "s" : ""} awaiting your decision</p>
                </div>
                {pendingAllocations.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No pending approvals. You're all caught up.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingAllocations.map(a => {
                      const memberName = (a.member as any)?.profile?.full_name ?? "Unknown";
                      const allocatorName = (a.allocator_profile as any)?.full_name ?? "Unknown";
                      const overdue = isPast(parseISO(a.end_date));
                      return (
                        <div key={a.id} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <Avatar name={memberName} size="md" />
                              <div>
                                <p className="text-sm font-semibold text-foreground">{memberName}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {a.scope_type} · <strong>{a.scope_label}</strong>
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {format(parseISO(a.start_date), "d MMM yyyy")} → {format(parseISO(a.end_date), "d MMM yyyy")}
                                  {overdue && <span className="ml-1.5 text-rose-500 font-medium">· overdue</span>}
                                </p>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Requested by: {allocatorName}</p>
                                {a.notes && <p className="text-[10px] text-muted-foreground mt-1 italic">"{a.notes}"</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs gap-1.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                onClick={() => approveAlloc.mutate({ id: a.id, approved: false })}
                                disabled={approveAlloc.isPending}
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                              <Button size="sm" className="h-7 text-xs gap-1.5"
                                onClick={() => approveAlloc.mutate({ id: a.id, approved: true })}
                                disabled={approveAlloc.isPending}
                              >
                                <CheckSquare className="w-3 h-3" /> Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Audit Log Tab ── */}
            {tab === "audit" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Audit Log</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">All pool and allocation events — immutable record</p>
                </div>
                {auditLoading ? (
                  <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
                ) : auditLog.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">No audit events yet.</div>
                ) : (
                  <div className="bg-foreground/5 font-mono text-xs rounded-xl divide-y divide-border/30 overflow-hidden">
                    {auditLog.map(entry => (
                      <div key={entry.id} className="px-4 py-2.5 flex items-start gap-4 hover:bg-foreground/5 transition-colors">
                        <span className="text-muted-foreground shrink-0 w-32">
                          {format(new Date(entry.created_at), "dd MMM HH:mm:ss")}
                        </span>
                        <span className={cn("shrink-0 font-semibold w-6 text-center",
                          entry.action.includes("revoke") || entry.action.includes("reject") || entry.action.includes("removed")
                            ? "text-rose-500"
                            : entry.action.includes("pending")
                              ? "text-orange-500"
                              : "text-green-500"
                        )}>●</span>
                        <span className="text-foreground capitalize flex-1">
                          {AUDIT_ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ")}
                        </span>
                        {entry.details?.scope_label && (
                          <span className="text-muted-foreground truncate max-w-[160px]">"{entry.details.scope_label}"</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Settings Tab (super_admin only) ── */}
            {tab === "settings" && isSuperAdmin && (
              <PoolSettingsPanel configs={configs} isLoading={configLoading} onUpdate={updateConfig.mutate} />
            )}
          </div>
        </div>
      </FadeIn>

      {/* ── Dialogs ── */}
      {allocatingMember && (
        <AllocateDialog
          member={allocatingMember}
          open={!!allocatingMember}
          onOpenChange={open => { if (!open) setAllocatingMember(null); }}
        />
      )}
      {revokingAlloc && (
        <RevokeDialog
          allocation={revokingAlloc}
          open={!!revokingAlloc}
          onOpenChange={open => { if (!open) setRevokingAlloc(null); }}
        />
      )}
    </div>
  );
}

// ── Allocation table component ────────────────────────────────────────────────

function AllocationTable({
  allocations, onRevoke, currentUserId, myLevel,
}: {
  allocations: AdminAllocation[];
  onRevoke: (a: AdminAllocation) => void;
  currentUserId?: string;
  myLevel: number;
}) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Scope</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocated by</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {allocations.map(a => {
            const memberName    = (a.member as any)?.profile?.full_name ?? "—";
            const allocatorName = (a.allocator_profile as any)?.full_name ?? "—";
            const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.active;
            const overdue = a.status === "active" && isPast(parseISO(a.end_date));
            const canRevoke = a.status === "active" &&
              (a.allocator_id === currentUserId || myLevel >= 4);

            return (
              <tr key={a.id} className={cn("hover:bg-secondary/20 transition-colors", overdue && "bg-rose-500/5")}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={memberName} />
                    <span className="font-medium text-foreground">{memberName}</span>
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
                      onClick={() => onRevoke(a)}
                    >
                      <XCircle className="w-3 h-3" /> Revoke
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Pool settings panel (super_admin) ─────────────────────────────────────────

function PoolSettingsPanel({
  configs, isLoading, onUpdate,
}: {
  configs: PoolConfig[];
  isLoading: boolean;
  onUpdate: (data: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Pool Configuration</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Configure which roles participate in the pool, their privilege levels, and approval requirements. Changes take effect immediately.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Privilege Level</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In Pool</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Can Allocate</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Needs Approval</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Approved by Role</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {configs.map(c => (
                <tr key={c.id} className={cn("hover:bg-secondary/10 transition-colors", !c.is_active && "opacity-50")}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-foreground">{c.display_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{c.role_key}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number" min={0} max={10}
                      defaultValue={c.privilege_level}
                      onBlur={e => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val !== c.privilege_level)
                          onUpdate({ id: c.id, privilege_level: val });
                      }}
                      className="w-14 text-center text-sm font-bold rounded-lg border border-border bg-background py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={c.is_pool_eligible}
                      onCheckedChange={v => onUpdate({ id: c.id, is_pool_eligible: v })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={c.can_allocate}
                      onCheckedChange={v => onUpdate({ id: c.id, can_allocate: v })}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={c.requires_approval}
                      disabled={!c.can_allocate}
                      onCheckedChange={v => onUpdate({ id: c.id, requires_approval: v })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {c.can_allocate && c.requires_approval ? (
                      <select
                        defaultValue={c.approval_assigned_role ?? ""}
                        onBlur={e => {
                          if (e.target.value !== (c.approval_assigned_role ?? ""))
                            onUpdate({ id: c.id, approval_assigned_role: e.target.value || null });
                        }}
                        className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none w-36"
                      >
                        <option value="">— None —</option>
                        {configs.filter(r => r.can_allocate && r.privilege_level > c.privilege_level).map(r => (
                          <option key={r.role_key} value={r.role_key}>{r.display_name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={v => onUpdate({ id: c.id, is_active: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
