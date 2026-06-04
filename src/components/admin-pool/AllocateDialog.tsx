import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Info, Users, GraduationCap, Building2, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateAllocation, PoolMember } from "@/hooks/useAdminPool";
import { useProgrammes } from "@/hooks/useCoreData";
import { useApprovalTasks } from "@/hooks/useCoreData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  member: PoolMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type ScopeType = "team" | "task" | "programme" | "department";

/** Fetch previously used team/department names for autocomplete */
function useScopeHistory(scopeType: string) {
  return useQuery({
    queryKey: ["admin_alloc_history", scopeType],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("admin_allocations")
        .select("scope_label")
        .eq("scope_type", scopeType)
        .order("created_at", { ascending: false })
        .limit(30);
      return [...new Set((data ?? []).map((r: any) => r.scope_label as string))];
    },
    staleTime: 60_000,
    enabled: scopeType === "team" || scopeType === "department",
  });
}

const SCOPE_CONFIG: Record<ScopeType, {
  label: string; icon: any; description: string;
  placeholder: string; hint: string;
}> = {
  team: {
    label: "Team",
    icon: Users,
    description: "Allocate to an operational or project team",
    placeholder: "e.g. Finance Team, Learner Success Team",
    hint: "Enter the team name. Previous teams are suggested below.",
  },
  task: {
    label: "Task / Project",
    icon: ClipboardCheck,
    description: "Allocate to a specific pending task or project",
    placeholder: "e.g. Q2 Onboarding Drive, Accreditation Review",
    hint: "Select a pending approval task or enter a custom task name.",
  },
  programme: {
    label: "Programme",
    icon: GraduationCap,
    description: "Allocate to support a specific programme",
    placeholder: "Select a programme",
    hint: "Dates are auto-filled from the programme's schedule.",
  },
  department: {
    label: "Department",
    icon: Building2,
    description: "Allocate to a department or business unit",
    placeholder: "e.g. Academic, HR, Finance, IT",
    hint: "Enter the department name.",
  },
};

export default function AllocateDialog({ member, open, onOpenChange }: Props) {
  const create = useCreateAllocation();

  const { data: programmes = [] } = useProgrammes();
  const { data: pendingTasks = [] } = useApprovalTasks();

  const [scopeType, setScopeType]   = useState<ScopeType>("team");
  const [scopeLabel, setScopeLabel] = useState("");
  const [scopeId, setScopeId]       = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [notes, setNotes]           = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState("");

  const { data: history = [] } = useScopeHistory(scopeType);

  const requiresApproval = member.config?.requires_approval ?? false;
  const displayName      = member.profile?.full_name ?? "Unknown";
  const roleLabel        = member.config?.display_name ?? member.role_key;
  const sc               = SCOPE_CONFIG[scopeType];

  const activeProgs = useMemo(() =>
    (programmes as any[]).filter(p => p.status === "active" || p.status === "draft"),
    [programmes]
  );

  const openTasks = useMemo(() =>
    (pendingTasks ?? []).filter((t: any) => t.status === "pending"),
    [pendingTasks]
  );

  const filteredSuggestions = history.filter(s =>
    !suggestionFilter || s.toLowerCase().includes(suggestionFilter.toLowerCase())
  );

  const handleScopeTypeChange = (v: ScopeType) => {
    setScopeType(v); setScopeLabel(""); setScopeId("");
    setStartDate(""); setEndDate(""); setShowSuggestions(false);
  };

  const handleProgrammeSelect = (progId: string) => {
    setScopeId(progId);
    const p = activeProgs.find(p => p.id === progId);
    if (p) {
      setScopeLabel((p as any).title);
      if ((p as any).start_date) setStartDate((p as any).start_date.split("T")[0]);
      if ((p as any).end_date)   setEndDate((p as any).end_date.split("T")[0]);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setScopeId(taskId);
    const t = (pendingTasks ?? []).find((t: any) => t.id === taskId);
    if (t) setScopeLabel((t as any).title);
  };

  const handleSubmit = async () => {
    if (!scopeLabel.trim() || !startDate || !endDate) return;
    await create.mutateAsync({
      pool_member_id:    member.id,
      allocated_user_id: member.user_id,
      member_role_key:   member.role_key,
      scope_type:        scopeType,
      scope_label:       scopeLabel.trim(),
      start_date:        startDate,
      end_date:          endDate,
      notes:             notes.trim() || undefined,
    });
    onOpenChange(false);
    setScopeLabel(""); setScopeId(""); setStartDate(""); setEndDate(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Allocate Admin Staff</DialogTitle>
        </DialogHeader>

        {/* Who */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0">
            Level {member.config?.privilege_level ?? 1}
          </span>
        </div>

        {requiresApproval && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-orange-600">
              Requires approval from <strong>{member.config?.approval_assigned_role?.replace(/_/g, " ")}</strong> before activating.
            </p>
          </div>
        )}

        <div className="space-y-4">

          {/* Scope type — card selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Allocate to</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(SCOPE_CONFIG) as [ScopeType, typeof SCOPE_CONFIG[ScopeType]][]).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => handleScopeTypeChange(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-[11px] font-medium transition-all",
                    scopeType === key
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}>
                  <cfg.icon className="w-4 h-4" />
                  {cfg.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground px-1">{sc.description}</p>
          </div>

          {/* ── Programme scope ── */}
          {scopeType === "programme" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Programme</Label>
              <Select value={scopeId} onValueChange={handleProgrammeSelect}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Choose a programme…" />
                </SelectTrigger>
                <SelectContent>
                  {activeProgs.length === 0
                    ? <div className="px-4 py-3 text-xs text-muted-foreground">No active programmes found.</div>
                    : activeProgs.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.programme_types?.color ?? "#888" }} />
                          <span className="text-sm">{p.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Task scope: pending approval tasks + custom ── */}
          {scopeType === "task" && (
            <div className="space-y-3">
              {openTasks.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Pending Tasks (from Approval Queue)</Label>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-border/40 divide-y divide-border/30">
                    {openTasks.slice(0, 10).map((t: any) => (
                      <button key={t.id} type="button"
                        onClick={() => handleTaskSelect(t.id)}
                        className={cn(
                          "w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-secondary/40 transition-colors",
                          scopeId === t.id && "bg-primary/5 border-l-2 border-primary"
                        )}>
                        <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {t.task_type?.replace(/_/g, " ")} · {t.assigned_role?.replace(/_/g, " ")}
                          </p>
                        </div>
                        {scopeId === t.id && <span className="text-[10px] text-primary font-medium shrink-0 ml-auto">Selected ✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Or enter a custom task name</Label>
                <Input value={scopeLabel} onChange={e => { setScopeLabel(e.target.value); setScopeId(""); }}
                  placeholder={sc.placeholder} className="text-sm" />
              </div>
            </div>
          )}

          {/* ── Team / Department scope: history suggestions + free text ── */}
          {(scopeType === "team" || scopeType === "department") && (
            <div className="space-y-2">
              {filteredSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Recent {sc.label}s</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSuggestions.slice(0, 8).map(s => (
                      <button key={s} type="button"
                        onClick={() => setScopeLabel(s)}
                        className={cn(
                          "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                          scopeLabel === s
                            ? "bg-primary/10 border-primary/30 text-primary font-medium"
                            : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-primary/30"
                        )}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{sc.label} Name</Label>
                <Input value={scopeLabel} onChange={e => setScopeLabel(e.target.value)}
                  placeholder={sc.placeholder} className="text-sm" />
              </div>
            </div>
          )}

          {/* Hint */}
          <p className="text-[10px] text-muted-foreground -mt-2 px-0.5">{sc.hint}</p>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Start Date
              </Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> End Date
              </Label>
              <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Context, deliverables, or expectations…"
              rows={2} className="text-sm resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit}
            disabled={create.isPending || !scopeLabel.trim() || !startDate || !endDate}>
            {create.isPending ? "Creating…" : requiresApproval ? "Submit for Approval" : "Allocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
