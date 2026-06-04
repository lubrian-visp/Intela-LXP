import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, Info, GraduationCap, Users,
  Layers, Video, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateLdAllocation, LdPoolMember } from "@/hooks/useLdPool";
import { useProgrammes, useCohorts } from "@/hooks/useCoreData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  member: LdPoolMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ROLE_LABELS: Record<string, string> = {
  facilitator: "Facilitator",
  assessor:    "Assessor",
  moderator:   "Moderator",
  mentor:      "Mentor",
};

const ROLE_COLORS: Record<string, string> = {
  facilitator: "bg-blue-500/10 text-blue-600",
  assessor:    "bg-sky-500/10 text-sky-600",
  moderator:   "bg-violet-500/10 text-violet-600",
  mentor:      "bg-green-500/10 text-green-600",
};

type ScopeType = "cohort" | "programme" | "session";

function useSessions() {
  return useQuery({
    queryKey: ["training_sessions_basic"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("training_sessions")
        .select("id, title, scheduled_start, scheduled_end, status")
        .in("status", ["scheduled", "in_progress"])
        .order("scheduled_start");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export default function LdAllocateDialog({ member, open, onOpenChange }: Props) {
  const create = useCreateLdAllocation();

  const { data: programmes = [] } = useProgrammes();
  const { data: cohorts = [] }    = useCohorts();
  const { data: sessions = [] }   = useSessions();

  const [scopeType, setScopeType]       = useState<ScopeType>("cohort");
  const [selectedProgrammeId, setProgId] = useState("");
  const [scopeId, setScopeId]           = useState("");
  const [scopeLabel, setScopeLabel]     = useState("");
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");
  const [notes, setNotes]               = useState("");

  const displayName = member.profile?.full_name ?? "—";
  const roleLabel   = ROLE_LABELS[member.role_key] ?? member.display_role;
  const roleColor   = ROLE_COLORS[member.role_key] ?? "bg-secondary text-foreground";

  // Active programmes
  const activeProgs = useMemo(() =>
    (programmes as any[]).filter(p => p.status === "active" || p.status === "draft"),
    [programmes]
  );

  // Cohorts filtered to selected programme
  const filteredCohorts = useMemo(() =>
    (cohorts as any[]).filter(c =>
      (!selectedProgrammeId || c.programme_id === selectedProgrammeId) &&
      (c.status === "active" || c.status === "planned")
    ),
    [cohorts, selectedProgrammeId]
  );

  const selectedCohort   = (cohorts as any[]).find(c => c.id === scopeId);
  const selectedProg     = (programmes as any[]).find(p => p.id === (selectedProgrammeId || selectedCohort?.programme_id));
  const selectedSession  = (sessions as any[]).find(s => s.id === scopeId);

  const handleScopeTypeChange = (v: ScopeType) => {
    setScopeType(v);
    setProgId(""); setScopeId(""); setScopeLabel("");
    setStartDate(""); setEndDate("");
  };

  const handleProgrammeSelect = (progId: string) => {
    setProgId(progId);
    setScopeId("");
    setScopeLabel("");
    const p = activeProgs.find(p => p.id === progId);
    if (p && scopeType === "programme") {
      setScopeLabel(p.title);
      if (p.start_date) setStartDate(p.start_date.split("T")[0]);
      if (p.end_date)   setEndDate(p.end_date.split("T")[0]);
    }
  };

  const handleCohortSelect = (cohortId: string) => {
    setScopeId(cohortId);
    const c = (cohorts as any[]).find(c => c.id === cohortId);
    if (c) {
      setScopeLabel(c.name);
      if (c.start_date) setStartDate(c.start_date.split("T")[0]);
      if (c.end_date)   setEndDate(c.end_date.split("T")[0]);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setScopeId(sessionId);
    const s = (sessions as any[]).find(s => s.id === sessionId);
    if (s) {
      setScopeLabel(s.title);
      if (s.scheduled_start) setStartDate(s.scheduled_start.split("T")[0]);
      if (s.scheduled_end)   setEndDate(s.scheduled_end.split("T")[0]);
    }
  };

  const canSubmit = scopeLabel.trim() && startDate && endDate &&
    (scopeType !== "cohort" || !!scopeId);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await create.mutateAsync({
      pool_member_id:    member.id,
      allocated_user_id: member.user_id,
      role_key:          member.role_key,
      scope_type:        scopeType,
      scope_id:          scopeId || undefined,
      scope_label:       scopeLabel.trim(),
      start_date:        startDate,
      end_date:          endDate,
      notes:             notes.trim() || undefined,
    });
    onOpenChange(false);
    setProgId(""); setScopeId(""); setScopeLabel("");
    setStartDate(""); setEndDate(""); setNotes("");
    setScopeType("cohort");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Allocate Practitioner</DialogTitle>
        </DialogHeader>

        {/* Who */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0", roleColor)}>
            {displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Workload</p>
            <p className={cn("text-sm font-bold",
              (member.active_cohort_count ?? 0) >= (member.max_cohorts ?? 4) ? "text-orange-500" : "text-foreground"
            )}>
              {member.active_cohort_count ?? 0}/{member.max_cohorts ?? 4}
            </p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Scope type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assign to</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "cohort",    label: "Cohort",     icon: Users },
                { value: "programme", label: "Programme",  icon: GraduationCap },
                { value: "session",   label: "Session",    icon: Video },
              ] as const).map(s => (
                <button key={s.value} type="button"
                  onClick={() => handleScopeTypeChange(s.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all",
                    scopeType === s.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}>
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Cohort scope: Programme → Cohort two-step ── */}
          {scopeType === "cohort" && (
            <div className="space-y-3 rounded-xl border border-border/50 p-3 bg-secondary/20">
              {/* Step 1: Programme */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">1</span>
                  Select Programme
                </Label>
                <Select value={selectedProgrammeId} onValueChange={handleProgrammeSelect}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All programmes (or filter below)…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_progs">— Show all cohorts —</SelectItem>
                    {activeProgs.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: (p as any).programme_types?.color ?? "#888" }} />
                          <span>{p.title}</span>
                          {(p as any).programme_types?.name && (
                            <span className="text-[10px] text-muted-foreground">· {(p as any).programme_types.name}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Breadcrumb */}
              {selectedProg && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground px-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>{selectedProg.title}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-foreground font-medium">Select cohort below</span>
                </div>
              )}

              {/* Step 2: Cohort */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">2</span>
                  Select Cohort
                  <span className="text-muted-foreground font-normal">({filteredCohorts.length} available)</span>
                </Label>
                {filteredCohorts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-1">
                    No active cohorts {selectedProgrammeId ? "for this programme" : "found"}.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/30">
                    {filteredCohorts.map((c: any) => {
                      const isSelected = scopeId === c.id;
                      const progName   = (programmes as any[]).find(p => p.id === c.programme_id)?.title;
                      const enrolCount = 0; // could fetch enrolments
                      return (
                        <button key={c.id} type="button"
                          onClick={() => handleCohortSelect(c.id)}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
                            isSelected ? "bg-primary/8 border-l-2 border-primary" : "hover:bg-secondary/40"
                          )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                            c.status === "active" ? "bg-green-500" : "bg-blue-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
                            {!selectedProgrammeId && progName && (
                              <p className="text-[10px] text-muted-foreground">{progName}</p>
                            )}
                            {(c.start_date || c.end_date) && (
                              <p className="text-[10px] text-muted-foreground">
                                {c.start_date ? new Date(c.start_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                {" → "}
                                {c.end_date ? new Date(c.end_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "ongoing"}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-semibold text-primary shrink-0 mt-1">Selected ✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Programme scope ── */}
          {scopeType === "programme" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Programme</Label>
              <Select value={selectedProgrammeId} onValueChange={handleProgrammeSelect}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Choose a programme…" /></SelectTrigger>
                <SelectContent>
                  {activeProgs.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: (p as any).programme_types?.color ?? "#888" }} />
                        {p.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Session scope ── */}
          {scopeType === "session" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Session</Label>
              <Select value={scopeId} onValueChange={handleSessionSelect}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Choose a training session…" /></SelectTrigger>
                <SelectContent>
                  {(sessions as any[]).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        {s.scheduled_start && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.scheduled_start).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates — auto-filled, editable */}
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
          {(startDate || endDate) && (
            <p className="text-[10px] text-muted-foreground -mt-2">
              Dates are auto-filled from the selected {scopeType} — adjust if needed.
            </p>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any context about this allocation…"
              rows={2} className="text-sm resize-none" />
          </div>

          {/* Info banner for cohort */}
          {scopeType === "cohort" && scopeId && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                <strong>{displayName}</strong> will appear in the cohort's staff roster as <strong>{roleLabel}</strong>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={create.isPending || !canSubmit}>
            {create.isPending ? "Allocating…" : "Allocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
