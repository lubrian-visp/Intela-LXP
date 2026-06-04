import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

export interface SDProfile {
  id: string;
  sponsor_id: string;
  financial_year: string;
  scorecard_type: "generic" | "qse";
  annual_leviable_amount: number;
  target_percentage: number;
  calculated_target: number;
  sub_minimum_percentage: number;
  admin_cap_percentage: number;
  informal_cap_percentage: number;
  travel_cap_percentage: number;
  wsp_submitted: boolean;
  atr_submitted: boolean;
  notes: string | null;
}

export interface SDExpenditure {
  id: string;
  profile_id: string;
  sponsor_id: string;
  category: string;
  description: string | null;
  amount: number;
  beneficiary_type: string | null;
  is_accredited: boolean;
  evidence_reference: string | null;
  expenditure_date: string | null;
  learner_id: string | null;
}

export interface SETACheckItem {
  id: string;
  sponsor_id: string;
  financial_year: string;
  check_key: string;
  check_label: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export const SD_CATEGORIES = [
  { key: "direct_training", label: "Direct Training Costs", desc: "Course fees, materials, venue hire" },
  { key: "learnership", label: "Learnerships / Apprenticeships", desc: "Stipends, salaries during learnerships" },
  { key: "bursary", label: "Bursaries", desc: "Fees for Black students at HEIs" },
  { key: "admin", label: "Administrative Costs", desc: "SD Facilitator / training manager (capped at 15%)" },
  { key: "informal_training", label: "Informal Training", desc: "Unverified / Category F & G (capped at 25%)" },
  { key: "travel_accommodation", label: "Travel & Accommodation", desc: "Training-related travel (capped at 15%)" },
] as const;

export const SETA_CHECKLIST_ITEMS = [
  { key: "emp201_calculated", label: "Calculate 12-month leviable amount from SARS EMP201 forms" },
  { key: "target_determined", label: "Determine target spend (6% Generic / 3% QSE)" },
  { key: "black_spend_tracked", label: "Track spending on Black employees (learnerships, bursaries, disabled)" },
  { key: "training_accredited", label: "Ensure training is accredited where possible" },
  { key: "sub_minimum_checked", label: "Calculate 40% sub-minimum to avoid level discounting" },
  { key: "wsp_approved", label: "SETA-approved Workplace Skills Plan (WSP) submitted" },
  { key: "atr_submitted", label: "Annual Training Report (ATR) submitted" },
  { key: "no_double_counting", label: "Verified no double-counting between criteria" },
  { key: "caps_verified", label: "Verified admin (15%), informal (25%), travel (15%) caps" },
  { key: "evidence_collected", label: "Supporting evidence collected for all expenditure claims" },
];

// ─── Hooks ───

export function useSDProfile(financialYear?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_sd_profiles", user?.id, financialYear],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = db.from("sponsor_sd_profiles").select("*").eq("sponsor_id", user!.id);
      if (financialYear) q = q.eq("financial_year", financialYear);
      q = q.order("financial_year", { ascending: false }).limit(1);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as SDProfile | null;
    },
  });
}

export function useUpsertSDProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SDProfile> & { sponsor_id: string; financial_year: string }) => {
      const { data, error } = await db
        .from("sponsor_sd_profiles")
        .upsert(input, { onConflict: "sponsor_id,financial_year" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor_sd_profiles"] });
      toast({ title: "Profile saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useSDExpenditures(profileId?: string) {
  return useQuery({
    queryKey: ["sponsor_sd_expenditures", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await db
        .from("sponsor_sd_expenditures")
        .select("*")
        .eq("profile_id", profileId!)
        .order("expenditure_date", { ascending: false });
      if (error) throw error;
      return data as SDExpenditure[];
    },
  });
}

export function useAddExpenditure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SDExpenditure> & { profile_id: string; sponsor_id: string; category: string; amount: number }) => {
      const { data, error } = await db.from("sponsor_sd_expenditures").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsor_sd_expenditures"] });
      toast({ title: "Expenditure added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteExpenditure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("sponsor_sd_expenditures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_sd_expenditures"] }),
  });
}

export function useSETAChecklist(financialYear?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sponsor_seta_checklist", user?.id, financialYear],
    enabled: !!user?.id && !!financialYear,
    queryFn: async () => {
      const { data, error } = await db
        .from("sponsor_seta_checklist")
        .select("*")
        .eq("sponsor_id", user!.id)
        .eq("financial_year", financialYear!)
        .order("created_at");
      if (error) throw error;
      return data as SETACheckItem[];
    },
  });
}

export function useUpsertSETACheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sponsor_id: string; financial_year: string; check_key: string; check_label: string; is_completed: boolean; notes?: string }) => {
      const { data, error } = await db
        .from("sponsor_seta_checklist")
        .upsert({
          ...input,
          completed_at: input.is_completed ? new Date().toISOString() : null,
        }, { onConflict: "sponsor_id,financial_year,check_key" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsor_seta_checklist"] }),
  });
}

// ─── Calculation Helpers ───

export function calculateExpenditureSummary(expenditures: SDExpenditure[], profile: SDProfile | null) {
  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const exp of expenditures) {
    byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
    total += exp.amount;
  }

  const target = profile?.calculated_target ?? 0;
  const subMinPct = profile?.sub_minimum_percentage ?? 40;
  const subMinAmount = target * subMinPct / 100;
  const meetsSubMinimum = total >= subMinAmount;

  // Cap checks
  const adminSpend = byCategory["admin"] ?? 0;
  const informalSpend = byCategory["informal_training"] ?? 0;
  const travelSpend = byCategory["travel_accommodation"] ?? 0;

  const adminCap = total * (profile?.admin_cap_percentage ?? 15) / 100;
  const informalCap = total * (profile?.informal_cap_percentage ?? 25) / 100;
  const travelCap = total * (profile?.travel_cap_percentage ?? 15) / 100;

  // Per-learner breakdown
  const byLearner: Record<string, number> = {};
  let taggedTotal = 0;
  for (const exp of expenditures) {
    if (exp.learner_id) {
      byLearner[exp.learner_id] = (byLearner[exp.learner_id] ?? 0) + exp.amount;
      taggedTotal += exp.amount;
    }
  }
  const learnerCount = Object.keys(byLearner).length;

  return {
    byCategory,
    total,
    target,
    achievementPct: target > 0 ? (total / target) * 100 : 0,
    subMinAmount,
    meetsSubMinimum,
    caps: {
      admin: { spend: adminSpend, cap: adminCap, exceeded: adminSpend > adminCap && total > 0 },
      informal: { spend: informalSpend, cap: informalCap, exceeded: informalSpend > informalCap && total > 0 },
      travel: { spend: travelSpend, cap: travelCap, exceeded: travelSpend > travelCap && total > 0 },
    },
    perLearner: {
      byLearner,
      learnerCount,
      taggedTotal,
      averageSpend: learnerCount > 0 ? taggedTotal / learnerCount : 0,
      untaggedSpend: total - taggedTotal,
    },
  };
}
