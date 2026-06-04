import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface WbtAnalyticsSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalApplications: number;
  totalCredentialsIssued: number;
  averageMentorRating: number;
  projectsByStatus: { status: string; count: number }[];
  projectsByFramework: { framework: string; count: number }[];
  topMentors: { user_id: string; rating_average: number; total_projects_completed: number }[];
  recentCompletions: any[];
}

export function useWbtAnalytics() {
  return useQuery({
    queryKey: ["wbt-analytics"],
    queryFn: async () => {
      const [projectsRes, appsRes, credsRes, ratingsRes, mentorsRes] = await Promise.all([
        db.from("wbt_projects").select("id, status, agile_framework, payment_model, created_at, updated_at"),
        db.from("wbt_project_applications").select("id, status, project_id"),
        db.from("wbt_project_credentials").select("id, project_id, learner_id, completion_date"),
        db.from("wbt_mentor_ratings").select("overall_rating"),
        db.from("wbt_mentor_profiles").select("user_id, rating_average, total_projects_completed").order("rating_average", { ascending: false }).limit(10),
      ]);

      const projects = projectsRes.data || [];
      const apps = appsRes.data || [];
      const creds = credsRes.data || [];
      const ratings = ratingsRes.data || [];
      const mentors = mentorsRes.data || [];

      const statusCounts: Record<string, number> = {};
      const frameworkCounts: Record<string, number> = {};
      let activeCount = 0;
      let completedCount = 0;

      projects.forEach((p: any) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        frameworkCounts[p.agile_framework] = (frameworkCounts[p.agile_framework] || 0) + 1;
        if (p.status === 'in_progress' || p.status === 'published') activeCount++;
        if (p.status === 'completed') completedCount++;
      });

      const avgRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) / ratings.length
        : 0;

      return {
        totalProjects: projects.length,
        activeProjects: activeCount,
        completedProjects: completedCount,
        totalApplications: apps.length,
        totalCredentialsIssued: creds.length,
        averageMentorRating: Math.round(avgRating * 10) / 10,
        projectsByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        projectsByFramework: Object.entries(frameworkCounts).map(([framework, count]) => ({ framework, count })),
        topMentors: mentors,
        recentCompletions: creds.slice(0, 10),
      } as WbtAnalyticsSummary;
    },
  });
}

export function useWbtMentorSuggestions(projectId: string | undefined) {
  return useQuery({
    queryKey: ["wbt-mentor-suggestions", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.rpc("wbt_suggest_mentors", { _project_id: projectId, _limit: 5 });
      if (error) throw error;
      return data as { user_id: string; match_score: number; skills: string[]; current_projects: number; rating_average: number }[];
    },
  });
}

export function useWbtMentorProfiles() {
  return useQuery({
    queryKey: ["wbt-mentor-profiles"],
    queryFn: async () => {
      const { data, error } = await db.from("wbt_mentor_profiles").select("*").order("rating_average", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}
