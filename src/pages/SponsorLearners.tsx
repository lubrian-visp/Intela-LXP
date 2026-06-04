import { Users, TrendingUp, Search } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolments } from "@/hooks/useCoreData";
import { useSDProfile, useSDExpenditures, calculateExpenditureSummary } from "@/hooks/useSponsorSD";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { maskNationalId } from "@/lib/privacyUtils";
import { useState, useMemo } from "react";

export default function SponsorLearners() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { data: enrolments = [], isLoading } = useEnrolments();

  // Filter to sponsor's learners
  const sponsored = useMemo(() => (enrolments as any[]).filter((e: any) => e.sponsor_id === user?.id), [enrolments, user]);

  // Get unique learner IDs
  const learnerIds = useMemo(() => [...new Set(sponsored.map((e: any) => e.learner_id))], [sponsored]);

  // Fetch profiles for learner names
  const { data: profiles = [] } = useQuery({
    queryKey: ["sponsor_learner_profiles", learnerIds],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", learnerIds);
      if (error) throw error;
      return data;
    },
  });

  // Fetch learner registrations for learner numbers
  const { data: registrations = [] } = useQuery({
    queryKey: ["sponsor_learner_registrations", learnerIds],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learner_registrations")
        .select("user_id, learner_number, full_name, national_id")
        .in("user_id", learnerIds);
      if (error) throw error;
      return data;
    },
  });

  // Build lookup maps
  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of profiles) {
      if (p.user_id && p.full_name) map[p.user_id] = p.full_name;
    }
    return map;
  }, [profiles]);

  const regMap = useMemo(() => {
    const map: Record<string, { learnerNumber: string | null; fullName: string; nationalId: string | null }> = {};
    for (const r of registrations) {
      if (r.user_id) map[r.user_id] = { learnerNumber: r.learner_number, fullName: r.full_name, nationalId: r.national_id };
    }
    return map;
  }, [registrations]);


  // Get current FY and expenditure data for per-learner spend
  const currentFY = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}/${year + 1}`;
  }, []);
  const { data: sdProfile } = useSDProfile(currentFY);
  const { data: expenditures = [] } = useSDExpenditures(sdProfile?.id);
  const summary = useMemo(() => calculateExpenditureSummary(expenditures, sdProfile ?? null), [expenditures, sdProfile]);

  const filtered = sponsored.filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = profileMap[e.learner_id] || regMap[e.learner_id]?.fullName || "";
    const lrn = regMap[e.learner_id]?.learnerNumber || "";
    const programme = e.cohorts?.programmes?.title ?? "";
    return name.toLowerCase().includes(s) || lrn.toLowerCase().includes(s) || programme.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Funded Learners</h1>
        <p className="text-sm text-muted-foreground">Track learner progress and SD spend across sponsored programmes.</p>
      </FadeIn>

      {/* Quick stats */}
      {summary.perLearner.learnerCount > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 text-center">
            <p className="text-lg font-bold text-foreground">R{summary.total.toLocaleString("en-ZA")}</p>
            <p className="text-[10px] text-muted-foreground">Total SD Spend</p>
          </div>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 text-center">
            <p className="text-lg font-bold text-accent">R{summary.perLearner.averageSpend.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground">Avg Spend / Learner</p>
          </div>
          <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 text-center">
            <p className="text-lg font-bold text-primary">{summary.perLearner.learnerCount}</p>
            <p className="text-[10px] text-muted-foreground">Learners with Tagged Spend</p>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search programmes or learners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No funded learners found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Learner No.</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Full Name</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">National ID</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Programme</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Progress</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase">SD Spend</th>
              </tr></thead>
              <tbody>
                {filtered.map((e: any) => {
                  const learnerSpend = summary.perLearner.byLearner[e.learner_id] ?? 0;
                  const fullName = profileMap[e.learner_id] || regMap[e.learner_id]?.fullName || "—";
                  const learnerNumber = regMap[e.learner_id]?.learnerNumber || "—";
                  return (
                    <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-mono font-semibold text-primary">{learnerNumber}</span>
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">{fullName}</td>
                      <td className="px-5 py-3">
                        <span className="text-[11px] font-mono text-muted-foreground tracking-wider">{maskNationalId(regMap[e.learner_id]?.nationalId)}</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{e.cohorts?.programmes?.title ?? "Programme"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${e.progress_percentage ?? 0}%` }} />
                          </div>
                          <span className="text-xs text-foreground">{e.progress_percentage ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium capitalize", e.status === "active" ? "bg-success/10 text-success" : e.status === "completed" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>{e.status}</span></td>
                      <td className="px-5 py-3 text-right">
                        {learnerSpend > 0 ? (
                          <span className="text-xs font-bold text-foreground">R{learnerSpend.toLocaleString("en-ZA")}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
