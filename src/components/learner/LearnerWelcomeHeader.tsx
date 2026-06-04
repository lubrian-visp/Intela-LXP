import ProgressRing from "@/components/dashboard/ProgressRing";
import { FadeIn } from "@/components/animations/MotionWrappers";

interface Props {
  firstName: string;
  activeCount: number;
  overallProgress: number;
}

export default function LearnerWelcomeHeader({ firstName, activeCount, overallProgress }: Props) {
  return (
    <FadeIn>
      <div className="bg-gradient-primary rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {firstName} 👋</h1>
            <p className="text-sm opacity-80 mt-1">
              {activeCount} active enrolment{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs opacity-60">Overall Progress</p>
              <p className="text-2xl font-bold">{overallProgress}%</p>
            </div>
            <ProgressRing value={overallProgress} size={56} strokeWidth={4} className="[&_circle:last-child]:!stroke-[hsl(38,92%,50%)] [&_span]:!text-primary-foreground" />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
