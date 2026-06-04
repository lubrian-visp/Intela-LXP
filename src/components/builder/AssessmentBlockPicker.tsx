import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface AssessmentBlockPickerProps {
  programmeId?: string;
  selectedAssessmentId: string | null;
  onSelect: (assessmentId: string | null) => void;
  briefingHtml?: string;
}

export function AssessmentBlockPicker({
  programmeId,
  selectedAssessmentId,
  onSelect,
}: AssessmentBlockPickerProps) {
  // Fetch published assessments for this programme
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["published-assessments-for-block", programmeId],
    enabled: !!programmeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, title, assessment_type, assessment_category, max_score, pass_mark, status")
        .eq("programme_id", programmeId!)
        .in("status", ["published", "active"])
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch linked assessment's settings to surface pass mark / attempts / time limit
  const { data: linkedAssessment } = useQuery({
    queryKey: ["linked-assessment-detail", selectedAssessmentId],
    enabled: !!selectedAssessmentId,
    queryFn: async () => {
      const [{ data: a }, { data: s }] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, title, assessment_type, assessment_category, max_score, pass_mark, status")
          .eq("id", selectedAssessmentId!)
          .maybeSingle(),
        supabase
          .from("assessment_settings_safe" as any)
          .select("time_limit_minutes, attempts_allowed, requires_access_code")
          .eq("assessment_id", selectedAssessmentId!)
          .maybeSingle(),
      ]);
      return { assessment: a, settings: s as any };
    },
  });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary" />
          Linked Assessment
        </Label>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          title="Opens the Assessment Builder in a new tab so you don't lose your edits"
        >
          <a href="/assessments" target="_blank" rel="noopener noreferrer">
            Open Assessment Builder <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading assessments...
        </div>
      ) : !assessments || assessments.length === 0 ? (
        <div className="space-y-3 rounded-md border border-dashed border-border bg-background p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                No <strong className="text-foreground">published</strong> assessments exist for this programme yet.
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open the Assessment Builder (button above)</li>
                <li>Click <strong className="text-foreground">+ New Assessment</strong> and select this programme</li>
                <li>Add questions / rubric, then change status to <strong className="text-foreground">Published</strong></li>
                <li>Return to this dialog — it will appear in the dropdown below</li>
              </ol>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 text-xs"
          >
            <a
              href={programmeId ? `/assessments?programme=${programmeId}&new=1` : "/assessments"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Create Assessment for this Programme <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      ) : (
        <Select
          value={selectedAssessmentId ?? "none"}
          onValueChange={(v) => onSelect(v === "none" ? null : v)}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select a published assessment..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-sm">— No assessment linked —</SelectItem>
            {assessments.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-sm">
                <span className="flex items-center gap-2">
                  <span>{a.title}</span>
                  <Badge variant="outline" className="text-[9px]">{a.assessment_type}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Linked assessment summary */}
      {selectedAssessmentId && linkedAssessment?.assessment && (
        <div className="rounded-md border border-border bg-background p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {linkedAssessment.assessment.title}
            </p>
            <Badge variant="outline" className="text-[9px] capitalize">
              {linkedAssessment.assessment.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <SummaryRow label="Type" value={linkedAssessment.assessment.assessment_type} />
            <SummaryRow label="Category" value={linkedAssessment.assessment.assessment_category ?? "—"} />
            <SummaryRow
              label="Max Score"
              value={linkedAssessment.assessment.max_score?.toString() ?? "—"}
            />
            <SummaryRow
              label="Pass Mark"
              value={
                linkedAssessment.assessment.pass_mark != null
                  ? `${linkedAssessment.assessment.pass_mark}${linkedAssessment.assessment.max_score ? ` / ${linkedAssessment.assessment.max_score}` : ""}`
                  : "—"
              }
            />
            <SummaryRow
              label="Attempts"
              value={
                linkedAssessment.settings?.attempts_allowed != null
                  ? String(linkedAssessment.settings.attempts_allowed)
                  : "Unlimited"
              }
            />
            <SummaryRow
              label="Time Limit"
              value={
                linkedAssessment.settings?.time_limit_minutes
                  ? `${linkedAssessment.settings.time_limit_minutes} min`
                  : "None"
              }
            />
          </div>
          {linkedAssessment.settings?.requires_access_code && (
            <p className="text-[10px] text-warning flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Requires an access code at launch
            </p>
          )}
          <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border">
            Settings above are inherited from the Assessment Builder. Edit them there to change behaviour.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/40">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground truncate">{value}</span>
    </div>
  );
}
