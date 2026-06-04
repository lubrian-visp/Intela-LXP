import { useMemo } from "react";
import { Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { isAfter, startOfDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

const typeDots: Record<string, string> = {
  session: "bg-info",
  assessment: "bg-warning",
  goal: "bg-primary",
  mentor_session: "bg-accent",
  cohort: "bg-success",
  milestone: "bg-muted-foreground",
};

interface CalendarWidgetProps {
  events: CalendarEvent[];
  maxItems?: number;
  className?: string;
}

export default function CalendarWidget({ events, maxItems = 5, className }: CalendarWidgetProps) {
  const navigate = useNavigate();

  const upcoming = useMemo(() => {
    const now = startOfDay(new Date());
    return events
      .filter(e => isAfter(e.date, now) || format(e.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"))
      .slice(0, maxItems);
  }, [events, maxItems]);

  return (
    <div className={cn("bg-card rounded-xl shadow-card border border-border/50", className)}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
        </div>
        <button
          onClick={() => navigate("/calendar")}
          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
        >
          View Calendar <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {upcoming.length === 0 ? (
          <div className="p-6 text-center">
            <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">No upcoming events</p>
          </div>
        ) : (
          upcoming.map(ev => (
            <div key={ev.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
              <div className="text-center w-10 shrink-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">{format(ev.date, "MMM")}</p>
                <p className="text-lg font-bold text-foreground leading-none">{format(ev.date, "d")}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", typeDots[ev.type] || "bg-muted-foreground")} />
                  <span className="text-[10px] text-muted-foreground capitalize">{ev.type.replace("_", " ")}</span>
                  <span className="text-[10px] text-muted-foreground">· {format(ev.date, "h:mm a")}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
