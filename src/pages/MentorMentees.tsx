import { Users, Search, TrendingUp, Star, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrolments } from "@/hooks/useCoreData";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import ProgressRing from "@/components/dashboard/ProgressRing";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

function getMenteeStatus(progress: number, status: string) {
  if (status === "completed") return { label: "Completed", color: "text-muted-foreground", bg: "bg-muted-foreground/10", icon: CheckCircle2 };
  if (progress >= 80)          return { label: "Excelling",  color: "text-success",          bg: "bg-success/10",          icon: Star };
  if (progress < 30)           return { label: "At Risk",    color: "text-warning",          bg: "bg-warning/10",          icon: AlertTriangle };
  return                              { label: "Active",     color: "text-info",             bg: "bg-info/10",             icon: TrendingUp };
}

export default function MentorMentees() {
  usePageTitle("My Mentees", "Mentor Portal");
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [search, setSearch] = useState("");

  // FIXED: fetch only enrolments where mentor_id = current user
  const { data: enrolments = [], isLoading } = useEnrolments();

  // Filter to only the current mentor's mentees
  const myMentees = useMemo(
    () => (enrolments as any[]).filter(e => e.mentor_id === user?.id),
    [enrolments, user?.id]
  );

  // Batch-fetch learner profiles for real names
  const learnerIds = useMemo(
    () => [...new Set(myMentees.map((e: any) => e.learner_id as string))],
    [myMentees]
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ["mentee-profiles", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("user_id, full_name, job_title")
        .in("user_id", learnerIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const profileMap = useMemo(() => {
    const m: Record<string, { name: string; title: string }> = {};
    (profiles as any[]).forEach(p => { m[p.user_id] = { name: p.full_name || "Unnamed", title: p.job_title || "" }; });
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return myMentees.filter((e: any) => {
      if (!q) return true;
      const name = profileMap[e.learner_id]?.name ?? "";
      const prog = e.cohorts?.programmes?.title ?? "";
      return name.toLowerCase().includes(q) || prog.toLowerCase().includes(q);
    });
  }, [myMentees, search, profileMap]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> My Mentees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and support your {myMentees.length} assigned learner{myMentees.length !== 1 ? "s" : ""}.
        </p>
      </FadeIn>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search mentees or programmes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search mentees"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {myMentees.length === 0 ? "No mentees assigned yet" : "No mentees match your search"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {myMentees.length === 0
              ? "You'll see your assigned learners here once a Programme Manager assigns them to you."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e: any) => {
            const progress = e.progress_percentage ?? 0;
            const st       = getMenteeStatus(progress, e.status);
            const profile  = profileMap[e.learner_id];
            const name     = profile?.name ?? `Learner ${e.learner_id.slice(0, 6)}`;
            const StatusIcon = st.icon;

            return (
              <button
                key={e.id}
                className="w-full text-left bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center gap-4 hover:shadow-card-hover hover:border-primary/20 transition-all group"
                onClick={() => navigate(`/learner/profile/${e.learner_id}`)}
                aria-label={`View profile for ${name}`}
              >
                {/* Learner info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {name}
                    </p>
                    <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0", st.color, st.bg)}>
                      <StatusIcon className="w-2.5 h-2.5" />{st.label}
                    </span>
                  </div>
                  {profile?.title && (
                    <p className="text-[10px] text-muted-foreground">{profile.title}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {e.cohorts?.programmes?.title ?? "Programme"} · {e.cohorts?.name ?? "Cohort"}
                    {e.enrolled_at && ` · Enrolled ${format(new Date(e.enrolled_at), "d MMM yyyy")}`}
                  </p>
                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-semibold text-foreground w-8 shrink-0">{progress}%</span>
                  </div>
                </div>

                {/* Progress ring + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <ProgressRing value={progress} size={44} strokeWidth={3} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
