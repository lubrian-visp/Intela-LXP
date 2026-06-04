import { useState, useRef } from "react";
import {
  FileText, Upload, CheckCircle2, XCircle, Clock, Eye,
  ThumbsUp, ThumbsDown, AlertTriangle, Trash2, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useLearnerDocuments,
  useUploadLearnerDocument,
  useVerifyDocument,
  DOCUMENT_TYPES,
  DOC_STATUS_CONFIG,
  type LearnerDocument,
} from "@/hooks/useLearnerDocuments";

interface Props {
  registrationId: string;
  learnerName: string;
  readOnly?: boolean;
}

export default function DocumentVerificationPanel({ registrationId, learnerName, readOnly }: Props) {
  const { data: documents = [], isLoading } = useLearnerDocuments(registrationId);
  const uploadDoc = useUploadLearnerDocument();
  const verifyDoc = useVerifyDocument();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [verifyingDoc, setVerifyingDoc] = useState<LearnerDocument | null>(null);
  const [verifyAction, setVerifyAction] = useState<"verified" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");

  const handleUpload = async () => {
    if (!selectedFile || !docType) return;
    try {
      await uploadDoc.mutateAsync({
        registrationId,
        documentType: docType,
        file: selectedFile,
      });
      toast.success("Document uploaded successfully.");
      setUploadOpen(false);
      setSelectedFile(null);
      setDocType("");
    } catch {
      toast.error("Upload failed. Please try again.");
    }
  };

  const handleVerify = async () => {
    if (!verifyingDoc || !verifyAction) return;
    if (verifyAction === "rejected" && !rejectionReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    try {
      await verifyDoc.mutateAsync({
        documentId: verifyingDoc.id,
        registrationId,
        status: verifyAction,
        rejectionReason: rejectionReason || undefined,
        notes: verifyNotes || undefined,
      });
      toast.success(verifyAction === "verified" ? "Document verified." : "Document rejected.");
      setVerifyingDoc(null);
      setVerifyAction(null);
      setRejectionReason("");
      setVerifyNotes("");
    } catch {
      toast.error("Verification failed.");
    }
  };

  const handleDownload = async (doc: LearnerDocument) => {
    const { data, error } = await supabase.storage
      .from("learner-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const verified = documents.filter(d => d.status === "verified").length;
  const pending = documents.filter(d => d.status === "pending_review").length;
  const rejected = documents.filter(d => d.status === "rejected").length;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Documents for {learnerName}
          </h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {documents.length === 0 ? "No documents uploaded yet." : `${verified} verified • ${pending} pending • ${rejected} rejected`}
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => setUploadOpen(true)}>
            <Upload className="w-3 h-3" /> Upload Document
          </Button>
        )}
      </div>

      {/* Document list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading documents...</p>
      ) : documents.length === 0 ? (
        <div className="p-6 text-center bg-secondary/20 rounded-lg border border-border/30">
          <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
          {!readOnly && (
            <Button size="sm" variant="outline" className="mt-3 h-7 text-[10px] gap-1" onClick={() => setUploadOpen(true)}>
              <Upload className="w-3 h-3" /> Upload First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const sc = DOC_STATUS_CONFIG[doc.status] || DOC_STATUS_CONFIG.pending_review;
            const typeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;
            return (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    doc.status === "verified" ? "bg-success/10" :
                    doc.status === "rejected" ? "bg-destructive/10" :
                    "bg-warning/10"
                  )}>
                    {doc.status === "verified" ? <CheckCircle2 className="w-4 h-4 text-success" /> :
                     doc.status === "rejected" ? <XCircle className="w-4 h-4 text-destructive" /> :
                     <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{doc.document_name}</p>
                    <p className="text-[10px] text-muted-foreground">{typeLabel} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "—"}</p>
                    {doc.status === "rejected" && doc.rejection_reason && (
                      <p className="text-[10px] text-destructive mt-0.5 truncate" title={doc.rejection_reason}>
                        Reason: {doc.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", sc.color)}>
                    {sc.label}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(doc)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  {!readOnly && doc.status === "pending_review" && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:bg-success/10"
                        onClick={() => { setVerifyingDoc(doc); setVerifyAction("verified"); }}>
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => { setVerifyingDoc(doc); setVerifyAction("rejected"); }}>
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Upload Document</DialogTitle>
            <DialogDescription className="text-xs">Upload a document for {learnerName}. All uploads are audited.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {selectedFile ? (
                  <div>
                    <FileText className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-xs font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Click to select a file</p>
                    <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG, DOC (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setUploadOpen(false); setSelectedFile(null); setDocType(""); }}>Cancel</Button>
            <Button size="sm" disabled={!selectedFile || !docType || uploadDoc.isPending} onClick={handleUpload}>
              {uploadDoc.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify/Reject Dialog */}
      <Dialog open={!!verifyingDoc} onOpenChange={() => { setVerifyingDoc(null); setVerifyAction(null); setRejectionReason(""); setVerifyNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {verifyAction === "verified" ? "Verify Document" : "Reject Document"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {verifyAction === "verified"
                ? `Confirm that "${verifyingDoc?.document_name}" has been reviewed and is valid.`
                : `Reject "${verifyingDoc?.document_name}" and provide a reason.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {verifyAction === "rejected" && (
              <div className="space-y-1">
                <Label className="text-xs">Rejection Reason (required)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Explain why this document is rejected..."
                  className="text-xs"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
                placeholder="Additional notes..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setVerifyingDoc(null); setVerifyAction(null); }}>Cancel</Button>
            <Button
              size="sm"
              disabled={verifyAction === "rejected" && !rejectionReason.trim()}
              onClick={handleVerify}
              className={verifyAction === "verified" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}
            >
              {verifyAction === "verified" ? "Confirm Verification" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
