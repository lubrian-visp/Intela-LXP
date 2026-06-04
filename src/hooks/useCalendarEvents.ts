import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: "session" | "assessment" | "goal" | "mentor_session" | "cohort" | "milestone";
  status?: string;
  color: string;
  meta?: Record<string, any>;
}

export function useCalendarEvents() {
  const { user, roles } = useAuth();

  return useQuery({
    queryKey: ["calendar_events", user?.id, roles],
    enabled: !!user?.id,
    queryFn: async () => {
      const events: CalendarEvent[] = [];

      // 1. Training sessions
      const { data: sessions } = await supabase
        .from("training_sessions")
        .select("id, title, scheduled_start, scheduled_end, status, session_type")
        .order("scheduled_start", { ascending: true });

      (sessions ?? []).forEach(s => {
        if (s.scheduled_start) {
          events.push({
            id: s.id,
            title: s.title,
            date: new Date(s.scheduled_start),
            endDate: s.scheduled_end ? new Date(s.scheduled_end) : undefined,
            type: "session",
            status: s.status,
            color: "hsl(var(--info))",
            meta: { session_type: s.session_type },
          });
        }
      });

      // 2. Assessment due dates
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, title, due_date, assessment_type")
        .not("due_date", "is", null);

      (assessments ?? []).forEach(a => {
        if (a.due_date) {
          events.push({
            id: a.id,
            title: a.title,
            date: new Date(a.due_date),
            type: "assessment",
            color: "hsl(var(--warning))",
            meta: { assessment_type: a.assessment_type },
          });
        }
      });

      // 3. Cohort start/end dates
      const { data: cohorts } = await supabase
        .from("cohorts")
        .select("id, name, start_date, end_date, status");

      (cohorts ?? []).forEach(c => {
        if (c.start_date) {
          events.push({
            id: `${c.id}-start`,
            title: `${c.name} — Start`,
            date: new Date(c.start_date),
            type: "cohort",
            status: c.status,
            color: "hsl(var(--success))",
          });
        }
        if (c.end_date) {
          events.push({
            id: `${c.id}-end`,
            title: `${c.name} — End`,
            date: new Date(c.end_date),
            type: "cohort",
            status: c.status,
            color: "hsl(var(--destructive))",
          });
        }
      });

      // 4. Mentor sessions
      const { data: mentorSessions } = await supabase
        .from("mentor_sessions")
        .select("id, session_type, scheduled_at, duration_minutes, status")
        .or(`mentor_id.eq.${user!.id},mentee_id.eq.${user!.id}`);

      (mentorSessions ?? []).forEach(ms => {
        events.push({
          id: ms.id,
          title: `Mentor ${ms.session_type.replace("_", " ")}`,
          date: new Date(ms.scheduled_at),
          type: "mentor_session",
          status: ms.status,
          color: "hsl(var(--accent))",
          meta: { duration: ms.duration_minutes },
        });
      });

      // 5. Goal target dates
      const { data: goals } = await supabase
        .from("mentor_goals")
        .select("id, title, target_date, status")
        .or(`mentor_id.eq.${user!.id},mentee_id.eq.${user!.id}`)
        .not("target_date", "is", null);

      (goals ?? []).forEach(g => {
        if (g.target_date) {
          events.push({
            id: g.id,
            title: g.title,
            date: new Date(g.target_date),
            type: "goal",
            status: g.status,
            color: "hsl(var(--primary))",
          });
        }
      });

      return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
  });
}
