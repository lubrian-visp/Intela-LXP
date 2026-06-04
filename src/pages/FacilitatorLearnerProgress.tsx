import { TrendingUp, Users, Search } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolments, useCohorts } from "@/hooks/useCoreData";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ProgressRing from "@/components/dashboard/ProgressRing";

export default function FacilitatorLearnerProgress() {
  const [search, setSearch] = useState("");
  const { data: enrolments = [], isLoading } = useEnrolments();

  const filtered = (enrolments as any[]).filter((e: any) =>
    !search || (e.cohorts?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Learner Progress</h1>
        <p className="text-sm text-muted-foreground">Monitor learner engagement and completion across your cohorts.</p>
      </FadeIn>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search cohorts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No learner enrolments found.</p>
            </div>
          ) : (
            filtered.map((e: any) => (
              <div key={e.id} className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center justify-between hover:shadow-card-hover transition-all">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{e.cohorts?.programmes?.title ?? "Programme"}</h4>
                  <p className="text-[10px] text-muted-foreground">{e.cohorts?.name ?? "Cohort"} · <span className="capitalize">{e.status}</span></p>
                </div>
                <ProgressRing value={e.progress_percentage ?? 0} size={44} strokeWidth={3} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
