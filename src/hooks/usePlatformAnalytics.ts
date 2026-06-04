import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface PlatformAnalyticsRow {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  status: string;
  subscription_tier: string;
  max_users: number | null;
  max_programmes: number | null;
  active_members: number;
  pending_invitations: number;
  custom_domains: number;
  verified_domains: number;
  total_programmes: number;
  active_programmes: number;
  total_enrolments: number;
  active_enrolments: number;
  submissions_30d: number;
  created_at: string;
  health_score: number;
}

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_platform_analytics");
      if (error) throw error;
      return (data ?? []) as PlatformAnalyticsRow[];
    },
    staleTime: 60_000,
  });
}
