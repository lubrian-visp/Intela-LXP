import { useState } from "react";
import { Flame, Target, Clock, Trophy, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useLearnerStreak, useWeeklyStudyMinutes, useUpdateWeeklyGoal,
} from "@/hooks/useLearnerStreak";

export default function LearnerStreakWidget() {
  const { data: streak }  = useLearnerStreak();
  const { data: weekly }  = useWeeklyStudyMinutes();
  const updateGoal        = useUpdateWeeklyGoal();

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput]     = useState("");

  const current    = streak?.current_streak  ?? 0;
  const longest    = streak?.longest_streak  ?? 0;
  const goal       = streak?.weekly_goal_minutes ?? 60;
  const studied    = weekly?.totalMinutes    ?? 0;
  const days       = weekly?.daysStudied     ?? 0;
  const pct        = Math.min(Math.round((studied / goal) * 100), 100);
  const remaining  = Math.max(goal - studied, 0);

  const saveGoal = () => {
    const v = parseInt(goalInput);
    if (!isNaN(v) && v > 0) updateGoal.mutate(v);
    setEditingGoal(false);
  };

  // 7-day mini heatmap (simulated from daysStudied)
  const days7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()], active: i >= 7 - days };
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
            current >= 3 ? "bg-orange-500/10" : "bg-secondary"
          )}>
            <Flame className={cn("w-3.5 h-3.5", current >= 3 ? "text-orange-500" : "text-muted-foreground")} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Study Streak</h3>
        </div>
        {current >= 7 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
            🔥 On fire!
          </span>
        )}
      </div>

      {/* Streak numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-orange-500/8 border border-orange-500/15 p-3 text-center">
          <p className="text-2xl font-bold text-orange-500 leading-none">{current}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">day streak</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3 text-center">
          <p className="text-2xl font-bold text-foreground leading-none">{longest}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
            <Trophy className="w-2.5 h-2.5" /> best
          </p>
        </div>
      </div>

      {/* 7-day heatmap */}
      <div className="flex items-center justify-between gap-1.5">
        {days7.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={cn("w-6 h-6 rounded-md transition-colors",
              d.active ? "bg-orange-500" : "bg-secondary"
            )} />
            <span className="text-[8px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>

      {/* Weekly goal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Target className="w-3 h-3" /> Weekly goal
          </span>
          {editingGoal ? (
            <div className="flex items-center gap-1">
              <input
                type="number" min={15} max={600} value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className="w-14 text-xs px-1.5 py-0.5 rounded border border-border bg-background text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <span className="text-[10px] text-muted-foreground">min</span>
              <button onClick={saveGoal} aria-label="Save goal" className="text-green-500 hover:text-green-600"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingGoal(false)} aria-label="Cancel" className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}
              aria-label="Edit weekly study goal"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Clock className="w-3 h-3" />
              {goal} min/week
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-green-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {studied} / {goal} min this week
          {remaining > 0 && <span className="text-muted-foreground/60"> · {remaining} min to go</span>}
          {pct >= 100 && <span className="text-green-600 font-semibold"> · Goal reached! 🎉</span>}
        </p>
      </div>
    </div>
  );
}
