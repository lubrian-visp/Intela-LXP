/**
 * MilestoneToast — detects learning milestones and shows celebratory toasts.
 * Call useMilestoneDetector() in LearnerDashboard or LearnerProgrammeDetail.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEnrolments, useCredentials, useSubmissions } from "@/hooks/useCoreData";
import { useLearnerStreak } from "@/hooks/useLearnerStreak";

const MILESTONES: Array<{
  key: string;
  check: (s: { progress: number; submissions: number; credentials: number; streak: number }) => boolean;
  message: string;
  emoji: string;
}> = [
  { key: "first_submission",   check: s => s.submissions === 1,           message: "You submitted your first assessment!", emoji: "🎯" },
  { key: "first_credential",   check: s => s.credentials === 1,           message: "You earned your first credential!",    emoji: "🏆" },
  { key: "halfway",            check: s => s.progress >= 50,              message: "You're halfway through your programme!", emoji: "🔥" },
  { key: "complete",           check: s => s.progress >= 100,             message: "Programme complete! Outstanding work!", emoji: "🎓" },
  { key: "streak_7",           check: s => s.streak >= 7,                 message: "7-day study streak! You're on fire!",   emoji: "🔥" },
  { key: "streak_30",          check: s => s.streak >= 30,                message: "30 days of learning! Incredible!",     emoji: "⭐" },
  { key: "ten_submissions",    check: s => s.submissions === 10,          message: "10 assessments submitted! Dedicated!", emoji: "📚" },
];

const SEEN_KEY = "intela_milestones_seen";

function getSeenMilestones(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function markMilestoneSeen(key: string) {
  const seen = getSeenMilestones();
  seen.add(key);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export function useMilestoneDetector() {
  const { user }               = useAuth();
  const { data: enrolments = [] } = useEnrolments({ learnerId: user?.id });
  const { data: credentials = [] }  = useCredentials(user?.id);
  const { data: submissions = [] }  = useSubmissions({ learnerId: user?.id });
  const { data: streak }        = useLearnerStreak();
  const checkedRef = useRef(false);

  const maxProgress = Math.max(
    0,
    ...(enrolments as any[]).map(e => e.progress_percentage ?? 0)
  );

  useEffect(() => {
    if (!user?.id || checkedRef.current) return;
    checkedRef.current = true;

    const seen = getSeenMilestones();
    const state = {
      progress:    maxProgress,
      submissions: submissions.length,
      credentials: credentials.length,
      streak:      streak?.current_streak ?? 0,
    };

    MILESTONES.forEach(m => {
      if (!seen.has(m.key) && m.check(state)) {
        markMilestoneSeen(m.key);
        setTimeout(() => {
          toast(
            `${m.emoji} ${m.message}`,
            {
              description: "Keep up the great work!",
              duration:    6000,
              style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" },
            }
          );
        }, 1500);
      }
    });
  }, [user?.id, maxProgress, submissions.length, credentials.length, streak?.current_streak]);
}

/** Drop this component anywhere to activate milestone detection */
export default function MilestoneDetector() {
  useMilestoneDetector();
  return null;
}
