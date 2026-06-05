/**
 * ApproveEnrolDialog
 * The gateway action that moves a learner from Repository → Directory.
 * Approval and cohort enrolment happen atomically — one action, no limbo.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GraduationCap, Users, CheckCircle2, AlertTriangle,
  Layers, Zap, UserCheck, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useApproveAndEnrol } from "@/hooks/useLearnerLifecycle";
import { useCohorts } from "@/hooks/useCoreData";
import { useAutoAssignCohort, useCohortAssignmentMode } from "@/hooks/useCohortAssignment";
import { toast } from "sonner";

interface Registration {
  id: string;
  full_name: string;
  email: string;
  programme_id: string | null;
  programme_name: string | null;
  status: string;
  registration_method?: string;
  [key: string]: any;
}

interface Props {
  registration: Registration | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ── Role hierarchy labels ─────────────────────────────────────────────────────
const ROLE_AUTHORITY: Record<string, { label: string; level: number; color: string }> = {
  super_admin:       { label: "Super Admin",        level: 5, color: "bg-red-500/10 text-red-600 border-red-500/20" },
  systems_admin:     { label: "Systems Admin",       level: 4, color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  operations:        { label: "Operations Control",  level: 3, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  programme_manager: { label: "Programme Manager",   level: 2, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const ALLOWED_ROLES = Object.keys(ROLE_AUTHORITY);

export default function ApproveEnrolDialog({ registration, open, onOpenChange }: Props) {
  const { user, roles } = useAuth();
  const approveAndEnrol = useApproveAndEnrol();

  const [assignMode, setAssignMode]   = useState<"auto" | "manual">("auto");
  const [cohortId, setCohortId]       = useState("");
  const [reason, setReason]           = useState("");

  const { isAutomatic } = useCohortAssignmentMode();
  const { data: allCohorts = [] }     = useCohorts();
  const { data: autoCohort, isLoading: autoLoading } = useAutoAssignCohort(
    assignMode === "auto" ? registration?.programme_id ?? undefined : undefined
  );

  // Default mode from platform feature flag
  useEffect(() => {
    setAssignMode(isAutomatic ? "auto" : "manual");
  }, [isAutomatic, open]);

  // Auto-fill cohort when auto mode selects one
  useEffect(() => {
    if (assignMode === "auto" && autoCohort) setCohortId(autoCohort.id);
    if (assignMode === "auto" && !autoCohort) setCohortId("");
  }, [assignMode, autoCohort]);

  if (!registration) return null;

  // Role info
  const primaryRole = (roles as string[]).find(r => ALLOWED_ROLES.includes(r));
  const roleInfo    = primaryRole ? ROLE_AUTHORITY[primaryRole] : null;
  const canApprove  = !!roleInfo;

  // Programme cohorts for manual mode
  const programmeCohorts = (allCohorts as any[]).filter(c =>
    c.programme_id === registration.programme_id &&
    (c.status === "active" || c.status === "planned")
  );

  const selectedCohort = (allCohorts as any[]).find(c => c.id === cohortId);
  const isReady = !!cohortId && canApprove;

  const handleSubmit = async () => {
    if (!isReady) return;
    const learnerId = (registration as any).user_id || registration.id;

    await approveAndEnrol.mutateAsync({
      registrationId:  registration.id,
      learnerId,
      cohortId,
      programmeId:     registration.programme_id || "",
      approvalReason:  reason.trim() || undefined,
      authoritySource: primaryRole ?? "manual",
    }, {
      onSuccess: () => {
        toast.success(`${registration.full_name} approved and enrolled in ${selectedCohort?.name ?? "cohort"}.`);
        onOpenChange(false);
        setReason(""); setCohortId("");
      },
      onError: (err: any) => {
        toast.error("Approve & Enrol failed", { description: err?.message ?? "Please try again." });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setReason(""); setCohortId(""); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-green-600" />
            </div>
            Approve & Enrol
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            This action moves the learner from the Repository into the Learner Directory.
            Both approval and cohort enrolment happen together.
          </p>
        </DialogHeader>

        <div className="space-y-4">

          {/* Learner summary */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {registration.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{registration.full_name}</p>
              <p className="text-[11px] text-muted-foreground">{registration.email}</p>
              {registration.programme_name && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <GraduationCap className="w-3 h-3" /> {registration.programme_name}
                </p>
              )}
            </div>
            {roleInfo && (
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                roleInfo.color
              )}>
                {roleInfo.label}
              </span>
            )}
          </div>

          {/* Cannot approve notice */}
          {!canApprove && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/8 border border-destructive/20">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-[11px] text-destructive">
                Your role does not have permission to approve learner registrations.
              </p>
            </div>
          )}

          {/* Cohort assignment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Cohort Assignment <span className="text-destructive">*</span></Label>
              {/* Mode toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-secondary/50 border border-border/50">
                <button type="button"
                  onClick={() => setAssignMode("auto")}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                    assignMode === "auto" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <Zap className="w-3 h-3" /> Auto
                </button>
                <button type="button"
                  onClick={() => setAssignMode("manual")}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
                    assignMode === "manual" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <UserCheck className="w-3 h-3" /> Manual
                </button>
              </div>
            </div>

            {/* Auto mode */}
            {assignMode === "auto" && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                {autoLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Finding best available cohort…</span>
                  </div>
                ) : autoCohort ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-500/5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{(autoCohort as any).name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(autoCohort as any).remainingCapacity} places remaining ·{" "}
                        {(autoCohort as any).start_date
                          ? `Starts ${new Date((autoCohort as any).start_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`
                          : "Date not set"}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 shrink-0">
                      Auto-selected
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-4 py-3 bg-orange-500/5">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-orange-600">No available cohort</p>
                      <p className="text-[11px] text-muted-foreground">
                        All cohorts for this programme are full or unavailable. Switch to Manual to select a specific cohort.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual mode */}
            {assignMode === "manual" && (
              <div className="space-y-2">
                {programmeCohorts.length === 0 ? (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-500/8 border border-orange-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">
                      No active cohorts found for this programme. Create a cohort in Cohort Management first.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/30">
                    {programmeCohorts.map((c: any) => {
                      const selected = cohortId === c.id;
                      return (
                        <button key={c.id} type="button"
                          onClick={() => setCohortId(c.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            selected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-secondary/30"
                          )}>
                          <div className={cn("w-2 h-2 rounded-full shrink-0",
                            c.status === "active" ? "bg-green-500" : "bg-blue-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {c.start_date
                                ? new Date(c.start_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
                                : "No start date"
                              }
                              {c.max_learners && ` · ${c.max_learners} max`}
                            </p>
                          </div>
                          {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Approval notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Approval Notes (optional)</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for approval, special conditions, or notes for the learner file…"
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* What will happen */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p><span className="font-medium text-foreground">{registration.full_name}</span> will be:</p>
              <p>✓ Approved and marked as <strong>Enrolled</strong></p>
              <p>✓ Assigned to <strong>{selectedCohort?.name ?? (assignMode === "auto" && autoCohort ? (autoCohort as any).name : "selected cohort")}</strong></p>
              <p>✓ Moved from the Repository into the <strong>Learner Directory</strong></p>
              <p>✓ Given access to cohort content immediately</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isReady || approveAndEnrol.isPending || (assignMode === "auto" && autoLoading)}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
          >
            {approveAndEnrol.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enrolling…</>
              : <><UserCheck className="w-3.5 h-3.5" /> Approve & Enrol</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
