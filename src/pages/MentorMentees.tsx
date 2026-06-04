import { Users, Search, TrendingUp, Star, AlertTriangle, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolments } from "@/hooks/useCoreData";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ProgressRing from "@/components/dashboard/ProgressRing";

function getMenteeStatus(progress: number, status: string) {
  if (status === "completed") return { label: "Completed", style: "bg-muted-foreground/10 text-muted-foreground" };
  if (progress >= 80) return { label: "Excelling", style: "bg-success/10 text-success" };
  if (progress < 30) return { label: "At Risk", style: "bg-warning/10 text-warning" };
  return { label: "Active", style: "bg-info/10 text-info" };
}

export default function MentorMentees() {
  const [search, setSearch] = useState("");
  const { data: enrolments = [], isLoading } = useEnrolments();

  const filtered = (enrolments as any[]).filter((e: any) =>
    !search || (e.cohorts?.programmes?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">My Mentees</h1>
        <p className="text-sm text-muted-foreground">Track and support your assigned learners.</p>
      </FadeIn>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No mentees assigned.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e: any) => {
            const status = getMenteeStatus(e.progress_percentage ?? 0, e.status);
            return (
              <div key={e.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center justify-between hover:shadow-card-hover transition-all">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{e.cohorts?.programmes?.title ?? "Programme"}</h4>
                  <p className="text-[10px] text-muted-foreground">{e.cohorts?.name ?? "Cohort"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", status.style)}>{status.label}</span>
                  <ProgressRing value={e.progress_percentage ?? 0} size={40} strokeWidth={3} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
