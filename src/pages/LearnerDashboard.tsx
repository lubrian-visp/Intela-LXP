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
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect, Component, ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Per-widget error boundary ────────────────────────────────────────────────
class WidgetErrorBoundary extends Component<
  { children: ReactNode; label: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground">{this.props.label} failed to load</p>
            <p className="text-[11px] text-muted-foreground">Try refreshing the page.</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] shrink-0"
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function LearnerDashboard() {
  usePageTitle("Dashboard", "Learner Portal");
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
      {/* Milestone detector — fires celebratory toasts on achievement */}
      <MilestoneDetector />

      {/* ── Welcome + KPI row ── */}
      <LearnerWelcomeHeader
        firstName={firstName}
        activeCount={activeEnrolments.length}
        overallProgress={overallProgress}
      />
      <LearnerStatsRow
        activeCount={activeEnrolments.length}
        credentialCount={credentials.length}
        submissionCount={submissions.length}
        overallProgress={overallProgress}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 1: Main content (2/3) + Streak + Cohort (1/3) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              <WidgetErrorBoundary label="My Programmes">
                <LearnerEnrolmentsList enrolments={activeEnrolments} />
              </WidgetErrorBoundary>

              <WidgetErrorBoundary label="Deadlines">
                <LearnerDeadlineWidget />
              </WidgetErrorBoundary>

              <WidgetErrorBoundary label="My Submissions">
                <LearnerSubmissionsTable submissions={submissions} />
              </WidgetErrorBoundary>
            </div>

            {/* Right sidebar — focus: motivation + progress */}
            <div className="space-y-6">
              <WidgetErrorBoundary label="Learning Streak">
                <LearnerStreakWidget />
              </WidgetErrorBoundary>

              <WidgetErrorBoundary label="Cohort Comparison">
                <LearnerCohortCompare />
              </WidgetErrorBoundary>

              <WidgetErrorBoundary label="My Analytics">
                <LearnerAnalyticsWidget />
              </WidgetErrorBoundary>
            </div>
          </div>

          {/* ── Row 2: Tabbed secondary widgets ── */}
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="h-9 gap-1 bg-secondary/60 border border-border/40 rounded-xl p-1">
              <TabsTrigger value="sessions"   className="text-[12px] rounded-lg px-3 h-7">📅 Upcoming Sessions</TabsTrigger>
              <TabsTrigger value="announcements" className="text-[12px] rounded-lg px-3 h-7">📣 Announcements</TabsTrigger>
              <TabsTrigger value="calendar"   className="text-[12px] rounded-lg px-3 h-7">🗓 Calendar</TabsTrigger>
              <TabsTrigger value="credentials" className="text-[12px] rounded-lg px-3 h-7">🏅 Credentials</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="sessions" className="mt-0">
                <WidgetErrorBoundary label="Upcoming Sessions">
                  <LearnerUpcomingSessions />
                </WidgetErrorBoundary>
              </TabsContent>

              <TabsContent value="announcements" className="mt-0">
                <WidgetErrorBoundary label="Announcements">
                  <LearnerRecentAnnouncements />
                </WidgetErrorBoundary>
              </TabsContent>

              <TabsContent value="calendar" className="mt-0">
                <WidgetErrorBoundary label="Calendar">
                  <CalendarWidget events={calendarEvents} />
                </WidgetErrorBoundary>
              </TabsContent>

              <TabsContent value="credentials" className="mt-0">
                <WidgetErrorBoundary label="My Credentials">
                  <LearnerCredentialWallet credentials={credentials} />
                </WidgetErrorBoundary>
              </TabsContent>
            </div>
          </Tabs>

          {/* ── Row 3: Recommendations (full width) ── */}
          <WidgetErrorBoundary label="Learning Recommendations">
            <LearnerRecommendationsWidget />
          </WidgetErrorBoundary>
        </>
      )}
    </div>
  );
}
