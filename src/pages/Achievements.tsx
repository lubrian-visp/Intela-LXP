import GamificationPanel from "@/components/gamification/GamificationPanel";
import { FadeIn } from "@/components/animations/MotionWrappers";

export default function Achievements() {
  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground">Achievements & Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Track your points, badges, and ranking amongst your peers.</p>
      </FadeIn>
      <GamificationPanel />
    </div>
  );
}
