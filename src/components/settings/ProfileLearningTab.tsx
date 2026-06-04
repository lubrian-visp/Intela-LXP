import { BookOpen, Award, GraduationCap, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ProfileLearningTab() {
  const { user } = useAuth();
  const db = supabase as any;

  const { data: enrolments, isLoading: enrLoading } = useQuery({
    queryKey: ["my-enrolments", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("enrolments")
        .select("*, cohorts(name, programme_id, programmes(title))")
        .eq("learner_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: credentials, isLoading: credLoading } = useQuery({
    queryKey: ["my-credentials", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("issued_credentials")
        .select("*")
        .eq("learner_id", user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: submissions } = useQuery({
    queryKey: ["my-submissions-scores", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("assessment_submissions")
        .select("score, status")
        .eq("learner_id", user!.id)
        .eq("status", "assessed");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const isLoading = enrLoading || credLoading;

  const totalEnrolments = enrolments?.length ?? 0;
  const completed = enrolments?.filter((e: any) => e.status === "completed").length ?? 0;
  const totalCredentials = credentials?.length ?? 0;
  const avgScore = submissions?.length
    ? Math.round(submissions.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) / submissions.length)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Learning Summary</h3>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={BookOpen} label="Programmes" value={String(totalEnrolments)} />
          <StatBox icon={GraduationCap} label="Completed" value={String(completed)} />
          <StatBox icon={Award} label="Credentials" value={String(totalCredentials)} />
          <StatBox icon={TrendingUp} label="Avg Score" value={avgScore !== null ? `${avgScore}%` : "—"} />
        </div>
      </div>

      {/* Enrolment List */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Enrolled Programmes</h3>
        </div>
        <div className="p-4">
          {totalEnrolments === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No enrolments found.</p>
          ) : (
            <div className="space-y-2">
              {enrolments!.map((e: any) => {
                const title = e.cohorts?.programmes?.title ?? e.cohorts?.name ?? "Unknown";
                const statusColor: Record<string, string> = {
                  active: "bg-success/10 text-success border-success/20",
                  completed: "bg-accent/10 text-accent border-accent/20",
                  pending: "bg-warning/10 text-warning border-warning/20",
                  withdrawn: "bg-destructive/10 text-destructive border-destructive/20",
                };
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Enrolled {e.enrolled_at ? format(new Date(e.enrolled_at), "dd MMM yyyy") : "—"}
                        {e.progress_percentage != null && ` · ${e.progress_percentage}% complete`}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColor[e.status] ?? "bg-muted text-muted-foreground"}>
                      {e.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-secondary/50 rounded-lg">
      <Icon className="w-5 h-5 mx-auto text-accent mb-1" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
