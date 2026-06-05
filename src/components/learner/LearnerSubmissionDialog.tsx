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
  X, File, Image, FileArchive, FileCode, Loader2,
  Camera, ScanLine, Smartphone, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_BADGE: Record<string, string> = {
  diagnostic: "bg-info/10 text-info",
  formative:  "bg-success/10 text-success",
  summative:  "bg-warning/10 text-warning",
  transfer:   "bg-primary/10 text-primary",
};

// Typed document formats
const DOCUMENT_TYPES = ".pdf,.doc,.docx,.txt,.xlsx,.csv";
const DOCUMENT_MIME  = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Scan / photo formats — includes HEIC (iPhone), TIFF (scanner), WebP
const SCAN_TYPES = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.tiff,.tif,.webp";
const SCAN_MIME  = [
  "application/pdf",
  "image/jpeg", "image/png", "image/heic", "image/heif",
  "image/tiff", "image/webp", "image/bmp",
];

const ALL_ALLOWED_TYPES = `${DOCUMENT_TYPES},${SCAN_TYPES},.zip`;
const ALL_ALLOWED_MIME  = [...new Set([...DOCUMENT_MIME, ...SCAN_MIME, "application/zip"])];

const MAX_FILE_SIZE  = 25 * 1024 * 1024;  // 25 MB — scans can be large
const MAX_FILES      = 10;                 // up to 10 pages / attachments

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fileIcon(file: File) {
  const t = file.type;
  if (t.startsWith("image/")) return <Image className="w-3.5 h-3.5 text-blue-500" />;
  if (t.includes("zip"))      return <FileArchive className="w-3.5 h-3.5 text-yellow-500" />;
  if (t.includes("pdf"))      return <FileText className="w-3.5 h-3.5 text-red-500" />;
  if (t.includes("word"))     return <FileText className="w-3.5 h-3.5 text-blue-600" />;
  if (t.includes("sheet") || t.includes("csv")) return <FileCode className="w-3.5 h-3.5 text-green-600" />;
  return <File className="w-3.5 h-3.5 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpg|jpeg|png|heic|heif|tiff|tif|webp|bmp)$/i.test(file.name);
}

// ─── Scan tips panel ──────────────────────────────────────────────────────────
function ScanTips({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        aria-expanded={open}
        aria-controls="scan-tips-content"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-[12px] font-medium text-foreground">Tips for a clear scan submission</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div id="scan-tips-content" className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: "☀️", tip: "Scan in good lighting — natural light or bright indoor light works best." },
              { icon: "📐", tip: "Place your work flat on a solid surface; avoid crumpled or folded pages." },
              { icon: "🎯", tip: "Capture the entire page — don't cut off edges or corners." },
              { icon: "🔍", tip: "Ensure all text and diagrams are clearly legible before uploading." },
              { icon: "📄", tip: "Use a scanning app (Adobe Scan, Microsoft Lens, CamScanner) for best results." },
              { icon: "🗂️", tip: "For multi-page assignments, use one file per page or merge into a single PDF." },
            ].map(({ icon, tip }) => (
              <div key={tip} className="flex items-start gap-2">
                <span className="text-sm shrink-0">{icon}</span>
                <p className="text-[11px] text-muted-foreground leading-snug">{tip}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Recommended free scanning apps:</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <strong>Android:</strong> Microsoft Lens, Adobe Scan, Google PhotoScan
              &nbsp;·&nbsp;
              <strong>iPhone:</strong> Notes app (built-in), Adobe Scan, Microsoft Lens
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LearnerSubmissionDialog({
  open, onOpenChange, assessment, enrolmentId, existingSubmission,
}: LearnerSubmissionDialogProps) {
  const { user }         = useAuth();
  const createSubmission = useCreateSubmission();

  // File input refs — separate inputs for document vs scan/camera
  const fileInputRef   = useRef<HTMLInputElement>(null);   // browse any
  const cameraInputRef = useRef<HTMLInputElement>(null);   // camera capture

  const [notes, setNotes]               = useState("");
  const [files, setFiles]               = useState<File[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [isDraft, setIsDraft]           = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [submitted, setSubmitted]       = useState(false);
  const [submittedAs, setSubmittedAs]   = useState<"draft" | "final">("final");
  const [tipsOpen, setTipsOpen]         = useState(false);

  const isResubmission     = existingSubmission?.status === "resubmit";
  const isAlreadySubmitted = existingSubmission && !["resubmit", "pending"].includes(existingSubmission.status);

  // ── File validation ──────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: File[]) => {
    const errors: string[] = [];
    const valid = incoming.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`"${f.name}" exceeds 25 MB`);
        return false;
      }
      const mimeOk = ALL_ALLOWED_MIME.includes(f.type);
      const extOk  = /\.(pdf|doc|docx|txt|csv|xlsx|jpg|jpeg|png|heic|heif|tiff?|webp|bmp|zip)$/i.test(f.name);
      if (!mimeOk && !extOk) {
        errors.push(`"${f.name}" is not a supported file type`);
        return false;
      }
      return true;
    });
    if (errors.length) toast.error(errors.join(" · "));
    setFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        toast.warning(`Maximum ${MAX_FILES} files allowed`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
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

  // ── Upload & submit ──────────────────────────────────────────────────────
  const handleSubmit = async (asDraft: boolean) => {
    if (!user?.id) return;
    setUploading(true);
    setIsDraft(asDraft);

    try {
      const uploadedPaths: string[] = [];

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `submissions/${user.id}/${assessment.id}/${Date.now()}_${safeName}`;

        setFileProgress(p => ({ ...p, [file.name]: 0 }));
        const interval = setInterval(() => {
          setFileProgress(p => ({
            ...p,
            [file.name]: Math.min((p[file.name] ?? 0) + 15, 85),
          }));
        }, 200);

        const { error: uploadErr } = await supabase.storage
          .from("learner-documents")
          .upload(path, file, { contentType: file.type || "application/octet-stream" });

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
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setUploading(false);
      setFileProgress({});
    }
  };

  const handleClose = () => {
    setNotes(""); setFiles([]); setSubmitted(false);
    setFileProgress({}); setTipsOpen(false);
    onOpenChange(false);
  };

  const scanCount     = files.filter(isImageFile).length;
  const docCount      = files.filter(f => !isImageFile(f)).length;
  const canSubmit     = !uploading && (notes.trim().length > 0 || files.length > 0);

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center",
              submittedAs === "final" ? "bg-green-500/10" : "bg-blue-500/10"
            )}>
              <CheckCircle2 className={cn("w-8 h-8",
                submittedAs === "final" ? "text-green-500" : "text-blue-500"
              )} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground">
                {submittedAs === "final" ? "Submission Received!" : "Draft Saved"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {submittedAs === "final"
                  ? `Your work for "${assessment.title}" has been submitted. Your assessor will review it and provide feedback.`
                  : `Your draft for "${assessment.title}" is saved. Return any time to finalise and submit.`
                }
              </p>
            </div>

            <div className="w-full text-left rounded-xl bg-secondary/30 border border-border/50 divide-y divide-border/30 text-sm">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] text-muted-foreground">Assessment</span>
                <span className="text-[12px] font-medium text-foreground truncate max-w-[60%]">{assessment.title}</span>
              </div>
              {notes.trim() && (
                <div className="flex items-start justify-between px-4 py-2.5 gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0">Response</span>
                  <span className="text-[11px] text-foreground text-right line-clamp-2">
                    {notes.slice(0, 80)}{notes.length > 80 ? "…" : ""}
                  </span>
                </div>
              )}
              {files.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] text-muted-foreground">Files</span>
                  <span className="text-[12px] font-medium text-foreground">
                    {docCount > 0 && `${docCount} document${docCount !== 1 ? "s" : ""}`}
                    {docCount > 0 && scanCount > 0 && " + "}
                    {scanCount > 0 && `${scanCount} scan${scanCount !== 1 ? "s" : ""}/photo${scanCount !== 1 ? "s" : ""}`}
                  </span>
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
                You'll receive a notification when your assessor has reviewed your work.
                Check <strong>My Grades</strong> for your result and feedback.
              </p>
            )}

            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Submission form ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            {isResubmission ? "Resubmit Assessment" : "Submit Assessment"}
          </DialogTitle>
          <DialogDescription className="text-xs">{assessment.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Assessment metadata ── */}
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
              {assessment.max_score && <span>Max score: <strong>{assessment.max_score}</strong></span>}
              {assessment.pass_mark && <span>Pass mark: <strong>{assessment.pass_mark}</strong></span>}
              {assessment.due_date && (
                <span className={cn(new Date(assessment.due_date) < new Date() ? "text-destructive font-medium" : "")}>
                  Due: <strong>{new Date(assessment.due_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</strong>
                  {new Date(assessment.due_date) < new Date() && " (Overdue)"}
                </span>
              )}
            </div>
          </div>

          {/* ── Resubmission feedback notice ── */}
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

          {/* ── Already submitted ── */}
          {isAlreadySubmitted && (
            <div className="p-4 rounded-lg bg-success/5 border border-success/20 text-center">
              <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1.5" />
              <p className="text-sm font-medium text-success">Already submitted</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">This assessment has been submitted and is awaiting review.</p>
            </div>
          )}

          {!isAlreadySubmitted && (
            <>
              {/* ── Written response ── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Written Response
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Type your response, reflections, or notes for the assessor here…"
                  className="text-sm min-h-[90px] resize-y"
                  maxLength={5000}
                  aria-label="Written response for this assessment"
                />
                <p className="text-[9px] text-muted-foreground text-right">{notes.length}/5,000</p>
              </div>

              {/* ── File / Scan upload ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    Attach Files or Upload Scanned Work
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {files.length}/{MAX_FILES} files
                  </span>
                </div>

                {/* ── Upload method buttons ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Browse files */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={files.length >= MAX_FILES}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed transition-all text-center",
                      "hover:border-primary/50 hover:bg-primary/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      files.length >= MAX_FILES && "opacity-40 pointer-events-none",
                      "border-border"
                    )}
                    aria-label="Browse and upload files from device"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Browse Files</p>
                      <p className="text-[9px] text-muted-foreground">PDF, Word, Excel, Images</p>
                    </div>
                  </button>

                  {/* Take photo / scan with camera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={files.length >= MAX_FILES}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed transition-all text-center",
                      "hover:border-blue-500/50 hover:bg-blue-500/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      files.length >= MAX_FILES && "opacity-40 pointer-events-none",
                      "border-border"
                    )}
                    aria-label="Use phone camera to photograph or scan your work"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Take Photo</p>
                      <p className="text-[9px] text-muted-foreground">Use device camera</p>
                    </div>
                  </button>

                  {/* Scan / upload existing image */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Drag and drop scanned files here"
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed transition-all text-center cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      dragOver
                        ? "border-primary bg-primary/8 scale-[1.01]"
                        : "border-border hover:border-primary/40 hover:bg-secondary/30",
                      files.length >= MAX_FILES && "opacity-40 pointer-events-none"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      dragOver ? "bg-primary/10" : "bg-secondary"
                    )}>
                      <ScanLine className={cn("w-3.5 h-3.5 transition-colors", dragOver ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Drop Scan Here</p>
                      <p className="text-[9px] text-muted-foreground">Drag & drop a file</p>
                    </div>
                  </div>
                </div>

                {/* ── Hidden file inputs ── */}
                {/* General browse input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={ALL_ALLOWED_TYPES}
                  onChange={handleFileInputChange}
                  aria-hidden="true"
                />
                {/* Camera capture input — opens rear camera on mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInputChange}
                  aria-hidden="true"
                />

                {/* ── Supported formats info ── */}
                <div className="flex items-start gap-2 rounded-lg bg-secondary/30 px-3 py-2">
                  <Smartphone className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    <strong className="text-foreground">Supported:</strong>{" "}
                    PDF, Word, Excel · JPG, PNG, WebP, HEIC (iPhone), TIFF · ZIP — up to{" "}
                    <strong className="text-foreground">25 MB</strong> per file,{" "}
                    <strong className="text-foreground">{MAX_FILES} files</strong> max.
                    For multi-page handwritten work, photograph each page separately.
                  </p>
                </div>

                {/* ── Scan quality tips ── */}
                <ScanTips open={tipsOpen} onToggle={() => setTipsOpen(o => !o)} />

                {/* ── Attached files list ── */}
                {files.length > 0 && (
                  <div className="space-y-1.5" aria-label="Attached files">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Attached ({files.length})
                    </p>
                    {files.map((f, i) => {
                      const progress  = fileProgress[f.name];
                      const isUp      = uploading && progress !== undefined && progress < 100;
                      const failed    = progress === -1;
                      const isScan    = isImageFile(f);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg border overflow-hidden",
                            failed
                              ? "border-destructive/30 bg-destructive/5"
                              : isScan
                                ? "border-blue-500/20 bg-blue-500/5"
                                : "border-border/40 bg-secondary/20"
                          )}
                        >
                          <div className="flex items-center gap-2.5 px-3 py-2">
                            {fileIcon(f)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[12px] font-medium text-foreground truncate">{f.name}</p>
                                {isScan && (
                                  <Badge className="text-[8px] h-4 px-1 bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0">
                                    scan
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{formatBytes(f.size)}</p>
                            </div>
                            {isUp ? (
                              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                            ) : progress === 100 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : failed ? (
                              <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                            ) : (
                              <button
                                onClick={() => removeFile(i)}
                                aria-label={`Remove ${f.name}`}
                                className="w-5 h-5 rounded-full bg-secondary hover:bg-destructive/10 flex items-center justify-center shrink-0 transition-colors"
                              >
                                <X className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                          {isUp && (
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

        {/* ── Action buttons ── */}
        {!isAlreadySubmitted && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={uploading || !canSubmit}
              className="gap-1.5"
              aria-label="Save work as draft"
            >
              {uploading && isDraft
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                : <><Save className="w-3 h-3" /> Save Draft</>
              }
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={uploading || !canSubmit}
              className="gap-1.5 flex-1"
              aria-label={isResubmission ? "Resubmit assessment" : "Submit assessment for marking"}
            >
              {uploading && !isDraft
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</>
                : <><Send className="w-3 h-3" />{isResubmission ? "Resubmit" : "Submit for Marking"}</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
