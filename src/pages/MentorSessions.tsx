import { useState } from "react";
import { Calendar, Plus, Clock, MapPin, CheckCircle2, XCircle, Video } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMentorSessions, useCreateMentorSession, useUpdateMentorSession } from "@/hooks/useMentorData";
import { useEnrolments } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-warning/10 text-warning",
};

export default function MentorSessions() {
  const { user } = useAuth();
  const { data: sessions = [], isLoading } = useMentorSessions();
  const { data: enrolments = [] } = useEnrolments();
  const createSession = useCreateMentorSession();
  const updateSession = useUpdateMentorSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mentee_id: "", session_type: "check_in", scheduled_at: "", duration_minutes: 30, location: "", notes: "" });

  const mentees = (enrolments as any[]).filter(e => e.mentor_id === user?.id);

  const handleCreate = () => {
    if (!form.mentee_id || !form.scheduled_at) return;
    const mentee = mentees.find(m => m.learner_id === form.mentee_id);
    createSession.mutate({
      mentor_id: user!.id,
      mentee_id: form.mentee_id,
      enrolment_id: mentee?.id,
      session_type: form.session_type,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes,
      location: form.location || undefined,
      notes: form.notes || undefined,
    }, { onSuccess: () => { setOpen(false); setForm({ mentee_id: "", session_type: "check_in", scheduled_at: "", duration_minutes: 30, location: "", notes: "" }); } });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mentoring Sessions</h1>
            <p className="text-sm text-muted-foreground">Schedule and manage 1-on-1 check-ins with your mentees.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Schedule Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Check-in</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={form.mentee_id} onValueChange={v => setForm(f => ({ ...f, mentee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select mentee" /></SelectTrigger>
                  <SelectContent>
                    {mentees.map(m => (
                      <SelectItem key={m.learner_id} value={m.learner_id}>{m.learner_id.slice(0, 8)}… — {(m as any).cohorts?.programmes?.title ?? "Programme"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in">Check-in</SelectItem>
                    <SelectItem value="goal_review">Goal Review</SelectItem>
                    <SelectItem value="workplace_visit">Workplace Visit</SelectItem>
                    <SelectItem value="evidence_review">Evidence Review</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                <Input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
                <Input placeholder="Location (optional)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                <Textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                <Button className="w-full" onClick={handleCreate} disabled={createSession.isPending}>
                  {createSession.isPending ? "Scheduling..." : "Schedule"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : sessions.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Sessions Scheduled</h3>
          <p className="text-xs text-muted-foreground">Schedule a check-in with your mentees to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions as any[]).map(s => (
            <div key={s.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground capitalize">{s.session_type.replace("_", " ")}</h4>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusStyles[s.status] || "bg-muted text-muted-foreground")}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(s.scheduled_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(s.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes}min</span>
                    {s.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>}
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
                </div>
                {s.status === "scheduled" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateSession.mutate({ id: s.id, status: "completed" })}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />Complete
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateSession.mutate({ id: s.id, status: "cancelled" })}>
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
