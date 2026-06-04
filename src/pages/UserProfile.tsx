import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Phone, Briefcase, Building2, MapPin, Calendar,
  GraduationCap, BookOpen, Users, ClipboardCheck, Shield, Star,
  Award, FileText, BarChart3, Clock
} from "lucide-react";

const roleBadgeColor: Record<string, string> = {
  super_admin: "bg-destructive text-destructive-foreground",
  systems_admin: "bg-info text-info-foreground",
  programme_manager: "bg-accent text-accent-foreground",
  operations: "bg-warning text-warning-foreground",
  facilitator: "bg-success text-success-foreground",
  learner: "bg-primary text-primary-foreground",
  assessor: "bg-info text-info-foreground",
  moderator: "bg-accent text-accent-foreground",
  mentor: "bg-success text-success-foreground",
  sponsor: "bg-warning text-warning-foreground",
  talent_manager: "bg-primary text-primary-foreground",
};

const roleLabel = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const targetId = userId === "me" || !userId ? currentUser?.id : userId;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user_profile", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", targetId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user_roles_profile", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", targetId!);
      if (error) throw error;
      return data.map((r: any) => r.role as string);
    },
  });

  const { data: userEmail } = useQuery({
    queryKey: ["user_email", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      if (targetId === currentUser?.id) return currentUser?.email ?? null;
      const { data } = await supabase.from("learner_registrations").select("email").eq("id", targetId!).maybeSingle();
      return data?.email ?? null;
    },
  });

  const roles = userRoles ?? [];
  const isLearner = roles.includes("learner");
  const isFacilitator = roles.includes("facilitator");
  const isAssessor = roles.includes("assessor");
  const isModerator = roles.includes("moderator");
  const isMentor = roles.includes("mentor");
  const isProgrammeManager = roles.includes("programme_manager");
  const isSponsor = roles.includes("sponsor");

  const { data: enrolments } = useQuery({
    queryKey: ["profile_enrolments", targetId],
    enabled: !!targetId && isLearner,
    queryFn: async () => {
      const { data, error } = await supabase.from("enrolments").select("*, cohorts(name, programmes(title))").eq("learner_id", targetId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["profile_submissions", targetId],
    enabled: !!targetId && isLearner,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_submissions").select("id, status, score").eq("learner_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: credentials } = useQuery({
    queryKey: ["profile_credentials", targetId],
    enabled: !!targetId && isLearner,
    queryFn: async () => {
      const { data, error } = await supabase.from("issued_credentials").select("id, title, credential_type, status, issued_at, programmes(title)").eq("learner_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: facilitatorCohorts } = useQuery({
    queryKey: ["profile_facilitator_cohorts", targetId],
    enabled: !!targetId && isFacilitator,
    queryFn: async () => {
      const { data, error } = await supabase.from("cohorts").select("id, name, status, start_date, end_date, programmes(title)").eq("facilitator_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: assessorSubmissions } = useQuery({
    queryKey: ["profile_assessor_subs", targetId],
    enabled: !!targetId && isAssessor,
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_submissions").select("id, status").eq("assessor_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: moderationItems } = useQuery({
    queryKey: ["profile_moderation", targetId],
    enabled: !!targetId && isModerator,
    queryFn: async () => {
      const { data, error } = await supabase.from("moderation_items").select("id, status").eq("reviewed_by", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: menteeEnrolments } = useQuery({
    queryKey: ["profile_mentees", targetId],
    enabled: !!targetId && isMentor,
    queryFn: async () => {
      const { data, error } = await supabase.from("enrolments").select("id, learner_id, status, cohorts(name, programmes(title))").eq("mentor_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: managedProgrammes } = useQuery({
    queryKey: ["profile_pm_programmes", targetId],
    enabled: !!targetId && isProgrammeManager,
    queryFn: async () => {
      const { data, error } = await supabase.from("programmes").select("id, title, status").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: sponsoredEnrolments } = useQuery({
    queryKey: ["profile_sponsor_enrolments", targetId],
    enabled: !!targetId && isSponsor,
    queryFn: async () => {
      const { data, error } = await supabase.from("enrolments").select("id, learner_id, status, cohorts(name, programmes(title))").eq("sponsor_id", targetId!);
      if (error) throw error;
      return data;
    },
  });

  if (profileLoading || rolesLoading) {
    return (
      <div className="animate-slide-up space-y-3 max-w-3xl mx-auto">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const initials = profile?.full_name
    ? (profile.full_name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const email = targetId === currentUser?.id ? currentUser?.email : userEmail;

  return (
    <div className="animate-slide-up space-y-3 max-w-3xl mx-auto">
      {/* ── Hero Header ── */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-16 bg-gradient-to-r from-primary via-primary/80 to-accent" />
        <CardContent className="px-5 pb-4 -mt-8">
          <div className="flex items-end gap-4">
            <Avatar className="w-16 h-16 border-[3px] border-card shadow-md">
              <AvatarImage src={(profile as any)?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-accent text-accent-foreground text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-lg font-bold text-foreground leading-tight">{(profile as any)?.full_name ?? "Unknown User"}</h1>
              {(profile as any)?.job_title && (
                <p className="text-xs text-muted-foreground">{(profile as any).job_title}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {roles.map(r => (
              <Badge key={r} className={`text-[10px] px-2 py-0 border-0 ${roleBadgeColor[r] ?? "bg-muted text-muted-foreground"}`}>
                {roleLabel(r)}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-3 text-xs">
            <InfoField icon={Mail} value={email} />
            <InfoField icon={Phone} value={(profile as any)?.phone} />
            <InfoField icon={Building2} value={(profile as any)?.organisation} />
            <InfoField icon={Briefcase} value={(profile as any)?.department} />
            <InfoField icon={MapPin} value={(profile as any)?.location} />
            <InfoField icon={Calendar} value={
              profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
            } />
          </div>
        </CardContent>
      </Card>

      {/* ── Role Sections ── */}
      {isLearner && (
        <RoleSection icon={GraduationCap} title="Learner" color="bg-primary">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <StatChip label="Enrolments" value={enrolments?.length ?? 0} color="bg-primary/10 text-primary" />
            <StatChip label="Active" value={enrolments?.filter(e => e.status === "active").length ?? 0} color="bg-success/10 text-success" />
            <StatChip label="Submissions" value={submissions?.length ?? 0} color="bg-info/10 text-info" />
            <StatChip label="Credentials" value={credentials?.length ?? 0} color="bg-accent/10 text-accent" />
          </div>
          {enrolments && enrolments.length > 0 && (
            <div className="space-y-1">
              {enrolments.slice(0, 5).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/50 text-xs">
                  <span className="font-medium text-foreground truncate">{e.cohorts?.programmes?.title ?? "Programme"}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-0">{e.status}</Badge>
                    <span className="text-muted-foreground">{e.progress_percentage ?? 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {credentials && credentials.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Credentials</p>
              {credentials.slice(0, 3).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-accent/5 text-xs">
                  <span className="font-medium text-foreground">{c.title}</span>
                  <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-0">{c.credential_type}</Badge>
                </div>
              ))}
            </div>
          )}
        </RoleSection>
      )}

      {isFacilitator && (
        <RoleSection icon={Users} title="Facilitator" color="bg-success">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <StatChip label="Cohorts" value={facilitatorCohorts?.length ?? 0} color="bg-success/10 text-success" />
            <StatChip label="Active" value={facilitatorCohorts?.filter(c => c.status === "active").length ?? 0} color="bg-primary/10 text-primary" />
            <StatChip label="Completed" value={facilitatorCohorts?.filter(c => c.status === "completed").length ?? 0} color="bg-muted text-muted-foreground" />
          </div>
          {facilitatorCohorts && facilitatorCohorts.length > 0 && (
            <div className="space-y-1">
              {facilitatorCohorts.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/50 text-xs">
                  <div>
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="text-muted-foreground ml-1.5">· {c.programmes?.title}</span>
                  </div>
                  <Badge className="text-[9px] px-1.5 py-0 bg-success/10 text-success border-0">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </RoleSection>
      )}

      {isAssessor && (
        <RoleSection icon={ClipboardCheck} title="Assessor" color="bg-info">
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Assigned" value={assessorSubmissions?.length ?? 0} color="bg-info/10 text-info" />
            <StatChip label="Pending" value={assessorSubmissions?.filter(s => s.status === "pending" || s.status === "submitted").length ?? 0} color="bg-warning/10 text-warning" />
            <StatChip label="Assessed" value={assessorSubmissions?.filter(s => s.status === "assessed" || s.status === "passed" || s.status === "failed").length ?? 0} color="bg-success/10 text-success" />
          </div>
        </RoleSection>
      )}

      {isModerator && (
        <RoleSection icon={Shield} title="Moderator" color="bg-accent">
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Reviewed" value={moderationItems?.length ?? 0} color="bg-accent/10 text-accent" />
            <StatChip label="Approved" value={moderationItems?.filter(m => m.status === "approved").length ?? 0} color="bg-success/10 text-success" />
            <StatChip label="Rejected" value={moderationItems?.filter(m => m.status === "rejected").length ?? 0} color="bg-destructive/10 text-destructive" />
          </div>
        </RoleSection>
      )}

      {isMentor && (
        <RoleSection icon={Star} title="Mentor" color="bg-success">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <StatChip label="Mentees" value={menteeEnrolments?.length ?? 0} color="bg-success/10 text-success" />
            <StatChip label="Active" value={menteeEnrolments?.filter(e => e.status === "active").length ?? 0} color="bg-primary/10 text-primary" />
          </div>
          {menteeEnrolments && menteeEnrolments.length > 0 && (
            <div className="space-y-1">
              {menteeEnrolments.slice(0, 5).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/50 text-xs">
                  <span className="font-medium text-foreground">{e.cohorts?.programmes?.title ?? "Programme"}</span>
                  <Badge className="text-[9px] px-1.5 py-0 bg-success/10 text-success border-0">{e.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </RoleSection>
      )}

      {isProgrammeManager && (
        <RoleSection icon={BarChart3} title="Programme Manager" color="bg-accent">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <StatChip label="Programmes" value={managedProgrammes?.length ?? 0} color="bg-accent/10 text-accent" />
            <StatChip label="Active" value={managedProgrammes?.filter(p => p.status === "active" || p.status === "approved").length ?? 0} color="bg-success/10 text-success" />
          </div>
          {managedProgrammes && managedProgrammes.length > 0 && (
            <div className="space-y-1">
              {managedProgrammes.slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/50 text-xs">
                  <span className="font-medium text-foreground">{p.title}</span>
                  <Badge className="text-[9px] px-1.5 py-0 bg-accent/10 text-accent border-0">{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </RoleSection>
      )}

      {isSponsor && (
        <RoleSection icon={Building2} title="Sponsor" color="bg-warning">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <StatChip label="Sponsored" value={sponsoredEnrolments?.length ?? 0} color="bg-warning/10 text-warning" />
            <StatChip label="Active" value={sponsoredEnrolments?.filter(e => e.status === "active").length ?? 0} color="bg-success/10 text-success" />
          </div>
          {sponsoredEnrolments && sponsoredEnrolments.length > 0 && (
            <div className="space-y-1">
              {sponsoredEnrolments.slice(0, 5).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/50 text-xs">
                  <span className="font-medium text-foreground">{e.cohorts?.programmes?.title ?? "Programme"}</span>
                  <Badge className="text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-0">{e.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </RoleSection>
      )}

      {(roles.includes("super_admin") || roles.includes("systems_admin") || roles.includes("operations")) && (
        <RoleSection icon={Shield} title="Admin Access" color="bg-destructive">
          <p className="text-xs text-muted-foreground">System-wide administrative privileges across all portals.</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {roles.filter(r => ["super_admin", "systems_admin", "operations"].includes(r)).map(r => (
              <Badge key={r} className={`text-[10px] px-2 py-0 border-0 ${roleBadgeColor[r]}`}>{roleLabel(r)}</Badge>
            ))}
          </div>
        </RoleSection>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function RoleSection({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <span className={`w-5 h-5 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-3 h-3 text-white" />
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <CardContent className="p-3">{children}</CardContent>
    </Card>
  );
}

function InfoField({ icon: Icon, value }: { icon: React.ElementType; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="w-3 h-3 text-accent shrink-0" />
      <span className={`truncate ${value ? "text-foreground" : "text-muted-foreground/50 italic"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${color}`}>
      <p className="text-base font-bold leading-none">{value}</p>
      <p className="text-[9px] mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
