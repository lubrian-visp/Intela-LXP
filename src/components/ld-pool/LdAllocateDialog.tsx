import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateLdAllocation, LdPoolMember } from "@/hooks/useLdPool";
import { useCohorts } from "@/hooks/useCoreData";

interface Props {
  member: LdPoolMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SCOPE_TYPES = [
  { value: "cohort",     label: "Cohort",     description: "Assign to a specific cohort" },
  { value: "programme",  label: "Programme",  description: "Assign to support an entire programme" },
  { value: "session",    label: "Session",    description: "Assign to a specific training session" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  facilitator: "Facilitator",
  assessor:    "Assessor",
  moderator:   "Moderator",
  mentor:      "Mentor",
};

export default function LdAllocateDialog({ member, open, onOpenChange }: Props) {
  const create = useCreateLdAllocation();
  const { data: cohorts = [] } = useCohorts();

  const [scopeType, setScopeType]     = useState<"cohort" | "programme" | "session">("cohort");
  const [scopeId, setScopeId]         = useState("");
  const [scopeLabel, setScopeLabel]   = useState("");
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [notes, setNotes]             = useState("");

  const displayName = member.profile?.full_name ?? "—";
  const roleLabel   = ROLE_LABELS[member.role_key] ?? member.display_role;

  // When cohort scope and a cohort is selected, auto-fill the label
  const handleCohortSelect = (cohortId: string) => {
    setScopeId(cohortId);
    const cohort = cohorts.find((c: any) => c.id === cohortId);
    if (cohort) setScopeLabel((cohort as any).name || cohortId);
  };

  const handleSubmit = async () => {
    if (!scopeLabel.trim() || !startDate || !endDate) return;
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
    setScopeLabel(""); setScopeId(""); setStartDate(""); setEndDate(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Allocate Practitioner</DialogTitle>
        </DialogHeader>

        {/* Who */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
            "bg-sky-500/10 text-sky-600"
          )}>
            {displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-muted-foreground">Workload</p>
            <p className="text-sm font-bold text-foreground">
              {member.active_cohort_count ?? 0}/{member.max_cohorts ?? 4} cohorts
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Scope type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assign to</Label>
            <Select value={scopeType} onValueChange={v => { setScopeType(v as any); setScopeId(""); setScopeLabel(""); }}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPE_TYPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cohort picker or free-text label */}
          {scopeType === "cohort" ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Cohort</Label>
              <Select value={scopeId} onValueChange={handleCohortSelect}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Choose a cohort…" /></SelectTrigger>
                <SelectContent>
                  {cohorts.filter((c: any) => c.status === "active" || c.status === "planned").map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {scopeType === "programme" ? "Programme Name" : "Session Name"}
              </Label>
              <Input
                value={scopeLabel}
                onChange={e => setScopeLabel(e.target.value)}
                placeholder={scopeType === "programme" ? "e.g. Data Science Certificate" : "e.g. Module 3 Workshop"}
                className="text-sm"
              />
            </div>
          )}

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
            <Textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any context about this allocation…"
              rows={2} className="text-sm resize-none"
            />
          </div>

          {/* Cohort info banner */}
          {scopeType === "cohort" && scopeId && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/15">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                This will also create a cohort staff assignment so <strong>{displayName}</strong> appears in the cohort's staff roster.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm" onClick={handleSubmit}
            disabled={create.isPending || !scopeLabel.trim() || !startDate || !endDate}
          >
            {create.isPending ? "Allocating…" : "Allocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
