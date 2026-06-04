import { useMemo } from "react";
import { Users, GraduationCap, TrendingUp, BarChart3, Award, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaffOverview, useLearnerPipeline, useProgrammeSummaries } from "@/hooks/useTalentManagerData";
import TalentStaffPanel from "@/components/talent/TalentStaffPanel";
import TalentLearnerPipeline from "@/components/talent/TalentLearnerPipeline";
import TalentCapacityPanel from "@/components/talent/TalentCapacityPanel";
import { WelcomeBanner, KpiGrid, ActionButton } from "@/components/dashboard/DashboardShell";
import { useNavigate } from "react-router-dom";

export default function TalentManagerPortal() {
  const navigate = useNavigate();
  const staffQuery = useStaffOverview();
  const learnerQuery = useLearnerPipeline();
  const programmeQuery = useProgrammeSummaries();

  const isLoading = staffQuery.isLoading || learnerQuery.isLoading || programmeQuery.isLoading;

  const kpiItems = useMemo(() => {
    const staff = staffQuery.data?.staff ?? [];
    const enrolments = learnerQuery.data?.enrolments ?? [];
    const credentials = learnerQuery.data?.credentials ?? [];
    const activeStaff = staff.filter((s: any) => s.status === "approved").length;
    const activeEnrolments = enrolments.filter((e: any) => ["active", "enrolled"].includes(e.status)).length;
    const avgProgress = enrolments.length
      ? Math.round(enrolments.reduce((sum: number, e: any) => sum + (e.progress_percentage ?? 0), 0) / enrolments.length)
      : 0;
    return [
      { label: "Active Staff", value: isLoading ? "—" : activeStaff, sub: "approved", trend: true, icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { label: "Active Learners", value: isLoading ? "—" : activeEnrolments, sub: "enrolled", trend: true, icon: GraduationCap, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { label: "Avg. Progress", value: isLoading ? "—" : `${avgProgress}%`, sub: "across learners", trend: avgProgress > 50, icon: TrendingUp, iconBg: "bg-green-500/10", iconColor: "text-green-500" },
      { label: "Credentials Issued", value: isLoading ? "—" : credentials.length, sub: "total", trend: true, icon: Award, iconBg: "bg-yellow-500/10", iconColor: "text-yellow-500" },
    ];
  }, [staffQuery.data, learnerQuery.data, isLoading]);

  return (
    <div className="space-y-6 animate-slide-up">
      <WelcomeBanner
        subtitle="Staff allocation, learner talent pipeline, and capacity planning — powered by live data."
        actions={
          <>
            <ActionButton icon={Users} label="Staff Directory" onClick={() => navigate("/staff/onboarding")} />
            <ActionButton icon={UserCheck} label="Allocate Staff" onClick={() => navigate("/admin/users")} primary />
          </>
        }
      />
      <KpiGrid items={kpiItems} />

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
