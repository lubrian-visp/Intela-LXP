import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordActivityGrade } from "@/hooks/useGradebook";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  enrolments?: any[];
  cohorts?: any[];
}

const ACTIVITY_TYPES = [
  { value: "participation", label: "Participation" },
  { value: "practical", label: "Practical Task" },
  { value: "project", label: "Project" },
  { value: "presentation", label: "Presentation" },
  { value: "attendance", label: "Attendance" },
  { value: "peer_review", label: "Peer Review" },
  { value: "workshop", label: "Workshop" },
  { value: "reflection", label: "Reflection" },
  { value: "other", label: "Other" },
];

export default function RecordActivityGradeDialog({ open, onOpenChange, enrolments = [], cohorts = [] }: Props) {
  const [learnerId, setLearnerId] = useState("");
  const [enrolmentId, setEnrolmentId] = useState("");
  const [activityType, setActivityType] = useState("participation");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));
  const [score, setScore] = useState<string>("");
  const [maxScore, setMaxScore] = useState<string>("100");
  const [feedback, setFeedback] = useState("");
  const record = useRecordActivityGrade();

  const learners = Array.from(new Map(enrolments.map((e: any) => [e.learner_id, e])).values());

  function reset() {
    setLearnerId(""); setEnrolmentId(""); setActivityTitle(""); setScore(""); setFeedback("");
  }

  async function handleSubmit() {
    if (!learnerId || !activityTitle) return;
    const enr = enrolments.find((e: any) => e.id === enrolmentId);
    const cohort = cohorts.find((c: any) => c.id === enr?.cohort_id);
    await record.mutateAsync({
      learner_id: learnerId,
      enrolment_id: enrolmentId || null,
      cohort_id: enr?.cohort_id || null,
      programme_id: cohort?.programme_id || null,
      activity_type: activityType,
      activity_title: activityTitle,
      activity_date: activityDate,
      score: score ? Number(score) : null,
      max_score: Number(maxScore || 100),
      feedback: feedback || null,
      status: "recorded",
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Activity Grade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Learner *</Label>
            <Select value={learnerId} onValueChange={(v) => {
              setLearnerId(v);
              const e = enrolments.find((x: any) => x.learner_id === v);
              if (e) setEnrolmentId(e.id);
            }}>
              <SelectTrigger><SelectValue placeholder="Select learner..." /></SelectTrigger>
              <SelectContent>
                {learners.map((e: any) => (
                  <SelectItem key={e.learner_id} value={e.learner_id}>
                    {e.learner_id.slice(0, 8)}…
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Activity Type *</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Activity Title *</Label>
            <Input value={activityTitle} onChange={(e) => setActivityTitle(e.target.value)} placeholder="e.g. Module 3 group presentation" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Score</Label>
              <Input type="number" step="0.1" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 78" />
            </div>
            <div>
              <Label>Max Score</Label>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Feedback</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback for the learner" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!learnerId || !activityTitle || record.isPending}>
            {record.isPending ? "Saving..." : "Record Grade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
