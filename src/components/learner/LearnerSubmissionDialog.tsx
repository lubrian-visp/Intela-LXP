import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateSubmission } from "@/hooks/useCoreData";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Send, Save, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface LearnerSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: {
    id: string;
    title: string;
    description?: string | null;
    assessment_category?: string;
    max_score?: number | null;
    pass_mark?: number | null;
    due_date?: string | null;
  };
  enrolmentId?: string;
  existingSubmission?: {
    id: string;
    status: string;
    feedback?: string | null;
  } | null;
}

const CATEGORY_BADGE: Record<string, string> = {
  diagnostic: "bg-info/10 text-info",
  formative: "bg-success/10 text-success",
  summative: "bg-warning/10 text-warning",
  transfer: "bg-primary/10 text-primary",
};

export function LearnerSubmissionDialog({
  open,
  onOpenChange,
  assessment,
  enrolmentId,
  existingSubmission,
}: LearnerSubmissionDialogProps) {
  const { user } = useAuth();
  const createSubmission = useCreateSubmission();
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const isResubmission = existingSubmission?.status === "resubmit";
  const isAlreadySubmitted = existingSubmission && !["resubmit", "pending"].includes(existingSubmission.status);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const valid = selected.filter(f => f.size <= maxSize);
    if (valid.length < selected.length) {
      toast.error("Some files exceed the 10MB limit and were excluded.");
    }
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!user?.id) return;
    setUploading(true);
    setIsDraft(asDraft);

    try {
      // Upload files if any
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const path = `submissions/${user.id}/${assessment.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("learner-documents")
          .upload(path, file);
        if (uploadErr) throw uploadErr;
        uploadedPaths.push(path);
      }

      await createSubmission.mutateAsync({
        assessment_id: assessment.id,
        learner_id: user.id,
        enrolment_id: enrolmentId || null,
        status: asDraft ? "pending" : "submitted",
        submitted_at: asDraft ? null : new Date().toISOString(),
        feedback: notes || null,
      });

      toast.success(asDraft ? "Draft saved" : "Submission sent successfully");
      setNotes("");
      setFiles([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            {isResubmission ? "Resubmit Assessment" : "Submit Assessment"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {assessment.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assessment info */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{assessment.title}</h3>
              {assessment.assessment_category && (
                <Badge variant="outline" className={cn("text-[8px]", CATEGORY_BADGE[assessment.assessment_category])}>
                  {assessment.assessment_category}
                </Badge>
              )}
            </div>
            {assessment.description && (
              <p className="text-[11px] text-muted-foreground">{assessment.description}</p>
            )}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              {assessment.max_score && <span>Max: {assessment.max_score}</span>}
              {assessment.pass_mark && <span>Pass: {assessment.pass_mark}</span>}
              {assessment.due_date && <span>Due: {assessment.due_date}</span>}
            </div>
          </div>

          {/* Resubmission feedback */}
          {isResubmission && existingSubmission?.feedback && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">Assessor Feedback</p>
                  <p className="text-[11px] text-muted-foreground">{existingSubmission.feedback}</p>
                </div>
              </div>
            </div>
          )}

          {/* Already submitted notice */}
          {isAlreadySubmitted && (
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
              <p className="text-xs text-success font-medium">This assessment has already been submitted.</p>
            </div>
          )}

          {!isAlreadySubmitted && (
            <>
              {/* Notes / answer */}
              <div className="space-y-1">
                <Label className="text-xs">Notes / Written Response</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter your response or notes for the assessor..."
                  className="text-sm min-h-[100px]"
                  maxLength={5000}
                />
                <p className="text-[9px] text-muted-foreground text-right">{notes.length}/5000</p>
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label className="text-xs">Attachments (optional, max 5 files, 10MB each)</Label>
                <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload files</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                  />
                </label>
                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 text-xs">
                        <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate text-foreground">{f.name}</span>
                        <span className="text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)}KB</span>
                        <button onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80 text-[10px]">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!isAlreadySubmitted && (
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleSubmit(true)} disabled={uploading} className="gap-1.5">
              <Save className="w-3 h-3" />
              {uploading && isDraft ? "Saving..." : "Save Draft"}
            </Button>
            <Button size="sm" onClick={() => handleSubmit(false)} disabled={uploading || (!notes && files.length === 0)} className="gap-1.5 flex-1">
              <Send className="w-3 h-3" />
              {uploading && !isDraft ? "Submitting..." : isResubmission ? "Resubmit" : "Submit"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
