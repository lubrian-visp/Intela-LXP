import { useMemo } from "react";
import { Users, GraduationCap, AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface Props {
  staffData: any;
  learnerData: any;
  programmes: any[];
  isLoading: boolean;
}

export default function TalentCapacityPanel({ staffData, learnerData, programmes, isLoading }: Props) {
  const capacityData = useMemo(() => {
    if (!staffData || !learnerData) return [];
    const { cohortStaff } = staffData;
    const { enrolments } = learnerData;

    // Group by programme
    return programmes.map(prog => {
      const progEnrolments = enrolments.filter((e: any) => (e.cohorts as any)?.programme_id === prog.id);
      const activeLearners = progEnrolments.filter((e: any) => ["active", "enrolled"].includes(e.status)).length;
      const completedLearners = progEnrolments.filter((e: any) => e.status === "completed").length;
      const avgProgress = progEnrolments.length
        ? Math.round(progEnrolments.reduce((s: number, e: any) => s + (e.progress_percentage ?? 0), 0) / progEnrolments.length)
        : 0;

      // Count staff assigned to cohorts of this programme
      const progCohortIds = new Set(progEnrolments.map((e: any) => e.cohorts?.id).filter(Boolean));
      // Use cohort_staff_assignments — these have cohort_id
      const assignedStaff = cohortStaff.filter((cs: any) => {
        const cohortId = cs.cohort_id;
        return progCohortIds.has(cohortId);
      });
      const uniqueStaff = new Set(assignedStaff.map((cs: any) => cs.user_id)).size;
      const ratio = uniqueStaff > 0 ? Math.round(activeLearners / uniqueStaff) : activeLearners;
      const isStrained = ratio > 20;

      return {
        id: prog.id,
        title: prog.title,
        activeLearners,
        completedLearners,
        avgProgress,
        staffCount: uniqueStaff,
        ratio,
        isStrained,
        nqfLevel: prog.nqf_level,
      };
    }).filter(p => p.activeLearners > 0 || p.completedLearners > 0 || p.staffCount > 0);
  }, [staffData, learnerData, programmes]);

  // Skills gap: programmes with learners but low completion
  const gapProgrammes = capacityData.filter(p => p.activeLearners > 0 && p.avgProgress < 40);

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {/* Programme Capacity Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Programme Capacity Overview</h3>
        {capacityData.length === 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
            No programme data available yet. Enrol learners and assign staff to see capacity metrics.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capacityData.map(prog => (
            <div key={prog.id} className="bg-card rounded-xl shadow-card border border-border/50 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{prog.title}</h4>
                  {prog.nqfLevel && <span className="text-[10px] text-muted-foreground">NQF {prog.nqfLevel}</span>}
                </div>
                {prog.isStrained && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> High ratio
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{prog.activeLearners}</p>
                  <p className="text-[10px] text-muted-foreground">Active Learners</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{prog.staffCount}</p>
                  <p className="text-[10px] text-muted-foreground">Staff Assigned</p>
                </div>
                <div>
                  <p className={cn("text-lg font-bold", prog.isStrained ? "text-destructive" : "text-foreground")}>{prog.ratio}:1</p>
                  <p className="text-[10px] text-muted-foreground">Learner:Staff</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Avg. Progress</span>
                  <span className="text-xs font-medium text-foreground">{prog.avgProgress}%</span>
                </div>
                <Progress value={prog.avgProgress} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Gap */}
      {gapProgrammes.length > 0 && (
        <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Skills Gap Alert
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Programmes with active learners but low average progress (&lt;40%)</p>
          </div>
          <div className="divide-y divide-border/50">
            {gapProgrammes.map(p => (
              <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-[10px] text-muted-foreground">{p.activeLearners} active learners • {p.avgProgress}% avg progress</p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{p.staffCount} staff</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
