import { useState } from "react";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Flag,
  ChevronDown, ChevronRight, FileText, Send, Eye,
  ThumbsUp, ThumbsDown, MinusCircle, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { maskNationalId } from "@/lib/privacyUtils";
import { toast } from "sonner";
import {
  useVerificationChecklist,
  useUpdateChecklistItem,
  useChecklistSummary,
  useDocumentRequests,
  useCreateDocumentRequest,
  CHECKLIST_SECTIONS,
  CHECK_STATUS_CONFIG,
  getSLAStatus,
  type ChecklistItem,
} from "@/hooks/useVerificationChecklist";
import { useLearnerDocuments, DOCUMENT_TYPES } from "@/hooks/useLearnerDocuments";
import { useCanApproveRegistration, getAuthorityLabel } from "@/hooks/useApprovalGovernance";
import DocumentVerificationPanel from "./DocumentVerificationPanel";

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  programme_name: string | null;
  programme_id: string | null;
  status: string;
  created_at: string;
  learner_number?: string | null;
  national_id?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  country?: string | null;
  education_level?: string | null;
  sla_started_at?: string | null;
  sla_deadline_at?: string | null;
  sla_paused_at?: string | null;
  sla_breached?: boolean;
  notes?: string | null;
}

interface Props {
  registration: Registration & { registered_by?: string | null };
  open: boolean;
  onClose: () => void;
  onApprove?: (id: string, reason: string, authoritySource: string) => void;
  onReject?: (id: string, reason: string, authoritySource: string) => void;
  slaAmberPercent?: number;
}

export default function VerificationChecklistDialog({
  registration,
  open,
  onClose,
  onApprove,
  onReject,
  slaAmberPercent = 75,
}: Props) {
  const { sections, allPassed, progress, totalChecks, passedChecks } = useChecklistSummary(registration.id);
  const { data: documents = [] } = useLearnerDocuments(registration.id);
  const { data: docRequests = [] } = useDocumentRequests(registration.id);
  const updateItem = useUpdateChecklistItem();
  const createDocRequest = useCreateDocumentRequest();
  const approvalAuth = useCanApproveRegistration(
    registration.id,
    (registration as any).registered_by,
    registration.programme_id
  );

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(CHECKLIST_SECTIONS.map(s => s.key)));
  const [activeTab, setActiveTab] = useState<"checklist" | "documents" | "requests">("checklist");
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [approveReason, setApproveReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Document request state
  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [requestDocTypes, setRequestDocTypes] = useState<string[]>([]);
  const [requestMessage, setRequestMessage] = useState("");

  const slaStatus = getSLAStatus(registration, slaAmberPercent);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleUpdateItem = (item: ChecklistItem, status: "passed" | "failed" | "flagged" | "not_applicable") => {
    updateItem.mutate({
      itemId: item.id,
      registrationId: registration.id,
      status,
      notes: itemNotes[item.id] || undefined,
    }, {
      onSuccess: () => toast.success(`${item.check_label}: ${status}`),
      onError: () => toast.error("Failed to update check"),
    });
  };

  const handleRequestDocuments = () => {
    if (requestDocTypes.length === 0) {
      toast.error("Select at least one document type.");
      return;
    }
    createDocRequest.mutate({
      registrationId: registration.id,
      documentTypes: requestDocTypes,
      message: requestMessage || undefined,
    }, {
      onSuccess: () => {
        toast.success("Document request sent. Registration returned for revision.");
        setShowRequestDocs(false);
        setRequestDocTypes([]);
        setRequestMessage("");
      },
      onError: () => toast.error("Failed to create request"),
    });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
      case "flagged": return <Flag className="w-4 h-4 text-orange-500" />;
      case "not_applicable": return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
      default: return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const slaColorClass = slaStatus.color === "green" ? "text-success" :
    slaStatus.color === "amber" ? "text-warning" :
    slaStatus.color === "red" ? "text-destructive" : "text-muted-foreground";

  const tabs = [
    { key: "checklist" as const, label: "Verification Checklist" },
    { key: "documents" as const, label: `Documents (${documents.length})` },
    { key: "requests" as const, label: `Requests (${docRequests.length})` },
  ];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            Verification: {registration.full_name}
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", slaColorClass,
              slaStatus.color === "green" ? "bg-success/10 border-success/20" :
              slaStatus.color === "amber" ? "bg-warning/10 border-warning/20" :
              slaStatus.color === "red" ? "bg-destructive/10 border-destructive/20" :
              "bg-muted border-border"
            )}>
              {slaStatus.label}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {registration.learner_number && <span className="font-mono font-semibold text-foreground mr-2">{registration.learner_number}</span>}
            {registration.email} • {registration.programme_name || "No programme"} • Submitted {new Date(registration.created_at).toLocaleDateString("en-ZA")}
          </DialogDescription>
        </DialogHeader>

        {/* Learner Profile Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <div><p className="text-[10px] text-muted-foreground">Full Name</p><p className="text-xs font-medium text-foreground">{registration.full_name}</p></div>
          <div><p className="text-[10px] text-muted-foreground">National ID</p><p className="text-xs font-medium text-foreground font-mono tracking-wider">{maskNationalId(registration.national_id)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Date of Birth</p><p className="text-xs font-medium text-foreground">{registration.date_of_birth || "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Country</p><p className="text-xs font-medium text-foreground">{registration.country || "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Gender</p><p className="text-xs font-medium text-foreground">{registration.gender || "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Education</p><p className="text-xs font-medium text-foreground">{registration.education_level || "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Phone</p><p className="text-xs font-medium text-foreground">{registration.phone || "—"}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Programme</p><p className="text-xs font-medium text-foreground">{registration.programme_name || "—"}</p></div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Verification Progress</p>
            <p className="text-xs text-muted-foreground">{passedChecks}/{totalChecks} checks ({progress}%)</p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1",
                activeTab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Checklist Tab */}
        {activeTab === "checklist" && (
          <div className="space-y-3">
            {sections.map(section => (
              <div key={section.key} className="border border-border/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{section.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{section.label}</span>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      section.complete ? "bg-success/10 text-success border-success/20" :
                      section.failed > 0 ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-warning/10 text-warning border-warning/20"
                    )}>
                      {section.passed}/{section.total}
                    </span>
                  </div>
                  {expandedSections.has(section.key)
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  }
                </button>

                {expandedSections.has(section.key) && (
                  <div className="divide-y divide-border/30">
                    {section.items.map(item => (
                      <div key={item.id} className="px-4 py-2.5 flex items-start gap-3">
                        <div className="mt-0.5">{statusIcon(item.status)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{item.check_label}</p>
                          {item.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{item.notes}</p>}
                          {item.verified_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Verified {new Date(item.verified_at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}

                          {/* Notes input for pending items */}
                          {item.status === "pending" && (
                            <div className="mt-2">
                              <Textarea
                                placeholder="Notes (optional)..."
                                value={itemNotes[item.id] || ""}
                                onChange={e => setItemNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="text-[10px] h-12 min-h-0"
                              />
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {item.status === "pending" && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:bg-success/10"
                              onClick={() => handleUpdateItem(item, "passed")} title="Pass">
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleUpdateItem(item, "failed")} title="Fail">
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-500/10"
                              onClick={() => handleUpdateItem(item, "flagged")} title="Flag for Review">
                              <Flag className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted"
                              onClick={() => handleUpdateItem(item, "not_applicable")} title="Not Applicable">
                              <MinusCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {/* Reset for non-pending */}
                        {item.status !== "pending" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground"
                            onClick={() => {
                              updateItem.mutate({
                                itemId: item.id,
                                registrationId: registration.id,
                                status: "passed", // Re-evaluate
                                notes: "Re-verified",
                              });
                            }}>
                            Re-verify
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <DocumentVerificationPanel
            registrationId={registration.id}
            learnerName={registration.full_name}
          />
        )}

        {/* Document Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Document Requests</p>
              <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowRequestDocs(true)}>
                <Send className="w-3 h-3" /> Request Documents
              </Button>
            </div>

            {docRequests.length === 0 ? (
              <div className="p-8 text-center bg-secondary/20 rounded-lg border border-border/30">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No document requests sent yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {docRequests.map(req => (
                  <div key={req.id} className="p-3 bg-secondary/20 rounded-lg border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        req.status === "fulfilled" ? "bg-success/10 text-success border-success/20" :
                        req.status === "expired" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {req.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("en-ZA")}
                      </span>
                    </div>
                    <p className="text-xs text-foreground">
                      Requested: {req.document_types.map(t => DOCUMENT_TYPES.find(d => d.value === t)?.label || t).join(", ")}
                    </p>
                    {req.message && <p className="text-[10px] text-muted-foreground mt-1">{req.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Expires: {new Date(req.expires_at).toLocaleDateString("en-ZA")} • Reminders sent: {req.reminder_count}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Governance Banner */}
        {!approvalAuth.canApprove && approvalAuth.reason && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">{approvalAuth.reason}</p>
          </div>
        )}
        {approvalAuth.canApprove && approvalAuth.authoritySource && (
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
            <p className="text-[11px] text-success">Authority: <strong>{getAuthorityLabel(approvalAuth.authoritySource)}</strong></p>
          </div>
        )}

        {/* Footer Controls */}
        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2 flex-1">
            {!showApproveConfirm && !showRejectConfirm ? (
              <>
                <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowRequestDocs(true)}>
                  <Send className="w-3 h-3" /> Request Docs
                </Button>
                <div className="flex-1" />
                {onReject && (
                  <Button size="sm" variant="destructive" className="gap-1"
                    disabled={!approvalAuth.canApprove}
                    onClick={() => setShowRejectConfirm(true)}>
                    <XCircle className="w-3 h-3" /> Reject
                  </Button>
                )}
                {onApprove && (
                  <Button size="sm" className="gap-1 bg-success text-success-foreground"
                    disabled={!allPassed || !approvalAuth.canApprove}
                    onClick={() => setShowApproveConfirm(true)}>
                    <CheckCircle2 className="w-3 h-3" /> Approve
                    {!allPassed && <span className="text-[10px] ml-1">({passedChecks}/{totalChecks})</span>}
                  </Button>
                )}
              </>
            ) : showApproveConfirm ? (
              <div className="w-full space-y-2">
                <Label className="text-xs">Approval Notes (required)</Label>
                <Textarea value={approveReason} onChange={e => setApproveReason(e.target.value)}
                  placeholder="Confirm all checks completed and learner is approved..." className="text-xs" />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setShowApproveConfirm(false); setApproveReason(""); }}>Cancel</Button>
                  <Button size="sm" className="bg-success text-success-foreground" disabled={!approveReason.trim()}
                    onClick={() => { onApprove?.(registration.id, approveReason, getAuthorityLabel(approvalAuth.authoritySource)); onClose(); }}>
                    Confirm Approval
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <Label className="text-xs">Rejection Reason (required)</Label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Provide a detailed reason for rejection..." className="text-xs" />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setShowRejectConfirm(false); setRejectReason(""); }}>Cancel</Button>
                  <Button size="sm" variant="destructive" disabled={!rejectReason.trim()}
                    onClick={() => { onReject?.(registration.id, rejectReason, getAuthorityLabel(approvalAuth.authoritySource)); onClose(); }}>
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogFooter>

        {/* Request Documents Sub-dialog */}
        <Dialog open={showRequestDocs} onOpenChange={setShowRequestDocs}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm">Request Missing Documents</DialogTitle>
              <DialogDescription className="text-xs">
                Select the documents needed from {registration.full_name}. A secure upload link will be generated.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                {DOCUMENT_TYPES.map(dt => (
                  <label key={dt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={requestDocTypes.includes(dt.value)}
                      onCheckedChange={(checked) => {
                        setRequestDocTypes(prev =>
                          checked ? [...prev, dt.value] : prev.filter(t => t !== dt.value)
                        );
                      }}
                    />
                    <span className="text-xs">{dt.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message to Learner (optional)</Label>
                <Textarea
                  value={requestMessage}
                  onChange={e => setRequestMessage(e.target.value)}
                  placeholder="Additional instructions for the learner..."
                  className="text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setShowRequestDocs(false)}>Cancel</Button>
              <Button size="sm" disabled={requestDocTypes.length === 0 || createDocRequest.isPending}
                onClick={handleRequestDocuments}>
                {createDocRequest.isPending ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
