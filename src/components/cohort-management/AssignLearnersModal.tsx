import { useState } from "react";
import { Search, UserPlus, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEnrolments, useCreateEnrolment } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
  cohortId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function AssignLearnersModal({ cohortId, open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { data: enrolments } = useEnrolments({ cohortId: cohortId ?? undefined });
  const createEnrolment = useCreateEnrolment();

  // Fetch all profiles to search from
  // Fetch only users with the 'learner' role from the Learner Directory
  const { data: profiles } = useQuery({
    queryKey: ["learner_directory"],
    queryFn: async () => {
      const { data: learnerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "learner");
      if (rolesError) throw rolesError;
      const learnerIds = learnerRoles?.map(r => r.user_id) ?? [];
      if (learnerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", learnerIds);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const enrolledIds = new Set(enrolments?.map(e => e.learner_id) ?? []);
  const available = (profiles ?? []).filter(p =>
    !enrolledIds.has(p.user_id) &&
    (!search || (p.full_name ?? "").toLowerCase().includes(search.toLowerCase()) || p.user_id.includes(search))
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (!cohortId || selected.length === 0) return;
    try {
      for (const learnerId of selected) {
        await createEnrolment.mutateAsync({ cohort_id: cohortId, learner_id: learnerId, status: "enrolled" });
      }
      toast.success(`${selected.length} learner(s) assigned successfully.`);
      setSelected([]);
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to assign learners.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-info" />
            Assign Learners
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {selected.map(id => {
              const p = profiles?.find(x => x.user_id === id);
              return (
                <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                  {p?.full_name || id.slice(0, 8)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleSelect(id)} />
                </Badge>
              );
            })}
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No available learners found.</p>
          ) : (
            available.slice(0, 50).map(p => (
              <button
                key={p.user_id}
                onClick={() => toggleSelect(p.user_id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  selected.includes(p.user_id) ? "bg-info/10 text-info" : "hover:bg-secondary"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {(p.full_name ?? "U").charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-left truncate">{p.full_name || "Unnamed"}</span>
                {selected.includes(p.user_id) && <Check className="w-4 h-4 text-info shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.length === 0 || createEnrolment.isPending}>
            Assign {selected.length > 0 && `(${selected.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
