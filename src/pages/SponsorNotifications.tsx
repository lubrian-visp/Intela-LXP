import { useState } from "react";
import { Bell, Check, CheckCheck, Clock, Filter } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useSponsorNotifications } from "@/hooks/useSponsorData";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const categoryStyles: Record<string, { label: string; color: string }> = {
  general: { label: "General", color: "bg-primary/10 text-primary" },
  approval: { label: "Approval", color: "bg-warning/10 text-warning" },
  submission: { label: "Assessment", color: "bg-info/10 text-info" },
  system: { label: "System", color: "bg-muted text-muted-foreground" },
};

export default function SponsorNotifications() {
  const { data: notifications = [], isLoading } = useSponsorNotifications();
  const [filter, setFilter] = useState<string>("all");
  const qc = useQueryClient();

  const filtered = filter === "all"
    ? notifications
    : filter === "unread"
      ? notifications.filter(n => !n.is_read)
      : notifications.filter(n => n.category === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sponsor_notifications"] });
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    await Promise.all(unread.map(n => supabase.from("notifications").update({ is_read: true }).eq("id", n.id)));
    qc.invalidateQueries({ queryKey: ["sponsor_notifications"] });
    toast.success(`${unread.length} notifications marked as read`);
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Milestone alerts, learner updates, and compliance deadlines.</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </FadeIn>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {["all", "unread", "general", "approval", "submission"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-[11px] px-3 py-1 rounded-full font-medium transition-colors capitalize",
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            )}
          >
            {f === "all" ? "All" : f === "unread" ? `Unread (${unreadCount})` : categoryStyles[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden divide-y divide-border/50">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications found.</p>
          </div>
        ) : (
          filtered.map(n => {
            const cat = categoryStyles[n.category] ?? categoryStyles.general;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={cn(
                  "px-5 py-4 flex items-start gap-4 hover:bg-secondary/20 transition-colors cursor-pointer",
                  !n.is_read && "bg-primary/[0.03]"
                )}
              >
                <div className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0", n.is_read ? "bg-transparent" : "bg-primary")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", cat.color)}>{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                </div>
                {n.is_read && <Check className="w-3.5 h-3.5 text-success shrink-0 mt-1" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
