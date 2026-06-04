import { BookOpen, Award, FileCheck, TrendingUp } from "lucide-react";
import { KpiGrid } from "@/components/dashboard/DashboardShell";

interface Props {
  activeCount: number;
  credentialCount: number;
  submissionCount: number;
  overallProgress: number;
}

export default function LearnerStatsRow({ activeCount, credentialCount, submissionCount, overallProgress }: Props) {
  const items = [
    { label: "Active Programmes", value: activeCount, sub: "enrolled", trend: true, icon: BookOpen, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    { label: "Credentials Earned", value: credentialCount, sub: "issued", trend: true, icon: Award, iconBg: "bg-yellow-500/10", iconColor: "text-yellow-500" },
    { label: "Submissions", value: submissionCount, sub: "total", trend: true, icon: FileCheck, iconBg: "bg-green-500/10", iconColor: "text-green-500" },
    { label: "Overall Progress", value: `${overallProgress}%`, sub: "avg. across programmes", trend: overallProgress > 50, icon: TrendingUp, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
  ];

  return <KpiGrid items={items} />;
}
