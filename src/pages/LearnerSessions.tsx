import { Calendar, Clock, Video } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useCoreData";
import { format, isPast, isFuture } from "date-fns";
import { cn } from "@/lib/utils";

export default function LearnerSessions() {
  const { user } = useAuth();
  useRealtimeSync(["training_sessions", "session_attendance", "notifications"]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["learner-sessions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("session_attendance")
        .select("*, training_sessions(*)")
        .eq("learner_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">My Sessions</h1>
        <p className="text-sm text-muted-foreground">Upcoming and past training sessions.</p>
      </FadeIn>

      {sessions.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Sessions</h3>
          <p className="text-xs text-muted-foreground">You don't have any scheduled sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((att: any) => {
            const session = att.training_sessions;
            if (!session) return null;
            const upcoming = isFuture(new Date(session.scheduled_start));
            return (
              <div key={att.id} className="bg-card rounded-xl shadow-card border border-border/50 p-5 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{session.title}</h4>
                    <p className="text-[10px] text-muted-foreground capitalize">{session.session_type}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase",
                    upcoming ? "bg-info/10 text-info" : "bg-secondary text-muted-foreground"
                  )}>
                    {upcoming ? "Upcoming" : "Past"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(session.scheduled_start), "MMM dd, yyyy · HH:mm")}
                  </span>
                  <span className="capitalize">{att.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
