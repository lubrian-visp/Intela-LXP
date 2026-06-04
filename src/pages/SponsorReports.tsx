import { FileBarChart, Users, TrendingUp, Award, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { useEnrolments, useCredentials } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { useSDProfile, useSDExpenditures, calculateExpenditureSummary } from "@/hooks/useSponsorSD";

export default function SponsorReports() {
  const { user } = useAuth();
  const { data: enrolments = [], isLoading } = useEnrolments();
  const { data: credentials = [] } = useCredentials();

  // Filter to sponsor's learners
  const sponsored = useMemo(() => enrolments.filter(e => e.sponsor_id === user?.id), [enrolments, user]);
  const active = sponsored.filter(e => e.status === "active" || e.status === "enrolled").length;
  const completed = sponsored.filter(e => e.status === "completed").length;
  const avgProgress = sponsored.length > 0 ? Math.round(sponsored.reduce((s, e) => s + (e.progress_percentage ?? 0), 0) / sponsored.length) : 0;

  // SD spend per learner
  const currentFY = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}/${year + 1}`;
  }, []);
  const { data: sdProfile } = useSDProfile(currentFY);
  const { data: expenditures = [] } = useSDExpenditures(sdProfile?.id);
  const summary = useMemo(() => calculateExpenditureSummary(expenditures, sdProfile ?? null), [expenditures, sdProfile]);

  // Progress distribution
  const progressBuckets = useMemo(() => {
    const buckets = [
      { range: "0–25%", count: 0 },
      { range: "26–50%", count: 0 },
      { range: "51–75%", count: 0 },
      { range: "76–100%", count: 0 },
    ];
    sponsored.forEach(e => {
      const p = e.progress_percentage ?? 0;
      if (p <= 25) buckets[0].count++;
      else if (p <= 50) buckets[1].count++;
      else if (p <= 75) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets;
  }, [sponsored]);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Sponsor Reports</h1>
        <p className="text-sm text-muted-foreground">Performance overview of your sponsored learners.</p>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Sponsored", value: sponsored.length, icon: <Users className="w-4 h-4" />, color: "text-foreground" },
          { label: "Active", value: active, icon: <TrendingUp className="w-4 h-4" />, color: "text-success" },
          { label: "Completed", value: completed, icon: <Award className="w-4 h-4" />, color: "text-accent" },
          { label: "Avg Progress", value: `${avgProgress}%`, icon: <FileBarChart className="w-4 h-4" />, color: "text-primary" },
          { label: "Avg Spend / Learner", value: summary.perLearner.learnerCount > 0 ? `R${summary.perLearner.averageSpend.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}` : "—", icon: <DollarSign className="w-4 h-4" />, color: "text-accent" },
        ].map(s => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4">Learner Progress Distribution</h3>
        {sponsored.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No sponsored learners found.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={progressBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
