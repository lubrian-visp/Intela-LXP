import { BookOpen, Award, FileCheck, TrendingUp } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/animations/MotionWrappers";

interface Props {
  activeCount: number;
  credentialCount: number;
  submissionCount: number;
  overallProgress: number;
}

export default function LearnerStatsRow({ activeCount, credentialCount, submissionCount, overallProgress }: Props) {
  const stats = [
    { label: "Active Programmes", value: activeCount, icon: <BookOpen className="w-4 h-4 text-info" /> },
    { label: "Credentials Earned", value: credentialCount, icon: <Award className="w-4 h-4 text-accent" /> },
    { label: "Submissions", value: submissionCount, icon: <FileCheck className="w-4 h-4 text-success" /> },
    { label: "Overall Progress", value: `${overallProgress}%`, icon: <TrendingUp className="w-4 h-4 text-warning" /> },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <StaggerItem key={s.label}>
          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
