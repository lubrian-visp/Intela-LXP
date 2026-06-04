import { useState } from "react";
import { Target, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMentorGoals, useCreateMentorGoal, useUpdateMentorGoal } from "@/hooks/useMentorData";
import { useEnrolments } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { style: string; icon: typeof Target }> = {
  in_progress: { style: "bg-info/10 text-info", icon: Clock },
  completed: { style: "bg-success/10 text-success", icon: CheckCircle2 },
  at_risk: { style: "bg-warning/10 text-warning", icon: AlertTriangle },
  overdue: { style: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export default function MentorGoals() {
  const { user } = useAuth();
  const { data: goals = [], isLoading } = useMentorGoals();
  const { data: enrolments = [] } = useEnrolments();
  const createGoal = useCreateMentorGoal();
  const updateGoal = useUpdateMentorGoal();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mentee_id: "", title: "", description: "", target_date: "" });

  const mentees = (enrolments as any[]).filter(e => e.mentor_id === user?.id);

  const handleCreate = () => {
    if (!form.mentee_id || !form.title) return;
    const mentee = mentees.find(m => m.learner_id === form.mentee_id);
    createGoal.mutate({
      mentor_id: user!.id,
      mentee_id: form.mentee_id,
      enrolment_id: mentee?.id,
      title: form.title,
      description: form.description || undefined,
      target_date: form.target_date || undefined,
    }, { onSuccess: () => { setOpen(false); setForm({ mentee_id: "", title: "", description: "", target_date: "" }); } });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Goals & Action Plans</h1>
            <p className="text-sm text-muted-foreground">Set development goals and track mentee action plans.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Goal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={form.mentee_id} onValueChange={v => setForm(f => ({ ...f, mentee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select mentee" /></SelectTrigger>
                  <SelectContent>
                    {mentees.map(m => (
                      <SelectItem key={m.learner_id} value={m.learner_id}>{m.learner_id.slice(0, 8)}…</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Goal title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                <Button className="w-full" onClick={handleCreate} disabled={createGoal.isPending}>
                  {createGoal.isPending ? "Creating..." : "Create Goal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : goals.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Target className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Goals Set</h3>
          <p className="text-xs text-muted-foreground">Create development goals for your mentees.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(goals as any[]).map(g => {
            const cfg = statusConfig[g.status] || statusConfig.in_progress;
            const StatusIcon = cfg.icon;
            return (
              <div key={g.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{g.title}</h4>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1", cfg.style)}>
                        <StatusIcon className="w-3 h-3" />{g.status.replace("_", " ")}
                      </span>
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      {g.target_date && <span>Target: {new Date(g.target_date).toLocaleDateString()}</span>}
                      <span>Progress: {g.progress_percentage}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                      <div className={cn("h-full rounded-full transition-all", g.progress_percentage >= 80 ? "bg-success" : g.progress_percentage >= 40 ? "bg-primary" : "bg-warning")} style={{ width: `${g.progress_percentage}%` }} />
                    </div>
                  </div>
                  {g.status !== "completed" && (
                    <div className="flex gap-1 ml-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateGoal.mutate({ id: g.id, progress_percentage: Math.min(100, g.progress_percentage + 25), status: g.progress_percentage + 25 >= 100 ? "completed" : g.status })}>
                        +25%
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-success" onClick={() => updateGoal.mutate({ id: g.id, status: "completed", progress_percentage: 100 })}>
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
