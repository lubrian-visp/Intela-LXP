import { useState } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight,
  Send, Link2, Copy, ShieldCheck, FileText, Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useStaffVerificationChecklist,
  useUpdateStaffVerificationItem,
  useBatchUpdateStaffChecklist,
  useStaffChecklistSummary,
  useStaffDocumentRequests,
  useCreateStaffDocumentRequest,
  STAFF_CHECKLIST_SECTIONS,
  CHECK_STATUS_CONFIG,
  type StaffVerificationItem,
} from "@/hooks/useStaffVerification";

interface Props {
  registrationId: string;
  staffName: string;
  onVerificationComplete?: () => void;
  onClose: () => void;
}

export default function StaffVerificationPanel({ registrationId, staffName, onVerificationComplete, onClose }: Props) {
  const [expandedSections, setExpandedSections] = useState<string[]>(STAFF_CHECKLIST_SECTIONS.map(s => s.key));
  const [noteItemId, setNoteItemId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showDocRequest, setShowDocRequest] = useState(false);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [docMessage, setDocMessage] = useState("");

  const { data: items } = useStaffVerificationChecklist(registrationId);
  const summary = useStaffChecklistSummary(registrationId);
  const updateItem = useUpdateStaffVerificationItem();
  const batchUpdate = useBatchUpdateStaffChecklist();
  const { data: docRequests } = useStaffDocumentRequests(registrationId);
  const createDocRequest = useCreateStaffDocumentRequest();

  const toggleSection = (key: string) => {
    setExpandedSections(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleStatusChange = (item: StaffVerificationItem, status: "passed" | "failed" | "flagged" | "not_applicable") => {
    updateItem.mutate({ itemId: item.id, registrationId, status, notes: noteItemId === item.id ? noteText : undefined });
    if (noteItemId === item.id) { setNoteItemId(null); setNoteText(""); }
  };

  const handleBatchPass = (section: string) => {
    batchUpdate.mutate({ registrationId, section, status: "passed" }, {
      onSuccess: () => toast.success("Section marked as passed"),
    });
  };

  const handleSendDocRequest = () => {
    if (docTypes.length === 0) { toast.error("Select at least one document type"); return; }
    createDocRequest.mutate({ registrationId, documentTypes: docTypes, message: docMessage }, {
      onSuccess: () => { toast.success("Document upload link sent"); setShowDocRequest(false); setDocTypes([]); setDocMessage(""); },
    });
  };

  const copyUploadLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/upload/${token}`);
    toast.success("Upload link copied to clipboard");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case "flagged": return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
      case "not_applicable": return <Ban className="w-3.5 h-3.5 text-muted-foreground" />;
      default: return <Clock className="w-3.5 h-3.5 text-warning" />;
    }
  };

  const DOC_TYPE_OPTIONS = [
    "ID Document", "Qualification Certificate", "Police Clearance", "CV / Resume",
    "Professional Registration", "Proof of Address", "Reference Letter", "Contract",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl shadow-lg border border-border w-full max-w-[720px] mx-4 max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> Staff Verification
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verifying <span className="font-semibold text-foreground">{staffName}</span>
              </p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors text-xs">✕</button>
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Verification Progress</span>
              <span className="font-semibold text-foreground">{summary.passedChecks}/{summary.totalChecks} checks passed ({summary.progress}%)</span>
            </div>
            <Progress value={summary.progress} className="h-2" />
            {summary.allPassed && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20 mt-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-success">All required checks passed — ready for approval</span>
              </div>
            )}
          </div>
        </div>

        {/* Checklist Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {STAFF_CHECKLIST_SECTIONS.map(section => {
            const sectionData = summary.sections.find(s => s.key === section.key);
            const sectionItems = items?.filter(i => i.section === section.key) || [];
            const isExpanded = expandedSections.includes(section.key);
            const pendingCount = sectionItems.filter(i => i.status === "pending").length;

            return (
              <div key={section.key} className="rounded-xl border border-border overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{section.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{section.label}</span>
                    {sectionData?.complete && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                    {(sectionData?.failed ?? 0) > 0 && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{sectionData?.passed ?? 0}/{sectionData?.total ?? 0}</span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Items */}
                {isExpanded && (
                  <div className="divide-y divide-border/50">
                    {sectionItems.map(item => {
                      const sc = CHECK_STATUS_CONFIG[item.status] || CHECK_STATUS_CONFIG.pending;
                      return (
                        <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/10 transition-colors">
                          {statusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-foreground">{item.check_label}</span>
                              {item.is_required && <span className="text-[9px] text-destructive">*</span>}
                            </div>
                            {item.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{item.notes}</p>}
                          </div>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", sc.color)}>{sc.label}</span>
                          {item.status === "pending" && (
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-success hover:bg-success/10" onClick={() => handleStatusChange(item, "passed")}>Pass</Button>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange(item, "failed")}>Fail</Button>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-orange-500 hover:bg-orange-500/10" onClick={() => handleStatusChange(item, "flagged")}>Flag</Button>
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setNoteItemId(item.id)}>
                                <FileText className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Batch actions */}
                    {pendingCount > 0 && (
                      <div className="px-4 py-2 bg-secondary/20 flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => handleBatchPass(section.key)}>
                          <CheckCircle2 className="w-3 h-3" /> Pass All Pending ({pendingCount})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes input */}
          {noteItemId && (
            <div className="rounded-xl border border-border p-4 space-y-2 bg-secondary/20">
              <Label className="text-xs">Add verification note</Label>
              <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Enter notes..." className="text-xs h-16" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setNoteItemId(null); setNoteText(""); }}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Document Upload Link Section */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setShowDocRequest(!showDocRequest)}
              className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Send Document Upload Link</span>
              </div>
              {showDocRequest ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {showDocRequest && (
              <div className="px-4 py-3 space-y-3 border-t border-border">
                <p className="text-[11px] text-muted-foreground">
                  Generate a secure upload link for the staff member to submit missing documents directly into the system.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Required Documents</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DOC_TYPE_OPTIONS.map(dt => (
                      <button
                        key={dt}
                        onClick={() => setDocTypes(prev => prev.includes(dt) ? prev.filter(d => d !== dt) : [...prev, dt])}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
                          docTypes.includes(dt)
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary text-muted-foreground border-border hover:border-primary/20"
                        )}
                      >
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Message to staff (optional)</Label>
                  <Textarea value={docMessage} onChange={e => setDocMessage(e.target.value)} placeholder="Please upload your..." className="text-xs h-14" />
                </div>
                <Button size="sm" className="gap-1.5 text-xs" onClick={handleSendDocRequest} disabled={createDocRequest.isPending}>
                  <Send className="w-3 h-3" /> {createDocRequest.isPending ? "Sending..." : "Generate & Send Link"}
                </Button>
              </div>
            )}
          </div>

          {/* Existing document requests */}
          {docRequests && docRequests.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-secondary/30">
                <span className="text-xs font-semibold text-foreground">Document Upload Links ({docRequests.length})</span>
              </div>
              <div className="divide-y divide-border/50">
                {docRequests.map(dr => (
                  <div key={dr.id} className="px-4 py-2.5 flex items-center gap-3">
                    <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-foreground truncate">{dr.document_types.join(", ")}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {dr.status === "fulfilled" ? "Fulfilled" : dr.status === "expired" ? "Expired" : `Expires ${new Date(dr.expires_at).toLocaleDateString("en-ZA")}`}
                      </p>
                    </div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium",
                      dr.status === "fulfilled" ? "bg-success/10 text-success border-success/20" :
                      dr.status === "expired" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-warning/10 text-warning border-warning/20"
                    )}>
                      {dr.status}
                    </span>
                    {dr.status === "pending" && (
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]" onClick={() => copyUploadLink(dr.secure_upload_token)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
          <Button variant="ghost" className="text-xs" onClick={onClose}>Close</Button>
          {summary.allPassed && onVerificationComplete && (
            <Button className="text-xs gap-1.5" onClick={onVerificationComplete}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete Verification & Approve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
