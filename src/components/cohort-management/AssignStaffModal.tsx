import { useState } from "react";
import { Search, Briefcase, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAssignCohortStaff } from "@/hooks/useCohortStaffAssignments";

interface Props {
  cohortId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function AssignStaffModal({ cohortId, open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [role, setRole] = useState("facilitator");
  const assignStaff = useAssignCohortStaff();

  const staffRoles = ["facilitator", "assessor", "moderator", "mentor"] as const;

  // Fetch only users with staff roles from the Staff Directory
  const { data: profiles } = useQuery({
    queryKey: ["staff_directory", role],
    queryFn: async () => {
      const { data: staffRoleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", staffRoles);
      if (rolesError) throw rolesError;
      const staffIds = [...new Set(staffRoleRows?.map(r => r.user_id) ?? [])];
      if (staffIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", staffIds);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = (profiles ?? []).filter(p =>
    !search || (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) || p.user_id.includes(search)
  );

  const handleAssign = async () => {
    if (!cohortId || !selectedStaff) return;
    await assignStaff.mutateAsync({ cohort_id: cohortId, user_id: selectedStaff, role });
    setSelectedStaff(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-accent" />
            Assign Staff
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facilitator">Facilitator</SelectItem>
              <SelectItem value="assessor">Assessor</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="mentor">Mentor</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search staff by name…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {selectedStaff && (
            <Badge variant="secondary" className="flex items-center gap-1 text-xs w-fit">
              {profiles?.find(p => p.user_id === selectedStaff)?.full_name ?? selectedStaff.slice(0, 8)}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStaff(null)} />
            </Badge>
          )}

          <div className="max-h-56 overflow-y-auto space-y-1 border rounded-lg p-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No staff found.</p>
            ) : (
              filtered.slice(0, 50).map(p => (
                <button
                  key={p.user_id}
                  onClick={() => setSelectedStaff(p.user_id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedStaff === p.user_id ? "bg-accent/10 text-accent" : "hover:bg-secondary"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {(p.full_name ?? "S").charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left truncate">{p.full_name || "Unnamed"}</span>
                  {selectedStaff === p.user_id && <Check className="w-4 h-4 text-accent shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedStaff || assignStaff.isPending}>
            Assign Staff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
