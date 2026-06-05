import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateSubmission } from "@/hooks/useCoreData";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Send, Save, FileText, AlertCircle, CheckCircle2,
  X, Download, File, Image, FileArchive, FileCode, Loader2,
} from "lucide-react";
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
  formative:  "bg-success/10 text-success",
  summative:  "bg-warning/10 text-warning",
  transfer:   "bg-primary/10 text-primary",
};

const ALLOWED_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.txt,.csv,.xlsx";
const ALLOWED_MIME  = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg","application/zip","text/plain","text/csv","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES     = 5;

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return <Image className="w-3.5 h-3.5 text-blue-500" />;
  if (file.type.includes("zip"))      return <FileArchive className="w-3.5 h-3.5 text-yellow-500" />;
  if (file.type.includes("pdf"))      return <FileText className="w-3.5 h-3.5 text-red-500" />;
  if (file.type.includes("word"))     return <FileText className="w-3.5 h-3.5 text-blue-600" />;
  if (file.type.includes("sheet") || file.type.includes("csv")) return <FileCode className="w-3.5 h-3.5 text-green-600" />;
  return <File className="w-3.5 h-3.5 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LearnerSubmissionDialog({
  open, onOpenChange, assessment, enrolmentId, existingSubmission,
}: LearnerSubmissionDialogProps) {
  const { user }            = useAuth();
  const createSubmission    = useCreateSubmission();
  const fileInputRef        = useRef<HTMLInputElement>(null);

  const [notes, setNotes]           = useState("");
  const [files, setFiles]           = useState<File[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [isDraft, setIsDraft]       = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [submitted, setSubmitted]   = useState(false);
  const [submittedAs, setSubmittedAs] = useState<"draft" | "final">("final");

  const isResubmission    = existingSubmission?.status === "resubmit";
  const isAlreadySubmitted = existingSubmission && !["resubmit", "pending"].includes(existingSubmission.status);

  const addFiles = useCallback((incoming: File[]) => {
    const errors: string[] = [];
    const valid = incoming.filter(f => {
      if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name} exceeds 10 MB`); return false; }
      if (!ALLOWED_MIME.includes(f.type) && !f.name.match(/\.(pdf|doc|docx|png|jpg|jpeg|zip|txt|csv|xlsx)$/i)) {
        errors.push(`${f.name} is not an allowed file type`); return false;
      }
      return true;
    });
    if (errors.length) toast.error(errors.join(", "));
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES));
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!user?.id) return;
    setUploading(true);
    setIsDraft(asDraft);

    try {
      const uploadedPaths: string[] = [];

      for (const file of files) {
        const path = `submissions/${user.id}/${assessment.id}/${Date.now()}_${file.name}`;

        // Simulate upload progress
        setFileProgress(p => ({ ...p, [file.name]: 0 }));
        const interval = setInterval(() => {
          setFileProgress(p => ({
            ...p,
            [file.name]: Math.min((p[file.name] ?? 0) + 20, 90),
          }));
        }, 150);

        const { error: uploadErr } = await supabase.storage
          .from("learner-documents")
          .upload(path, file);

        clearInterval(interval);
        setFileProgress(p => ({ ...p, [file.name]: uploadErr ? -1 : 100 }));
        if (uploadErr) throw uploadErr;
        uploadedPaths.push(path);
      }

      await createSubmission.mutateAsync({
        assessment_id: assessment.id,
        learner_id:    user.id,
        enrolment_id:  enrolmentId || null,
        status:        asDraft ? "pending" : "submitted",
        submitted_at:  asDraft ? null : new Date().toISOString(),
        feedback:      notes || null,
      });

      setSubmittedAs(asDraft ? "draft" : "final");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setUploading(false);
      setFileProgress({});
    }
  };

  const handleClose = () => {
    setNotes(""); setFiles([]); setSubmitted(false); setFileProgress({});
    onOpenChange(false);
  };

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center",
              submittedAs === "final" ? "bg-green-500/10" : "bg-blue-500/10"
            )}>
              <CheckCircle2 className={cn("w-8 h-8", submittedAs === "final" ? "text-green-500" : "text-blue-500")} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground">
                {submittedAs === "final" ? "Submission Received!" : "Draft Saved"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {submittedAs === "final"
                  ? `Your work for "${assessment.title}" has been submitted. Your assessor will review it and provide feedback.`
                  : `Your draft for "${assessment.title}" has been saved. You can return and submit when ready.`
                }
              </p>
            </div>

            {/* What was submitted */}
            <div className="w-full text-left rounded-xl bg-secondary/30 border border-border/50 divide-y divide-border/30">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground">Assessment</span>
                <span className="text-[12px] font-medium text-foreground">{assessment.title}</span>
              </div>
              {notes.trim() && (
                <div className="flex items-start justify-between px-4 py-2.5 gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">Response</span>
                  <span className="text-[11px] text-foreground text-right line-clamp-2">{notes.slice(0, 80)}{notes.length > 80 ? "…" : ""}</span>
                </div>
              )}
              {files.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] text-muted-foreground">Files</span>
                  <span className="text-[12px] font-medium text-foreground">{files.length} file{files.length !== 1 ? "s" : ""} attached</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground">Status</span>
                <span className={cn("text-[11px] font-semibold",
                  submittedAs === "final" ? "text-green-600" : "text-blue-600"
                )}>
                  {submittedAs === "final" ? "Submitted for Assessment" : "Saved as Draft"}
                </span>
              </div>
            </div>

            {submittedAs === "final" && (
              <p className="text-[11px] text-muted-foreground">
                You'll be notified when your assessor reviews your submission.
                Check My Grades for your result.
              </p>
            )}

            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Submission form ────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            {isResubmission ? "Resubmit Assessment" : "Submit Assessment"}
          </DialogTitle>
          <DialogDescription className="text-xs">{assessment.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assessment metadata */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
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
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              {assessment.max_score && <span>Max: <strong>{assessment.max_score}</strong></span>}
              {assessment.pass_mark && <span>Pass: <strong>{assessment.pass_mark}</strong></span>}
              {assessment.due_date && (
                <span className={cn(
                  new Date(assessment.due_date) < new Date() ? "text-destructive font-medium" : ""
                )}>
                  Due: <strong>{new Date(assessment.due_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</strong>
                  {new Date(assessment.due_date) < new Date() && " (Overdue)"}
                </span>
              )}
            </div>
          </div>

          {/* Resubmission feedback */}
          {isResubmission && existingSubmission?.feedback && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">Assessor Feedback to Address</p>
                  <p className="text-[11px] text-muted-foreground">{existingSubmission.feedback}</p>
                </div>
              </div>
            </div>
          )}

          {/* Already submitted notice */}
          {isAlreadySubmitted && (
            <div className="p-3 rounded-lg bg-success/5 border border-success/20 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-xs text-success font-medium">This assessment has already been submitted.</p>
            </div>
          )}

          {!isAlreadySubmitted && (
            <>
              {/* Text response */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Written Response
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Enter your response, reflections, or notes for the assessor…"
                  className="text-sm min-h-[100px] resize-y"
                  maxLength={5000}
                  aria-label="Written response for this assessment"
                />
                <p className="text-[9px] text-muted-foreground text-right">{notes.length}/5000</p>
              </div>

              {/* File upload — drag-drop */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Attachments
                  <span className="text-muted-foreground font-normal ml-1">
                    (max {MAX_FILES} files · 10 MB each · PDF, DOC, DOCX, PNG, JPG, ZIP)
                  </span>
                </Label>

                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Drop files here or click to browse"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed transition-colors cursor-pointer",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-secondary/30",
                    files.length >= MAX_FILES && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-foreground">Drop files here or <span className="text-primary">browse</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {files.length}/{MAX_FILES} files selected
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept={ALLOWED_TYPES}
                    onChange={handleFileInputChange}
                    aria-hidden="true"
                  />
                </div>

                {/* File list with progress */}
                {files.length > 0 && (
                  <div className="space-y-1.5">
                    {files.map((f, i) => {
                      const progress = fileProgress[f.name];
                      const isUploading = uploading && progress !== undefined && progress < 100;
                      return (
                        <div key={i} className="rounded-lg border border-border/40 bg-secondary/20 overflow-hidden">
                          <div className="flex items-center gap-2.5 px-3 py-2">
                            {fileIcon(f)}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-foreground truncate">{f.name}</p>
                              <p className="text-[10px] text-muted-foreground">{formatBytes(f.size)}</p>
                            </div>
                            {isUploading ? (
                              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                            ) : progress === 100 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <button
                                onClick={() => removeFile(i)}
                                aria-label={`Remove ${f.name}`}
                                className="w-5 h-5 rounded-full bg-secondary hover:bg-destructive/10 flex items-center justify-center shrink-0 transition-colors"
                              >
                                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            )}
                          </div>
                          {isUploading && (
                            <Progress value={progress} className="h-1 rounded-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!isAlreadySubmitted && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline" size="sm"
              onClick={() => handleSubmit(true)}
              disabled={uploading}
              className="gap-1.5"
              aria-label="Save as draft"
            >
              <Save className="w-3 h-3" />
              {uploading && isDraft ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : "Save Draft"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={uploading || (!notes.trim() && files.length === 0)}
              className="gap-1.5 flex-1"
              aria-label={isResubmission ? "Resubmit assessment" : "Submit assessment"}
            >
              {uploading && !isDraft
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                : <><Send className="w-3 h-3" />{isResubmission ? "Resubmit" : "Submit"}</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
