import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCohort, useProgrammes, useCohorts } from "@/hooks/useCoreData";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Cohort = Tables<"cohorts">;

/** Extract 3 most relevant uppercase letters from a programme name */
function programmeAbbreviation(title: string): string {
  // Remove common stop words, take first letters of remaining words
  const stops = new Set(["and", "the", "of", "in", "for", "a", "an", "&", "to", "with"]);
  const words = title.split(/[\s&,\-–]+/).filter(w => w.length > 0 && !stops.has(w.toLowerCase()));
  if (words.length >= 3) {
    return words.slice(0, 3).map(w => w[0].toUpperCase()).join("");
  }
  if (words.length === 2) {
    // Take first letter of first word + first two of second (or vice versa)
    return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  }
  // Single word – take first 3 chars
  return (words[0] ?? "XXX").slice(0, 3).toUpperCase();
}

function getQuarter(dateStr: string): string {
  const m = new Date(dateStr).getMonth(); // 0-based
  if (m < 3) return "Q1";
  if (m < 6) return "Q2";
  if (m < 9) return "Q3";
  return "Q4";
}

interface Props {
  cohort?: Cohort | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export default function CreateCohortDialog({ cohort, open, onOpenChange, trigger }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  const { data: programmes } = useProgrammes();
  const { data: allCohorts } = useCohorts();
  const createCohort = useCreateCohort();

  const [name, setName] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxLearners, setMaxLearners] = useState("30");

  // Auto-generate code when programme or start date changes
  useEffect(() => {
    if (!programmeId) return;
    const prog = (programmes ?? []).find(p => p.id === programmeId);
    if (!prog) return;

    const abbr = programmeAbbreviation(prog.title);
    const dateRef = startDate || new Date().toISOString().slice(0, 10);
    const year = new Date(dateRef).getFullYear();
    const quarter = getQuarter(dateRef);
    const prefix = `${abbr}-${year}-${quarter}-`;

    // Find next sequence
    const existing = (allCohorts ?? [])
      .filter(c => c.code?.startsWith(prefix))
      .map(c => parseInt(c.code!.slice(prefix.length), 10))
      .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    setCode(`${prefix}${String(next).padStart(3, "0")}`);
  }, [programmeId, startDate, programmes, allCohorts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !programmeId) {
      toast.error("Name and programme are required");
      return;
    }
    try {
      await createCohort.mutateAsync({
        name: name.trim(),
        programme_id: programmeId,
        code: code.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        max_learners: maxLearners ? parseInt(maxLearners) : 30,
      });
      toast.success("Cohort created");
      setIsOpen(false);
      setName(""); setProgrammeId(""); setCode(""); setStartDate(""); setEndDate(""); setMaxLearners("30");
    } catch (err: any) {
      toast.error(err.message || "Failed to create cohort");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Cohort</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cohort-name">Name *</Label>
            <Input id="cohort-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cohort Alpha 2026" />
          </div>
          <div className="space-y-2">
            <Label>Programme *</Label>
            <Select value={programmeId} onValueChange={setProgrammeId}>
              <SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger>
              <SelectContent>
                {(programmes ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cohort-code">Code</Label>
              <Input id="cohort-code" value={code} onChange={e => setCode(e.target.value)} placeholder="ALPHA-26" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-learners">Max Learners</Label>
              <Input id="max-learners" type="number" value={maxLearners} onChange={e => setMaxLearners(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCohort.isPending}>
              {createCohort.isPending ? "Creating..." : "Create Cohort"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
