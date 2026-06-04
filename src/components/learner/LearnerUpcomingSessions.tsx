import { Calendar, Clock, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isFuture } from "date-fns";
import { cn } from "@/lib/utils";

export default function LearnerUpcomingSessions() {
  const { user } = useAuth();

  const { data: sessions = [] } = useQuery({
    queryKey: ["learner-upcoming-sessions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("session_attendance")
        .select("*, training_sessions(*)")
        .eq("learner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []).filter((a: any) => a.training_sessions && isFuture(new Date(a.training_sessions.scheduled_start)));
    },
  });

  if (sessions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Video className="w-4 h-4 text-info" /> Upcoming Sessions
      </h3>
      <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border/50">
        {sessions.slice(0, 3).map((att: any) => {
          const s = att.training_sessions;
          return (
            <div key={att.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-info" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{s.title}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(s.scheduled_start), "MMM dd · HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
