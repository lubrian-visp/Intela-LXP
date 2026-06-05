import { useAuth } from "@/hooks/useAuth";
import { useEnrolments, useCredentials, useSubmissions, useRealtimeSync } from "@/hooks/useCoreData";
import { Skeleton } from "@/components/ui/skeleton";
import LearnerWelcomeHeader from "@/components/learner/LearnerWelcomeHeader";
import LearnerStatsRow from "@/components/learner/LearnerStatsRow";
import LearnerUpcomingSessions from "@/components/learner/LearnerUpcomingSessions";
import LearnerRecentAnnouncements from "@/components/learner/LearnerRecentAnnouncements";
import LearnerEnrolmentsList from "@/components/learner/LearnerEnrolmentsList";
import LearnerSubmissionsTable from "@/components/learner/LearnerSubmissionsTable";
import LearnerCredentialWallet from "@/components/learner/LearnerCredentialWallet";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import LearnerRecommendationsWidget from "@/components/learner/LearnerRecommendationsWidget";
import LearnerStreakWidget from "@/components/learner/LearnerStreakWidget";
import LearnerDeadlineWidget from "@/components/learner/LearnerDeadlineWidget";
import LearnerAnalyticsWidget from "@/components/learner/LearnerAnalyticsWidget";
import LearnerCohortCompare from "@/components/learner/LearnerCohortCompare";
import MilestoneDetector from "@/components/learner/MilestoneToast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useRecordStudyActivity } from "@/hooks/useLearnerStreak";
import { useEffect } from "react";

export default function LearnerDashboard() {
  const { user, profile } = useAuth();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const recordActivity = useRecordStudyActivity();

  // Record dashboard visit as a study activity (1 min) to contribute to streak
  useEffect(() => {
    if (user?.id) recordActivity.mutate({ minutes: 1, activity: "content" });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data: enrolments = [], isLoading: enrolLoading } = useEnrolments({ learnerId: user?.id });
  const { data: credentials = [], isLoading: credLoading } = useCredentials(user?.id);
  const { data: submissions = [], isLoading: subLoading } = useSubmissions({ learnerId: user?.id });

  // Real-time cross-portal sync
  useRealtimeSync(["enrolments", "assessment_submissions", "issued_credentials", "announcements", "notifications"]);

  const isLoading = enrolLoading || credLoading || subLoading;
  const activeEnrolments = enrolments.filter((e: any) => e.status === "active" || e.status === "enrolled");
  const overallProgress = activeEnrolments.length > 0
    ? Math.round(activeEnrolments.reduce((a: number, e: any) => a + (e.progress_percentage ?? 0), 0) / activeEnrolments.length)
    : 0;
  const firstName = profile?.full_name?.split(" ")[0] || "Learner";

  return (
    <div className="space-y-6">
      {/* Milestone detector — fires celebratory toasts */}
      <MilestoneDetector />

      <LearnerWelcomeHeader firstName={firstName} activeCount={activeEnrolments.length} overallProgress={overallProgress} />
      <LearnerStatsRow activeCount={activeEnrolments.length} credentialCount={credentials.length} submissionCount={submissions.length} overallProgress={overallProgress} />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LearnerEnrolmentsList enrolments={activeEnrolments} />
            <LearnerSubmissionsTable submissions={submissions} />
          </div>
          <div className="space-y-6">
            <LearnerStreakWidget />
            <LearnerCohortCompare />
            <LearnerDeadlineWidget />
            <LearnerAnalyticsWidget />
            <LearnerRecommendationsWidget />
            <CalendarWidget events={calendarEvents} />
            <LearnerCredentialWallet credentials={credentials} />
            <LearnerUpcomingSessions />
            <LearnerRecentAnnouncements />
          </div>
        </div>
      )}
    </div>
  );
}
