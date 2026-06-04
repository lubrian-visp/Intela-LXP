import { useState } from "react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarView from "@/components/calendar/CalendarView";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { format, isBefore, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_CATEGORIES = [
  { key: "session", label: "Training Sessions", color: "bg-info" },
  { key: "assessment", label: "Assessment Due", color: "bg-warning" },
  { key: "mentor_session", label: "Mentor Sessions", color: "bg-accent" },
  { key: "goal", label: "Goal Targets", color: "bg-primary" },
  { key: "cohort", label: "Cohort Dates", color: "bg-success" },
  { key: "milestone", label: "Milestones", color: "bg-destructive" },
];

export default function CalendarPage() {
  const { data: events = [], isLoading } = useCalendarEvents();
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    new Set(EVENT_CATEGORIES.map(c => c.key))
  );

  const toggleCategory = (key: string) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filteredEvents = events.filter(e => enabledCategories.has(e.type));
  const upcomingEvents = events
    .filter(e => !isBefore(startOfDay(e.date), startOfDay(new Date())))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground">View all sessions, assessments, goals, and milestones in one place.</p>
      </FadeIn>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Upcoming Events */}
          <div className="bg-card rounded-lg border border-border/50 shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
            </div>
            <div className="divide-y divide-border/30">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded" />)}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">No upcoming events.</p>
              ) : (
                upcomingEvents.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                      <p className="text-[11px] text-muted-foreground">{format(ev.date, "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Filter Board */}
          <div className="bg-card rounded-lg border border-border/50 shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Filter Board</h3>
            </div>
            <div className="p-4 space-y-2.5">
              {EVENT_CATEGORIES.map(cat => (
                <label key={cat.key} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={enabledCategories.has(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                    className="rounded border-border text-primary focus:ring-primary/30 h-4 w-4"
                  />
                  <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0", cat.color)} />
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calendar Grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <Skeleton className="h-[560px] rounded-lg" />
          ) : (
            <CalendarView events={filteredEvents} view="month" />
          )}
        </div>
      </div>
    </div>
  );
}
