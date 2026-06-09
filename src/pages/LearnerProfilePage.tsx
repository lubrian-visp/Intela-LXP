/**
 * LearnerProfilePage
 * Comprehensive, modern learner profile — designed for both the learner
 * viewing their own profile and for admins/PMs reviewing a learner.
 */
import { useState, useMemo } from "react";
import { useRealtimeSync } from "@/hooks/useCoreData";
import { useMentorFeedbackForLearner } from "@/hooks/useAssessorReports";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail, Phone, MapPin, Building2, Calendar, User,
  GraduationCap, BookOpen, Award, ClipboardCheck, TrendingUp,
  FileText, Shield, Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, ArrowLeft, Edit2, MoreHorizontal, Users,
  Activity, BarChart3, Target, Star, Layers, Download, Lock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import AdminPasswordResetButton from "@/components/admin/AdminPasswordResetButton";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    active:    "bg-green-500/10 text-green-600 border-green-500/20",
    enrolled:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
    completed: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    pending:   "bg-orange-500/10 text-orange-600 border-orange-500/20",
    passed:    "bg-green-500/10 text-green-600 border-green-500/20",
    failed:    "bg-rose-500/10 text-rose-600 border-rose-500/20",
    graded:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    withdrawn: "bg-muted text-muted-foreground border-border",
    draft:     "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize", cfg[status] ?? "bg-secondary text-foreground border-border")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", color.split(" ")[0])}>
          <Icon className={cn("w-4 h-4", color.split(" ")[1])} />
        </div>
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useLearnerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["learner_profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profileRes, rolesRes, enrolRes, subRes, credRes, regRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId!).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        (supabase as any).from("enrolments").select(`
          *, cohorts(id, name, start_date, end_date, status, programme_id,
            programmes(id, title, nqf_level, status, programme_types(name, color)))
        `).eq("learner_id", userId!).order("enrolled_at", { ascending: false }),
        (supabase as any).from("assessment_submissions").select(`
          id, status, score, submitted_at, created_at,
          assessments(title, max_score, pass_mark, assessment_type)
        `).eq("learner_id", userId!).order("created_at", { ascending: false }),
        (supabase as any).from("issued_credentials").select(`
          id, title, credential_type, status, issued_at, expires_at,
          programmes(title)
        `).eq("learner_id", userId!).order("issued_at", { ascending: false }),
        (supabase as any).from("learner_registrations").select(
          "id, full_name, email, phone, national_id, date_of_birth, gender, country, education_level, learner_number, status, created_at, programme_name, registration_method, notes"
        ).eq("user_id", userId!).maybeSingle(),
      ]);

      return {
        profile:      profileRes.data,
        roles:        (rolesRes.data ?? []).map((r: any) => r.role as string),
        enrolments:   enrolRes.data  ?? [],
        submissions:  subRes.data    ?? [],
        credentials:  credRes.data   ?? [],
        registration: regRes.data,
      };
    },
  });
}

function useAuditActivity(userId: string | undefined) {
  return useQuery({
    queryKey: ["learner_activity", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_audit_log")
        .select("*")
        .eq("entity_type", "learner")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });
}

type ProfileTab = "overview" | "academic" | "assessments" | "credentials" | "activity" | "mentor";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LearnerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, roles: currentRoles } = useAuth();
  const navigate = useNavigate();

  const targetId  = userId === "me" || !userId ? currentUser?.id : userId;
  const isSelf    = targetId === currentUser?.id;

  // Real-time sync — ensures assessor grades and facilitator activity grades
  // update this profile without requiring a manual page refresh (cross-portal sync fix)
  useRealtimeSync(["assessment_submissions", "activity_grades", "issued_credentials", "enrolments"]);
  const isAdmin   = (currentRoles as string[]).some(r =>
    ["super_admin","systems_admin","operations","programme_manager"].includes(r)
  );

  const [tab, setTab] = useState<ProfileTab>("overview");

  const { data, isLoading } = useLearnerProfile(targetId);
  const { data: activityLog = [] } = useAuditActivity(targetId);
  // Mentor feedback — previously write-only from learner's view (Journey 7 fix)
  const { data: mentorReports = [] } = useMentorFeedbackForLearner(targetId);

  const { profile, roles = [], enrolments = [], submissions = [], credentials = [], registration } = data ?? {};

  const handlePOPIAExport = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      personal_information: {
        full_name:       registration?.full_name ?? (profile as any)?.full_name,
        email:           registration?.email ?? email,
        phone:           registration?.phone ?? (profile as any)?.phone,
        date_of_birth:   registration?.date_of_birth,
        national_id:     registration?.national_id ? "REDACTED for download" : null,
        gender:          registration?.gender,
        country:         registration?.country,
        education_level: registration?.education_level,
      },
      academic_record: {
        enrolments: enrolments.map((e: any) => ({
          programme: e.cohorts?.programmes?.title,
          cohort:    e.cohorts?.name,
          status:    e.status,
          progress:  e.progress_percentage,
          enrolled_at: e.enrolled_at,
        })),
        assessments: submissions.map((s: any) => ({
          title:        s.assessments?.title,
          status:       s.status,
          score:        s.score,
          submitted_at: s.submitted_at,
        })),
        credentials: credentials.map((c: any) => ({
          title:           c.title,
          type:            c.credential_type,
          issued_at:       c.issued_at,
          blockchain_hash: c.blockchain_hash,
        })),
      },
      note: "This data export is provided in accordance with POPIA Section 23 (Right of access to personal information).",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `InteLa_LXP_My_Data_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // POPIA compliance: log every data export to the audit trail
    supabase.from("onboarding_audit_log").insert({
      action:      "popia_data_export",
      entity_type: "learner",
      entity_id:   targetId,
      performed_by: currentUser?.id ?? null,
      details: {
        exported_by: isSelf ? "self" : "admin",
        fields_exported: ["personal_information", "academic_record", "credentials"],
        format: "json",
        timestamp: new Date().toISOString(),
      },
    }).then(() => {}); // fire-and-forget, non-blocking
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const activeEnrolments = useMemo(() =>
    enrolments.filter((e: any) => e.status === "active" || e.status === "enrolled"), [enrolments]);
  const completedEnrolments = useMemo(() =>
    enrolments.filter((e: any) => e.status === "completed"), [enrolments]);
  const avgProgress = useMemo(() => {
    if (!activeEnrolments.length) return 0;
    return Math.round(activeEnrolments.reduce((s: number, e: any) => s + (e.progress_percentage ?? 0), 0) / activeEnrolments.length);
  }, [activeEnrolments]);
  const passRate = useMemo(() => {
    const graded = submissions.filter((s: any) => s.status === "graded" || s.status === "passed" || s.status === "failed");
    if (!graded.length) return null;
    const passed = graded.filter((s: any) => {
      const score = s.score ?? 0;
      const pass  = s.assessments?.pass_mark ?? 50;
      const max   = s.assessments?.max_score ?? 100;
      return (score / max) * 100 >= pass;
    });
    return Math.round((passed.length / graded.length) * 100);
  }, [submissions]);

  const displayName = (profile as any)?.full_name ?? registration?.full_name ?? "Learner";
  const email       = isSelf ? currentUser?.email : registration?.email;

  const tabs: { key: ProfileTab; label: string; count?: number }[] = [
    { key: "overview",     label: "Overview" },
    { key: "academic",     label: "Academic Journey", count: enrolments.length },
    { key: "assessments",  label: "Assessments",      count: submissions.length },
    { key: "credentials",  label: "Credentials",      count: credentials.length },
    { key: "activity",     label: "Activity Log" },
    // Only show Mentor Feedback tab when there is feedback to display
    ...(mentorReports.length > 0 ? [{ key: "mentor" as ProfileTab, label: "Mentor Feedback", count: mentorReports.length }] : []),
  ];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 p-4">
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Back navigation ── */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* ══ HERO CARD ══ */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Colour banner */}
        <div className="h-24 bg-gradient-to-br from-sidebar via-sidebar/80 to-primary/20 relative">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 60%)" }} />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Avatar className="w-20 h-20 border-4 border-card shadow-lg">
              <AvatarImage src={(profile as any)?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            {/* Admin actions */}
            {isAdmin && email && (
              <div className="flex items-center gap-2">
                <AdminPasswordResetButton email={email} userName={displayName} variant="button" className="text-xs" />
                {!isSelf && (
                  <Button variant="outline" size="sm" className="text-xs gap-1.5"
                    onClick={() => navigate(`/learner/onboarding`)}>
                    <GraduationCap className="w-3.5 h-3.5" /> Manage
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Name + metadata */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                {registration?.learner_number && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                    LRN: {registration.learner_number}
                  </span>
                )}
              </div>

              {/* Role badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.map((r: string) => (
                  <span key={r} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                    {r.replace(/_/g, " ")}
                  </span>
                ))}
                {activeEnrolments.length > 0 && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                    {activeEnrolments.length} Active Enrolment{activeEnrolments.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Contact grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Mail,      val: email },
                { icon: Phone,     val: registration?.phone || (profile as any)?.phone },
                { icon: MapPin,    val: registration?.country || (profile as any)?.location },
                { icon: Building2, val: (profile as any)?.organisation || registration?.education_level },
              ].map(({ icon: Icon, val }, i) => val && (
                <div key={i} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="truncate">{val}</span>
                </div>
              ))}
            </div>

            {/* Active cohorts strip */}
            {activeEnrolments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeEnrolments.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/8 border border-blue-500/15">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[11px] font-medium text-foreground">{e.cohorts?.name}</span>
                    {e.cohorts?.programmes?.title && (
                      <span className="text-[10px] text-muted-foreground">· {e.cohorts.programmes.title}</span>
                    )}
                    <span className="text-[10px] font-bold text-blue-600">{e.progress_percentage ?? 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Programmes" value={activeEnrolments.length}
          sub={`${completedEnrolments.length} completed`}
          icon={GraduationCap} color="bg-blue-500/10 text-blue-500" />
        <KpiCard label="Overall Progress" value={`${avgProgress}%`}
          sub="across active"
          icon={TrendingUp} color="bg-green-500/10 text-green-500" />
        <KpiCard label="Assessments" value={submissions.length}
          sub={passRate !== null ? `${passRate}% pass rate` : "no results yet"}
          icon={ClipboardCheck} color="bg-orange-500/10 text-orange-500" />
        <KpiCard label="Credentials Earned" value={credentials.filter((c: any) => c.status === "issued").length}
          sub={`${credentials.length} total`}
          icon={Award} color="bg-purple-500/10 text-purple-500" />
      </div>

      {/* ══ TABS + CONTENT ══ */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border overflow-x-auto px-4 pt-4 gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors",
                tab === t.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Personal details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
                  <div className="rounded-xl border border-border/50 divide-y divide-border/30">
                    {[
                      { label: "Full Name",       val: displayName },
                      { label: "Learner Number",  val: registration?.learner_number },
                      { label: "ID / Passport",   val: registration?.national_id ? `••••${registration.national_id.slice(-4)}` : null },
                      { label: "Date of Birth",   val: registration?.date_of_birth ? format(new Date(registration.date_of_birth), "d MMM yyyy") : null },
                      { label: "Gender",          val: registration?.gender },
                      { label: "Country",         val: registration?.country },
                      { label: "Education",       val: registration?.education_level },
                    ].filter(r => r.val).map(r => (
                      <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[12px] text-muted-foreground">{r.label}</span>
                        <span className="text-[13px] font-medium text-foreground">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registration info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Registration Details</h3>
                  <div className="rounded-xl border border-border/50 divide-y divide-border/30">
                    {[
                      { label: "Status",       val: registration?.status, badge: true },
                      { label: "Method",       val: registration?.registration_method?.replace(/-/g, " ") },
                      { label: "Programme",    val: registration?.programme_name },
                      { label: "Registered",   val: registration?.created_at ? format(new Date(registration.created_at), "d MMM yyyy") : null },
                    ].filter(r => r.val).map(r => (
                      <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[12px] text-muted-foreground">{r.label}</span>
                        {r.badge
                          ? <StatusBadge status={r.val as string} />
                          : <span className="text-[13px] font-medium text-foreground capitalize">{r.val}</span>
                        }
                      </div>
                    ))}
                  </div>

                  {/* Progress overview */}
                  {activeEnrolments.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <h3 className="text-sm font-semibold text-foreground">Current Progress</h3>
                      {activeEnrolments.slice(0, 3).map((e: any) => (
                        <div key={e.id} className="space-y-1">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-foreground font-medium truncate">{e.cohorts?.programmes?.title ?? "Programme"}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">{e.progress_percentage ?? 0}%</span>
                          </div>
                          <Progress value={e.progress_percentage ?? 0} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {registration?.notes && (
                <div className="px-4 py-3 rounded-xl bg-secondary/30 border border-border/40">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-[13px] text-foreground">{registration.notes}</p>
                </div>
              )}

              {/* POPIA data export — own profile only */}
              {isSelf && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary/20 border border-border/40">
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-foreground">Your Data Rights (POPIA)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Download a copy of all personal information held about you on this platform.
                    </p>
                  </div>
                  <button
                    onClick={handlePOPIAExport}
                    aria-label="Download your personal data (POPIA Section 23)"
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Export My Data
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Academic Journey ── */}
          {tab === "academic" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Enrolment History</h3>
                <span className="text-[11px] text-muted-foreground">{enrolments.length} record{enrolments.length !== 1 ? "s" : ""}</span>
              </div>

              {enrolments.length === 0 ? (
                <div className="py-12 text-center">
                  <GraduationCap className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No enrolments yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolments.map((e: any) => {
                    const prog = e.cohorts?.programmes;
                    const cohort = e.cohorts;
                    return (
                      <div key={e.id} className="rounded-xl border border-border/50 p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                            style={{ backgroundColor: prog?.programme_types?.color ?? "#888" }}>
                            {(prog?.title ?? "P").substring(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{prog?.title ?? "Programme"}</p>
                              {prog?.nqf_level && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">NQF L{prog.nqf_level}</span>
                              )}
                              <StatusBadge status={e.status} />
                            </div>
                            {cohort && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Layers className="w-3 h-3" /> {cohort.name}
                                {cohort.start_date && (
                                  <span className="ml-1">· {format(new Date(cohort.start_date), "MMM yyyy")}</span>
                                )}
                              </p>
                            )}
                            {e.enrolled_at && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Enrolled {format(new Date(e.enrolled_at), "d MMM yyyy")}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-foreground">{e.progress_percentage ?? 0}%</p>
                            <p className="text-[10px] text-muted-foreground">Progress</p>
                          </div>
                        </div>
                        {(e.progress_percentage ?? 0) > 0 && (
                          <Progress value={e.progress_percentage ?? 0} className="h-1.5 mt-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Assessments ── */}
          {tab === "assessments" && (
            <div className="space-y-4">
              {/* Summary */}
              {submissions.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total",    val: submissions.length,                                         color: "bg-blue-500/10 text-blue-600" },
                    { label: "Pending",  val: submissions.filter((s: any) => s.status === "pending").length, color: "bg-orange-500/10 text-orange-600" },
                    { label: "Graded",   val: submissions.filter((s: any) => ["graded","passed","failed"].includes(s.status)).length, color: "bg-green-500/10 text-green-600" },
                    { label: "Pass Rate",val: passRate !== null ? `${passRate}%` : "—",                   color: passRate !== null && passRate >= 50 ? "bg-green-500/10 text-green-600" : "bg-rose-500/10 text-rose-600" },
                  ].map(s => (
                    <div key={s.label} className={cn("rounded-xl p-3 text-center", s.color.split(" ")[0])}>
                      <p className={cn("text-xl font-bold", s.color.split(" ")[1])}>{s.val}</p>
                      <p className="text-[10px] mt-0.5 text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {submissions.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardCheck className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No assessment submissions yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assessment</th>
                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                        <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {submissions.map((s: any) => {
                        const maxScore = s.assessments?.max_score;
                        const passMark = s.assessments?.pass_mark;
                        const scorePct = s.score != null && maxScore ? Math.round((s.score / maxScore) * 100) : null;
                        const isPassing = scorePct !== null && passMark !== null ? scorePct >= passMark : null;
                        return (
                          <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-5 py-3">
                              <p className="text-[13px] font-medium text-foreground">{s.assessments?.title ?? "Assessment"}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] capitalize text-muted-foreground">
                                {s.assessments?.assessment_type?.replace(/_/g, " ") ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s.score != null ? (
                                <span className={cn("text-sm font-bold", isPassing === true ? "text-green-600" : isPassing === false ? "text-rose-600" : "text-foreground")}>
                                  {s.score}/{maxScore ?? "—"}
                                  {scorePct !== null && <span className="text-[10px] font-normal ml-1 text-muted-foreground">({scorePct}%)</span>}
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
                            <td className="px-5 py-3 text-right text-[11px] text-muted-foreground">
                              {s.submitted_at ? format(new Date(s.submitted_at), "d MMM yyyy") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Credentials ── */}
          {tab === "credentials" && (
            <div className="space-y-4">
              {credentials.length === 0 ? (
                <div className="py-12 text-center">
                  <Award className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No credentials issued yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {credentials.map((c: any) => (
                    <div key={c.id} className="rounded-xl border border-border/50 p-4 bg-gradient-to-br from-card to-secondary/20 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">{c.title}</p>
                          {c.programmes?.title && (
                            <p className="text-[11px] text-muted-foreground">{c.programmes.title}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <StatusBadge status={c.status} />
                            <span className="text-[10px] capitalize text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              {c.credential_type?.replace(/_/g, " ")}
                            </span>
                          </div>
                          {c.issued_at && (
                            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Issued {format(new Date(c.issued_at), "d MMM yyyy")}
                              {c.expires_at && ` · Expires ${format(new Date(c.expires_at), "d MMM yyyy")}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Activity ── */}
          {tab === "activity" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              {activityLog.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No activity recorded.</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border/40" />
                  {activityLog.slice(0, 20).map((entry: any) => (
                    <div key={entry.id} className="flex gap-4 pb-4 pl-1">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10 ring-2 ring-background">
                        <Activity className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[13px] font-medium text-foreground capitalize">
                          {entry.action.replace(/_/g, " ")}
                        </p>
                        {entry.details && typeof entry.details === "object" && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                            {Object.entries(entry.details)
                              .filter(([, v]) => v && String(v).length < 50)
                              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      <time className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Mentor Feedback (Journey 7 fix — was invisible to learner) ── */}
          {tab === "mentor" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Mentor & Assessor Feedback
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Workplace guidance and mentor observations recorded in your assessment reports.
                </p>
              </div>
              {mentorReports.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No mentor feedback recorded yet.</div>
              ) : (
                <div className="space-y-4">
                  {mentorReports.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-semibold text-foreground">{r.programme_name ?? "Assessment Report"}</p>
                        {r.report_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(r.report_date), "d MMM yyyy")}
                          </span>
                        )}
                      </div>
                      {r.section5_mentor_update && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mentor Update</p>
                          <p className="text-sm text-foreground leading-relaxed bg-secondary/20 rounded-lg p-3">{r.section5_mentor_update}</p>
                        </div>
                      )}
                      {r.section5_difficulties && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-warning" /> Learner with Difficulties
                          </p>
                          <p className="text-sm text-foreground leading-relaxed bg-warning/5 border border-warning/20 rounded-lg p-3">{r.section5_difficulties}</p>
                        </div>
                      )}
                      {r.section5_conflicts && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Conflict Notes</p>
                          <p className="text-sm text-foreground leading-relaxed bg-secondary/20 rounded-lg p-3">{r.section5_conflicts}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
