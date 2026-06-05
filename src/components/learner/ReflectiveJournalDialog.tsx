import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, BookOpen, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCreateSubmission } from "@/hooks/useCoreData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessment: { id: string; title: string; description?: string | null };
  enrolmentId?: string;
}

const PROMPTS = [
  { key: "what_learned",  label: "What did I learn?",          placeholder: "Describe the key concepts, skills, or insights you gained…" },
  { key: "challenges",    label: "What was challenging?",       placeholder: "What did you find difficult or confusing? How did you approach it?" },
  { key: "applied",       label: "How will I apply this?",      placeholder: "Where in your work or life could you use what you've learned?" },
  { key: "questions",     label: "What questions remain?",      placeholder: "What would you still like to explore or understand better?" },
];

export function ReflectiveJournalDialog({ open, onOpenChange, assessment, enrolmentId }: Props) {
  const { user }         = useAuth();
  const createSubmission = useCreateSubmission();

  const [responses, setResponses] = useState<Record<string, string>>(
    Object.fromEntries(PROMPTS.map(p => [p.key, ""]))
  );
  const [rating, setRating]       = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]       = useState(false);

  const totalChars = Object.values(responses).join("").length;
  const isReady    = Object.values(responses).some(v => v.trim().length > 10) && rating > 0;

  const handleSubmit = async () => {
    if (!user?.id || !isReady) return;
    setSaving(true);
    try {
      const body = PROMPTS.map(p =>
        `### ${p.label}\n${responses[p.key] || "(not answered)"}`
      ).join("\n\n") + `\n\n### Self-rating: ${rating}/5 ⭐`;

      await createSubmission.mutateAsync({
        assessment_id: assessment.id,
        learner_id:    user.id,
        enrolment_id:  enrolmentId || null,
        status:        "submitted",
        submitted_at:  new Date().toISOString(),
        feedback:      body,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit journal");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setResponses(Object.fromEntries(PROMPTS.map(p => [p.key, ""])));
    setRating(0); setSubmitted(false);
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Journal Submitted!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your reflective journal for <strong>{assessment.title}</strong> has been submitted.
                Your facilitator will review it privately.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="w-4 h-4 text-blue-500" />
            Reflective Journal
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            {assessment.title} — your responses are private and shared only with your facilitator.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {PROMPTS.map(prompt => (
            <div key={prompt.key} className="space-y-1.5">
              <Label className="text-sm font-medium">{prompt.label}</Label>
              <Textarea
                value={responses[prompt.key]}
                onChange={e => setResponses(p => ({ ...p, [prompt.key]: e.target.value }))}
                placeholder={prompt.placeholder}
                rows={3}
                className="text-sm resize-none"
                aria-label={prompt.label}
              />
            </div>
          ))}

          {/* Self-rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">How well do you feel you understood this topic?</Label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`Rate ${n} out of 5`}
                  aria-pressed={rating >= n}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  {n <= rating ? "⭐" : "☆"}
                </button>
              ))}
              {rating > 0 && (
                <span className="text-[11px] text-muted-foreground ml-1">
                  {["","Not yet","Getting there","Somewhat","Mostly","Confident"][rating]}
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">{totalChars} characters written</p>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!isReady || saving} className="gap-1.5">
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</>
              : <><Send className="w-3.5 h-3.5" /> Submit Journal</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
