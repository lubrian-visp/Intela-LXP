import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PortalSwitcherProvider } from "@/hooks/usePortalSwitcher";
import { TenantProvider } from "@/hooks/useTenant";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleBasedLayout from "@/components/auth/RoleBasedLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SessionTimeoutDialog from "@/components/SessionTimeoutDialog";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

// Eager: landing + auth (critical path)
import LandingPage from "@/pages/LandingPage";
import Auth from "@/pages/Auth";
import TypographyProvider from "@/components/typography/TypographyProvider";
import { TenantBrandingProvider } from "@/hooks/useTenantBranding";


// Lazy: everything else
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerifyCredential = lazy(() => import("@/pages/VerifyCredential"));
const AcceptInvitation = lazy(() => import("@/pages/AcceptInvitation"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const InstallApp = lazy(() => import("@/pages/InstallApp"));
const HealthCheck = lazy(() => import("@/pages/HealthCheck"));

const RoleDashboardRedirect = lazy(() => import("@/components/auth/RoleDashboardRedirect"));
const Programmes = lazy(() => import("@/pages/Programmes"));
const ProgrammeBuilder = lazy(() => import("@/pages/ProgrammeBuilder"));
const Pathways = lazy(() => import("@/pages/Pathways"));
const Cohorts = lazy(() => import("@/pages/Cohorts"));
const Modules = lazy(() => import("@/pages/Modules"));
const Credentials = lazy(() => import("@/pages/Credentials"));
const Assessments = lazy(() => import("@/pages/Assessments"));
const AssessmentBuilderV2 = lazy(() => import("@/pages/AssessmentBuilderV2"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Tenants = lazy(() => import("@/pages/Tenants"));
const TenantAdmin = lazy(() => import("@/pages/TenantAdmin"));
const PlatformAnalytics = lazy(() => import("@/pages/PlatformAnalytics"));
const BillingConfig = lazy(() => import("@/pages/BillingConfig"));
const RolesPermissions = lazy(() => import("@/pages/RolesPermissions"));
const ProgrammeTypes = lazy(() => import("@/pages/ProgrammeTypes"));
const LearnerDashboard = lazy(() => import("@/pages/LearnerDashboard"));
const FacilitatorDashboard = lazy(() => import("@/pages/FacilitatorDashboard"));
const PortfolioOfEvidence = lazy(() => import("@/pages/PortfolioOfEvidence"));
const LearnerOnboarding = lazy(() => import("@/pages/LearnerOnboarding"));
const StaffOnboarding = lazy(() => import("@/pages/StaffOnboarding"));
const AdminStaffPool  = lazy(() => import("@/pages/AdminStaffPool"));
const TalentManagement = lazy(() => import("@/pages/TalentManagement"));
const TalentManagerPortal = lazy(() => import("@/pages/TalentManagerPortal"));
const SponsorPartner = lazy(() => import("@/pages/SponsorPartner"));
const SponsorPortal = lazy(() => import("@/pages/SponsorPortal"));
const AssessorPortal = lazy(() => import("@/pages/AssessorPortal"));
const MentorPortal = lazy(() => import("@/pages/MentorPortal"));
const ProgrammeManagerPortal = lazy(() => import("@/pages/ProgrammeManagerPortal"));
const ModeratorPortal = lazy(() => import("@/pages/ModeratorPortal"));
const OperationsPortal = lazy(() => import("@/pages/OperationsPortal"));
const PopiaCompliance = lazy(() => import("@/pages/PopiaCompliance"));
const TrainingSessions = lazy(() => import("@/pages/TrainingSessions"));
const SessionRoom = lazy(() => import("@/pages/SessionRoom"));
const Discussions = lazy(() => import("@/pages/Discussions"));
const AnnouncementsManager = lazy(() => import("@/pages/AnnouncementsManager"));
const SystemsAdminPortal = lazy(() => import("@/pages/SystemsAdminPortal"));
const LearnerProgrammes = lazy(() => import("@/pages/LearnerProgrammes"));
const LearnerProgrammeDetail = lazy(() => import("@/pages/LearnerProgrammeDetail"));
const LearnerAssessments = lazy(() => import("@/pages/LearnerAssessments"));
const LearnerSessions = lazy(() => import("@/pages/LearnerSessions"));
const LearnerAnnouncements = lazy(() => import("@/pages/LearnerAnnouncements"));
const UserDirectory = lazy(() => import("@/pages/UserDirectory"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const UnifiedAuditLog = lazy(() => import("@/pages/UnifiedAuditLog"));
const SystemHealth = lazy(() => import("@/pages/SystemHealth"));
const ApprovalQueue = lazy(() => import("@/pages/ApprovalQueue"));
const SponsorLearners = lazy(() => import("@/pages/SponsorLearners"));
const SponsorReports = lazy(() => import("@/pages/SponsorReports"));
const SponsorComplianceDashboard = lazy(() => import("@/pages/SponsorComplianceDashboard"));
const SponsorNotifications = lazy(() => import("@/pages/SponsorNotifications"));
const SponsorMessages = lazy(() => import("@/pages/SponsorMessages"));
const SponsorInvoices = lazy(() => import("@/pages/SponsorInvoices"));
const SponsorQuotes = lazy(() => import("@/pages/SponsorQuotes"));
const ProviderQuoteManagement = lazy(() => import("@/pages/ProviderQuoteManagement"));
const FacilitatorLearnerProgress = lazy(() => import("@/pages/FacilitatorLearnerProgress"));
const FacilitatorEngagement = lazy(() => import("@/pages/FacilitatorEngagement"));
const AssessorQueue = lazy(() => import("@/pages/AssessorQueue"));
const AssessorReport = lazy(() => import("@/pages/AssessorReport"));
const AssessorReportTemplates = lazy(() => import("@/pages/AssessorReportTemplates"));
const AssessorHistory = lazy(() => import("@/pages/AssessorHistory"));
const ModeratorQueue = lazy(() => import("@/pages/ModeratorQueue"));
const ModeratorReports = lazy(() => import("@/pages/ModeratorReports"));
const ModeratorQAReport = lazy(() => import("@/pages/ModeratorQAReport"));
const MentorMentees = lazy(() => import("@/pages/MentorMentees"));
const MentorEvidence = lazy(() => import("@/pages/MentorEvidence"));
const MentorSessions = lazy(() => import("@/pages/MentorSessions"));
const MentorGoals = lazy(() => import("@/pages/MentorGoals"));
const MentorMessages = lazy(() => import("@/pages/MentorMessages"));
const MentorFeedback = lazy(() => import("@/pages/MentorFeedback"));
const SponsorOnboarding = lazy(() => import("@/pages/SponsorOnboarding"));
const SponsorProfilePage = lazy(() => import("@/pages/SponsorProfilePage"));
const SponsorLinkingPage = lazy(() => import("@/pages/SponsorLinkingPage"));
const MySettings = lazy(() => import("@/pages/MySettings"));
const MyProfile = lazy(() => import("@/pages/MyProfile"));
const CohortManagement = lazy(() => import("@/pages/CohortManagement"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const FontManager = lazy(() => import("@/pages/FontManager"));
const WorkflowManager = lazy(() => import("@/pages/WorkflowManager"));
const AssessmentAnalytics = lazy(() => import("@/pages/AssessmentAnalytics"));
const AssessmentCoverageReport = lazy(() => import("@/pages/AssessmentCoverageReport"));
const LearnerComparisonMatrix = lazy(() => import("@/pages/LearnerComparisonMatrix"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const Transcript = lazy(() => import("@/pages/Transcript"));
const Gradebook = lazy(() => import("@/pages/Gradebook"));
const LearnerGrades = lazy(() => import("@/pages/LearnerGrades"));
const AttendanceComplianceReport = lazy(() => import("@/pages/AttendanceComplianceReport"));
const QrCheckin = lazy(() => import("@/pages/QrCheckin"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const DynamicRolePortal = lazy(() => import("@/pages/DynamicRolePortal"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SkillsManager = lazy(() => import("@/pages/SkillsManager"));
const ContentContributions = lazy(() => import("@/pages/ContentContributions"));
const ContentLibrary = lazy(() => import("@/pages/ContentLibrary"));
const LxpAnalytics = lazy(() => import("@/pages/LxpAnalytics"));
const QuizPage = lazy(() => import("@/pages/QuizPage"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const DesignManager = lazy(() => import("@/pages/DesignManager"));
const SharedContentLibrary = lazy(() => import("@/pages/SharedContentLibrary"));
const ChallengeExams = lazy(() => import("@/pages/ChallengeExams"));
const ExecutiveDashboard = lazy(() => import("@/pages/ExecutiveDashboard"));
const WbtMarketplace = lazy(() => import("@/pages/WbtMarketplace"));
const WbtProjectDetail = lazy(() => import("@/pages/WbtProjectDetail"));
const WbtAgileBoard = lazy(() => import("@/pages/WbtAgileBoard"));
const WbtAnalytics = lazy(() => import("@/pages/WbtAnalytics"));
const WbtClientPortal = lazy(() => import("@/pages/WbtClientPortal"));

const PageLoader = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-9 w-32 rounded-md bg-muted" />
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-7 w-16 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="space-y-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-4 rounded bg-muted" style={{ width: `${75 + (j % 3) * 10}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min — avoid refetching on every navigation
      gcTime: 10 * 60 * 1000,   // 10 min garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SessionTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const { showWarning, extendSession, logout } = useSessionTimeout();
  return (
    <>
      {children}
      <SessionTimeoutDialog open={showWarning} onExtend={extendSession} onLogout={logout} />
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
            <PortalSwitcherProvider>
              <TypographyProvider />
              <TenantBrandingProvider>
              <SessionTimeoutWrapper>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify" element={<VerifyCredential />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/install" element={<InstallApp />} />
                <Route path="/health-check" element={<HealthCheck />} />


                {/* All protected routes */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <RoleBasedLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/dashboard" element={<RoleDashboardRedirect />} />
                          <Route path="/learner" element={<LearnerDashboard />} />
                          <Route path="/learner/dashboard" element={<Navigate to="/learner" replace />} />
                          <Route path="/learner/onboarding" element={<LearnerOnboarding />} />
                          <Route path="/learner/programmes" element={<LearnerProgrammes />} />
                          <Route path="/learner/programmes/:enrolmentId" element={<LearnerProgrammeDetail />} />
                          <Route path="/learner/assessments" element={<LearnerAssessments />} />
                          <Route path="/learner/sessions" element={<LearnerSessions />} />
                          <Route path="/learner/announcements" element={<LearnerAnnouncements />} />
                          <Route path="/learner/grades" element={<LearnerGrades />} />
                          <Route path="/portfolio" element={<PortfolioOfEvidence />} />
                          <Route path="/transcript" element={<Transcript />} />
                          <Route path="/gradebook" element={<Gradebook />} />
                          <Route path="/credentials" element={<Credentials />} />
                          <Route path="/staff/onboarding" element={<StaffOnboarding />} />
                          <Route path="/admin/staff-pool" element={<AdminStaffPool />} />
                          <Route path="/facilitator" element={<FacilitatorDashboard />} />
                          <Route path="/programmes" element={<Programmes />} />
                          <Route path="/programmes/:programmeId/builder" element={<ProgrammeBuilder />} />
                          <Route path="/pathways" element={<Pathways />} />
                          <Route path="/cohorts" element={<Cohorts />} />
                          <Route path="/cohort-management" element={<CohortManagement />} />
                          <Route path="/modules" element={<Modules />} />
                          <Route path="/assessments" element={<Assessments />} />
                          <Route path="/assessments/:assessmentId/builder-v2" element={<AssessmentBuilderV2 />} />
                          <Route path="/assessment-analytics" element={<AssessmentAnalytics />} />
                          <Route path="/assessment-coverage" element={<AssessmentCoverageReport />} />
                          <Route path="/learner-comparison" element={<LearnerComparisonMatrix />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/talent" element={<TalentManagement />} />
                          <Route path="/talent-manager" element={<TalentManagerPortal />} />
                          <Route path="/sponsors" element={<SponsorPartner />} />
                          <Route path="/sponsor-portal" element={<SponsorPortal />} />
                          <Route path="/assessor" element={<AssessorPortal />} />
                          <Route path="/mentor" element={<MentorPortal />} />
                          <Route path="/moderator" element={<ModeratorPortal />} />
                          <Route path="/operations" element={<OperationsPortal />} />
                          <Route path="/programme-manager" element={<ProgrammeManagerPortal />} />
                          <Route path="/systems-admin" element={<SystemsAdminPortal />} />
                          <Route path="/admin/programme-types" element={<ProgrammeTypes />} />
                          <Route path="/admin/tenants" element={<Tenants />} />
                          <Route path="/tenant-admin" element={<TenantAdmin />} />
                          <Route path="/admin/platform-analytics" element={<PlatformAnalytics />} />
                          <Route path="/admin/billing-config" element={<BillingConfig />} />
                          <Route path="/admin/roles" element={<RolesPermissions />} />
                          <Route path="/admin/popia" element={<PopiaCompliance />} />
                          <Route path="/admin/settings" element={<MySettings />} />
                          <Route path="/admin/typography" element={<FontManager />} />
                          <Route path="/admin/users" element={<UserDirectory />} />
                          <Route path="/admin/workflows" element={<WorkflowManager />} />
                          <Route path="/admin/integrations" element={<Integrations />} />
                          <Route path="/admin/audit-logs" element={<AuditLogs />} />
                          <Route path="/admin/unified-audit" element={<UnifiedAuditLog />} />
                          <Route path="/admin/system-health" element={<SystemHealth />} />
                          <Route path="/approvals" element={<ApprovalQueue />} />
                          <Route path="/sponsor/learners" element={<SponsorLearners />} />
                          <Route path="/sponsor/reports" element={<SponsorReports />} />
                          <Route path="/sponsor/compliance" element={<SponsorComplianceDashboard />} />
                          <Route path="/sponsor/profile" element={<SponsorProfilePage />} />
                          <Route path="/sponsor/onboarding" element={<SponsorOnboarding />} />
                          <Route path="/sponsor/linking" element={<SponsorLinkingPage />} />
                          <Route path="/sponsor/notifications" element={<SponsorNotifications />} />
                          <Route path="/sponsor/messages" element={<SponsorMessages />} />
                          <Route path="/sponsor/invoices" element={<SponsorInvoices />} />
                          <Route path="/sponsor/quotes" element={<SponsorQuotes />} />
                          <Route path="/provider/quotes" element={<ProviderQuoteManagement />} />
                          <Route path="/facilitator/learner-progress" element={<FacilitatorLearnerProgress />} />
                          <Route path="/assessor/queue" element={<AssessorQueue />} />
                          <Route path="/assessor/report" element={<AssessorReport />} />
                          <Route path="/assessor/report-templates" element={<AssessorReportTemplates />} />
                          <Route path="/assessor/history" element={<AssessorHistory />} />
                          <Route path="/moderator/queue" element={<ModeratorQueue />} />
                          <Route path="/moderator/reports" element={<ModeratorReports />} />
                          <Route path="/moderator/qa-report" element={<ModeratorQAReport />} />
                          <Route path="/mentor/mentees" element={<MentorMentees />} />
                          <Route path="/mentor/evidence" element={<MentorEvidence />} />
                          <Route path="/mentor/sessions" element={<MentorSessions />} />
                          <Route path="/mentor/goals" element={<MentorGoals />} />
                          <Route path="/mentor/messages" element={<MentorMessages />} />
                          <Route path="/mentor/feedback" element={<MentorFeedback />} />
                          <Route path="/facilitator/engagement" element={<FacilitatorEngagement />} />
                          <Route path="/sessions" element={<TrainingSessions />} />
                          <Route path="/sessions/:sessionId" element={<SessionRoom />} />
                          <Route path="/attendance-compliance" element={<AttendanceComplianceReport />} />
                          <Route path="/qr-checkin" element={<QrCheckin />} />
                          <Route path="/discussions" element={<Discussions />} />
                          <Route path="/announcements" element={<AnnouncementsManager />} />
                          <Route path="/profile/:userId" element={<UserProfile />} />
                          <Route path="/my-settings" element={<MySettings />} />
                          <Route path="/my-profile" element={<MyProfile />} />
                          <Route path="/help" element={<HelpCenter />} />
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/skills" element={<SkillsManager />} />
                          <Route path="/content-contributions" element={<ContentContributions />} />
                          <Route path="/content-library" element={<ContentLibrary />} />
                          <Route path="/lxp-analytics" element={<LxpAnalytics />} />
                          <Route path="/quiz/:assessmentId" element={<QuizPage />} />
                          <Route path="/achievements" element={<Achievements />} />
                          <Route path="/admin/design-manager" element={<DesignManager />} />
                          <Route path="/shared-content" element={<SharedContentLibrary />} />
                          <Route path="/challenge-exams" element={<ChallengeExams />} />
                          <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
                          <Route path="/wbt" element={<WbtMarketplace />} />
                          <Route path="/wbt/project/:projectId" element={<WbtProjectDetail />} />
                          <Route path="/wbt/board/:projectId" element={<WbtAgileBoard />} />
                          <Route path="/wbt/analytics" element={<WbtAnalytics />} />
                          <Route path="/wbt/client-portal" element={<WbtClientPortal />} />
                          <Route path="/portal/:roleKey" element={<DynamicRolePortal />} />
                          <Route path="/portal/:roleKey/*" element={<DynamicRolePortal />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </RoleBasedLayout>
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
              </SessionTimeoutWrapper>
              </TenantBrandingProvider>
            </PortalSwitcherProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
