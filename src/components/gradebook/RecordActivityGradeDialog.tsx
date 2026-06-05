import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordActivityGrade } from "@/hooks/useGradebook";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { User, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  enrolments?: any[];
  cohorts?: any[];
}

const ACTIVITY_TYPES = [
  { value: "participation", label: "Participation"  },
  { value: "practical",     label: "Practical Task"  },
  { value: "project",       label: "Project"         },
  { value: "presentation",  label: "Presentation"    },
  { value: "attendance",    label: "Attendance"      },
  { value: "peer_review",   label: "Peer Review"     },
  { value: "workshop",      label: "Workshop"        },
  { value: "reflection",    label: "Reflection"      },
  { value: "other",         label: "Other"           },
];

export default function RecordActivityGradeDialog({
  open, onOpenChange, enrolments = [], cohorts = [],
}: Props) {
  const [learnerId,     setLearnerId]     = useState("");
  const [enrolmentId,   setEnrolmentId]   = useState("");
  const [cohortFilter,  setCohortFilter]  = useState("all");
  const [activityType,  setActivityType]  = useState("participation");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDate,  setActivityDate]  = useState(new Date().toISOString().slice(0, 10));
  const [score,         setScore]         = useState<string>("");
  const [maxScore,      setMaxScore]      = useState<string>("100");
  const [feedback,      setFeedback]      = useState("");

  const record = useRecordActivityGrade();

  // ── Fetch profiles for all learner IDs in enrolments ──────────────────────
  const allLearnerIds = useMemo(
    () => [...new Set(enrolments.map((e: any) => e.learner_id as string))],
    [enrolments]
  );

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["record-grade-profiles", allLearnerIds.join(",")],
    enabled: open && allLearnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, job_title")
        .in("user_id", allLearnerIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m: Record<string, { name: string; title: string }> = {};
    (profiles as any[]).forEach(p => {
      m[p.user_id] = { name: p.full_name || "Unnamed Learner", title: p.job_title || "" };
    });
    return m;
  }, [profiles]);

  // ── Deduplicate learners; optionally filter by cohort ─────────────────────
  const filteredEnrolments = useMemo(() => {
    if (cohortFilter === "all") return enrolments;
    return enrolments.filter((e: any) => e.cohort_id === cohortFilter);
  }, [enrolments, cohortFilter]);

  const uniqueLearners = useMemo(() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const e of filteredEnrolments) {
      if (!seen.has(e.learner_id)) {
        seen.add(e.learner_id);
        result.push(e);
      }
    }
    // Sort alphabetically by name
    return result.sort((a, b) => {
      const nameA = profileMap[a.learner_id]?.name ?? "";
      const nameB = profileMap[b.learner_id]?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [filteredEnrolments, profileMap]);

  // ── Selected learner's enrolment details ──────────────────────────────────
  const selectedEnrolment = useMemo(
    () => enrolments.find((e: any) => e.id === enrolmentId),
    [enrolments, enrolmentId]
  );
  const selectedCohort = useMemo(
    () => cohorts.find((c: any) => c.id === selectedEnrolment?.cohort_id),
    [cohorts, selectedEnrolment]
  );

  // ── Score validation ───────────────────────────────────────────────────────
  const scoreNum  = score !== "" ? parseFloat(score) : null;
  const maxNum    = maxScore !== "" ? parseFloat(maxScore) : 100;
  const isOverMax = scoreNum != null && scoreNum > maxNum;
  const isNeg     = scoreNum != null && scoreNum < 0;
  const pct       = scoreNum != null && maxNum > 0 ? Math.round((scoreNum / maxNum) * 100) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleLearnerChange(selectedLearnerId: string) {
    setLearnerId(selectedLearnerId);
    // Auto-select the first enrolment for this learner
    const enr = filteredEnrolments.find((e: any) => e.learner_id === selectedLearnerId);
    if (enr) setEnrolmentId(enr.id);
    else setEnrolmentId("");
  }

  function reset() {
    setLearnerId(""); setEnrolmentId(""); setActivityTitle("");
    setScore(""); setFeedback(""); setActivityType("participation");
    setActivityDate(new Date().toISOString().slice(0, 10));
    setMaxScore("100"); setCohortFilter("all");
  }

  async function handleSubmit() {
    if (!learnerId || !activityTitle || isOverMax || isNeg) return;
    const enr    = enrolments.find((e: any) => e.id === enrolmentId);
    const cohort = cohorts.find((c: any) => c.id === enr?.cohort_id);
    await record.mutateAsync({
      learner_id:     learnerId,
      enrolment_id:   enrolmentId || null,
      cohort_id:      enr?.cohort_id || null,
      programme_id:   cohort?.programme_id || null,
      activity_type:  activityType,
      activity_title: activityTitle,
      activity_date:  activityDate,
      score:          scoreNum,
      max_score:      maxNum,
      feedback:       feedback || null,
      status:         "recorded",
    });
    reset();
    onOpenChange(false);
  }

  const canSubmit = learnerId && activityTitle && !isOverMax && !isNeg && !record.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Record Activity Grade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* ── Cohort filter (if multiple cohorts) ── */}
          {cohorts.length > 1 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Filter by Cohort
              </Label>
              <Select value={cohortFilter} onValueChange={(v) => {
                setCohortFilter(v);
                setLearnerId(""); setEnrolmentId("");
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cohorts</SelectItem>
                  {cohorts.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Learner selector ── */}
          <div>
            <Label className="text-sm font-medium">
              Learner <span className="text-destructive">*</span>
            </Label>
            <Select
              value={learnerId}
              onValueChange={handleLearnerChange}
              disabled={profilesLoading || uniqueLearners.length === 0}
            >
              <SelectTrigger className={cn("h-10 mt-1", !learnerId && "text-muted-foreground")}>
                <SelectValue
                  placeholder={
                    profilesLoading
                      ? "Loading learners…"
                      : uniqueLearners.length === 0
                        ? "No learners available"
                        : "Select learner…"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {uniqueLearners.map((e: any) => {
                  const profile = profileMap[e.learner_id];
                  const name    = profile?.name ?? `Learner ${e.learner_id.slice(0, 8)}`;
                  const cohort  = cohorts.find((c: any) => c.id === e.cohort_id);
                  return (
                    <SelectItem key={e.learner_id} value={e.learner_id}>
                      <div className="flex items-center gap-2 py-0.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{name}</p>
                          {(profile?.title || cohort?.name) && (
                            <p className="text-[10px] text-muted-foreground leading-tight truncate">
                              {[profile?.title, cohort?.name].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Selected learner chip */}
            {learnerId && profileMap[learnerId] && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{profileMap[learnerId].name}</p>
                  {selectedCohort && (
                    <p className="text-[10px] text-muted-foreground">
                      {selectedCohort.name}
                      {selectedCohort.programmes?.title ? ` · ${selectedCohort.programmes.title}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Activity Type + Date ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">
                Activity Type <span className="text-destructive">*</span>
              </Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={activityDate}
                onChange={e => setActivityDate(e.target.value)}
                className="h-10 mt-1"
              />
            </div>
          </div>

          {/* ── Activity Title ── */}
          <div>
            <Label className="text-sm font-medium">
              Activity Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={activityTitle}
              onChange={e => setActivityTitle(e.target.value)}
              placeholder="e.g. Module 3 group presentation"
              className="h-10 mt-1"
            />
          </div>

          {/* ── Score + Max Score ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Score</Label>
              <Input
                type="number"
                step="0.5"
                min={0}
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder="e.g. 78"
                className={cn("h-10 mt-1", (isOverMax || isNeg) && "border-destructive ring-destructive")}
                aria-describedby={isOverMax ? "score-error" : undefined}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Max Score</Label>
              <Input
                type="number"
                value={maxScore}
                onChange={e => setMaxScore(e.target.value)}
                className="h-10 mt-1"
              />
            </div>
          </div>

          {/* Live score feedback */}
          {scoreNum != null && !isOverMax && !isNeg && pct != null && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg",
              pct >= 50 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {pct >= 50
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> {pct}% — Pass</>
                : <><AlertTriangle className="w-3.5 h-3.5" /> {pct}% — Fail</>
              }
            </div>
          )}
          {isOverMax && (
            <p id="score-error" className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Score cannot exceed max score ({maxNum})
            </p>
          )}
          {isNeg && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Score cannot be negative
            </p>
          )}

          {/* ── Feedback ── */}
          <div>
            <Label className="text-sm font-medium">Feedback</Label>
            <Textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Optional feedback for the learner"
              rows={3}
              className="mt-1 resize-none text-sm"
              maxLength={2000}
            />
            <p className="text-[9px] text-muted-foreground text-right mt-0.5">{feedback.length}/2000</p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-1.5"
          >
            {record.isPending ? "Saving…" : "Record Grade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
