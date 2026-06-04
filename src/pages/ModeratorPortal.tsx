import { useState } from "react";
import {
  Shield, CheckCircle2, Clock,
  Search, Eye, Flag,
  ThumbsUp, ThumbsDown, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useModerationItems, useUpdateModerationItem, useRealtimeSync } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ModerationReviewDialog } from "@/components/moderation/ModerationReviewDialog";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  under_review: "Under Review",
};

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  escalated: "bg-accent/10 text-accent-foreground",
  under_review: "bg-info/10 text-info",
};

const priorityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted-foreground/10 text-muted-foreground",
};

export default function ModeratorPortal() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [reviewItem, setReviewItem] = useState<any>(null);

  const { data: items = [], isLoading } = useModerationItems();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const updateItem = useUpdateModerationItem();
  const { user } = useAuth();

  useRealtimeSync(["moderation_items", "notifications"]);

  const filtered = items.filter((item: any) => {
    if (item.submitted_by === user?.id) return false;
    const matchesSearch = item.content?.toLowerCase().includes(search.toLowerCase()) || item.reason?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pendingCount = items.filter((i: any) => i.status === "pending").length;
  const resolvedCount = items.filter((i: any) => ["approved", "rejected"].includes(i.status)).length;
  const flaggedCount = items.filter((i: any) => i.priority === "high").length;

  const stats = [
    { label: "Pending Reviews", value: String(pendingCount), icon: Clock },
    { label: "Resolved", value: String(resolvedCount), icon: CheckCircle2 },
    { label: "High Priority", value: String(flaggedCount), icon: Flag },
    { label: "Total Items", value: String(items.length), icon: BarChart3 },
  ];

  const handleReviewSubmit = (data: { id: string; status: "approved" | "rejected"; moderation_feedback: string; rejection_category?: string; review_notes?: string }) => {
    updateItem.mutate(
      {
        id: data.id,
        status: data.status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        moderation_feedback: data.moderation_feedback,
        rejection_category: data.rejection_category,
        review_notes: data.review_notes,
      },
      {
        onSuccess: () => {
          toast.success(`Item ${data.status} with feedback`);
          setReviewItem(null);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Moderator Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Review flagged content, manage reports, and enforce community standards.</p>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Calendar Widget */}
      <CalendarWidget events={calendarEvents} maxItems={3} />

      {/* Moderation Queue */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Moderation Queue</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{filtered.length} items</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-44" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading moderation queue…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No moderation items found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider max-w-[280px]">Content</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((item: any) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">{item.item_type?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{(item as any).programmes?.title ?? "—"}</td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{item.reason}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", priorityStyles[item.priority])}>{item.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusStyles[item.status])}>{statusLabels[item.status] ?? item.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {item.status === "pending" || item.status === "under_review" ? (
                          <button
                            onClick={() => setReviewItem(item)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors flex items-center gap-1 text-[10px] font-medium"
                            title="Review"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </button>
                        ) : item.moderation_feedback ? (
                          <button
                            onClick={() => setReviewItem(item)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                            title="View feedback"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      {reviewItem && (
        <ModerationReviewDialog
          open={!!reviewItem}
          onOpenChange={(open) => { if (!open) setReviewItem(null); }}
          item={reviewItem}
          onSubmit={handleReviewSubmit}
          isLoading={updateItem.isPending}
        />
      )}
    </div>
  );
}
