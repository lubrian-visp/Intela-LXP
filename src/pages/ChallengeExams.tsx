import { useState } from "react";
import { Trophy, Plus, Search, Clock, Target, Zap, Users, Loader2, Edit2, Trash2, Play, BarChart3, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useChallengeExams, useCreateChallengeExam, useUpdateChallengeExam, useDeleteChallengeExam,
  type ChallengeExam,
} from "@/hooks/useChallengeExams";
import { useProgrammesList } from "@/hooks/useProgrammesList";

export default function ChallengeExamsPage() {
  const [selectedProgramme, setSelectedProgramme] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingExam, setEditingExam] = useState<ChallengeExam | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "Challenge Exam",
    description: "",
    passing_grade: 70,
    time_limit_minutes: 60,
    max_attempts: 1,
    question_count: 20,
    on_pass_action: "auto_complete",
    on_fail_action: "redirect_course",
    is_active: true,
  });

  const { data: exams = [], isLoading } = useChallengeExams(selectedProgramme || undefined);
  const { data: programmes = [] } = useProgrammesList();
  const createMutation = useCreateChallengeExam();
  const updateMutation = useUpdateChallengeExam();
  const deleteMutation = useDeleteChallengeExam();

  const handleCreate = () => {
    if (!selectedProgramme) return;
    createMutation.mutate({
      programme_id: selectedProgramme,
      ...form,
    }, {
      onSuccess: () => {
        setShowCreate(false);
        resetForm();
      },
    });
  };

  const handleUpdate = () => {
    if (!editingExam) return;
    updateMutation.mutate({ id: editingExam.id, ...form }, {
      onSuccess: () => setEditingExam(null),
    });
  };

  const resetForm = () => {
    setForm({
      title: "Challenge Exam", description: "", passing_grade: 70,
      time_limit_minutes: 60, max_attempts: 1, question_count: 20,
      on_pass_action: "auto_complete", on_fail_action: "redirect_course", is_active: true,
    });
  };

  const openEdit = (exam: ChallengeExam) => {
    setForm({
      title: exam.title,
      description: exam.description || "",
      passing_grade: exam.passing_grade,
      time_limit_minutes: exam.time_limit_minutes,
      max_attempts: exam.max_attempts,
      question_count: exam.question_count,
      on_pass_action: exam.on_pass_action,
      on_fail_action: exam.on_fail_action,
      is_active: exam.is_active,
    });
    setEditingExam(exam);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" /> Challenge Exams
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Allow learners to test out of programmes by passing a challenge exam</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!selectedProgramme} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Challenge Exam
        </Button>
      </div>

      {/* Programme Filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
          <SelectTrigger className="w-72 h-10 text-sm"><SelectValue placeholder="Select a programme..." /></SelectTrigger>
          <SelectContent>
            {programmes.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Exams List */}
      {!selectedProgramme ? (
        <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
          <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select a Programme</h3>
          <p className="text-sm text-muted-foreground">Choose a programme above to view or create challenge exams.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
      ) : exams.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-12 text-center">
          <Trophy className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Challenge Exams</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a challenge exam so learners can test out of this programme.</p>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Create First Exam</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <div className="p-5 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{exam.title}</h4>
                      <Badge variant={exam.is_active ? "default" : "secondary"} className="text-[10px]">
                        {exam.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {exam.description && <p className="text-[11px] text-muted-foreground mt-0.5">{exam.description}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Pass: {exam.passing_grade}%</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.time_limit_minutes} min</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> {exam.max_attempts} attempt(s)</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {exam.question_count} questions</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-2.5 bg-secondary/20 border-t border-border/30 flex items-center gap-2">
                <button onClick={() => openEdit(exam)} className="text-[11px] text-accent hover:underline flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <span className="text-border">·</span>
                <button
                  onClick={() => updateMutation.mutate({ id: exam.id, is_active: !exam.is_active })}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {exam.is_active ? "Deactivate" : "Activate"}
                </button>
                <span className="text-border">·</span>
                <button onClick={() => setDeletingId(exam.id)} className="text-[11px] text-destructive hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editingExam} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditingExam(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit" : "New"} Challenge Exam</DialogTitle>
            <DialogDescription>Configure the challenge exam settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Passing Grade (%)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[form.passing_grade]} onValueChange={([v]) => setForm({ ...form, passing_grade: v })} min={1} max={100} step={1} className="flex-1" />
                  <span className="text-sm font-mono w-10 text-right">{form.passing_grade}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Time Limit (minutes)</Label>
                <Input type="number" value={form.time_limit_minutes} onChange={(e) => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Max Attempts</Label>
                <Input type="number" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })} min={1} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Questions from Pool</Label>
                <Input type="number" value={form.question_count} onChange={(e) => setForm({ ...form, question_count: parseInt(e.target.value) || 10 })} min={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">On Pass</Label>
                <Select value={form.on_pass_action} onValueChange={(v) => setForm({ ...form, on_pass_action: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_complete">Auto-Complete Programme</SelectItem>
                    <SelectItem value="skip_to_module">Skip to Final Module</SelectItem>
                    <SelectItem value="grant_credit">Grant Credit Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">On Fail</Label>
                <Select value={form.on_fail_action} onValueChange={(v) => setForm({ ...form, on_fail_action: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redirect_course">Redirect to Course</SelectItem>
                    <SelectItem value="block_retry">Block Retry</SelectItem>
                    <SelectItem value="suggest_modules">Suggest Weak Modules</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setEditingExam(null); resetForm(); }}>Cancel</Button>
            <Button size="sm" onClick={editingExam ? handleUpdate : handleCreate} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingExam ? "Save Changes" : "Create Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge Exam?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the exam and all attempt records. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingId) deleteMutation.mutate(deletingId); setDeletingId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
