import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateAllocation, PoolMember } from "@/hooks/useAdminPool";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  member: PoolMember;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SCOPE_TYPES = [
  { value: "team",        label: "Team",        description: "Allocate to a named team" },
  { value: "task",        label: "Task",         description: "Allocate for a specific task" },
  { value: "programme",   label: "Programme",    description: "Allocate to support a programme" },
  { value: "department",  label: "Department",   description: "Allocate to a department" },
] as const;

export default function AllocateDialog({ member, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const create = useCreateAllocation();

  const [scopeType, setScopeType]   = useState<"team" | "task" | "programme" | "department">("team");
  const [scopeLabel, setScopeLabel] = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [notes, setNotes]           = useState("");

  const requiresApproval = member.config?.requires_approval ?? false;

  const handleSubmit = async () => {
    if (!scopeLabel.trim() || !startDate || !endDate) return;
    await create.mutateAsync({
      pool_member_id:   member.id,
      allocated_user_id: member.user_id,
      member_role_key:  member.role_key,
      scope_type:       scopeType,
      scope_label:      scopeLabel.trim(),
      start_date:       startDate,
      end_date:         endDate,
      notes:            notes.trim() || undefined,
    });
    onOpenChange(false);
    setScopeLabel(""); setStartDate(""); setEndDate(""); setNotes("");
  };

  const displayName = member.profile?.full_name ?? "Unknown";
  const roleLabel   = member.config?.display_name ?? member.role_key;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Allocate Staff Member</DialogTitle>
        </DialogHeader>

        {/* Who */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        {/* Approval notice */}
        {requiresApproval && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-orange-600">
              Your role requires approval from <strong>{member.config?.approval_assigned_role?.replace(/_/g, " ")}</strong> before this allocation activates.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Scope type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Scope Type</Label>
            <Select value={scopeType} onValueChange={v => setScopeType(v as any)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
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

          {/* Scope label */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {SCOPE_TYPES.find(s => s.value === scopeType)?.label} Name / Label
            </Label>
            <Input
              value={scopeLabel}
              onChange={e => setScopeLabel(e.target.value)}
              placeholder={`e.g. Finance Team, Q2 Onboarding Task…`}
              className="text-sm"
            />
          </div>

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
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any context about this allocation…"
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={create.isPending || !scopeLabel.trim() || !startDate || !endDate}
          >
            {create.isPending ? "Creating…" : requiresApproval ? "Submit for Approval" : "Allocate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
