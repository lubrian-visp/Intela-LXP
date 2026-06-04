import { Bell, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function LearnerRecentAnnouncements() {
  const navigate = useNavigate();

  const { data: announcements = [] } = useQuery({
    queryKey: ["learner-recent-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, priority, published_at, body")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  if (announcements.length === 0) return null;

  const priorityDot: Record<string, string> = {
    urgent: "bg-destructive",
    high: "bg-warning",
    normal: "bg-info",
    low: "bg-muted-foreground",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-warning" /> Announcements
        </h3>
        <button onClick={() => navigate("/learner/announcements")} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="bg-card rounded-xl shadow-card border border-border/50 divide-y divide-border/50">
        {announcements.map((a: any) => (
          <div key={a.id} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[a.priority] ?? priorityDot.normal}`} />
              <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{a.body}</p>
            {a.published_at && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(a.published_at), "MMM dd, yyyy")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
