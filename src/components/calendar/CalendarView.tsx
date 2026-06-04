import { useState, useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, addMonths, subMonths,
  addWeeks, subWeeks, startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Video, Target, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

const typeIcons: Record<string, typeof CalendarIcon> = {
  session: Video,
  assessment: BookOpen,
  goal: Target,
  mentor_session: Clock,
  cohort: Users,
  milestone: CalendarIcon,
};

const typeLabels: Record<string, string> = {
  session: "Training Session",
  assessment: "Assessment Due",
  goal: "Goal Target",
  mentor_session: "Mentor Session",
  cohort: "Cohort",
  milestone: "Milestone",
};

interface CalendarViewProps {
  events: CalendarEvent[];
  view?: "month" | "week";
  compact?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

export default function CalendarView({ events, view: initialView = "month", compact = false, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(initialView);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  const eventsForDay = (day: Date) =>
    events.filter(e => isSameDay(e.date, day));

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  return (
    <div className={cn("bg-card rounded-lg shadow-sm border border-border/50", compact && "text-xs")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>
            Today
          </Button>
        </div>
        <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
          {view === "month" ? format(currentDate, "MMMM yyyy") : `Week of ${format(days[0], "MMM d")}`}
        </h3>
        {!compact && (
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("month")} className={cn("px-3 py-1 text-[11px] font-medium transition-colors", view === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>Month</button>
            <button onClick={() => setView("week")} className={cn("px-3 py-1 text-[11px] font-medium transition-colors", view === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>Week</button>
            <button onClick={() => { setView("week"); setSelectedDay(new Date()); setCurrentDate(new Date()); }} className={cn("px-3 py-1 text-[11px] font-medium transition-colors text-muted-foreground hover:bg-secondary")}>Day</button>
          </div>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => (
          <div key={d} className="text-center py-2.5 text-[10px] font-semibold text-muted-foreground tracking-wider">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = eventsForDay(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isCurrentMonth = isSameMonth(day, currentDate);
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "relative border-b border-r border-border/30 transition-colors text-left",
                compact ? "p-1 min-h-[40px]" : "p-1.5 min-h-[72px]",
                !isCurrentMonth && "opacity-40",
                isSelected && "bg-primary/5 ring-1 ring-primary/30",
                isToday(day) && "bg-accent/5",
                "hover:bg-secondary/30"
              )}
            >
              <span className={cn(
                "text-[11px] font-medium leading-none",
                isToday(day) && "bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]",
                !isToday(day) && "text-foreground"
              )}>
                {format(day, "d")}
              </span>
              {!compact && dayEvents.slice(0, 3).map(ev => (
                <div
                  key={ev.id}
                  className="mt-0.5 text-[9px] leading-tight truncate rounded px-1 py-0.5 cursor-pointer"
                  style={{ backgroundColor: ev.color + "20", color: ev.color }}
                  onClick={e => { e.stopPropagation(); onEventClick?.(ev); }}
                >
                  {ev.title}
                </div>
              ))}
              {compact && dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {dayEvents.slice(0, 3).map(ev => (
                    <span key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color }} />
                  ))}
                </div>
              )}
              {dayEvents.length > 3 && !compact && (
                <span className="text-[9px] text-muted-foreground mt-0.5 block">+{dayEvents.length - 3} more</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedEvents.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {format(selectedDay, "EEEE, MMMM d")} — {selectedEvents.length} event{selectedEvents.length > 1 ? "s" : ""}
          </p>
          {selectedEvents.map(ev => {
            const Icon = typeIcons[ev.type] || CalendarIcon;
            return (
              <div
                key={ev.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => onEventClick?.(ev)}
              >
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: ev.color + "15" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: ev.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(ev.date, "h:mm a")} · {typeLabels[ev.type] || ev.type}
                    {ev.status && <span className="capitalize"> · {ev.status}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
