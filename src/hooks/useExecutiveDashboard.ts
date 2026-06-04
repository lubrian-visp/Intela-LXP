import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Executive Dashboard Hook
 *
 * Aggregates cross-role metrics for the unified reporting dashboard:
 * - Financial ROI from sponsor data
 * - Talent pipeline & skills gaps
 * - Programme completion rates
 * - Platform health indicators
 */

interface FinancialMetrics {
  totalRevenue: number;
  totalOutstanding: number;
  overdueInvoices: number;
  quoteConversionRate: number;
  currency: string;
}

interface ProgrammeMetrics {
  totalProgrammes: number;
  activeProgrammes: number;
  averageCompletionRate: number;
  totalEnrolments: number;
  activeEnrolments: number;
  completedEnrolments: number;
}

interface TalentMetrics {
  totalLearners: number;
  activeLearners: number;
  credentialsIssued: number;
  averageAssessmentScore: number;
}

interface PlatformHealth {
  totalUsers: number;
  activeRoles: number;
  pendingApprovals: number;
  slaBreach: number;
}

export interface ExecutiveDashboardData {
  financial: FinancialMetrics;
  programmes: ProgrammeMetrics;
  talent: TalentMetrics;
  health: PlatformHealth;
}

export function useExecutiveDashboard() {
  return useQuery({
    queryKey: ["executive-dashboard"],
    queryFn: async (): Promise<ExecutiveDashboardData> => {
      // Parallel fetch all metrics
      const [
        invoicesRes,
        quotesRes,
        programmesRes,
        enrolmentsRes,
        credentialsRes,
        submissionsRes,
        profilesRes,
        rolesRes,
        approvalsRes,
        slaRes,
      ] = await Promise.all([
        supabase.from("sponsor_invoices").select("amount, status, currency"),
        supabase.from("sponsor_quotes").select("status"),
        supabase.from("programmes").select("id, status"),
        supabase.from("enrolments").select("id, status"),
        supabase.from("issued_credentials").select("id"),
        supabase.from("assessment_submissions").select("score, status"),
        supabase.from("profiles").select("user_id", { count: "exact" }),
        supabase.from("user_roles").select("role"),
        supabase.from("approval_tasks").select("id, status").eq("status", "pending"),
        supabase.from("learner_registrations").select("id, sla_breached").eq("sla_breached", true),
      ]);

      const invoices = invoicesRes.data ?? [];
      const quotes = quotesRes.data ?? [];
      const programmes = programmesRes.data ?? [];
      const enrolments = enrolmentsRes.data ?? [];
      const credentials = credentialsRes.data ?? [];
      const submissions = submissionsRes.data ?? [];

      // Financial
      const paidInvoices = invoices.filter((i: any) => i.status === "paid");
      const totalRevenue = paidInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
      const outstandingInvoices = invoices.filter((i: any) => ["issued", "overdue"].includes(i.status));
      const totalOutstanding = outstandingInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
      const overdueInvoices = invoices.filter((i: any) => i.status === "overdue").length;
      const acceptedQuotes = quotes.filter((q: any) => ["accepted", "invoiced"].includes(q.status)).length;
      const quoteConversionRate = quotes.length > 0 ? (acceptedQuotes / quotes.length) * 100 : 0;

      // Programmes
      const activeProgrammes = programmes.filter((p: any) =>
        ["approved", "published", "active"].includes(p.status)
      ).length;
      const activeEnrolments = enrolments.filter((e: any) => e.status === "active").length;
      const completedEnrolments = enrolments.filter((e: any) => e.status === "completed").length;
      const avgCompletion = enrolments.length > 0 ? (completedEnrolments / enrolments.length) * 100 : 0;

      // Talent
      const scoredSubs = submissions.filter((s: any) => s.score !== null);
      const avgScore = scoredSubs.length > 0
        ? scoredSubs.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) / scoredSubs.length
        : 0;

      // Unique roles
      const uniqueRoles = new Set((rolesRes.data ?? []).map((r: any) => r.role));

      return {
        financial: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOutstanding: Math.round(totalOutstanding * 100) / 100,
          overdueInvoices,
          quoteConversionRate: Math.round(quoteConversionRate * 10) / 10,
          currency: invoices[0]?.currency ?? "ZAR",
        },
        programmes: {
          totalProgrammes: programmes.length,
          activeProgrammes,
          averageCompletionRate: Math.round(avgCompletion * 10) / 10,
          totalEnrolments: enrolments.length,
          activeEnrolments,
          completedEnrolments,
        },
        talent: {
          totalLearners: activeEnrolments,
          activeLearners: activeEnrolments,
          credentialsIssued: credentials.length,
          averageAssessmentScore: Math.round(avgScore * 10) / 10,
        },
        health: {
          totalUsers: profilesRes.count ?? 0,
          activeRoles: uniqueRoles.size,
          pendingApprovals: (approvalsRes.data ?? []).length,
          slaBreach: (slaRes.data ?? []).length,
        },
      };
    },
    staleTime: 60 * 1000, // Refresh every minute
  });
}
