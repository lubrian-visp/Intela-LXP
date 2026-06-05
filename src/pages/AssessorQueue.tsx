import { useState, useMemo } from "react";
import {
  Inbox, Clock, Search, FileCheck, CheckCircle2, BarChart3,
  AlertTriangle, History, ChevronRight, User,
} from "lucide-react";
import { FadeIn } from "@/components/animations/MotionWrappers";
import { Input } from "@/components/ui/input";
import { useSubmissions, useRealtimeSync } from "@/hooks/useCoreData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState as useLocalState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";
import GradeSubmissionDialog from "@/components/assessor/GradeSubmissionDialog";
import { Badge } from "@/components/ui/badge";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pending",    color: "text-warning",     bg: "bg-warning/10"     },
  submitted:  { label: "Submitted",  color: "text-info",        bg: "bg-info/10"        },
  in_review:  { label: "In Review",  color: "text-info",        bg: "bg-info/10"        },
  graded:     { label: "Graded",     color: "text-success",     bg: "bg-success/10"     },
  moderation: { label: "Moderation", color: "text-accent",      bg: "bg-accent/10"      },
  resubmit:   { label: "Resubmit",   color: "text-destructive", bg: "bg-destructive/10" },
  assessed:   { label: "Assessed",   color: "text-success",     bg: "bg-success/10"     },
};

export default function AssessorQueue() {
  usePageTitle("Assessment Queue", "Assessor Portal");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") ?? "pending";
  const [search, setSearch]             = useState("");
  const [gradingTarget, setGradingTarget] = useState<any | null>(null);

  const { data: submissions = [], isLoading } = useSubmissions();
  useRealtimeSync(["assessment_submissions", "notifications"]);

  // Fetch learner profiles
  const learnerIds = useMemo(
    () => [...new Set((submissions as any[]).map(s => s.learner_id))],
    [submissions]
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ["queue-profiles", learnerIds.join(",")],
    enabled: learnerIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("user_id, full_name")
        .in("user_id", learnerIds);
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles as any[]).forEach(p => { m[p.user_id] = p.full_name || "Unknown Learner"; });
    return m;
  }, [profiles]);

  const allSubs  = submissions as any[];
  const pending  = allSubs.filter(s => s.status === "pending" || s.status === "submitted");
  const inReview = allSubs.filter(s => s.status === "in_review");
  const graded   = allSubs.filter(s => s.status === "graded" || s.status === "assessed");
  const needsAttention = allSubs.filter(s => s.status === "resubmit" || s.status === "moderation");

  const applySearch = (list: any[]) =>
    search
      ? list.filter(s => (s.assessments?.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (profileMap[s.learner_id] ?? "").toLowerCase().includes(search.toLowerCase()))
      : list;

  const tabs = [
    { key: "pending",    label: "To Grade",     icon: Clock,         list: pending,        badge: pending.length,       badgeColor: "bg-warning/10 text-warning"     },
    { key: "in_review",  label: "In Review",    icon: FileCheck,     list: inReview,       badge: inReview.length,      badgeColor: "bg-info/10 text-info"           },
    { key: "attention",  label: "Needs Action", icon: AlertTriangle, list: needsAttention, badge: needsAttention.length,badgeColor: "bg-destructive/10 text-destructive" },
    { key: "graded",     label: "Graded",       icon: CheckCircle2,  list: graded,         badge: graded.length,        badgeColor: "bg-success/10 text-success"     },
    { key: "summary",    label: "Summary",      icon: BarChart3,     list: allSubs,        badge: 0,                    badgeColor: ""                               },
  ];

  // ── Submission card ──────────────────────────────────────────────────────
  const renderCard = (s: any) => {
    const cfg       = STATUS_CFG[s.status] ?? { label: s.status, color: "text-muted-foreground", bg: "bg-secondary" };
    const name      = profileMap[s.learner_id] ?? `Learner ${s.learner_id?.slice(0, 6)}…`;
    const passMark  = s.assessments?.pass_mark;
    const passes    = s.score != null && passMark != null && s.score >= passMark;
    const fails     = s.score != null && passMark != null && s.score < passMark;

    return (
      <button
        key={s.id}
        className="w-full text-left bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer group"
        onClick={() => setGradingTarget(s)}
        aria-label={`Grade ${s.assessments?.title ?? "submission"} by ${name}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {s.assessments?.title ?? "Assessment"}
            </h4>
            {s.assessments?.assessment_category && (
              <Badge variant="outline" className="text-[8px] mt-0.5 capitalize">
                {s.assessments.assessment_category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          {/* Learner */}
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {name}
          </span>

          {/* Submitted date */}
          {s.submitted_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(s.submitted_at), "d MMM yyyy")}
            </span>
          )}

          {/* Score */}
          {s.score != null && (
            <span className={cn(
              "ml-auto text-xs font-bold",
              passes ? "text-success" : fails ? "text-destructive" : "text-foreground"
            )}>
              {s.score}{s.assessments?.max_score ? `/${s.assessments.max_score}` : ""}
            </span>
          )}
          {s.score == null && (
            <span className="ml-auto text-[10px] text-primary font-medium">
              Click to grade →
            </span>
          )}
        </div>
      </button>
    );
  };

  const renderEmpty = (message: string, icon?: React.ReactNode) => (
    <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
      {icon ?? <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />}
      <h3 className="text-sm font-semibold text-foreground mb-1">Nothing here</h3>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" /> Assessment Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} submission{pending.length !== 1 ? "s" : ""} awaiting grading
          {inReview.length > 0 && ` · ${inReview.length} in review`}
          {needsAttention.length > 0 && ` · ${needsAttention.length} need action`}
        </p>
      </FadeIn>

      <Tabs value={activeView} onValueChange={v => setSearchParams({ view: v })} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-secondary/60 border border-border/40 rounded-xl">
          {tabs.map(t => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="flex items-center gap-1.5 text-xs rounded-lg px-3 h-8 data-[state=active]:bg-card"
            >
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.badge > 0 && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none", t.badgeColor)}>
                  {t.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Search — shared across tabs */}
        <div className="relative max-w-sm mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments or learners…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search submissions"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3 mt-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* ── To Grade ── */}
            <TabsContent value="pending" className="space-y-3 mt-4">
              {applySearch(pending).length === 0
                ? renderEmpty("No submissions awaiting grading.", <CheckCircle2 className="w-10 h-10 mx-auto text-success/40 mb-3" />)
                : applySearch(pending).map(renderCard)}
            </TabsContent>

            {/* ── In Review ── */}
            <TabsContent value="in_review" className="space-y-3 mt-4">
              {applySearch(inReview).length === 0
                ? renderEmpty("No submissions currently in review.")
                : applySearch(inReview).map(renderCard)}
            </TabsContent>

            {/* ── Needs Action (resubmit + moderation) ── */}
            <TabsContent value="attention" className="space-y-3 mt-4">
              {applySearch(needsAttention).length === 0
                ? renderEmpty("No submissions need immediate action.", <CheckCircle2 className="w-10 h-10 mx-auto text-success/40 mb-3" />)
                : applySearch(needsAttention).map(renderCard)}
            </TabsContent>

            {/* ── Graded ── */}
            <TabsContent value="graded" className="space-y-3 mt-4">
              {applySearch(graded).length === 0
                ? renderEmpty("No submissions graded yet.")
                : applySearch(graded).map(renderCard)}
            </TabsContent>

            {/* ── Summary ── */}
            <TabsContent value="summary" className="mt-4 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "To Grade",     value: pending.length,       color: "text-warning",     bg: "bg-warning/10"     },
                  { label: "In Review",    value: inReview.length,      color: "text-info",        bg: "bg-info/10"        },
                  { label: "Graded",       value: graded.length,        color: "text-success",     bg: "bg-success/10"     },
                  { label: "Needs Action", value: needsAttention.length,color: "text-destructive", bg: "bg-destructive/10" },
                ].map(s => (
                  <div key={s.label} className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center">
                    <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">All Submissions ({applySearch(allSubs).length})</h3>
                {applySearch(allSubs).map(renderCard)}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* ── Grading dialog ── */}
      <GradeSubmissionDialog
        open={!!gradingTarget}
        onOpenChange={open => { if (!open) setGradingTarget(null); }}
        submission={gradingTarget}
      />
    </div>
  );
}
