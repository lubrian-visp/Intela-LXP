import { CheckSquare, Clock, Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { useApprovalTasks, useUpdateApprovalTask, useRealtimeSync } from "@/hooks/useCoreData";
import ExportButton from "@/components/ExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCanApproveProgramme, useTransitionProgramme, useLogLifecycleAction } from "@/hooks/useProgrammeLifecycle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCreateNotification } from "@/hooks/useNotifications";

function ApprovalActionCell({ task }: { task: any }) {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const { data: canApprove } = useCanApproveProgramme(
    task.reference_table === "programmes" ? task.reference_id : undefined
  );
  const updateTask = useUpdateApprovalTask();
  const transition = useTransitionProgramme();
  const logAction = useLogLifecycleAction();
  const createNotification = useCreateNotification();

  const [action, setAction] = useState<"approved" | "rejected" | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (task.status !== "pending") return null;

  const primaryRole = roles[0] ?? "unknown";

  const handleConfirm = async () => {
    if (!action || !user) return;
    setLoading(true);
    try {
      // 1. Update the approval task
      await updateTask.mutateAsync({
        id: task.id,
        status: action,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        notes: notes || null,
      });

      // 2. Transition the programme status
      if (task.reference_table === "programmes") {
        const newStatus = action === "approved" ? "approved" : "rejected";
        await transition.mutateAsync({
          id: task.reference_id,
          status: newStatus,
          reason: notes || undefined,
          previousStatus: "pending_approval",
          roleAtAction: primaryRole,
        });
      }

      toast.success(`Task ${action} successfully`);

      // Notify the submitter
      if (task.requested_by) {
        createNotification.mutate({
          user_id: task.requested_by,
          title: `Programme ${action}: ${task.title?.replace("Approve Programme: ", "")}`,
          body: action === "approved"
            ? "Your programme submission has been approved."
            : `Your programme was rejected. ${notes ? `Reason: ${notes}` : ""}`,
          category: "approval",
          reference_table: task.reference_table,
          reference_id: task.reference_id,
          action_url: task.reference_table === "programmes" ? `/programmes/${task.reference_id}/builder` : undefined,
        });
      }

      setAction(null);
      setNotes("");
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} task`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {task.reference_table === "programmes" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/programmes/${task.reference_id}/builder`)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View
          </Button>
        )}
        {canApprove && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-success hover:text-success hover:bg-success/10"
              onClick={() => setAction("approved")}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setAction("rejected")}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
            </Button>
          </>
        )}
      </div>

      <Dialog open={!!action} onOpenChange={() => { setAction(null); setNotes(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "approved" ? "Approve" : "Reject"} Task
            </DialogTitle>
            <DialogDescription>
              {action === "approved"
                ? "Confirm approval for this programme. This will move it to Approved status."
                : "Provide a reason for rejection. The programme will return to Rejected status."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{task.title}</p>
            <Textarea
              placeholder={action === "rejected" ? "Reason for rejection (required)..." : "Notes (optional)..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setNotes(""); }}>
              Cancel
            </Button>
            <Button
              variant={action === "approved" ? "default" : "destructive"}
              onClick={handleConfirm}
              disabled={loading || (action === "rejected" && !notes.trim())}
            >
              {loading ? "Processing..." : action === "approved" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ApprovalQueue() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: tasks = [], isLoading } = useApprovalTasks();

  useRealtimeSync(["approval_tasks", "programmes", "notifications"]);
  const filtered = (tasks as any[]).filter((t: any) => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = (tasks as any[]).filter((t: any) => t.status === "pending").length;

  const statusStyle: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Approval Queue</h1>
            <p className="text-sm text-muted-foreground">Review and action pending approvals.</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                {pendingCount} pending
              </Badge>
            )}
            <ExportButton
              data={filtered.map((t: any) => ({
                title: t.title,
                type: t.task_type?.replace(/_/g, " "),
                status: t.status,
                created: format(new Date(t.created_at), "MMM dd, yyyy"),
              }))}
              filename="approval-queue-export"
              columns={[
                { key: "title", label: "Task" },
                { key: "type", label: "Type" },
                { key: "status", label: "Status" },
                { key: "created", label: "Created" },
              ]}
            />
          </div>
        </div>
      </FadeIn>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search approvals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              className="h-8 text-xs capitalize"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {statusFilter === "pending" ? "No pending approvals." : "No approvals found."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Task</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Type</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Created</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((t: any) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground capitalize">{t.task_type?.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium capitalize", statusStyle[t.status] ?? "bg-secondary text-muted-foreground")}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM dd, yyyy")}</td>
                    <td className="px-5 py-3 text-right">
                      <ApprovalActionCell task={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
