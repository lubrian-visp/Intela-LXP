import { useState } from "react";
import {
  Video, Calendar, Clock, Users, Plus, Play, CheckCircle2,
  XCircle, ChevronRight, Search, Filter, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useAuth } from "@/hooks/useAuth";
import { useTrainingSessions, useCreateTrainingSession, useUpdateTrainingSession, useCohorts, useRealtimeSync } from "@/hooks/useCoreData";
import { format, isPast, isFuture, isToday, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/10 text-info",
  live: "bg-success/10 text-success",
  completed: "bg-muted-foreground/10 text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function TrainingSessions() {
  const { user } = useAuth();
  const { data: sessions = [], isLoading } = useTrainingSessions();
  const { data: cohorts = [] } = useCohorts();
  const createSession = useCreateTrainingSession();
  const updateSession = useUpdateTrainingSession();
  const navigate = useNavigate();

  useRealtimeSync(["training_sessions", "cohorts", "notifications"]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    cohort_id: "",
    session_type: "live",
    scheduled_start: "",
    scheduled_end: "",
    recurrence_rule: "",
    agenda: [] as Array<{ title: string; duration?: number }>,
  });
  const [agendaInput, setAgendaInput] = useState("");
  const [agendaDuration, setAgendaDuration] = useState("");

  const filtered = sessions.filter((s: any) => {
    const matchesSearch = s.title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const liveCount = sessions.filter((s: any) => s.status === "live").length;
  const todayCount = sessions.filter((s: any) => isToday(new Date(s.scheduled_start))).length;
  const upcomingCount = sessions.filter((s: any) => isFuture(new Date(s.scheduled_start)) && s.status === "scheduled").length;
  const completedCount = sessions.filter((s: any) => s.status === "completed").length;

  const stats = [
    { label: "Live Now", value: liveCount, icon: Radio, color: "text-success" },
    { label: "Today", value: todayCount, icon: Calendar, color: "text-info" },
    { label: "Upcoming", value: upcomingCount, icon: Clock, color: "text-warning" },
    { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-muted-foreground" },
  ];

  const handleCreate = () => {
    if (!form.title || !form.cohort_id || !form.scheduled_start || !form.scheduled_end) {
      toast.error("Please fill all required fields");
      return;
    }
    createSession.mutate(
      {
        ...form,
        created_by: user?.id,
        facilitator_id: user?.id,
        jitsi_room_id: `intela-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recurrence_rule: form.recurrence_rule || null,
      },
      {
        onSuccess: () => {
          toast.success("Session created");
          setDialogOpen(false);
          setForm({ title: "", description: "", cohort_id: "", session_type: "live", scheduled_start: "", scheduled_end: "", recurrence_rule: "", agenda: [] });
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleStatusChange = (id: string, status: string) => {
    updateSession.mutate({ id, status }, {
      onSuccess: () => toast.success(`Session ${status}`),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Training Sessions</h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule, manage, and deliver live training with built-in video and attendance tracking.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Training Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Data Science Workshop" />
                </div>
                <div className="space-y-1.5">
                  <Label>Cohort *</Label>
                  <Select value={form.cohort_id} onValueChange={v => setForm(f => ({ ...f, cohort_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
                    <SelectContent>
                      {cohorts.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.programmes?.title ?? ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start *</Label>
                    <Input type="datetime-local" value={form.scheduled_start} onChange={e => setForm(f => ({ ...f, scheduled_start: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End *</Label>
                    <Input type="datetime-local" value={form.scheduled_end} onChange={e => setForm(f => ({ ...f, scheduled_end: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.session_type} onValueChange={v => setForm(f => ({ ...f, session_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="recorded">Recorded</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Recurrence</Label>
                    <Select value={form.recurrence_rule || "none"} onValueChange={v => setForm(f => ({ ...f, recurrence_rule: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="One-off" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-off</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Session agenda or notes..." rows={3} />
                </div>
                {/* Agenda Builder */}
                <div className="space-y-1.5">
                  <Label>Meeting Agenda</Label>
                  <div className="space-y-1.5">
                    {form.agenda.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.duration && <span className="text-muted-foreground">{item.duration}m</span>}
                        <button onClick={() => setForm(f => ({ ...f, agenda: f.agenda.filter((_, idx) => idx !== i) }))} className="text-destructive hover:text-destructive/80 text-[10px]">✕</button>
                      </div>
                    ))}
                    <div className="flex gap-1.5">
                      <Input
                        value={agendaInput}
                        onChange={e => setAgendaInput(e.target.value)}
                        placeholder="Agenda item title..."
                        className="h-8 text-xs flex-1"
                        onKeyDown={e => {
                          if (e.key === "Enter" && agendaInput.trim()) {
                            e.preventDefault();
                            setForm(f => ({ ...f, agenda: [...f.agenda, { title: agendaInput.trim(), duration: agendaDuration ? parseInt(agendaDuration) : undefined }] }));
                            setAgendaInput("");
                            setAgendaDuration("");
                          }
                        }}
                      />
                      <Input
                        value={agendaDuration}
                        onChange={e => setAgendaDuration(e.target.value)}
                        placeholder="Min"
                        type="number"
                        className="h-8 text-xs w-16"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          if (!agendaInput.trim()) return;
                          setForm(f => ({ ...f, agenda: [...f.agenda, { title: agendaInput.trim(), duration: agendaDuration ? parseInt(agendaDuration) : undefined }] }));
                          setAgendaInput("");
                          setAgendaDuration("");
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createSession.isPending} className="w-full">
                  {createSession.isPending ? "Creating..." : "Schedule Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions..." className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Video className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No training sessions found</p>
          <p className="text-[11px] text-muted-foreground mt-1">Schedule your first session to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session: any) => {
            const startDate = new Date(session.scheduled_start);
            const endDate = new Date(session.scheduled_end);
            const isLive = session.status === "live";
            const isUpcoming = session.status === "scheduled" && isFuture(startDate);
            const duration = differenceInMinutes(endDate, startDate);

            return (
              <div
                key={session.id}
                className={cn(
                  "bg-card rounded-xl shadow-card border p-5 transition-all hover:shadow-card-hover cursor-pointer",
                  isLive ? "border-success/40 ring-1 ring-success/20" : "border-border/50"
                )}
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2.5 rounded-lg shrink-0",
                      isLive ? "bg-success/10" : "bg-secondary"
                    )}>
                      {isLive ? <Radio className="w-5 h-5 text-success animate-pulse" /> : <Video className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{session.title}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {(session as any).cohorts?.name ?? "—"} · {(session as any).cohorts?.programmes?.title ?? ""}
                      </p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full capitalize", statusStyles[session.status])}>{session.status}</span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(startDate, "MMM dd, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(startDate, "HH:mm")} – {format(endDate, "HH:mm")} ({duration}min)
                  </span>
                  <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-secondary">{session.session_type}</span>
                  {session.recurrence_rule && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground capitalize">
                      {session.recurrence_rule.toLowerCase()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {isLive && (
                    <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); navigate(`/sessions/${session.id}`); }}>
                      <Play className="w-3 h-3" /> Join Now
                    </Button>
                  )}
                  {isUpcoming && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={e => { e.stopPropagation(); handleStatusChange(session.id, "live"); }}>
                      <Play className="w-3 h-3" /> Start Session
                    </Button>
                  )}
                  {isLive && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleStatusChange(session.id, "completed"); }}>
                      <XCircle className="w-3 h-3" /> End Session
                    </Button>
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
