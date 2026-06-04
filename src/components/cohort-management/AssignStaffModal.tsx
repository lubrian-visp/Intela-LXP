import { useState } from "react";
import { Search, Briefcase, X, Check, AlertTriangle, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAssignCohortStaff } from "@/hooks/useCohortStaffAssignments";
import { useLdPoolMembersByRole } from "@/hooks/useLdPool";

interface Props {
  cohortId: string | null;
  open: boolean;
  onClose: () => void;
}

const ROLES = [
  { value: "facilitator", label: "Facilitator" },
  { value: "assessor",    label: "Assessor" },
  { value: "moderator",   label: "Moderator" },
  { value: "mentor",      label: "Mentor" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  facilitator: "bg-blue-500/10 text-blue-600",
  assessor:    "bg-sky-500/10 text-sky-600",
  moderator:   "bg-violet-500/10 text-violet-600",
  mentor:      "bg-green-500/10 text-green-600",
};

export default function AssignStaffModal({ cohortId, open, onClose }: Props) {
  const [search, setSearch]           = useState("");
  const [selectedStaff, setSelected]  = useState<string | null>(null);
  const [role, setRole]               = useState<typeof ROLES[number]["value"]>("facilitator");

  const assignStaff   = useAssignCohortStaff();
  const { data: poolMembers = [], isLoading } = useLdPoolMembersByRole(role, open);

  const filtered = poolMembers.filter(m => {
    const name = m.profile?.full_name?.toLowerCase() ?? "";
    return !search || name.includes(search.toLowerCase());
  });

  const selectedMember = poolMembers.find(m => m.user_id === selectedStaff);

  const handleAssign = async () => {
    if (!cohortId || !selectedStaff) return;
    await assignStaff.mutateAsync({ cohort_id: cohortId, user_id: selectedStaff, role });
    setSelected(null);
    setSearch("");
    onClose();
  };

  const handleRoleChange = (v: string) => {
    setRole(v as typeof ROLES[number]["value"]);
    setSelected(null);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSelected(null); setSearch(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
            </div>
            Assign from L&D Practitioner Pool
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Only active pool members are shown. Workload indicates current cohort assignments.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {/* Role selector */}
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => (
                <SelectItem key={r.value} value={r.value} className="text-sm">
                  <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded mr-2", ROLE_COLORS[r.value])}>
                    {r.label}
                  </span>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search ${role}s in pool…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Pool member list */}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/30">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading pool…</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {poolMembers.length === 0
                    ? `No ${role}s in the L&D Practitioner Pool yet.`
                    : "No matches found."}
                </p>
                {poolMembers.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Approve {role} staff in Staff Onboarding to add them to the pool.
                  </p>
                )}
              </div>
            ) : (
              filtered.map(m => {
                const name        = m.profile?.full_name ?? "Unknown";
                const cohortCount = m.active_cohort_count ?? 0;
                const atCapacity  = cohortCount >= (m.max_cohorts ?? 4);
                const isSelected  = selectedStaff === m.user_id;

                return (
                  <button
                    key={m.user_id}
                    onClick={() => !atCapacity && setSelected(isSelected ? null : m.user_id)}
                    disabled={atCapacity}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      isSelected    ? "bg-primary/8 border-l-2 border-primary" :
                      atCapacity    ? "opacity-50 cursor-not-allowed bg-secondary/20" :
                                      "hover:bg-secondary/30"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      ROLE_COLORS[m.role_key] ?? "bg-secondary text-foreground"
                    )}>
                      {name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.profile?.job_title || m.display_role}</p>
                    </div>

                    {/* Workload indicator */}
                    <div className="flex flex-col items-end shrink-0">
                      {atCapacity ? (
                        <span className="flex items-center gap-1 text-[10px] text-orange-500 font-medium">
                          <AlertTriangle className="w-3 h-3" /> At capacity
                        </span>
                      ) : (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          cohortCount === 0 ? "bg-green-500/10 text-green-600" :
                          cohortCount <= 2  ? "bg-blue-500/10 text-blue-600" :
                                              "bg-orange-500/10 text-orange-600"
                        )}>
                          {cohortCount}/{m.max_cohorts ?? 4} cohorts
                        </span>
                      )}
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Selected summary */}
          {selectedMember && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-[12px] text-foreground">
                <span className="font-semibold">{selectedMember.profile?.full_name}</span>
                {" "}will be assigned as <span className="font-semibold capitalize">{role}</span> to this cohort
              </p>
              <button onClick={() => setSelected(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!selectedStaff || assignStaff.isPending}
            className="gap-1.5"
          >
            {assignStaff.isPending ? "Assigning…" : "Assign to Cohort"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
