import { Clock, BookOpen, Bell } from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import ProgressRing from "@/components/dashboard/ProgressRing";
import { useNavigate } from "react-router-dom";

interface Props {
  firstName: string;
  activeCount: number;
  overallProgress: number;
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default function LearnerWelcomeHeader({ firstName, activeCount, overallProgress }: Props) {
  const navigate = useNavigate();
  return (
    <FadeIn>
      <div className="bg-gradient-to-br from-sidebar via-sidebar/95 to-sidebar/80 rounded-2xl p-6 border border-sidebar-border/50 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-2xl font-bold text-foreground">{getGreeting(firstName)}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeCount > 0
                ? `You have ${activeCount} active programme${activeCount !== 1 ? "s" : ""} in progress.`
                : "You have no active programmes yet. Explore available programmes below."}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-4 shrink-0">
            {/* Overall progress ring */}
            <div className="flex flex-col items-center gap-1">
              <ProgressRing value={overallProgress} size={56} strokeWidth={4} />
              <p className="text-[10px] text-muted-foreground">Overall</p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/discussions")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                Announcements
              </button>
              <button
                onClick={() => navigate("/portfolio")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                My Portfolio
              </button>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
