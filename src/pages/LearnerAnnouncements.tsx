import { Bell, Clock, AlertCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const priorityStyle: Record<string, { dot: string; border: string }> = {
  urgent: { dot: "bg-destructive", border: "border-l-destructive" },
  high: { dot: "bg-warning", border: "border-l-warning" },
  normal: { dot: "bg-info", border: "border-l-info" },
  low: { dot: "bg-muted-foreground", border: "border-l-muted-foreground" },
};

export default function LearnerAnnouncements() {
  usePageTitle("Announcements", "Learner Portal");
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["learner-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, priority, published_at, scope_type")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: readIds = [] } = useQuery({
    queryKey: ["announcement-reads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: any) => r.announcement_id);
    },
  });

  const markRead = useMutation({
    mutationFn: async (announcementId: string) => {
      await supabase.from("announcement_reads").insert({ announcement_id: announcementId, user_id: user!.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcement-reads"] }),
  });

  // Auto-mark visible announcements as read
  useEffect(() => {
    if (!user?.id || announcements.length === 0) return;
    const unread = announcements.filter((a: any) => !readIds.includes(a.id));
    unread.forEach((a: any) => markRead.mutate(a.id));
  }, [announcements, readIds, user?.id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Announcements</h1>
        <p className="text-sm text-muted-foreground">Stay up to date with important announcements.</p>
      </FadeIn>

      {announcements.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Announcements</h3>
          <p className="text-xs text-muted-foreground">There are no announcements at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => {
            const ps = priorityStyle[a.priority] ?? priorityStyle.normal;
            const isUnread = !readIds.includes(a.id);
            return (
              <FadeIn key={a.id}>
                <div className={cn(
                  "bg-card rounded-xl shadow-card border border-border/50 border-l-4 p-5 transition-all",
                  ps.border,
                  isUnread && "ring-1 ring-primary/20"
                )}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", ps.dot)} />
                      <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                      {isUnread && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">New</span>}
                    </div>
                    {a.priority === "urgent" && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{a.body}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                    <Clock className="w-3 h-3" />
                    {a.published_at ? format(new Date(a.published_at), "MMM dd, yyyy · HH:mm") : "—"}
                    <span className="capitalize">· {a.scope_type}</span>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
