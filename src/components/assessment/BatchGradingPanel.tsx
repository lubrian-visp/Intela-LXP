import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Submission {
  id: string;
  learner_id: string;
  learner_name?: string;
  assessment_title?: string;
  status: string;
  score: number | null;
}

interface BatchGradingPanelProps {
  submissions: Submission[];
  assessmentId: string;
  passMark?: number | null;
  maxScore?: number | null;
}

export default function BatchGradingPanel({
  submissions,
  assessmentId,
  passMark,
  maxScore,
}: BatchGradingPanelProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchScore, setBatchScore] = useState("");
  const [batchFeedback, setBatchFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingSubs = submissions.filter((s) =>
    ["submitted", "pending", "in_progress"].includes(s.status)
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pendingSubs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingSubs.map((s) => s.id)));
    }
  };

  const handleBatchGrade = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one submission.");
      return;
    }

    const score = parseFloat(batchScore);
    if (isNaN(score) || score < 0) {
      toast.error("Enter a valid score.");
      return;
    }

    if (maxScore !== null && maxScore !== undefined && score > maxScore) {
      toast.error(`Score cannot exceed ${maxScore}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const status = passMark !== null && passMark !== undefined
        ? score >= passMark ? "passed" : "failed"
        : "assessed";

      const updates = [...selected].map((id) =>
        supabase
          .from("assessment_submissions")
          .update({
            score,
            feedback: batchFeedback || null,
            status,
            assessed_at: new Date().toISOString(),
            assessor_id: null, // Will be set by RLS context
          })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        toast.error(`${errors.length} of ${selected.size} updates failed.`);
      } else {
        toast.success(`${selected.size} submission(s) graded successfully.`);
        setSelected(new Set());
        setBatchScore("");
        setBatchFeedback("");
        queryClient.invalidateQueries({ queryKey: ["assessment-submissions"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Batch grading failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingSubs.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">All submissions have been graded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Batch Grading</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.size === pendingSubs.length && pendingSubs.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground">
            {selected.size} of {pendingSubs.length} selected
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1">
          {pendingSubs.map((sub) => (
            <div
              key={sub.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                selected.has(sub.id) ? "bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => toggleSelect(sub.id)}
            >
              <Checkbox checked={selected.has(sub.id)} />
              <span className="text-sm text-foreground flex-1 truncate">
                {sub.learner_name || sub.learner_id}
              </span>
              <Badge variant="outline" className="text-xs">
                {sub.status}
              </Badge>
            </div>
          ))}
        </div>

        {/* Batch inputs */}
        {selected.size > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Score {maxScore ? `(max ${maxScore})` : ""}
                </label>
                <Input
                  type="number"
                  value={batchScore}
                  onChange={(e) => setBatchScore(e.target.value)}
                  placeholder="Enter score"
                  min={0}
                  max={maxScore ?? undefined}
                />
              </div>
              <div className="flex items-end">
                {passMark && (
                  <p className="text-xs text-muted-foreground">
                    Pass mark: {passMark}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Feedback (optional)</label>
              <Textarea
                value={batchFeedback}
                onChange={(e) => setBatchFeedback(e.target.value)}
                placeholder="Common feedback for all selected..."
                rows={2}
              />
            </div>
            <Button onClick={handleBatchGrade} disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Grade {selected.size} Submission{selected.size > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
