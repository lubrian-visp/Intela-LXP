import { useState, useMemo } from "react";
import { Users, Briefcase, GraduationCap, TrendingUp, UserCheck, Target, Search, ChevronRight, Clock, BarChart3, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffOverview, useLearnerPipeline, useProgrammeSummaries } from "@/hooks/useTalentManagerData";
import TalentStaffPanel from "@/components/talent/TalentStaffPanel";
import TalentLearnerPipeline from "@/components/talent/TalentLearnerPipeline";
import TalentCapacityPanel from "@/components/talent/TalentCapacityPanel";

export default function TalentManagerPortal() {
  const staffQuery = useStaffOverview();
  const learnerQuery = useLearnerPipeline();
  const programmeQuery = useProgrammeSummaries();

  const isLoading = staffQuery.isLoading || learnerQuery.isLoading || programmeQuery.isLoading;

  // Compute stats
  const stats = useMemo(() => {
    const staff = staffQuery.data?.staff ?? [];
    const enrolments = learnerQuery.data?.enrolments ?? [];
    const credentials = learnerQuery.data?.credentials ?? [];
    const activeStaff = staff.filter((s: any) => s.status === "approved").length;
    const activeEnrolments = enrolments.filter((e: any) => ["active", "enrolled"].includes(e.status)).length;
    const completedEnrolments = enrolments.filter((e: any) => e.status === "completed").length;
    const avgProgress = enrolments.length
      ? Math.round(enrolments.reduce((sum: number, e: any) => sum + (e.progress_percentage ?? 0), 0) / enrolments.length)
      : 0;
    return [
      { label: "Active Staff", value: String(activeStaff), icon: Users, color: "text-primary" },
      { label: "Active Learners", value: String(activeEnrolments), icon: GraduationCap, color: "text-info" },
      { label: "Avg. Progress", value: `${avgProgress}%`, icon: TrendingUp, color: "text-success" },
      { label: "Credentials Issued", value: String(credentials.length), icon: Award, color: "text-warning" },
    ];
  }, [staffQuery.data, learnerQuery.data]);

  return (
    <div className="space-y-6 animate-slide-up">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Talent Manager Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Staff allocation, learner talent pipeline, and capacity planning — powered by live data.
          </p>
        </div>
      </FadeIn>

      {/* Stats */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <div className="bg-card rounded-xl shadow-card border border-border/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <s.icon className={cn("w-4 h-4", s.color)} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Tabs */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="staff" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Staff Allocation</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Learner Pipeline</TabsTrigger>
          <TabsTrigger value="capacity" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Capacity & Gaps</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <TalentStaffPanel data={staffQuery.data} isLoading={staffQuery.isLoading} />
        </TabsContent>

        <TabsContent value="pipeline">
          <TalentLearnerPipeline data={learnerQuery.data} programmes={programmeQuery.data ?? []} isLoading={learnerQuery.isLoading} />
        </TabsContent>

        <TabsContent value="capacity">
          <TalentCapacityPanel staffData={staffQuery.data} learnerData={learnerQuery.data} programmes={programmeQuery.data ?? []} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
